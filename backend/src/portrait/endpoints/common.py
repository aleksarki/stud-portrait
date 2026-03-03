
from django.db.models import Count, Avg, Min, Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import (
    Participants, Competencecenters as CompetenceCenters, Institutions,
    Educationlevels, Studyforms, Specialties,
    Results, Course, Academicperformance
)

successResponse = lambda d: JsonResponse({**{"status": "success"}, **d})
errorResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=400)
notFoundResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=404)
notAllowedResponse = lambda: JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
exceptionResponse = lambda e: JsonResponse({"status": "error", "message": str(e)}, status=500)


# ====== DECORATORS ====== #

def method(method):
    def inner(func):
        @csrf_exempt
        def wrapper(request):
            if request.method != method:
                return notAllowedResponse()
            return func(request)
        return wrapper
    return inner

def response(func):
    @csrf_exempt
    def wrapper(request):
        try:
            return successResponse(func(request))
        except Exception as e:
            return exceptionResponse(e)
    return wrapper


# ====== ENDPOINTS ====== #

@method('GET')
@response
@csrf_exempt
def stats(request):
    try:
        # Общая статистика
        total_participants = Participants.objects.count()
        total_tests = Results.objects.count()
        unique_institutions = Institutions.objects.count()
        unique_centers = CompetenceCenters.objects.count()

        # Участники по году получения первой оценки
        first_year_stats = Results.objects.values('res_participant').annotate(
            first_year=Min('res_year')
        ).values('first_year').annotate(
            count=Count('res_participant')
        ).order_by('first_year')
        
        participants_by_first_year = {
            'years': [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
            'counts': [stat['count'] for stat in first_year_stats if stat['first_year']]
        }

        # Участники по центрам компетенций (топ-15)
        centers_stats = Results.objects.filter(
            res_center__isnull=False
        ).values('res_center__center_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_center = {
            'centers': [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
            'counts': [stat['count'] for stat in centers_stats if stat['res_center__center_name']]
        }

        # Участники по учебным заведениям (топ-15)
        institutions_stats = Results.objects.filter(
            res_institution__isnull=False
        ).values('res_institution__inst_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_institution = {
            'institutions': [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
            'counts': [stat['count'] for stat in institutions_stats if stat['res_institution__inst_name']]
        }

        # Специальности участников
        specialties_stats = Results.objects.filter(
            res_spec__isnull=False
        ).values('res_spec__spec_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')
        
        specialties_distribution = {
            'specialties': [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
            'counts': [stat['count'] for stat in specialties_stats if stat['res_spec__spec_name']]
        }

        # Динамика тестирований по годам
        tests_by_year = Results.objects.filter(
            res_year__isnull=False
        ).values('res_year').annotate(
            count=Count('res_id')
        ).order_by('res_year')
        
        tests_by_year_data = {
            'years': [str(stat['res_year']) for stat in tests_by_year if stat['res_year']],
            'counts': [stat['count'] for stat in tests_by_year if stat['res_year']]
        }

        # Средние оценки по компетенциям по годам
        competences_fields = [
            'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
            'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
            'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
            'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab'
        ]
        
        competence_names = {
            'res_comp_info_analysis': 'Анализ информации',
            'res_comp_planning': 'Планирование',
            'res_comp_result_orientation': 'Ориентация на результат',
            'res_comp_stress_resistance': 'Стрессоустойчивость',
            'res_comp_partnership': 'Партнерство',
            'res_comp_rules_compliance': 'Соблюдение правил',
            'res_comp_self_development': 'Саморазвитие',
            'res_comp_leadership': 'Лидерство',
            'res_comp_emotional_intel': 'Эмоциональный интеллект',
            'res_comp_client_focus': 'Клиентоориентированность',
            'res_comp_communication': 'Коммуникация',
            'res_comp_passive_vocab': 'Пассивный словарь'
        }
        
        competences_by_year = []
        for field in competences_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                competences_by_year.append({
                    'name': competence_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по мотиваторам по годам
        motivators_fields = [
            'res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
            'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
            'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
            'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions'
        ]
        
        motivator_names = {
            'res_mot_autonomy': 'Автономия',
            'res_mot_altruism': 'Альтруизм',
            'res_mot_challenge': 'Вызов',
            'res_mot_salary': 'Зарплата',
            'res_mot_career': 'Карьера',
            'res_mot_creativity': 'Креативность',
            'res_mot_relationships': 'Отношения',
            'res_mot_recognition': 'Признание',
            'res_mot_affiliation': 'Принадлежность',
            'res_mot_self_development': 'Саморазвитие',
            'res_mot_purpose': 'Цель',
            'res_mot_cooperation': 'Сотрудничество',
            'res_mot_stability': 'Стабильность',
            'res_mot_tradition': 'Традиции',
            'res_mot_management': 'Управление',
            'res_mot_work_conditions': 'Условия работы'
        }
        
        motivators_by_year = []
        for field in motivators_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                motivators_by_year.append({
                    'name': motivator_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по ценностям по годам
        values_fields = [
            'res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
            'res_val_family', 'res_val_health', 'res_val_environment'
        ]
        
        value_names = {
            'res_val_honesty_justice': 'Честность и справедливость',
            'res_val_humanism': 'Гуманизм',
            'res_val_patriotism': 'Патриотизм',
            'res_val_family': 'Семья',
            'res_val_health': 'Здоровье',
            'res_val_environment': 'Окружающая среда'
        }
        
        values_by_year = []
        for field in values_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                values_by_year.append({
                    'name': value_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        stats_data = {
            'totalParticipants': total_participants,
            'totalTests': total_tests,
            'uniqueInstitutions': unique_institutions,
            'uniqueCenters': unique_centers,
            'participantsByFirstYear': participants_by_first_year,
            'participantsByCenter': participants_by_center,
            'participantsByInstitution': participants_by_institution,
            'specialtiesDistribution': specialties_distribution,
            'testsByYear': tests_by_year_data,
            'competencesByYear': competences_by_year,
            'motivatorsByYear': motivators_by_year,
            'valuesByYear': values_by_year
        }
        
        return {"stats": stats_data}
        
    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@response
@csrf_exempt
def courses(request):
    try:
        # Получаем данные по курсам с информацией об участниках
        courses_query = Course.objects.all().select_related(
            'course_participant',
            'course_participant__part_institution',
            'course_participant__part_spec',
            'course_participant__part_edu_level',
            'course_participant__part_form'
        )
        
        courses_data = []
        for course in courses_query:
            course_data = {
                'course_id': course.course_id,
                'participant': {
                    'part_id': course.course_participant.part_id,
                    'part_name': course.course_participant.part_name,
                    'part_gender': course.course_participant.part_gender,
                    'institution': course.course_participant.part_institution.inst_name if course.course_participant.part_institution else None,
                    'specialty': course.course_participant.part_spec.spec_name if course.course_participant.part_spec else None,
                    'edu_level': course.course_participant.part_edu_level.edu_level_name if course.course_participant.part_edu_level else None,
                    'study_form': course.course_participant.part_form.form_name if course.course_participant.part_form else None,
                },
                # Данные по курсам
                'course_an_dec': float(course.course_an_dec) if course.course_an_dec is not None else 0,
                'course_client_focus': float(course.course_client_focus) if course.course_client_focus is not None else 0,
                'course_communication': float(course.course_communication) if course.course_communication is not None else 0,
                'course_leadership': float(course.course_leadership) if course.course_leadership is not None else 0,
                'course_result_orientation': float(course.course_result_orientation) if course.course_result_orientation is not None else 0,
                'course_planning_org': float(course.course_planning_org) if course.course_planning_org is not None else 0,
                'course_rules_culture': float(course.course_rules_culture) if course.course_rules_culture is not None else 0,
                'course_self_dev': float(course.course_self_dev) if course.course_self_dev is not None else 0,
                'course_collaboration': float(course.course_collaboration) if course.course_collaboration is not None else 0,
                'course_stress_resistance': float(course.course_stress_resistance) if course.course_stress_resistance is not None else 0,
                'course_emotions_communication': float(course.course_emotions_communication) if course.course_emotions_communication is not None else 0,
                'course_negotiations': float(course.course_negotiations) if course.course_negotiations is not None else 0,
                'course_digital_comm': float(course.course_digital_comm) if course.course_digital_comm is not None else 0,
                'course_effective_learning': float(course.course_effective_learning) if course.course_effective_learning is not None else 0,
                'course_entrepreneurship': float(course.course_entrepreneurship) if course.course_entrepreneurship is not None else 0,
                'course_creativity_tech': float(course.course_creativity_tech) if course.course_creativity_tech is not None else 0,
                'course_trendwatching': float(course.course_trendwatching) if course.course_trendwatching is not None else 0,
                'course_conflict_management': float(course.course_conflict_management) if course.course_conflict_management is not None else 0,
                'course_career_management': float(course.course_career_management) if course.course_career_management is not None else 0,
                'course_burnout': float(course.course_burnout) if course.course_burnout is not None else 0,
                'course_cross_cultural_comm': float(course.course_cross_cultural_comm) if course.course_cross_cultural_comm is not None else 0,
                'course_mentoring': float(course.course_mentoring) if course.course_mentoring is not None else 0,
            }
            courses_data.append(course_data)
        
        return {"courses": courses_data}
        
    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def students(request):
    """Получить список всех студентов"""
    try:
        students_list = Participants.objects.all().select_related(
            'part_institution', 'part_spec', 'part_edu_level', 'part_form'
        )
        
        students_data = []
        for student in students_list:
            student_data = {
                'stud_id': student.part_id,
                'stud_name': student.part_name,
                'stud_gender': student.part_gender,
                'institution': student.part_institution.inst_name if student.part_institution else None,
                'specialty': student.part_spec.spec_name if student.part_spec else None,
                'edu_level': student.part_edu_level.edu_level_name if student.part_edu_level else None,
                'study_form': student.part_form.form_name if student.part_form else None,
                'course_num': student.part_course_num
            }
            students_data.append(student_data)
            
        return successResponse({
            "students": students_data,
            "total_count": len(students_data)
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def student_results(request):
    """Получить результаты конкретного студента"""
    stud_id = request.GET.get('stud_id')
    
    if not stud_id:
        return errorResponse("stud_id parameter is required")
    
    try:
        stud_id = int(stud_id)
        
        try:
            # Ищем участника по part_id
            participant = Participants.objects.select_related(
                'part_institution', 'part_spec', 'part_edu_level', 'part_form'
            ).get(part_id=stud_id)
        except Participants.DoesNotExist:
            return notFoundResponse("Student not found")
        
        results_list = []
        for result in Results.objects.filter(res_participant=stud_id).select_related(
            'res_center', 'res_institution', 'res_edu_level', 'res_form', 'res_spec'
        ):
            # Создаем плоскую структуру
            result_data = {
                'res_id': result.res_id,
                'res_year': result.res_year,
                'res_course_num': result.res_course_num,
                'res_high_potential': result.res_high_potential,
                'res_summary_report': result.res_summary_report,
                
                # Базовые данные
                'center': result.res_center.center_name if result.res_center else None,
                'institution': result.res_institution.inst_name if result.res_institution else None,
                'edu_level': result.res_edu_level.edu_level_name if result.res_edu_level else None,
                'study_form': result.res_form.form_name if result.res_form else None,
                'specialty': result.res_spec.spec_name if result.res_spec else None,
                
                # Компетенции (разворачиваем из объекта competences)
                'res_comp_info_analysis': result.res_comp_info_analysis,
                'res_comp_planning': result.res_comp_planning,
                'res_comp_result_orientation': result.res_comp_result_orientation,
                'res_comp_stress_resistance': result.res_comp_stress_resistance,
                'res_comp_partnership': result.res_comp_partnership,
                'res_comp_rules_compliance': result.res_comp_rules_compliance,
                'res_comp_self_development': result.res_comp_self_development,
                'res_comp_leadership': result.res_comp_leadership,
                'res_comp_emotional_intel': result.res_comp_emotional_intel,
                'res_comp_client_focus': result.res_comp_client_focus,
                'res_comp_communication': result.res_comp_communication,
                'res_comp_passive_vocab': result.res_comp_passive_vocab,
                
                # Мотиваторы (разворачиваем из объекта motivators)
                'res_mot_autonomy': float(result.res_mot_autonomy) if result.res_mot_autonomy else None,
                'res_mot_altruism': float(result.res_mot_altruism) if result.res_mot_altruism else None,
                'res_mot_challenge': float(result.res_mot_challenge) if result.res_mot_challenge else None,
                'res_mot_salary': float(result.res_mot_salary) if result.res_mot_salary else None,
                'res_mot_career': float(result.res_mot_career) if result.res_mot_career else None,
                'res_mot_creativity': float(result.res_mot_creativity) if result.res_mot_creativity else None,
                'res_mot_relationships': float(result.res_mot_relationships) if result.res_mot_relationships else None,
                'res_mot_recognition': float(result.res_mot_recognition) if result.res_mot_recognition else None,
                'res_mot_affiliation': float(result.res_mot_affiliation) if result.res_mot_affiliation else None,
                'res_mot_self_development': float(result.res_mot_self_development) if result.res_mot_self_development else None,
                'res_mot_purpose': float(result.res_mot_purpose) if result.res_mot_purpose else None,
                'res_mot_cooperation': float(result.res_mot_cooperation) if result.res_mot_cooperation else None,
                'res_mot_stability': float(result.res_mot_stability) if result.res_mot_stability else None,
                'res_mot_tradition': float(result.res_mot_tradition) if result.res_mot_tradition else None,
                'res_mot_management': float(result.res_mot_management) if result.res_mot_management else None,
                'res_mot_work_conditions': float(result.res_mot_work_conditions) if result.res_mot_work_conditions else None,
                
                # Ценности (разворачиваем из объекта values)
                'res_val_honesty_justice': result.res_val_honesty_justice,
                'res_val_humanism': result.res_val_humanism,
                'res_val_patriotism': result.res_val_patriotism,
                'res_val_family': result.res_val_family,
                'res_val_health': result.res_val_health,
                'res_val_environment': result.res_val_environment,
            }
            results_list.append(result_data)
            
        return successResponse({
            "student": {
                "stud_id": participant.part_id,
                "stud_name": participant.part_name,
                "stud_gender": participant.part_gender,
                "institution": participant.part_institution.inst_name if participant.part_institution else None,
                "specialty": participant.part_spec.spec_name if participant.part_spec else None,
                "edu_level": participant.part_edu_level.edu_level_name if participant.part_edu_level else None,
                "study_form": participant.part_form.form_name if participant.part_form else None,
                "course_num": participant.part_course_num
            },
            "results": results_list
        })
        
    except ValueError:
        return errorResponse("stud_id must be an integer")
    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def get_institution_directions(request):
    """
    Возвращает направления, которые есть в выбранных институтах.
    Извлекает уникальные пары (institution, direction) из таблицы Results.
    """
    try:
        institution_ids = request.GET.getlist('institution_ids[]')
        
        print(f"📊 get_institution_directions called with institutions: {institution_ids}")
        
        # Если институты не выбраны, возвращаем ВСЕ направления
        if not institution_ids or len(institution_ids) == 0:
            directions = Results.objects.filter(
                res_spec__isnull=False
            ).values_list(
                'res_spec__spec_name', flat=True
            ).distinct().order_by('res_spec__spec_name')
            
            directions_list = list(directions)
            print(f"✅ Нет фильтра по ВУЗам, вернули {len(directions_list)} направлений")
            
            return successResponse({
                "directions": directions_list
            })
        
        # Фильтруем направления по выбранным институтам
        directions = Results.objects.filter(
            res_institution__inst_id__in=institution_ids,
            res_spec__isnull=False
        ).values_list(
            'res_spec__spec_name', flat=True
        ).distinct().order_by('res_spec__spec_name')
        
        directions_list = list(directions)
        print(f"✅ Для ВУЗов {institution_ids} нашли {len(directions_list)} направлений")
        
        return successResponse({
            "directions": directions_list
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_institution_directions: {str(e)}")
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def get_filter_options_with_counts(request):
    """
    Возвращает опции фильтров с количеством записей для каждой.
    С учётом уже выбранных фильтров (cross-filtering).
    
    ВАЖНО: Динамически подсчитывает максимальное количество прохождений!
    """
    try:
        session_id = request.GET.get('session_id')
        

        # Получаем текущие выбранные фильтры
        selected_institution_ids = request.GET.getlist('institution_ids[]')
        selected_directions = request.GET.getlist('directions[]')
        selected_courses = request.GET.getlist('courses[]')
        selected_test_attempts = request.GET.getlist('test_attempts[]')
        
        print(f"\n{'='*60}")
        print(f"📊 get_filter_options_with_counts вызван")
        print(f"   Текущие фильтры:")
        print(f"   - Институты: {selected_institution_ids}")
        print(f"   - Направления: {selected_directions}")
        print(f"   - Курсы: {selected_courses}")
        print(f"   - Прохождения: {selected_test_attempts}")
        print(f"{'='*60}\n")
        
        from django.db.models import Count
        
        # Базовый запрос (применяем все фильтры кроме текущего)
        base_results = Results.objects.select_related(
            'res_participant__part_institution',
            'res_participant__part_spec'
        )
        
        # ============================================================
        # ИНСТИТУТЫ с количеством (с учётом других фильтров)
        # ============================================================
        
        institutions_query = base_results
        
        # Применяем фильтры КРОМЕ институтов
        if selected_directions:
            institutions_query = institutions_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_courses:
            institutions_query = institutions_query.filter(
                res_course_num__in=selected_courses
            )
        
        if selected_test_attempts:
            # Фильтр по количеству прохождений
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            institutions_query = institutions_query.filter(
                res_participant__in=valid_students
            )
        
        institutions_counts = institutions_query.values(
            'res_participant__part_institution__inst_id',
            'res_participant__part_institution__inst_name'
        ).annotate(
            count=Count('res_id')
        ).order_by('-count')  # Сортировка по количеству (больше → меньше)
        
        institutions_list = [
            {
                'id': item['res_participant__part_institution__inst_id'],
                'name': item['res_participant__part_institution__inst_name'],
                'count': item['count']
            }
            for item in institutions_counts
            if item['res_participant__part_institution__inst_name']
        ]
        
        print(f"✅ Институты: {len(institutions_list)} (отсортировано по количеству)")
        
        # ============================================================
        # НАПРАВЛЕНИЯ с количеством (с учётом других фильтров)
        # ============================================================
        
        directions_query = base_results
        
        # Применяем фильтры КРОМЕ направлений
        if selected_institution_ids:
            directions_query = directions_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_courses:
            directions_query = directions_query.filter(
                res_course_num__in=selected_courses
            )
        
        if selected_test_attempts:
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            directions_query = directions_query.filter(
                res_participant__in=valid_students
            )
        
        directions_counts = directions_query.values(
            'res_participant__part_spec__spec_name'
        ).annotate(
            count=Count('res_id')
        ).order_by('-count')
        
        directions_list = [
            {
                'id': item['res_participant__part_spec__spec_name'],  # id = name для строк
                'name': item['res_participant__part_spec__spec_name'],
                'count': item['count']
            }
            for item in directions_counts
            if item['res_participant__part_spec__spec_name']
        ]
        
        print(f"✅ Направления: {len(directions_list)} (отсортировано по количеству)")
        
        # ============================================================
        # КУРСЫ с количеством (с учётом других фильтров)
        # ============================================================
        
        courses_query = base_results
        
        # Применяем фильтры КРОМЕ курсов
        if selected_institution_ids:
            courses_query = courses_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_directions:
            courses_query = courses_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_test_attempts:
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in selected_test_attempts
            ]
            
            courses_query = courses_query.filter(
                res_participant__in=valid_students
            )
        
        courses_counts = courses_query.values('res_course_num').annotate(
            count=Count('res_id')
        ).order_by('res_course_num')
        
        courses_list = [
            {
                'id': item['res_course_num'],
                'name': f"{item['res_course_num']} курс",
                'count': item['count']
            }
            for item in courses_counts
            if item['res_course_num']
        ]
        
        print(f"✅ Курсы: {len(courses_list)}")
        
        # ============================================================
        # КОЛИЧЕСТВО ПРОХОЖДЕНИЙ (ДИНАМИЧЕСКИЙ ПОДСЧЁТ!)
        # ============================================================
        
        attempts_query = base_results
        
        # Применяем фильтры КРОМЕ прохождений
        if selected_institution_ids:
            attempts_query = attempts_query.filter(
                res_participant__part_institution__inst_id__in=selected_institution_ids
            )
        
        if selected_directions:
            attempts_query = attempts_query.filter(
                res_participant__part_spec__spec_name__in=selected_directions
            )
        
        if selected_courses:
            attempts_query = attempts_query.filter(
                res_course_num__in=selected_courses
            )
        
        # Подсчитываем количество замеров для каждого студента
        student_attempts = attempts_query.values('res_participant').annotate(
            attempt_count=Count('res_id')
        )
        
        # Группируем по количеству прохождений
        from collections import defaultdict
        attempts_distribution = defaultdict(int)
        
        for item in student_attempts:
            attempts_distribution[item['attempt_count']] += 1
        
        # ДИНАМИЧЕСКИ определяем максимум
        max_attempts = max(attempts_distribution.keys()) if attempts_distribution else 6
        
        print(f"🔍 Максимальное количество прохождений: {max_attempts}")
        print(f"   Распределение: {dict(attempts_distribution)}")
        
        # Формируем список (сортировка по количеству прохождений)
        test_attempts_list = [
            {
                'id': attempts,
                'name': f"{attempts} прохождение" if attempts == 1 else f"{attempts} прохождения",
                'count': students_count
            }
            for attempts, students_count in sorted(attempts_distribution.items())
        ]
        
        print(f"✅ Прохождений: {len(test_attempts_list)} (от 1 до {max_attempts})")
        
        # Компетенции с русскими названиями
        competencies_data = [
            {"id": "res_comp_info_analysis", "name": "Анализ информации"},
            {"id": "res_comp_planning", "name": "Планирование"},
            {"id": "res_comp_result_orientation", "name": "Ориентация на результат"},
            {"id": "res_comp_stress_resistance", "name": "Стрессоустойчивость"},
            {"id": "res_comp_partnership", "name": "Партнёрство"},
            {"id": "res_comp_rules_compliance", "name": "Соблюдение правил"},
            {"id": "res_comp_self_development", "name": "Саморазвитие"},
            {"id": "res_comp_leadership", "name": "Лидерство"},
            {"id": "res_comp_emotional_intel", "name": "Эмоциональный интеллект"},
            {"id": "res_comp_client_focus", "name": "Клиентоориентированность"},
            {"id": "res_comp_communication", "name": "Коммуникация"},
            {"id": "res_comp_passive_vocab", "name": "Пассивный словарь"},
        ]

        competencies_list = []

        for comp_info in competencies_data:
            comp_field = comp_info["id"]
            
            # Подсчитываем ненулевые значения
            count = Results.objects.exclude(
                Q(**{f"{comp_field}__isnull": True}) | Q(**{comp_field: 0})
            ).count()
            
            competencies_list.append({
                "id": comp_field,
                "name": comp_info["name"],
                "count": count
            })

        print(f"✅ Компетенции: {len(competencies_list)}")


        students_query = Participants.objects.annotate(
            results_count=Count('results')
        ).filter(
            results_count__gt=0
        ).order_by('part_name')[:1000]  # Ограничиваем 1000 для производительности

        students_list = [
            {
                'id': student.part_id,
                'name': f"{student.part_name} (ID: {student.part_id})",
                'count': student.results_count
            }
            for student in students_query
        ]

        print(f"✅ Студенты: {len(students_list)}")

        return successResponse({
            "data": {
                "institutions": institutions_list,
                "directions": directions_list,
                "courses": courses_list,
                "test_attempts": test_attempts_list,
                "competencies": competencies_list,  # ← С count!
                "students": students_list,  # ← ДОБАВЛЕНО!
                "max_attempts": max_attempts
            }
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_filter_options_with_counts: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)
