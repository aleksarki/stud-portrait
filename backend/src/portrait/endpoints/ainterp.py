from datetime import datetime
import json

from django.db.models import Q, Avg, Count

from ..llmclient import LLM_CLIENT
from .common import *
from .datanal import DisciplineImpactAnalyzer
from .analysis_end import get_vam_trend_data


# ! ================================================== ENDPOINTS =================================================== ! #

@cached()
@method(POST)
@csrf_exempt
def ai_analytics_summary(request):
    """
    Генерирует аналитическую сводку для администратора.
    """
    try:
        body = json.loads(request.body)
        context_type = body.get('context_type', 'general')
        filters = body.get('filters', {})

        inst_ids = filters.get('institutions', [])
        dir_ids = filters.get('directions', [])
        courses = filters.get('courses', [])
        competency = filters.get('competency', COMP.LEADERSHIP)
        year = filters.get('year', None)

        results_qs = TestResults.objects.select_related('res_institution', 'res_edu_specialty')
        if inst_ids:
            results_qs = results_qs.filter(res_institution_id__in=inst_ids)
        if dir_ids:
            results_qs = results_qs.filter(res_edu_specialty_id__in=dir_ids)
        if courses:
            results_qs = results_qs.filter(res_course__in=courses)
        if year:
            results_qs = results_qs.filter(res_year=year)

        prompt = ""
        if context_type == 'general':
            total_students = results_qs.values('res_participant_id').distinct().count()
            avg_scores = {}
            for comp in COMP.list[:6]:
                avg = results_qs.aggregate(Avg(comp))[f'{comp}__avg']
                if avg:
                    comp_name = COMP.names.get(comp, comp)
                    avg_scores[comp_name] = round(avg, 1)

            scores = results_qs.exclude(**{f'{competency}__isnull': True}).values_list(competency, flat=True)
            if scores:
                low = sum(1 for s in scores if s < 400)
                medium = sum(1 for s in scores if 400 <= s < 600)
                high = sum(1 for s in scores if s >= 600)
                total = len(scores)
                low_pct = round(low / total * 100, 1) if total else 0
                medium_pct = round(medium / total * 100, 1) if total else 0
                high_pct = round(high / total * 100, 1) if total else 0
            else:
                low_pct = medium_pct = high_pct = 0

            comp_display = COMP.names.get(competency, competency)
            prompt = f"""Ты — аналитик образовательной платформы. На основе следующих данных напиши краткий аналитический отчёт (3-5 предложений) для администратора.

Данные:
- Всего участников: {total_students}
- Средние баллы по компетенциям: {avg_scores}
- Распределение по уровням для компетенции "{comp_display}": высокий {high_pct}%, средний {medium_pct}%, начальный {low_pct}%

Выдели основные тренды, сильные стороны и зоны роста.
"""

        elif context_type == 'institution_comparison':
            if not inst_ids:
                inst_agg = results_qs.values('res_institution_id', 'res_institution__inst_name') \
                    .annotate(avg_score=Avg(competency), student_count=Count('res_participant_id', distinct=True)) \
                    .order_by('-student_count')[:5]
            else:
                inst_agg = results_qs.values('res_institution_id', 'res_institution__inst_name') \
                    .annotate(avg_score=Avg(competency), student_count=Count('res_participant_id', distinct=True)) \
                    .filter(res_institution_id__in=inst_ids)

            comparison = []
            for item in inst_agg:
                comparison.append(f"- {item['res_institution__inst_name']}: средний балл {item['avg_score']:.1f}, студентов {item['student_count']}")

            comp_display = COMP.names.get(competency, competency)
            prompt = f"""
Сравни учебные заведения по компетенции "{comp_display}".

Данные:
{chr(10).join(comparison)}

Выдели лидеров и отстающих, дай рекомендации.
"""

        elif context_type == 'discipline_impact':
            analyzer = DisciplineImpactAnalyzer()
            perf_data = []
            perf_qs = AcademicPerformances.objects.select_related('perf_participant', 'perf_edu_discipline')
            
            # Фильтрация через participants
            if inst_ids or dir_ids:
                participant_filters = Q()
                if inst_ids:
                    participant_filters &= Q(res_institution_id__in=inst_ids)
                if dir_ids:
                    participant_filters &= Q(res_edu_specialty_id__in=dir_ids)
                qualified_participants = TestResults.objects.filter(participant_filters).values_list('res_participant_id', flat=True).distinct()
                perf_qs = perf_qs.filter(perf_participant_id__in=qualified_participants)

            for perf in perf_qs[:200]:
                year_perf = perf.perf_year
                student = perf.perf_participant
                try:
                    year_start = int(year_perf.split('/')[0])
                except:
                    continue
                before = TestResults.objects.filter(res_participant=student, res_year__lt=year_perf).order_by('-res_year').first()
                after = TestResults.objects.filter(res_participant=student, res_year=year_perf).order_by('-res_course').first()
                if before and after:
                    before_score = getattr(before, competency, None)
                    after_score = getattr(after, competency, None)
                    if before_score and after_score:
                        perf_data.append({
                            'discipline': perf.perf_edu_discipline.edu_disc_name,
                            'grade': perf.perf_main,
                            f'{competency}_before': before_score,
                            f'{competency}_after': after_score
                        })
            if perf_data:
                df = pd.DataFrame(perf_data)
                analysis = analyzer.analyze_discipline_impact(df, competency)
                impact_text = ""
                for disc_res in analysis.get('results', []):
                    impact_text += f"\nДисциплина: {disc_res['discipline']}\n"
                    for grade, impact in disc_res.get('grade_impacts', {}).items():
                        impact_text += f"  Оценка {grade}: прирост {impact['mean_gain']:.1f} баллов, эффект {impact['cohens_d']:.2f} (p={impact['p_value']:.3f})\n"
                comp_display = COMP.names.get(competency, competency)
                prompt = f"""
Проанализируй влияние дисциплин на компетенцию "{comp_display}".

Данные анализа:
{impact_text}

Сделай выводы: какие дисциплины наиболее эффективны, какие требуют доработки.
"""
            else:
                prompt = "Недостаточно данных для анализа влияния дисциплин."

        elif context_type == 'vam_trend':
            # Прямой вызов get_vam_trend_data (функция уже определена в этом модуле)
            from django.http import HttpRequest
            mock_request = HttpRequest()
            mock_request.method = "POST"
            mock_request.body = json.dumps({
                'group_by': 'institution',
                'competency': competency,
                'filter_institutions': inst_ids,
                'filter_directions': dir_ids,
                'filter_courses': courses
            }).encode()
            response = get_vam_trend_data(mock_request)
            content = json.loads(response.content)
            if content.get('status') == 'success':
                data_points = []
                for group in content.get('data', []):
                    for course in group.get('courses', []):
                        data_points.append(f"{group['group_name']}, курс {course['course']}: {course['value_added']:.1f} баллов")
                comp_display = COMP.names.get(competency, competency)
                prompt = f"""
Проанализируй динамику развития компетенции "{comp_display}" по курсам.

Данные (средний балл на курсе для каждой группы):
{chr(10).join(data_points[:20])}

Выдели общий тренд (рост, падение, стагнацию), укажи группы с лучшей и худшей динамикой.
"""
            else:
                prompt = "Недостаточно данных для анализа VAM."

        else:
            prompt = "Неизвестный тип анализа."

        result = LLM_CLIENT.generate(prompt, max_length=600, temperature=0.2)
        if result is None:
            result = "⚠️ Модель временно недоступна. Попробуйте позже."

        return JsonResponse({
            'status': 'success',
            'summary': result,
            'context_type': context_type
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@cached()
@method(GET)
@jsonResponse
@csrf_exempt
def interpret_student_results(request):
    student_id = request.GET.get('student_id')
    year = request.GET.get('year')
    with_ai = request.GET.get('with_ai', 'true').lower() == 'true'

    if not student_id:
        raise ResponseError("student_id required")

    try:
        participant = Participants.objects.get(**{tPART.ID: student_id})
    except Participants.DoesNotExist:
        raise ResponseError(f"Participant {student_id} not found", status=404)

    # Ищем маппинг для получения ФИО
    try:
        mapping = StudentMapping.objects.get(mapping_rsv=participant.part_rsv)
        student_name = mapping.mapping_stud_name
    except StudentMapping.DoesNotExist:
        student_name = participant.part_rsv or f"Участник {student_id}"

    results = TestResults.objects.filter(**{tRES.PARTICIPANT: participant})
    
    # Исправляем обработку year - проверяем на "null" и None
    if year and year.lower() != 'null' and year != 'undefined':
        results = results.filter(**{tRES.YEAR: year})
    
    results = results.order_by(desc(tRES.YEAR), desc(tRES.COURSE_NUM))

    if not results.exists():
        raise ResponseError("No results")

    latest_result = results.first()
    if latest_result is None:
        raise ResponseError("Result is None")

    resume_data = {
        'personal_info': {
            'name':       student_name,
            'gender':     participant.part_gender or '',
            'student_id': student_id,
            'rsv_id':     participant.part_rsv
        },
        'education': {
            'institution': attrIfObj(latest_result.res_institution, 'inst_name', ''),
            'direction':   attrIfObj(latest_result.res_edu_specialty, 'edu_spec_name', ''),
            'form':        attrIfObj(latest_result.res_edu_form, 'edu_form_name', ''),
            'level':       attrIfObj(latest_result.res_edu_level, 'edu_level_name', ''),
            'course':      participant.part_course_num or latest_result.res_course
        },
        'competencies': [],
        'generated_at': datetime.now().isoformat(),
        'year':         latest_result.res_year if not year or year.lower() == 'null' or year == 'undefined' else year
    }

    competencies_order = [
        'res_comp_leadership', 'res_comp_communication', 'res_comp_self_development',
        'res_comp_result_orientation', 'res_comp_stress_resistance', 'res_comp_client_focus',
        'res_comp_planning', 'res_comp_info_analysis', 'res_comp_partnership',
        'res_comp_rules_compliance', 'res_comp_emotional_intel', 'res_comp_passive_vocab'
    ]

    all_scores = {}
    for comp_field in competencies_order:
        score = getattr(latest_result, comp_field, None)
        if score and score > 0:
            all_scores[comp_field] = score

    for comp_field in competencies_order:
        score = getattr(latest_result, comp_field, None)
        if not score or score == 0:
            continue
        comp_name = COMP.names[comp_field]
        course = latest_result.res_course or 1
        prediction = predict_competency_level(score)
        comp_data = {
            'field': comp_field,
            'name': comp_name,
            'score': score,
            'max_score': 800,
            'percentage': ((score - 200) / 600) * 100,
            'ai': {
                'level':           prediction['level'],
                'level_code':      prediction['level_code'],
                'confidence':      prediction['confidence'],
                'percentile':      prediction['percentile'],
                'emoji':           {'начальный': '🔴', 'средний': '🟡', 'высокий': '🟢'}.get(prediction['level'], '⚪'),
                'color':           {'начальный': '#f44336', 'средний': '#ff9800', 'высокий': '#4caf50'}.get(prediction['level'], '#9e9e9e'),
                'interpretation':  generate_mock_interpretation(score, prediction['level'], comp_name, course, prediction['percentile']),
                'recommendations': generate_mock_recommendations(comp_field, prediction['level'])
            }
        }
        resume_data['competencies'].append(comp_data)

    # Общая интерпретация (ИИ) - используем ТОЛЬКО компетенции из latest_result
    if with_ai:
        # Используем словарь компетенций для AI
        competencies_dict = {comp['name']: comp['score'] for comp in resume_data['competencies']}
        try:
            general_text = generate_general_interpretation_with_ai(resume_data['education'], competencies_dict)
            resume_data['general_interpretation'] = general_text
        except Exception as e:
            print(f"General AI generation failed: {e}")
            resume_data['general_interpretation'] = None
    else:
        resume_data['general_interpretation'] = None

    return {'data': resume_data}


# ! ================================================== UTILITIES =================================================== ! #


def generate_general_interpretation_with_ai(student_info, competencies_dict):
    # Сортируем компетенции (общая логика для обоих случаев)
    sorted_comps = sorted(competencies_dict.items(), key=lambda x: x[1], reverse=True)
    strong = [name for name, _ in sorted_comps[:2]]
    weak = [name for name, _ in sorted_comps[-2:]]

    # Если модель недоступна
    if not LLM_CLIENT.health_check()["status"] in ("healthy", "available"):
        print("[model] (!): model not available")
        return (
            f"Студент демонстрирует сильные стороны в области {', '.join(strong)}. "
            f"Рекомендуется обратить внимание на развитие {', '.join(weak)}."
        )

    def level(value):
        if value < 399:
            return "начальный уровень"
        if value < 599:
            return "средний уровень"
        return "высокий уровень"

    # Формируем промпт с использованием strong/weak
    prompt = (
        f"Ты — карьерный консультант. Напиши краткую характеристику студента, используя только данные о компетенциях. "
        f"Не добавляй никакой информации о внешности, возрасте или личных качествах, не указанных в данных.\n\n"
        f"Курс: {student_info.get('course', 'X')}\n"
        f"Направление: {student_info.get('direction', 'не указано')}\n"
        f"Баллы развития компетенций (200-800):\n"
    ) + (
        "\n".join([f"{comp}: {val} ({level(val)})" for comp, val in competencies_dict.items()])
    ) + (
        f"\nСильные стороны (наиболее высокие баллы): {', '.join(strong)}\n"
        f"Зоны роста (наиболее низкие баллы): {', '.join(weak)}\n\n"
        f"Характеристика (2-3 предложения):"
    )

    text = LLM_CLIENT.generate(prompt, max_length=150, temperature=0.6, top_p=0.85)

    # Если ответ пустой или содержит признаки галлюцинаций
    if not text or any(phrase in text.lower() for phrase in ['внешность', 'возраст', 'рост', 'характер', 'build']):
        print("[model] (!): model got high and generated garbage")

    return text


def predict_competency_level(score):
    if score < 400:
        level = "начальный"
        level_code = 0
    elif score < 600:
        level = "средний"
        level_code = 1
    else:
        level = "высокий"
        level_code = 2
    percentile = ((score - 200) / 600) * 100
    return {
        "level": level,
        "level_code": level_code,
        "confidence": 1.0,
        "percentile": int(max(0, min(100, percentile))),
        "probabilities": {
            "начальный": 1.0 if level_code == 0 else 0.0,
            "средний": 1.0 if level_code == 1 else 0.0,
            "высокий": 1.0 if level_code == 2 else 0.0
        }
    }


def generate_mock_interpretation(score, level, competency_name, course, percentile):
    level_templates = {
        'начальный': {
            'intro': f"Ваш результат по компетенции '{competency_name}' находится на начальном уровне развития ({score} баллов).",
            'context': f"Для студента {course} курса это типичный показатель на этапе формирования базовых навыков.",
            'outlook': "У вас есть хороший потенциал для роста! С регулярной практикой и обучением вы сможете значительно улучшить этот показатель.",
            'emoji': '🔴'
        },
        'средний': {
            'intro': f"Ваш результат по компетенции '{competency_name}' находится на среднем уровне ({score} баллов, {percentile}-й процентиль).",
            'context': f"Вы демонстрируете хорошее базовое владение этой компетенцией, что соответствует ожиданиям для {course} курса.",
            'outlook': "Вы на правильном пути! Продолжайте развивать эти навыки, и вы достигнете высокого уровня.",
            'emoji': '🟡'
        },
        'высокий': {
            'intro': f"Отличный результат! Ваша компетенция '{competency_name}' развита на высоком уровне ({score} баллов).",
            'context': f"Вы находитесь в топ-{100-percentile}% студентов вашего курса. Это выдающийся показатель!",
            'outlook': "Поздравляем! Продолжайте развиваться в этом направлении и делитесь опытом с другими студентами.",
            'emoji': '🟢'
        }
    }
    template = level_templates.get(level, level_templates['средний'])
    interpretation = f"{template['emoji']} {template['intro']}\n\n{template['context']}\n\n{template['outlook']}"
    return interpretation.strip()


def generate_mock_recommendations(competency_field, level):
    comp_name = COMP.names.get(competency_field, 'Компетенция')
    recommendations_db = {
        'Лидерство': {
            'начальный': [
                "Примите участие в групповых проектах в роли координатора задач",
                "Пройдите онлайн-курс по основам лидерства (Coursera, Stepik)",
                "Присоединитесь к студенческому самоуправлению или волонтёрским проектам",
                "Начните с малого: возглавьте учебную группу или подгруппу"
            ],
            'средний': [
                "Возглавьте студенческий проект или инициативу в университете",
                "Развивайте навыки делегирования и мотивации команды",
                "Изучите различные стили лидерства и попробуйте их на практике",
                "Примите участие в деловых играх и симуляциях управления"
            ],
            'высокий': [
                "Станьте ментором для студентов младших курсов",
                "Участвуйте в молодёжных лидерских программах и конкурсах",
                "Развивайте стратегическое лидерство через сложные проекты",
                "Рассмотрите возможность стажировки на управленческих позициях"
            ]
        },
        'Коммуникация': {
            'начальный': [
                "Активно участвуйте в семинарах и групповых дискуссиях",
                "Тренируйте публичные выступления (начните с коротких докладов)",
                "Посетите тренинг по эффективной коммуникации",
                "Практикуйте активное слушание в повседневном общении"
            ],
            'средний': [
                "Развивайте навыки презентации проектов перед аудиторией",
                "Участвуйте в дебатах или дискуссионных клубах",
                "Изучите техники невербальной коммуникации",
                "Попробуйте себя в роли ведущего студенческих мероприятий"
            ],
            'высокий': [
                "Выступайте на студенческих конференциях и форумах",
                "Развивайте кросс-культурные коммуникации",
                "Станьте спикером или модератором на крупных мероприятиях",
                "Делитесь опытом: проводите мастер-классы по коммуникации"
            ]
        },
        'Саморазвитие': {
            'начальный': [
                "Составьте план личностного развития на семестр",
                "Начните читать профессиональную литературу",
                "Определите 2-3 навыка для развития",
                "Ведите дневник достижений и рефлексии"
            ],
            'средний': [
                "Пройдите курсы повышения квалификации",
                "Установите систему регулярного самообразования",
                "Найдите ментора в профессиональной сфере",
                "Участвуйте в профессиональных сообществах"
            ],
            'высокий': [
                "Делитесь знаниями: пишите статьи, ведите блог",
                "Изучайте смежные области для расширения компетенций",
                "Участвуйте в научных исследованиях",
                "Станьте наставником для других студентов"
            ]
        }
    }
    default_recs = [
        "Продолжайте развивать эту компетенцию через практику",
        "Ищите возможности для применения навыков в реальных проектах",
        "Получайте обратную связь от преподавателей и сокурсников"
    ]
    comp_recs = recommendations_db.get(comp_name, {})
    return comp_recs.get(level, default_recs)[:4]
