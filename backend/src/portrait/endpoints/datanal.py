# Модуль анализа данных.

from collections import defaultdict
import numpy as np

from .common import *


# ====== ENDPOINTS ====== #

@method('GET')
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
    try:        
        # Фильтры
        institution_ids =       request.GET.getlist('institution_ids[]')
        directions =            request.GET.getlist('directions[]')
        courses =               request.GET.getlist('courses[]')
        test_attempts =         request.GET.getlist('test_attempts[]')
        selected_competencies = request.GET.getlist('competencies[]')
        student_ids =           request.GET.getlist('student_ids[]')
        
        print(f"\n{'='*60}")
        print(f"📊 get_vam_unified вызван")
        print(f"   Институты: {institution_ids}")
        print(f"   Направления: {directions}")
        print(f"   Курсы: {courses}")
        print(f"   Прохождений: {test_attempts}")
        print(f"   Студенты: {student_ids}")
        print(f"{'='*60}\n")

        # Базовый запрос
        results = Results.objects.select_related(
            "res_participant",
            "res_participant__part_institution",
            "res_participant__part_spec"
        ).exclude(
            res_course_num__isnull=True
        ).order_by(
            "res_participant_id",
            "res_year",
            "res_course_num"
        )

        # Применяем фильтры
        if institution_ids and len(institution_ids) > 0:
            results = results.filter(
                res_participant__part_institution__inst_id__in=institution_ids
            )
        
        if directions and len(directions) > 0:
            results = results.filter(
                res_participant__part_spec__spec_name__in=directions
            )
        
        if courses and len(courses) > 0:
            results = results.filter(res_course_num__in=courses)

        # Фильтр по количеству прохождений
        if test_attempts and len(test_attempts) > 0:
            print(f"🔍 Фильтрация по количеству прохождений: {test_attempts}")
            
            from django.db.models import Count
            
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
                if str(count) in test_attempts
            ]
            
            print(f"✅ Найдено {len(valid_students)} студентов")
            
            results = results.filter(res_participant__in=valid_students)
        
        competencies = list(COMP.names.keys())

        if selected_competencies:
            competencies = [c for c in competencies if c in selected_competencies]

        if student_ids and len(student_ids) > 0:
            # Конвертируем в int, так как part_id это число
            student_ids_int = [int(sid) for sid in student_ids if sid.isdigit()]
            results = results.filter(res_participant__part_id__in=student_ids_int)
            print(f"   → Фильтр: {len(student_ids_int)} студентов")

        results_list = list(results)
        
        print(f"🔍 Найдено {len(results_list)} записей после всех фильтров")

        # ============================================================
        # АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ТИПА АНАЛИЗА
        # ============================================================
        
        # Если выбрано только "1 прохождение" → Cross-Sectional
        if test_attempts == ['1']:
            print("📊 Используем Cross-Sectional VAM (только 1 прохождение)")
            vam_data = calculate_cross_sectional_vam(results_list, competencies)
            analysis_method = "cross_sectional"
        
        # Если выбраны только "2+" прохождения → Longitudinal
        elif test_attempts and all(int(a) >= 2 for a in test_attempts):
            print("📊 Используем Longitudinal VAM (2+ прохождения)")
            vam_data = calculate_longitudinal_vam(results_list, competencies)
            analysis_method = "longitudinal"
        
        # Если смешанные или не выбрано → Mixed (приоритет Longitudinal)
        else:
            print("📊 Используем Mixed VAM (приоритет Longitudinal)")
            vam_data = calculate_longitudinal_vam(results_list, competencies)
            analysis_method = "mixed"
        
        import json
        response_data = json.loads(vam_data.content)
        
        if response_data.get("status") != "success":
            return vam_data
        
        # Группируем данные для графика
        grouped_data = group_vam_for_comparison(
            response_data["data"],
            institution_ids,
            directions
        )
        
        return JsonResponse({
            "status":                "success",
            "data":                  response_data["data"],
            "grouped":               grouped_data,
            "total_students":        response_data.get("total_students", len(response_data["data"])),
            "analysis_method":       analysis_method,  # Для информации на фронте
            "selected_attempts":     test_attempts,
            "selected_competencies": selected_competencies
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_vam_unified: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)


@method('GET')
@csrf_exempt
def vam_summary_statistics(request):
    """
    Сводная статистика для понимания данных и выбора подхода к анализу.
    """
    
    results = Results.objects.select_related(
        "res_participant"
    ).exclude(
        res_course_num__isnull=True
    ).order_by(
        "res_participant_id",
        "res_year"
    )
    
    # Подсчёт замеров по студентам
    student_measurements = defaultdict(int)
    
    for row in results:
        student_measurements[row.res_participant_id] += 1
    
    # Распределение по количеству замеров
    distribution = defaultdict(int)
    for count in student_measurements.values():
        distribution[count] += 1
    
    # Распределение по курсам
    course_distribution = defaultdict(int)
    for row in results:
        course_distribution[row.res_course_num] += 1
    
    # Распределение по годам
    year_distribution = defaultdict(int)
    for row in results:
        year_distribution[row.res_year] += 1
    
    return JsonResponse({
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
    })


@method('GET')
@csrf_exempt
def get_latent_growth(request):
    """
    Получает данные Latent Growth Model (LGM) с фильтрацией.
    ОБНОВЛЕНО: Теперь поддерживает группировку по институтам/направлениям!
    """
    try:
        # Получаем фильтры
        institution_ids =       request.GET.getlist('institution_ids[]')
        directions =            request.GET.getlist('directions[]')
        courses =               request.GET.getlist('courses[]')
        test_attempts =         request.GET.getlist('test_attempts[]')
        selected_competencies = request.GET.getlist('competencies[]')

        print(f"\n{'='*60}")
        print(f"📊 get_latent_growth вызван")
        print(f"   Институты: {institution_ids}")
        print(f"   Направления: {directions}")
        print(f"{'='*60}\n")

        competencies = list(COMP.names.keys())

        if selected_competencies:
            competencies = [c for c in competencies if c in selected_competencies]

        # Базовый запрос
        results = Results.objects.select_related(
            "res_participant",
            "res_participant__part_institution",
            "res_participant__part_spec"
        ).exclude(res_course_num__isnull=True)

        # Применяем фильтры
        if institution_ids:
            results = results.filter(
                res_participant__part_institution__inst_id__in=institution_ids
            )

        if directions:
            results = results.filter(
                res_participant__part_spec__spec_name__in=directions
            )

        if courses:
            results = results.filter(res_course_num__in=courses)

        # Фильтр по количеству прохождений
        if test_attempts:
            from django.db.models import Count
            
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
                if str(count) in test_attempts
            ]
            
            results = results.filter(res_participant__in=valid_students)

        results_list = list(results)
        
        print(f"🔍 Итого записей: {len(results_list)}")

        # ============================================================
        # ОПРЕДЕЛЯЕМ ТИП ГРУППИРОВКИ (как в VAM!)
        # ============================================================
        
        group_by = None
        
        if len(institution_ids) > 0 and len(directions) == 0:
            group_by = 'by_institution'
            print(f"   Группировка: по институтам ({len(institution_ids)})")
        elif len(directions) > 0 and len(institution_ids) == 0:
            group_by = 'by_direction'
            print(f"   Группировка: по направлениям ({len(directions)})")
        elif len(institution_ids) > 0 and len(directions) > 0:
            group_by = 'by_institution_direction'
            print(f"   Группировка: институт + направление")
        else:
            group_by = 'overall'
            print(f"   Группировка: общая")

        # ============================================================
        # ВЫЧИСЛЯЕМ ТРАЕКТОРИИ С ГРУППИРОВКОЙ
        # ============================================================
        
        if group_by == 'overall':
            # Без группировки - как раньше
            growth_data = calculate_population_growth(results_list, competencies)
        else:
            # С группировкой - новая функция!
            growth_data = calculate_grouped_growth(
                results_list, 
                competencies,
                group_by
            )

        # Добавляем метаданные
        if growth_data.get("status") == "success":
            growth_data["group_by"] = group_by
            growth_data["filters_applied"] = {
                "institutions":  len(institution_ids),
                "directions":    len(directions),
                "courses":       len(courses),
                "test_attempts": len(test_attempts),
                "competencies":  len(competencies)
            }

        return JsonResponse(growth_data)

    except Exception as e:
        print(f"❌ Ошибка в get_latent_growth: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)


# ====== UTILITIES ====== #

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
            "participant_name":  participant.part_name if participant else "Unknown",
            "year":              row.res_year,
            "course":            course,
            "mean_vam":          round(mean_vam, 3),
            "vam_by_competency": vam_by_competency,
            "institution_id": (
                participant.part_institution.inst_id
                if participant and participant.part_institution else None
            ),
            "institution_name": (
                participant.part_institution.inst_name
                if participant and participant.part_institution else None
            ),
            "direction": (
                participant.part_spec.spec_name
                if participant and participant.part_spec else None
            ),
            "analysis_type": "cross_sectional"
        })
    
    return JsonResponse({
        "status":         "success",
        "data":           data,
        "total_students": len(data),
        "course_baselines": {
            course: {comp: round(val, 3) for comp, val in baselines.items()}
            for course, baselines in course_baselines.items()
        }
    })


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
                "participant_name":  participant.part_name if participant else "Unknown",
                "from_year":         prev_row.res_year,
                "to_year":           curr_row.res_year,
                "from_course":       prev_row.res_course_num,
                "to_course":         curr_row.res_course_num,
                "mean_vam":          round(mean_vam, 3),
                "vam_by_competency": vam_by_competency,
                "institution_id": (
                    participant.part_institution.inst_id
                    if participant and participant.part_institution else None
                ),
                "institution_name": (
                    participant.part_institution.inst_name
                    if participant and participant.part_institution else None
                ),
                "direction": (
                    participant.part_spec.spec_name
                    if participant and participant.part_spec else None
                ),
                "analysis_type": "longitudinal"
            })
    
    return JsonResponse({
        "status":            "success",
        "data":              data,
        "total_students":    len(grouped),
        "total_transitions": len(data),
        "regression_models": {
            comp: {"a": round(a, 4), "b": round(b, 4)}
            for comp, (a, b) in regression_models.items()
        }
    })


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


def calculate_population_growth(results_list, competencies):
    """
    Latent Growth Model (LGM) - модель скрытого роста.
    Вычисляет средние траектории развития компетенций на уровне популяции.
    
    Возвращает среднее значение каждой компетенции по курсам.
    """
    try:
        from collections import defaultdict
        
        print(f"\n{'='*60}")
        print(f"📊 calculate_population_growth вызван")
        print(f"   Записей: {len(results_list)}")
        print(f"   Компетенций: {len(competencies)}")
        print(f"{'='*60}\n")
        
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
                print(f"   ✅ {comp}: {len(trajectory)} точек данных")
        
        print(f"\n✅ Построены траектории для {len(growth_trajectory)} компетенций")
        
        return {
            "status":             "success",
            "data":               growth_trajectory,
            "model":              "latent_growth",
            "total_records":      len(results_list),
            "competencies_count": len(growth_trajectory)
        }
    
    except Exception as e:
        print(f"❌ Ошибка в calculate_population_growth: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }


def calculate_grouped_growth(results_list, competencies, group_by):
    """
    Вычисляет траектории роста с группировкой по институтам/направлениям.
    Возвращает данные в формате для multi-line графиков.
    """
    try:
        from collections import defaultdict
        
        print(f"\n📊 calculate_grouped_growth: {group_by}")
        
        # Группируем результаты
        groups = defaultdict(list)
        
        for result in results_list:
            # Определяем группу
            if group_by == 'by_institution':
                group_name = result.res_participant.part_institution.inst_name if result.res_participant.part_institution else "Неизвестно"
            elif group_by == 'by_direction':
                group_name = result.res_participant.part_spec.spec_name if result.res_participant.part_spec else "Неизвестно"
            elif group_by == 'by_institution_direction':
                inst = result.res_participant.part_institution.inst_name if result.res_participant.part_institution else "Неизвестно"
                spec = result.res_participant.part_spec.spec_name if result.res_participant.part_spec else "Неизвестно"
                group_name = f"{inst} - {spec}"
            else:
                group_name = "Все"
            
            groups[group_name].append(result)
        
        print(f"   Найдено групп: {len(groups)}")
        for group_name, group_results in list(groups.items())[:3]:
            print(f"   - {group_name}: {len(group_results)} записей")
        
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
        
        print(f"✅ Построены траектории для {len(growth_trajectory)} компетенций")
        
        return {
            "status":        "success",
            "data":          growth_trajectory,
            "model":         "latent_growth",
            "group_by":      group_by,
            "total_records": len(results_list),
            "groups_count":  len(groups)
        }
    
    except Exception as e:
        print(f"❌ Ошибка в calculate_grouped_growth: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }
