# Модуль статистики и результатов.

from django.db.models import Q, Count

from collections import defaultdict

from .common import *


# ====== ENDPOINTS ====== #

@method('GET')
@jsonResponse
@csrf_exempt
def courses(request):
    """ Information about course completion for '/admin/courses' page
    """

    selected_institution_ids = list(map(int, selected_institution_ids or []))
    selected_directions = list(map(int, selected_directions or []))

    courses_data = [
        {
            "course_id": course.course_id,
            "participant": {
                "part_id":     course.course_participant.part_id,
                "part_rsv_id":   course.course_participant.part_rsv_id,
                "part_gender": course.course_participant.part_gender,
                "institution": attrIfObj(course.course_participant.part_institution, 'inst_name'),
                "specialty":   attrIfObj(course.course_participant.part_spec,        'spec_name'),
                "edu_level":   attrIfObj(course.course_participant.part_edu_level,   'edu_level_name'),
                "study_form":  attrIfObj(course.course_participant.part_form,        'form_name'),
            },
            **{c: zeroIfNull(getattr(course, c)) for c in CUR.names.keys()}
        }
        for course in Course.objects
            .all()
            .select_related(
                'course_participant', 'course_participant__part_institution', 'course_participant__part_spec',
                'course_participant__part_edu_level', 'course_participant__part_form'
            )
    ]

    return {"courses": courses_data}


@method('GET')
@jsonResponse
@csrf_exempt
def student_results(request):
    """ Get specific participant's results.
    """

    stud_id = request.GET.get('stud_id')

    if not stud_id:
        raise ResponseError("stud_id parameter is required")

    try:
        stud_id = int(stud_id)
    except ValueError:
        raise ResponseError("stud_id must be an integer")

    try:
        participant = Participants.objects                                                  \
            .select_related('part_institution', 'part_spec', 'part_edu_level', 'part_form') \
            .get(part_id=stud_id)
    except Participants.DoesNotExist:
        raise ResponseError("Student not found", status=404)

    results_list = [
        {
            "res_id":             result.res_id,
            "res_year":           result.res_year,
            "res_course_num":     result.res_course_num,
            "res_high_potential": result.res_high_potential,
            "res_summary_report": result.res_summary_report,

            "center":      attrIfObj(result.res_center,      'center_name'),
            "institution": attrIfObj(result.res_institution, 'inst_name'),
            "edu_level":   attrIfObj(result.res_edu_level,   'edu_level_name'),
            "study_form":  attrIfObj(result.res_form,        'form_name'),
            "specialty":   attrIfObj(result.res_spec,        'spec_name'),

            **{c: getattr(result, c)             for c in COMP.names.keys()},
            **{m: zeroIfNull(getattr(result, m)) for m in MOT.names.keys()},
            **{v: getattr(result, v)             for v in VAL.names.keys()},
        }
        for result in Results.objects
            .filter(res_participant=stud_id)
            .select_related(
                'res_center', 'res_institution', 'res_edu_level', 'res_form', 'res_spec'
            )
    ]

    return {
        "student": {
            "stud_id":     participant.part_id,
            "stud_rsv_id":   participant.part_rsv_id,
            "stud_gender": participant.part_gender,
            "institution": attrIfObj(participant.part_institution, 'inst_name'),
            "specialty":   attrIfObj(participant.part_spec,        'spec_name'),
            "edu_level":   attrIfObj(participant.part_edu_level,   'edu_level_name'),
            "study_form":  attrIfObj(participant.part_form,        'form_name'),
            "course_num":  participant.part_course_num
        },
        "results": results_list
    }


@method('GET')
@jsonResponse
@csrf_exempt
def get_institution_directions(request):
    """
    Возвращает направления, которые есть в выбранных институтах.
    Извлекает уникальные пары (institution, direction) из таблицы Results.
    """
    institution_ids = request.GET.getlist('institution_ids') or request.GET.getlist('institution_ids[]')

    # привести к int
    try:
        institution_ids = list(map(int, institution_ids))
    except:
        institution_ids = []

    if not institution_ids:
        directions = Specialties.objects.all().values('spec_id', 'spec_name').order_by('spec_name')
    else:
        directions = Specialties.objects.filter(
            results_set__res_institution_id__in=institution_ids
        ).distinct().values('spec_id', 'spec_name').order_by('spec_name')

    return {
        "status": "success",
        "directions": [
            {"id": d['spec_id'], "name": d['spec_name']}
            for d in directions
        ]
    }


@method('GET')
@jsonResponse
@csrf_exempt
def get_filter_options_with_counts(request):
    """
    Возвращает опции фильтров с количеством записей для каждой.
    С учётом уже выбранных фильтров (cross-filtering).
    
    ВАЖНО: Динамически подсчитывает максимальное количество прохождений!
    """
    selected_institution_ids = request.GET.getlist('institution_ids[]')
    selected_directions =      request.GET.getlist('directions[]')
    selected_courses =         request.GET.getlist('courses[]')
    selected_test_attempts =   request.GET.getlist('test_attempts[]')

    # all filters except the current one
    base_results = Results.objects.select_related(
        'res_institution',
        'res_spec'
    )

    # institutions

    institutions_query = base_results

    if selected_directions:
        institutions_query = institutions_query.filter(
            res_spec__spec_id__in=selected_directions
        )

    if selected_courses:
        institutions_query = institutions_query.filter(res_course_num__in=selected_courses)

    if selected_test_attempts:
        student_attempts = Results.objects \
            .values('res_participant')     \
            .annotate(attempt_count=Count('res_id'))

        attempts_dict = {
            item['res_participant']: item['attempt_count'] 
            for item in student_attempts
        }

        valid_students = [
            student_id 
            for student_id, count in attempts_dict.items()
            if str(count) in selected_test_attempts
        ]

        institutions_query = institutions_query.filter(res_participant__in=valid_students)

    institutions_counts = institutions_query                                                                  \
        .values('res_institution__inst_id', 'res_institution__inst_name') \
        .annotate(count=Count('res_id'))                                                                      \
        .order_by('-count')

    institutions_list = [
        {
            "id":    item['res_institution__inst_id'],
            "name":  item['res_institution__inst_name'],
            "count": item['count']
        }
        for item in institutions_counts
        if item['res_institution__inst_name']
    ]

    # majors

    directions_query = base_results

    if selected_institution_ids:
        directions_query = directions_query.filter(
            res_institution__inst_id__in=selected_institution_ids
        )

    if selected_courses:
        directions_query = directions_query.filter(res_course_num__in=selected_courses)

    if selected_test_attempts:
        student_attempts = Results.objects \
            .values('res_participant')     \
            .annotate(attempt_count=Count('res_id'))

        attempts_dict = {
            item['res_participant']: item['attempt_count'] 
            for item in student_attempts
        }

        valid_students = [
            student_id 
            for student_id, count in attempts_dict.items()
            if str(count) in selected_test_attempts
        ]

        directions_query = directions_query.filter(res_participant__in=valid_students)

    directions_counts = directions_query                 \
        .values('res_spec__spec_id', 'res_spec__spec_name') \
        .annotate(count=Count('res_id'))                 \
        .order_by('-count')

    directions_list = [
        {
            "id":    item['res_spec__spec_id'],
            "name":  item['res_spec__spec_name'],
            "count": item['count']
        }
        for item in directions_counts if item['res_spec__spec_name']
    ]

    # courses

    courses_query = base_results

    if selected_institution_ids:
        courses_query = courses_query.filter(
            res_institution__inst_id__in=selected_institution_ids
        )

    if selected_directions:
        courses_query = courses_query.filter(
            res_spec__spec_id__in=selected_directions
        )

    if selected_test_attempts:
        student_attempts = Results.objects \
            .values('res_participant')     \
            .annotate(attempt_count=Count('res_id'))

        attempts_dict = {
            item['res_participant']: item['attempt_count'] 
            for item in student_attempts
        }

        valid_students = [
            student_id 
            for student_id, count in attempts_dict.items()
            if str(count) in selected_test_attempts
        ]

        courses_query = courses_query.filter(res_participant__in=valid_students)

    courses_counts = courses_query       \
        .values('res_course_num')        \
        .annotate(count=Count('res_id')) \
        .order_by('res_course_num')

    courses_list = [
        {
            "id":    item['res_course_num'],
            "name":  f"{item['res_course_num']} курс",
            "count": item['count']
        }
        for item in courses_counts if item['res_course_num']
    ]

    # test attempts

    attempts_query = base_results

    if selected_institution_ids:
        attempts_query = attempts_query.filter(
            res_institution__inst_id__in=selected_institution_ids
        )

    if selected_directions:
        attempts_query = attempts_query.filter(
            res_spec__spec_id__in=selected_directions
        )

    if selected_courses:
        attempts_query = attempts_query.filter(res_course_num__in=selected_courses)

    student_attempts = attempts_query \
        .values('res_participant')    \
        .annotate(attempt_count=Count('res_id'))

    attempts_distribution = defaultdict(int)

    for item in student_attempts:
        attempts_distribution[item['attempt_count']] += 1

    max_attempts = max(attempts_distribution.keys()) if attempts_distribution else 6

    test_attempts_list = [
        {
            "id":    attempts,
            "name":  f"{attempts} прохождение" if attempts == 1 else f"{attempts} прохождения",
            "count": students_count
        }
        for attempts, students_count in sorted(attempts_distribution.items())
    ]

    # competencies

    competencies_data = [
        {'id': comp, 'name': COMP.names[comp]}
        for comp in COMP.names.keys()
    ]

    competencies_list = [
        {
            'id':    (comp_field := comp_info['id']),
            'name':  comp_info['name'],
            'count': Results.objects
                .exclude(Q(**{f"{comp_field}__isnull": True}) | Q(**{comp_field: 0}))
                .count()
        }
        for comp_info in competencies_data
    ]

    students_query = Participants.objects         \
        .annotate(results_count=Count('results')) \
        .filter(results_count__gt=0)              \
        .order_by('part_rsv_id')[:1000]  # limit by 1000 for performance

    students_list = [
        {
            "id":     student.part_id,
            "rsv_id": f"{student.part_rsv_id} (ID: {student.part_id})",
            "count":  student.results_count
        }
        for student in students_query
    ]

    return {"data": {
        "institutions":  institutions_list,
        "directions":    directions_list,
        "courses":       courses_list,
        "test_attempts": test_attempts_list,
        "competencies":  competencies_list,
        "students":      students_list,
        "max_attempts":  max_attempts
    }}


@method('GET')
@jsonResponse
@csrf_exempt
def centers_by_region(request):
    AVAILABLE_YEARS = '2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026'

    year = request.GET.get('year', '2024/2025')
    if year not in AVAILABLE_YEARS:
        raise ResponseError(f"Invalid year. Available years: {AVAILABLE_YEARS}")

    # Получаем все результаты за выбранный год
    results = Results.objects.filter(res_year=year).select_related('res_center')

    # Считаем количество результатов по центрам
    center_counts = {}
    for result in results:
        if result.res_center:
            center_name = result.res_center.center_name
            center_counts[center_name] = center_counts.get(center_name, 0) + 1

    # Группируем по регионам
    region_stats = {}
    for center_name, count in center_counts.items():
        region = CENTERS_REGIONS.get(center_name)
        if region:  # Игнорируем центры без привязки к региону
            region_stats[region] = region_stats.get(region, 0) + count

    # Формируем данные для карты
    map_data = [
        {'name': region, 'value': count}
        for region, count in region_stats.items()
    ]

    # Находим максимальное значение для шкалы
    max_value = max(region_stats.values()) if region_stats else 0

    return {
        'year': year,
        'data': map_data,
        'max_value': max_value,
        'total_centers': len(region_stats),
        'available_years': AVAILABLE_YEARS
    }
