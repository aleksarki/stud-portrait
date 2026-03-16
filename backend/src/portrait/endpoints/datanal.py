# Модуль анализа данных.

from collections import defaultdict
import numpy as np

from django.db.models import Count

from .common import *


# ====== ENDPOINTS ====== #

@method('GET')
@jsonResponse
@csrf_exempt
def get_vam_unified(request):
    """
    UNIFIED VAM FUNCTION (вместо Cross-Sectional и Longitudinal)

    ЕДИНЫЙ метод VAM, который автоматически определяет тип анализа
    на основе фильтра "Количество прохождений":
    
    - Если выбрано "1 прохождение" → Cross-Sectional VAM
    - Если выбрано "2+" прохождений → Longitudinal VAM
    - Если не выбрано → Mixed (оба подхода)
    """
    institution_ids =       request.GET.getlist('institution_ids[]')
    directions =            request.GET.getlist('directions[]')
    courses =               request.GET.getlist('courses[]')
    test_attempts =         request.GET.getlist('test_attempts[]')
    selected_competencies = request.GET.getlist('competencies[]')
    student_ids =           request.GET.getlist('student_ids[]')

    results = Results.objects                                                                                 \
        .select_related("res_participant", "res_participant__part_institution", "res_participant__part_spec") \
        .exclude(res_course_num__isnull=True)                                                                 \
        .order_by("res_participant_id", "res_year", "res_course_num")

    if institution_ids and len(institution_ids) > 0:
        results = results.filter(res_participant__part_institution__inst_id__in=institution_ids)
    
    if directions and len(directions) > 0:
        results = results.filter(res_participant__part_spec__spec_name__in=directions)
    
    if courses and len(courses) > 0:
        results = results.filter(res_course_num__in=courses)

    if test_attempts and len(test_attempts) > 0:
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
            if str(count) in test_attempts
        ]

        results = results.filter(res_participant__in=valid_students)

    competencies = list(COMP.names.keys())
    if selected_competencies:
        competencies = [c for c in competencies if c in selected_competencies]

    if student_ids and len(student_ids) > 0:  # convert into int, as part_id is a number
        student_ids_int = [int(sid) for sid in student_ids if sid.isdigit()]
        results = results.filter(res_participant__part_id__in=student_ids_int)

    results_list = list(results)

    # if only selected "1 прохождение" → Cross-Sectional
    if test_attempts == ['1']:  
        vam_data = calculate_cross_sectional_vam(results_list, competencies)
        analysis_method = 'cross_sectional'

    # if only selected "2+" прохождения → Longitudinal
    elif test_attempts and all(int(a) >= 2 for a in test_attempts):  
        vam_data = calculate_longitudinal_vam(results_list, competencies)
        analysis_method = 'longitudinal'

    # if mixed or not selected → Mixed (priority to Longitudinal)
    else:
        vam_data = calculate_longitudinal_vam(results_list, competencies)
        analysis_method = 'mixed'

    if vam_data.get("status") != "success":
        return vam_data

    # group data for graph
    grouped_data = group_vam_for_comparison(vam_data["data"], institution_ids, directions)

    return {
        "status":                "success",
        "data":                  vam_data["data"],
        "grouped":               grouped_data,
        "total_students":        vam_data.get("total_students", len(vam_data["data"])),
        "analysis_method":       analysis_method,
        "selected_attempts":     test_attempts,
        "selected_competencies": selected_competencies
    }


@method('GET')
@jsonResponse
@csrf_exempt
def vam_summary_statistics(request):
    """
    Сводная статистика для понимания данных и выбора подхода к анализу.
    """
    results = Results.objects                 \
        .select_related("res_participant")    \
        .exclude(res_course_num__isnull=True) \
        .order_by("res_participant_id", "res_year")

    student_measurements = defaultdict(int)
    for row in results:
        student_measurements[row.res_participant_id] += 1  # fixme shouldn't it be row.res_participant.part_id ??

    distribution = defaultdict(int)
    for count in student_measurements.values():
        distribution[count] += 1

    course_distribution = defaultdict(int)
    for row in results:
        course_distribution[row.res_course_num] += 1

    year_distribution = defaultdict(int)
    for row in results:
        year_distribution[row.res_year] += 1

    return {
        "status":                    "success",
        "total_students":            len(student_measurements),
        "total_measurements":        sum(student_measurements.values()),
        "measurements_distribution": dict(distribution),
        "longitudinal_eligible":     sum(1 for c in student_measurements.values() if c >= 2),
        "course_distribution":       dict(course_distribution),
        "year_distribution":         dict(year_distribution),
        "recommendation": (
            "Рекомендуем использовать Cross-Sectional VAM, так как только "
            f"{sum(1 for c in student_measurements.values() if c >= 2)} студентов "
            f"({round(100 * sum(1 for c in student_measurements.values() if c >= 2) / len(student_measurements), 1)}%) "
            "имеют повторные замеры для Longitudinal VAM."
        )
    }


@method('GET')
@jsonResponse
@csrf_exempt
def get_latent_growth(request):
    """
    Получает данные Latent Growth Model (LGM) с фильтрацией.
    ОБНОВЛЕНО: Теперь поддерживает группировку по институтам/направлениям!
    """
    institution_ids =       request.GET.getlist('institution_ids[]')
    directions =            request.GET.getlist('directions[]')
    courses =               request.GET.getlist('courses[]')
    test_attempts =         request.GET.getlist('test_attempts[]')
    selected_competencies = request.GET.getlist('competencies[]')

    competencies = list(COMP.names.keys())
    if selected_competencies:
        competencies = [c for c in competencies if c in selected_competencies]

    results = Results.objects                                                                                 \
        .select_related("res_participant", "res_participant__part_institution", "res_participant__part_spec") \
        .exclude(res_course_num__isnull=True)

    if institution_ids:
        results = results.filter(res_participant__part_institution__inst_id__in=institution_ids)

    if directions:
        results = results.filter(res_participant__part_spec__spec_name__in=directions)

    if courses:
        results = results.filter(res_course_num__in=courses)

    if test_attempts:
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
            if str(count) in test_attempts
        ]

        results = results.filter(res_participant__in=valid_students)

    results_list = list(results)

    if len(institution_ids) > 0 and len(directions) == 0:  # group by institutions
        group_by = 'by_institution'
    elif len(directions) > 0 and len(institution_ids) == 0:  # group by majors
        group_by = 'by_direction'
    elif len(institution_ids) > 0 and len(directions) > 0:  # group by institutions & majors
        group_by = 'by_institution_direction'
    else:  # general groupping
        group_by = 'overall'

    if group_by == 'overall':
        growth_data = calculate_population_growth(results_list, competencies)
    else:
        growth_data = calculate_grouped_growth(results_list,  competencies, group_by)

    if growth_data.get("status") == "success":
        growth_data["group_by"] = group_by
        growth_data["filters_applied"] = {
            "institutions":  len(institution_ids),
            "directions":    len(directions),
            "courses":       len(courses),
            "test_attempts": len(test_attempts),
            "competencies":  len(competencies)
        }

    return growth_data


# ====== UTILITIES ====== #

# --- VAM calculation --- #

def calculate_cross_sectional_vam(results_list, competencies):
    """
    Cross-Sectional VAM: Сравнение каждого студента с нормой его курса.
    Работает для ВСЕХ студентов, даже с одним замером.
    """
    # 1. Вычисляем средние значения по курсам (эталон)
    course_means = defaultdict(lambda: {comp: [] for comp in competencies})

    for row in results_list:
        course = row.res_course_num
        for comp in competencies:
            value = getattr(row, comp)
            if value is not None:
                course_means[course][comp].append(float(value))

    # Средние по курсам
    course_baselines = {}
    for course, comp_data in course_means.items():
        course_baselines[course] = {}
        for comp, values in comp_data.items():
            if values:
                course_baselines[course][comp] = np.mean(values)

    # 2. Вычисляем VAM для каждого студента
    data = []
    for row in results_list:
        course = row.res_course_num
        participant = row.res_participant

        if course not in course_baselines:
            continue

        vam_by_competency = {}
        vam_values = []

        for comp in competencies:
            actual = getattr(row, comp)

            if actual is None or comp not in course_baselines[course]:
                continue

            expected = course_baselines[course][comp]
            vam = float(actual) - expected

            vam_by_competency[comp] = round(vam, 3)
            vam_values.append(vam)

        if not vam_values:
            continue

        mean_vam = np.mean(vam_values)

        data.append({
            "participant_id":    row.res_participant_id,
            "rsv_id":            participant.part_rsv_id if participant else "Unknown",
            "year":              row.res_year,
            "course":            course,
            "mean_vam":          round(mean_vam, 3),
            "vam_by_competency": vam_by_competency,
            "institution_id":    attrIfObj(attrIfObj(participant, 'part_institution'), 'inst_id'),
            "institution_name":  attrIfObj(attrIfObj(participant, 'part_institution'), 'inst_name'),
            "direction":         attrIfObj(attrIfObj(participant, 'part_spec'),        'spec_name'),
            "analysis_type":     "cross_sectional"
        })

    return {
        "status":         "success",
        "data":           data,
        "total_students": len(data),
        "course_baselines": {
            course: {comp: round(val, 3) for comp, val in baselines.items()}
            for course, baselines in course_baselines.items()
        }
    }


def calculate_longitudinal_vam(results_list, competencies):
    """
    Longitudinal VAM: Отслеживание личного прогресса студентов.
    Работает только для студентов с несколькими замерами.
    """
    # Группировка по студентам
    grouped = defaultdict(list)
    for row in results_list:
        grouped[row.res_participant_id].append(row)

    # Фильтруем только студентов с 2+ замерами
    grouped = {k: v for k, v in grouped.items() if len(v) >= 2}

    # Строим регрессионные модели
    regression_data = {comp: {"x": [], "y": []} for comp in competencies}

    for rows in grouped.values():
        for i in range(1, len(rows)):
            prev_row = rows[i - 1]
            curr_row = rows[i]

            for comp in competencies:
                prev_score = getattr(prev_row, comp)
                curr_score = getattr(curr_row, comp)

                if prev_score is not None and curr_score is not None:
                    regression_data[comp]["x"].append(float(prev_score))
                    regression_data[comp]["y"].append(float(curr_score))

    # Вычисляем коэффициенты регрессии
    regression_models = {}

    for comp in competencies:
        X = regression_data[comp]["x"]
        Y = regression_data[comp]["y"]

        if len(X) < 5:
            continue

        n = len(X)
        mean_x = np.mean(X)
        mean_y = np.mean(Y)

        numerator = sum((X[i] - mean_x) * (Y[i] - mean_y) for i in range(n))
        denominator = sum((X[i] - mean_x) ** 2 for i in range(n))

        if denominator == 0:
            continue

        a = numerator / denominator
        b = mean_y - a * mean_x

        regression_models[comp] = (a, b)

    # Вычисляем VAM для каждого студента
    data = []
    for participant_id, rows in grouped.items():
        participant = rows[0].res_participant

        for i in range(1, len(rows)):
            prev_row = rows[i - 1]
            curr_row = rows[i]

            vam_by_competency = {}
            vam_values = []

            for comp in competencies:
                if comp not in regression_models:
                    continue

                prev_score = getattr(prev_row, comp)
                curr_score = getattr(curr_row, comp)

                if prev_score is None or curr_score is None:
                    continue

                a, b = regression_models[comp]
                predicted = a * float(prev_score) + b
                vam = float(curr_score) - predicted

                vam_by_competency[comp] = round(vam, 3)
                vam_values.append(vam)

            if not vam_values:
                continue

            mean_vam = np.mean(vam_values)

            data.append({
                "participant_id":    participant_id,
                "rsv_id":  participant.part_rsv_id if participant else "Unknown",
                "from_year":         prev_row.res_year,
                "to_year":           curr_row.res_year,
                "from_course":       prev_row.res_course_num,
                "to_course":         curr_row.res_course_num,
                "mean_vam":          round(mean_vam, 3),
                "vam_by_competency": vam_by_competency,
                "institution_id":    attrIfObj(attrIfObj(participant, 'part_institution'), 'inst_id'),
                "institution_name":  attrIfObj(attrIfObj(participant, 'part_institution'), 'inst_name'),
                "direction":         attrIfObj(attrIfObj(participant, 'part_spec'),        'spec_name'),
                "analysis_type":     "longitudinal"
            })

    return {
        "status":            "success",
        "data":              data,
        "total_students":    len(grouped),
        "total_transitions": len(data),
        "regression_models": {
            comp: {"a": round(a, 4), "b": round(b, 4)}
            for comp, (a, b) in regression_models.items()
        }
    }

# --- other --- #

def group_vam_for_comparison(data, institution_ids, directions):
    """
    Группирует VAM данные для построения нескольких линий на графике.
    
    Возвращает:
    {
        "by_institution": {
            "МГУ": {1: [vam1, vam2, ...], 2: [vam3, vam4, ...], ...},
            "СПбГУ": {1: [...], 2: [...], ...}
        },
        "by_direction": {
            "Информатика": {1: [...], 2: [...], ...},
            "Математика": {1: [...], 2: [...], ...}
        }
    }
    """

    grouped = {
        "by_institution":           defaultdict(lambda: defaultdict(list)),
        "by_direction":             defaultdict(lambda: defaultdict(list)),
        "by_institution_direction": defaultdict(lambda: defaultdict(list))
    }

    for item in data:
        course =      item.get("course") or item.get("to_course")
        vam =         item.get("mean_vam", 0)
        institution = item.get("institution_name", "Неизвестно")
        direction =   item.get("direction", "Неизвестно")

        if course:
            # Группируем по институту
            grouped["by_institution"][institution][course].append(vam)

            # Группируем по направлению
            grouped["by_direction"][direction][course].append(vam)

            # Группируем по комбинации институт+направление
            key = f"{institution} - {direction}"
            grouped["by_institution_direction"][key][course].append(vam)

    # Вычисляем средние значения
    result = {
        "by_institution": {},
        "by_direction": {},
        "by_institution_direction": {}
    }

    for inst, courses_data in grouped["by_institution"].items():
        result["by_institution"][inst] = {
            course: round(sum(vams) / len(vams), 2) if vams else 0
            for course, vams in courses_data.items()
        }

    for dir, courses_data in grouped["by_direction"].items():
        result["by_direction"][dir] = {
            course: round(sum(vams) / len(vams), 2) if vams else 0
            for course, vams in courses_data.items()
        }

    for key, courses_data in grouped["by_institution_direction"].items():
        result["by_institution_direction"][key] = {
            course: round(sum(vams) / len(vams), 2) if vams else 0
            for course, vams in courses_data.items()
        }

    return result

# --- LGM calculation --- #

def calculate_population_growth(results_list, competencies):
    """
    Latent Growth Model (LGM) - модель скрытого роста.
    Вычисляет средние траектории развития компетенций на уровне популяции.
    
    Возвращает среднее значение каждой компетенции по курсам.
    """
    # Группируем по курсам
    by_course = defaultdict(lambda: defaultdict(list))

    for result in results_list:
        course = result.res_course_num
        if not course:
            continue

        for comp in competencies:
            value = getattr(result, comp, None)
            if value is not None:
                by_course[course][comp].append(value)

    # Вычисляем средние для каждого курса
    growth_trajectory = {}

    for comp in competencies:
        trajectory = []

        for course in sorted(by_course.keys()):
            if comp in by_course[course] and len(by_course[course][comp]) > 0:
                values = by_course[course][comp]
                avg = sum(values) / len(values)
                trajectory.append({
                    "course": course,
                    "mean": round(avg, 2),
                    "count": len(values)
                })

        if trajectory:  # Только если есть данные
            growth_trajectory[comp] = trajectory

    return {
        "status":             "success",
        "data":               growth_trajectory,
        "model":              "latent_growth",
        "total_records":      len(results_list),
        "competencies_count": len(growth_trajectory)
    }


def calculate_grouped_growth(results_list, competencies, group_by):
    """
    Вычисляет траектории роста с группировкой по институтам/направлениям.
    Возвращает данные в формате для multi-line графиков.
    """
    # Группируем результаты
    groups = defaultdict(list)

    for result in results_list:
        # Определяем группу
        if group_by == 'by_institution':
            group_name = result.res_participant.part_institution.inst_name if result.res_participant.part_institution else "Неизвестно"
        elif group_by == 'by_direction':
            group_name = result.res_participant.part_spec.spec_name        if result.res_participant.part_spec        else "Неизвестно"
        elif group_by == 'by_institution_direction':
            inst = result.res_participant.part_institution.inst_name       if result.res_participant.part_institution else "Неизвестно"
            spec = result.res_participant.part_spec.spec_name              if result.res_participant.part_spec        else "Неизвестно"
            group_name = f"{inst} - {spec}"
        else:
            group_name = "Все"

        groups[group_name].append(result)

    # Вычисляем траектории для каждой компетенции
    growth_trajectory = {}

    for comp in competencies:
        comp_data = {}

        # Для каждой группы вычисляем траекторию
        for group_name, group_results in groups.items():
            by_course = defaultdict(list)

            for result in group_results:
                course = result.res_course_num
                if not course:
                    continue

                value = getattr(result, comp, None)
                if value is not None:
                    by_course[course].append(value)

            # Вычисляем средние по курсам
            trajectory = []
            for course in sorted(by_course.keys()):
                if by_course[course]:
                    values = by_course[course]
                    avg = sum(values) / len(values)
                    trajectory.append({
                        "course": course,
                        "mean": round(avg, 2),
                        "count": len(values)
                    })

            if trajectory:
                comp_data[group_name] = trajectory

        if comp_data:
            growth_trajectory[comp] = comp_data

    return {
        "status":        "success",
        "data":          growth_trajectory,
        "model":         "latent_growth",
        "group_by":      group_by,
        "total_records": len(results_list),
        "groups_count":  len(groups)
    }
