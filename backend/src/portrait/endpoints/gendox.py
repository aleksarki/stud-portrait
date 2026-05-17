from collections import defaultdict
from datetime import datetime
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt, Inches, RGBColor, Cm

from .common import *
from .genutils import *
from ..mlmodel import MlModel


# ! ================================================== ENDPOINTS =================================================== ! #

@method(GET)
@httpResponse
@csrf_exempt
def generate_docx_resume(request):
    """ Generate professional Docx resume.
    """
    student_id = request.GET.get('student_id')
    with_ai = request.GET.get('with_ai', 'true').lower() == 'true'

    if not student_id:
        raise ResponseError("Missing student_id")

    # данные студента
    try:
        participant = Participants.objects                                                      \
            .select_related(TPART.INSTITUTION, TPART.EDU_SPEC, TPART.EDU_FORM, TPART.EDU_LEVEL) \
            .get(**{TPART.ID: student_id})
    except Participants.DoesNotExist:
        raise ResponseError(f"Participant {student_id} not found", status=404)

    # последние результаты для компетенций
    latest_result = Results.objects                       \
        .filter(**{TRES.PARTICIPANT: participant})        \
        .order_by(desc(TRES.YEAR), desc(TRES.COURSE_NUM)) \
        .first()

    # данные для ИИ
    competencies_dict = {}
    student_info = {
        'direction': participant.part_spec.spec_name if participant.part_spec else '',
        'course':    participant.part_course_num or 1,
        'form':      participant.part_form.form_name if participant.part_form else '',
        'level':     participant.part_edu_level.edu_level_name if participant.part_edu_level else ''
    }

    # Список компетенций в порядке, который используется в genutils
    # fixme why the order??????????
    competencies_order = [
        'res_comp_leadership', 'res_comp_communication', 'res_comp_self_development',
        'res_comp_result_orientation', 'res_comp_stress_resistance', 'res_comp_client_focus',
        'res_comp_planning', 'res_comp_info_analysis', 'res_comp_partnership',
        'res_comp_rules_compliance', 'res_comp_emotional_intel', 'res_comp_passive_vocab'
    ]

    if latest_result:
        for comp in competencies_order:
            score = getattr(latest_result, comp, None)
            if score and score > 0:
                competencies_dict[COMP.names[comp]] = score

    # Генерация ИИ-интерпретации, если включено и есть данные
    ai_text = None
    if with_ai and competencies_dict:
        try:
            ai_text = generate_general_interpretation_with_ai(student_info, competencies_dict)
            # Ограничим длину для резюме (не более 3 предложений)
            if ai_text and len(ai_text) > 300:
                ai_text = ai_text[:300] + '...'  # fixme this is preposterous
        except:
            ai_text = None

    doc = Document()

    # Настройка полей (стандартные для резюме)
    sections = doc.sections
    for section in sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2)

    # ============================================================
    # ШАПКА РЕЗЮМЕ
    # ============================================================

    # ФИО (крупным жирным шрифтом)
    name_para = doc.add_paragraph()
    name_run = name_para.add_run('ФИО')
    name_run.font.size = Pt(20)
    name_run.font.bold = True
    name_run.font.color.rgb = RGBColor(0, 0, 0)
    name_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_para.space_after = Pt(6)

    # Должность
    position_para = doc.add_paragraph()
    position_run = position_para.add_run('Резюме на должность')
    position_run.font.size = Pt(14)
    position_run.font.color.rgb = RGBColor(80, 80, 80)
    position_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    position_para.space_after = Pt(8)

    # Контакты
    contact_para = doc.add_paragraph()
    contact_run = contact_para.add_run('Телефон: +7 (ХХХ) ХХХ-ХХ-ХХ\nEmail: email@example.com')
    contact_run.font.size = Pt(11)
    contact_run.font.color.rgb = RGBColor(100, 100, 100)
    contact_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    contact_para.space_after = Pt(18)

    # ============================================================
    # ЛИЧНАЯ ИНФОРМАЦИЯ
    # ============================================================

    heading = doc.add_heading('ЛИЧНАЯ ИНФОРМАЦИЯ', level=1)
    heading.runs[0].font.size = Pt(14)
    heading.runs[0].font.color.rgb = RGBColor(0, 70, 140)
    heading.space_after = Pt(10)

    gender = format_gender(participant.part_gender)
    edu_level = participant.part_edu_level.edu_level_name if participant.part_edu_level else 'Не указано'

    info_items = [
        f"Место проживания:",
        f"Образование: {edu_level}",
        f"Дата рождения: дд.мм.гггг",
        f"Пол: {gender}"
    ]

    for item in info_items:
        p = doc.add_paragraph(item, style='List Bullet')
        p.paragraph_format.left_indent = Inches(0.25)
        p.runs[0].font.size = Pt(11)
        p.space_after = Pt(4)

    doc.add_paragraph().space_after = Pt(6)

    # ============================================================
    # ОПЫТ РАБОТЫ
    # ============================================================

    heading = doc.add_heading('ОПЫТ РАБОТЫ', level=1)
    heading.runs[0].font.size = Pt(14)
    heading.runs[0].font.color.rgb = RGBColor(0, 70, 140)
    heading.space_after = Pt(10)

    # Пустые строки для заполнения студентом
    for _ in range(4):
        p = doc.add_paragraph()
        p.add_run('_' * 100).font.color.rgb = RGBColor(200, 200, 200)
        p.space_after = Pt(8)

    doc.add_paragraph().space_after = Pt(6)

    # ============================================================
    # ОБРАЗОВАНИЕ
    # ============================================================

    heading = doc.add_heading('ОБРАЗОВАНИЕ', level=1)
    heading.runs[0].font.size = Pt(14)
    heading.runs[0].font.color.rgb = RGBColor(0, 70, 140)
    heading.space_after = Pt(10)

    edu_items = [
        f"Уровень образования: {edu_level}",
        f"Учебное заведение: {participant.part_institution.inst_name if participant.part_institution else 'Не указано'}",
        f"Год окончания: ____________________",
        f"Специальность: {participant.part_spec.spec_name if participant.part_spec else 'Не указано'}",
        f"Форма обучения: {participant.part_form.form_name if participant.part_form else 'Не указана'}"
    ]

    for item in edu_items:
        p = doc.add_paragraph(item, style='List Bullet')
        p.paragraph_format.left_indent = Inches(0.25)
        p.runs[0].font.size = Pt(11)
        p.space_after = Pt(4)

    doc.add_paragraph().space_after = Pt(6)

    # ============================================================
    # ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ (с ИИ-интерпретацией)
    # ============================================================

    heading = doc.add_heading('ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ', level=1)
    heading.runs[0].font.size = Pt(14)
    heading.runs[0].font.color.rgb = RGBColor(0, 70, 140)
    heading.space_after = Pt(10)

    # Если есть AI-текст, добавляем его как выделенный абзац
    if ai_text:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.space_after = Pt(8)
        run = p.add_run("Характеристика по результатам диагностики: ")
        run.font.bold = True
        run.font.size = Pt(11)
        run = p.add_run(ai_text)
        run.font.size = Pt(11)
        run.font.italic = True
        run.font.color.rgb = RGBColor(60, 60, 60)
        doc.add_paragraph().space_after = Pt(6)

    # Остальные поля для заполнения (языки, навыки и т.д.)
    additional_info_items = [
        'Иностранные языки: _______________________________________________',
        'Компьютерные навыки: _______________________________________________',
        'Наличие водительских прав (категории): _______________________________________________',
        'Наличие медицинской книжки: _______________________________________________',
        'Занятия в свободное время: _______________________________________________',
        'Личные качества: _______________________________________________'
    ]

    for item in additional_info_items:
        p = doc.add_paragraph(item, style='List Bullet')
        p.paragraph_format.left_indent = Inches(0.25)
        p.runs[0].font.size = Pt(11)
        p.space_after = Pt(6)

    # Примечание для "Личные качества"
    note_para = doc.add_paragraph()
    note_para.paragraph_format.left_indent = Inches(0.5)
    note_run = note_para.add_run(
        'Примечание: В разделе "Личные качества" укажите ваши профессиональные качества, '
        'такие как ответственность, коммуникабельность, стрессоустойчивость, '
        'целеустремлённость и т.д.'
    )
    note_run.font.size = Pt(9)
    note_run.font.italic = True
    note_run.font.color.rgb = RGBColor(120, 120, 120)
    note_para.space_after = Pt(12)

    # ============================================================
    # ПОДВАЛ
    # ============================================================

    footer_para = doc.add_paragraph()
    footer_run = footer_para.add_run(
        f'Дата формирования резюме: {datetime.now().strftime("%d.%m.%Y")}'
    )
    footer_run.font.size = Pt(9)
    footer_run.font.color.rgb = RGBColor(150, 150, 150)
    footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    return docxResponse(doc, f"Резюме.docx")


@method(GET)
@jsonResponse
@csrf_exempt
def get_student_resume_data(request):
    student_id = request.GET.get('student_id')
    year = request.GET.get('year')
    with_ai = request.GET.get('with_ai', 'true').lower() == 'true'

    if not student_id:
        raise ResponseError("student_id required")

    participant = Participants.objects                                                      \
        .select_related(TPART.INSTITUTION, TPART.EDU_SPEC, TPART.EDU_FORM, TPART.EDU_LEVEL) \
        .get(**{TPART.ID: student_id})

    results = Results.objects.filter(**{TRES.PARTICIPANT: participant})
    if year:
        results = results.filter(**{TRES.YEAR: year})
    results = results.order_by(desc(TRES.YEAR), desc(TRES.COURSE_NUM))

    if not results.exists():
        raise ResponseError("No results")

    latest_result = results.first()

    resume_data = {
        'personal_info': {
            'name':       participant.part_rsv_id or '',
            'gender':     participant.part_gender or '',
            'student_id': student_id
        },
        'education': {
            'institution': participant.part_institution.inst_name if participant.part_institution else '',
            'direction':   participant.part_spec.spec_name if participant.part_spec else '',
            'form':        participant.part_form.form_name if participant.part_form else '',
            'level':       participant.part_edu_level.edu_level_name if participant.part_edu_level else '',
            'course':      participant.part_course_num
        },
        'competencies': [],
        'generated_at': datetime.now().isoformat(),
        'year':         year or latest_result.res_year
    }

    # fixme why the order??????????
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

    # Для каждой компетенции используем ТОЛЬКО шаблонные интерпретации (без ИИ)
    for comp_field in competencies_order:
        score = getattr(latest_result, comp_field, None)
        if not score or score == 0:
            continue
        comp_name = COMP.names[comp_field]
        course = latest_result.res_course_num or 1
        prediction = predict_competency_level(score, course, [s for cf, s in all_scores.items() if cf != comp_field])
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
                'emoji':           get_level_emoji(prediction['level']),
                'color':           get_level_color(prediction['level']),
                'interpretation':  generate_interpretation(score, prediction['level'], comp_name, course, prediction['percentile']),
                'recommendations': generate_recommendations(comp_field, prediction['level'], course)
            }
        }
        resume_data['competencies'].append(comp_data)

    # Общая интерпретация (ИИ)
    if with_ai:
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


@method(GET)
@httpResponse
@csrf_exempt
def generate_geography_report(request):
    """ Generate Word report about the geography of the testing.
    """
    year = request.GET.get('year', '2024/2025')
    available_years = ['2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026']

    if year not in available_years:
        year = '2024/2025'

    doc = Document()

    # Заголовок
    title = doc.add_heading(f'Отчёт о географии тестирования', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Подзаголовок с датой
    date_paragraph = doc.add_paragraph(f'Дата формирования: {datetime.now().strftime("%d.%m.%Y %H:%M")}')
    date_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph(f'Учебный год: {year}')
    doc.add_paragraph()

    # ========== 1. ГЕОГРАФИЯ ЦЕНТРОВ КОМПЕТЕНЦИЙ ==========
    doc.add_heading('1. География центров компетенций', level=1)

    # Получаем данные по центрам
    results = Results.objects        \
        .filter(**{TRES.YEAR: year}) \
        .select_related(TRES.CENTER)

    center_counts = defaultdict(int)
    for result in results:
        if result.res_center:
            center_name = result.res_center.center_name
            center_counts[center_name] += 1

    # Группируем по регионам
    region_stats = defaultdict(int)
    center_region_map = {}

    for center_name, count in center_counts.items():
        region = CENTERS_REGIONS.get(center_name)
        if region:
            region_stats[region] += count
            if region not in center_region_map:
                center_region_map[region] = []
            center_region_map[region].append(center_name)

    # Таблица регионов
    doc.add_heading('Распределение центров по регионам:', level=2)
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Заголовки таблицы
    header_cells = table.rows[0].cells
    header_cells[0].text = 'Регион'
    header_cells[1].text = 'Количество центров'
    header_cells[2].text = 'Процент от общего числа'

    total_regions = sum(region_stats.values())

    for region, count in sorted(region_stats.items(), key=lambda x: x[1], reverse=True):
        row_cells = table.add_row().cells
        row_cells[0].text = region
        row_cells[1].text = str(count)
        percent = round(count / total_regions * 100, 1) if total_regions > 0 else 0
        row_cells[2].text = f'{percent}%'

    doc.add_paragraph()

    # Список центров по регионам
    doc.add_heading('Центры компетенций по регионам:', level=2)
    for region, centers in sorted(center_region_map.items(), key=lambda x: x[0]):
        doc.add_paragraph(region)
        for center in centers:
            doc.add_paragraph(center, style='List Bullet')

    doc.add_page_break()

    # ========== 2. СТАТИСТИКА ПО ГОДАМ ==========
    doc.add_heading('2. Динамика по годам', level=1)

    yearly_stats = []
    for yr in available_years:
        yr_results = Results.objects.filter(**{TRES.YEAR: yr})
        yr_centers = set()
        for res in yr_results:
            if res.res_center:
                yr_centers.add(res.res_center.center_name)
        yearly_stats.append({
            'year': yr,
            'total_results': yr_results.count(),
            'unique_centers': len(yr_centers)
        })

    # Таблица динамики
    doc.add_heading('Динамика тестирования по годам:', level=2)
    table = doc.add_table(rows=1, cols=4)
    table.style = 'Table Grid'

    header_cells = table.rows[0].cells
    header_cells[0].text = 'Учебный год'
    header_cells[1].text = 'Всего тестирований'
    header_cells[2].text = 'Уникальных центров'
    header_cells[3].text = 'Динамика тестирований'

    prev_total = None
    for stat in yearly_stats:
        row_cells = table.add_row().cells
        row_cells[0].text = stat['year']
        row_cells[1].text = str(stat['total_results'])
        row_cells[2].text = str(stat['unique_centers'])

        if prev_total is not None and prev_total > 0:
            growth = round((stat['total_results'] - prev_total) / prev_total * 100, 1)
            growth_text = f'+{growth}%' if growth > 0 else f'{growth}%'
            row_cells[3].text = growth_text
        else:
            row_cells[3].text = '-'

        prev_total = stat['total_results']

    doc.add_paragraph()

    # ========== 3. ГЕОГРАФИЯ СТУДЕНТОВ ==========
    doc.add_heading('3. География студентов', level=1)

    # Получаем данные о студентах
    students_data = []
    for result in results:
        participant = result.res_participant
        if participant and participant.part_institution:
            students_data.append({
                'student_id': participant.part_rsv_id,
                'institution': participant.part_institution.inst_name,
                'specialty': participant.part_spec.spec_name if participant.part_spec else None,
                'course': participant.part_course_num
            })

    # Группировка по вузам
    institution_stats = defaultdict(int)
    for student in students_data:
        institution_stats[student['institution']] += 1

    doc.add_heading('Распределение студентов по учебным заведениям:', level=2)
    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'

    header_cells = table.rows[0].cells
    header_cells[0].text = 'Учебное заведение'
    header_cells[1].text = 'Количество студентов'
    header_cells[2].text = 'Процент'

    total_students = len(students_data)
    for inst, count in sorted(institution_stats.items(), key=lambda x: x[1], reverse=True)[:20]:
        row_cells = table.add_row().cells
        row_cells[0].text = inst
        row_cells[1].text = str(count)
        percent = round(count / total_students * 100, 1) if total_students > 0 else 0
        row_cells[2].text = f'{percent}%'

    doc.add_paragraph()

    # ========== 4. РАСПРЕДЕЛЕНИЕ ПО КУРСАМ ==========
    doc.add_heading('4. Распределение по курсам', level=1)

    course_stats = defaultdict(int)
    for student in students_data:
        if student['course']:
            course_stats[student['course']] += 1

    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'

    header_cells = table.rows[0].cells
    header_cells[0].text = 'Курс'
    header_cells[1].text = 'Количество студентов'
    header_cells[2].text = 'Процент'

    for course in sorted(course_stats.keys()):
        row_cells = table.add_row().cells
        row_cells[0].text = f'{course} курс'
        row_cells[1].text = str(course_stats[course])
        percent = round(course_stats[course] / total_students * 100, 1) if total_students > 0 else 0
        row_cells[2].text = f'{percent}%'

    doc.add_page_break()

    # ========== 5. РАСПРЕДЕЛЕНИЕ ПО СПЕЦИАЛЬНОСТЯМ ==========
    doc.add_heading('5. Топ-20 направлений подготовки', level=1)

    specialty_stats = defaultdict(int)
    for student in students_data:
        if student['specialty']:
            specialty_stats[student['specialty']] += 1

    table = doc.add_table(rows=1, cols=3)
    table.style = 'Table Grid'

    header_cells = table.rows[0].cells
    header_cells[0].text = 'Направление подготовки'
    header_cells[1].text = 'Количество студентов'
    header_cells[2].text = 'Процент'

    for specialty, count in sorted(specialty_stats.items(), key=lambda x: x[1], reverse=True)[:20]:
        row_cells = table.add_row().cells
        row_cells[0].text = specialty
        row_cells[1].text = str(count)
        percent = round(count / total_students * 100, 1) if total_students > 0 else 0
        row_cells[2].text = f'{percent}%'

    doc.add_paragraph()

    # ========== 6. ИТОГОВАЯ СТАТИСТИКА ==========
    doc.add_heading('6. Итоговая статистика', level=1)

    stats_paragraph = doc.add_paragraph()
    stats_paragraph.add_run(f'• Всего тестирований за {year}: ').bold = True
    stats_paragraph.add_run(f'{len(results)}\n')

    stats_paragraph.add_run(f'• Всего уникальных центров компетенций: ').bold = True
    stats_paragraph.add_run(f'{len(center_counts)}\n')

    stats_paragraph.add_run(f'• Всего регионов с центрами: ').bold = True
    stats_paragraph.add_run(f'{len(region_stats)}\n')

    stats_paragraph.add_run(f'• Всего студентов: ').bold = True
    stats_paragraph.add_run(f'{total_students}\n')

    stats_paragraph.add_run(f'• Всего учебных заведений: ').bold = True
    stats_paragraph.add_run(f'{len(institution_stats)}\n')

    return docxResponse(doc, f"geography_report_{year}.docx")


# ! ================================================== UTILITIES =================================================== ! #

def format_gender(gender_code):
    """Преобразует код пола в читаемый формат."""
    if not gender_code:
        return "Не указан"
    gender_map = {
        'м': 'Мужской',
        'М': 'Мужской',
        'ж': 'Женский',
        'Ж': 'Женский'
    }
    return gender_map.get(gender_code.lower(), gender_code)


def generate_general_interpretation_with_ai(student_info, competencies_dict):
    # Сортируем компетенции (общая логика для обоих случаев)
    sorted_comps = sorted(competencies_dict.items(), key=lambda x: x[1], reverse=True)
    strong = [name for name, _ in sorted_comps[:2]]
    weak = [name for name, _ in sorted_comps[-2:]]

    # Если модель недоступна — возвращаем шаблонную заглушку
    if not MlModel.AVAILABLE:
        return (
            f"Студент демонстрирует сильные стороны в области {', '.join(strong)}. "
            f"Рекомендуется обратить внимание на развитие {', '.join(weak)}."
        )

    # Формируем промпт с использованием strong/weak
    prompt = (
        f"Ты — карьерный консультант. Напиши краткую характеристику студента, используя только данные о компетенциях. "
        f"Не добавляй никакой информации о внешности, возрасте или личных качествах, не указанных в данных.\n\n"
        f"Курс: {student_info.get('course', 'X')}\n"
        f"Направление: {student_info.get('direction', 'не указано')}\n"
        f"Сильные стороны (наиболее высокие баллы): {', '.join(strong)}\n"
        f"Зоны роста (наиболее низкие баллы): {', '.join(weak)}\n\n"
        f"Характеристика (2-3 предложения):"
    )

    text = MlModel.generate(prompt, max_length=150, temperature=0.6, top_p=0.85)

    # Если ответ пустой или содержит признаки галлюцинаций — возвращаем заглушку
    if not text or any(phrase in text.lower() for phrase in ['внешность', 'возраст', 'рост', 'характер', 'build']):
        return (f"Студент демонстрирует сильные стороны в области {', '.join(strong[:2])}. "
                f"Рекомендуется обратить внимание на развитие {', '.join(weak[:2])}.")

    # Очистка от лишних символов
    text = text.split('\n')[0].strip()
    if text.endswith(','):
        text = text[:-1]
    return text
