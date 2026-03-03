
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
import numpy as np
from collections import defaultdict

from .models import (
    Participants, Competencecenters as CompetenceCenters, Institutions,
    Educationlevels, Studyforms, Specialties,
    Results, Course, Academicperformance
)

# Create your views here.

successResponse = lambda d: JsonResponse({**{"status": "success"}, **d})
errorResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=400)
notFoundResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=404)
notAllowedResponse = lambda: JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
exceptionResponse = lambda e: JsonResponse({"status": "error", "message": str(e)}, status=500)


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


@csrf_exempt
def value_added_improved(request):
    """
    Улучшенная модель Value-Added для анализа развития компетенций.
    
    Поддерживает два подхода:
    1. Cross-sectional VAM - для всех студентов (сравнение с нормой курса)
    2. Longitudinal VAM - для студентов с повторными замерами (личный прогресс)
    """
    
    session_id = request.GET.get("session_id")
    institution_id = request.GET.get("institution")
    direction_name = request.GET.get("direction")
    course_filter = request.GET.get("course")
    analysis_type = request.GET.get("type", "cross_sectional")  # или "longitudinal"

    # Компетенции
    competencies = [
        "res_comp_leadership",
        "res_comp_communication", 
        "res_comp_self_development",
        "res_comp_result_orientation",
        "res_comp_stress_resistance",
        "res_comp_client_focus",
        "res_comp_planning",
        "res_comp_info_analysis",
        "res_comp_partnership",
        "res_comp_rules_compliance",
        "res_comp_emotional_intel",
        "res_comp_passive_vocab"
    ]

    # Загрузка данных
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

    # Фильтрация
    if institution_id:
        results = results.filter(
            res_participant__part_institution__inst_id=institution_id
        )
    if direction_name:
        results = results.filter(
            res_participant__part_spec__spec_name=direction_name
        )
    if course_filter:
        results = results.filter(res_course_num=course_filter)

    results_list = list(results)

    # ========================================
    # CROSS-SECTIONAL VAM (для всех студентов)
    # ========================================
    if analysis_type == "cross_sectional":
        return calculate_cross_sectional_vam(results_list, competencies)
    
    # ========================================
    # LONGITUDINAL VAM (только повторные замеры)
    # ========================================
    elif analysis_type == "longitudinal":
        return calculate_longitudinal_vam(results_list, competencies)
    
    # ========================================
    # COMPARISON (сравнение групп)
    # ========================================
    elif analysis_type == "comparison":
        return calculate_comparison_vam(results_list, competencies)

    return JsonResponse({"status": "error", "message": "Invalid analysis type"})


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
            "participant_id": row.res_participant_id,
            "participant_name": participant.part_name if participant else "Unknown",
            "year": row.res_year,
            "course": course,
            "mean_vam": round(mean_vam, 3),
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
        "status": "success",
        "data": data,
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
                "participant_id": participant_id,
                "participant_name": participant.part_name if participant else "Unknown",
                "from_year": prev_row.res_year,
                "to_year": curr_row.res_year,
                "from_course": prev_row.res_course_num,
                "to_course": curr_row.res_course_num,
                "mean_vam": round(mean_vam, 3),
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
        "status": "success",
        "data": data,
        "total_students": len(grouped),
        "total_transitions": len(data),
        "regression_models": {
            comp: {"a": round(a, 4), "b": round(b, 4)}
            for comp, (a, b) in regression_models.items()
        }
    })


def calculate_comparison_vam(results_list, competencies):
    """
    Сравнительный анализ: Группировка по ВУЗам/направлениям для проверки гипотезы.
    """
    
    # Группировка по институтам и направлениям
    groups = defaultdict(lambda: {comp: [] for comp in competencies})
    
    for row in results_list:
        participant = row.res_participant
        
        if not participant:
            continue
        
        # Ключ группы: (institution, direction, course)
        group_key = (
            participant.part_institution.inst_name if participant.part_institution else "Unknown",
            participant.part_spec.spec_name if participant.part_spec else "Unknown",
            row.res_course_num
        )
        
        for comp in competencies:
            value = getattr(row, comp)
            if value is not None:
                groups[group_key][comp].append(float(value))
    
    # Вычисляем статистику по группам
    data = []
    
    for (institution, direction, course), comp_data in groups.items():
        group_stats = {
            "institution": institution,
            "direction": direction,
            "course": course,
            "student_count": len(comp_data[competencies[0]]) if comp_data[competencies[0]] else 0
        }
        
        # Средние по компетенциям
        competency_means = {}
        all_means = []
        
        for comp in competencies:
            values = comp_data[comp]
            if values:
                mean = np.mean(values)
                competency_means[comp] = round(mean, 3)
                all_means.append(mean)
        
        if all_means:
            group_stats["mean_all_competencies"] = round(np.mean(all_means), 3)
            group_stats["competency_means"] = competency_means
            data.append(group_stats)
    
    return JsonResponse({
        "status": "success",
        "data": data,
        "total_groups": len(data)
    })


# ========================================
# Дополнительная функция для сводной статистики
# ========================================

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
        "status": "success",
        "total_students": len(student_measurements),
        "total_measurements": sum(student_measurements.values()),
        "measurements_distribution": dict(distribution),
        "longitudinal_eligible": sum(1 for c in student_measurements.values() if c >= 2),
        "course_distribution": dict(course_distribution),
        "year_distribution": dict(year_distribution),
        "recommendation": (
            "Рекомендуем использовать Cross-Sectional VAM, так как только "
            f"{sum(1 for c in student_measurements.values() if c >= 2)} студентов "
            f"({round(100 * sum(1 for c in student_measurements.values() if c >= 2) / len(student_measurements), 1)}%) "
            "имеют повторные замеры для Longitudinal VAM."
        )
    })

@method('GET')
@csrf_exempt
def get_filter_options(request):
    """
    Возвращает доступные опции для фильтров (ВУЗы, направления, курсы)
    """
    try:
        session_id = request.GET.get('session_id')
        
        print(f"=== get_filter_options called ===")
        print(f"session_id: {session_id}")
        print(f"Available sessions: {list(data_view_sessions.keys())}")
        
        # Проверка сессии НЕ обязательна для этого endpoint
        # Можем вернуть данные и без сессии
        if session_id and session_id in data_view_sessions:
            session = data_view_sessions[session_id]
            session.update_activity()
            print("Session found and updated")
        else:
            print("No valid session, but continuing anyway")
        
        # Получаем уникальные значения для фильтров
        
        # Институты
        print("Fetching institutions...")
        institutions = Institutions.objects.all().values('inst_id', 'inst_name').order_by('inst_name')
        institutions_list = [
            {'id': inst['inst_id'], 'name': inst['inst_name']} 
            for inst in institutions
        ]
        print(f"Found {len(institutions_list)} institutions")
        if institutions_list:
            print(f"First institution: {institutions_list[0]}")
        
        # Направления (специальности)
        print("Fetching directions...")
        directions = Specialties.objects.all().values_list('spec_name', flat=True).distinct().order_by('spec_name')
        directions_list = list(directions)
        print(f"Found {len(directions_list)} directions")
        if directions_list:
            print(f"First direction: {directions_list[0]}")
        
        # Курсы (обычно 1-6)
        print("Fetching courses...")
        courses = Results.objects.filter(
            res_course_num__isnull=False
        ).values_list('res_course_num', flat=True).distinct().order_by('res_course_num')
        courses_list = list(courses)
        print(f"Found {len(courses_list)} courses: {courses_list}")
        
        # Годы
        print("Fetching years...")
        years = Results.objects.filter(
            res_year__isnull=False
        ).values_list('res_year', flat=True).distinct().order_by('res_year')
        years_list = list(years)
        print(f"Found {len(years_list)} years")
        
        # Центры компетенций
        print("Fetching centers...")
        centers = CompetenceCenters.objects.all().values_list('center_name', flat=True).distinct().order_by('center_name')
        centers_list = list(centers)
        print(f"Found {len(centers_list)} centers")
        
        # Уровни образования
        print("Fetching edu_levels...")
        edu_levels = Educationlevels.objects.all().values_list('edu_level_name', flat=True).distinct().order_by('edu_level_name')
        edu_levels_list = list(edu_levels)
        print(f"Found {len(edu_levels_list)} edu_levels")
        
        # Формы обучения
        print("Fetching study_forms...")
        study_forms = Studyforms.objects.all().values_list('form_name', flat=True).distinct().order_by('form_name')
        study_forms_list = list(study_forms)
        print(f"Found {len(study_forms_list)} study_forms")
        
        response_data = {
            "data": {
                "institutions": institutions_list,
                "directions": directions_list,
                "courses": courses_list,
                "years": years_list,
                "centers": centers_list,
                "edu_levels": edu_levels_list,
                "study_forms": study_forms_list
            }
        }
        
        print(f"Returning response with {len(institutions_list)} institutions, {len(directions_list)} directions, {len(courses_list)} courses")
        
        return successResponse(response_data)
        
    except Exception as e:
        print(f"ERROR in get_filter_options: {str(e)}")
        import traceback
        traceback.print_exc()
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
def get_vam_comparison(request):
    """
    Получает VAM данные для нескольких институтов/направлений для сравнения.
    Добавлен фильтр по количеству прохождений тестирования.
    """
    try:
        session_id = request.GET.get("session_id")
        analysis_type = request.GET.get("type", "cross_sectional")
        
        # Multi-select параметры
        institution_ids = request.GET.getlist('institution_ids[]')
        directions = request.GET.getlist('directions[]')
        courses = request.GET.getlist('courses[]')
        test_attempts = request.GET.getlist('test_attempts[]')  # Новый параметр!
        
        print(f"\n{'='*60}")
        print(f"📊 get_vam_comparison вызван")
        print(f"   Институты: {institution_ids}")
        print(f"   Направления: {directions}")
        print(f"   Курсы: {courses}")
        print(f"   Прохождений: {test_attempts}")
        print(f"{'='*60}\n")

        competencies = [
            "res_comp_leadership", "res_comp_communication", 
            "res_comp_self_development", "res_comp_result_orientation",
            "res_comp_stress_resistance", "res_comp_client_focus",
            "res_comp_planning", "res_comp_info_analysis",
            "res_comp_partnership", "res_comp_rules_compliance",
            "res_comp_emotional_intel", "res_comp_passive_vocab"
        ]

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

        # ============================================================
        # НОВЫЙ ФИЛЬТР: По количеству прохождений тестирования
        # ============================================================
        
        if test_attempts and len(test_attempts) > 0:
            print(f"🔍 Фильтрация по количеству прохождений: {test_attempts}")
            
            # Группируем по студентам и считаем количество замеров
            from django.db.models import Count
            
            # Подсчитываем количество замеров для каждого студента
            student_attempts = Results.objects.values('res_participant').annotate(
                attempt_count=Count('res_id')
            )
            
            # Создаём словарь {student_id: attempt_count}
            attempts_dict = {
                item['res_participant']: item['attempt_count'] 
                for item in student_attempts
            }
            
            # Фильтруем студентов по заданному количеству прохождений
            valid_students = [
                student_id 
                for student_id, count in attempts_dict.items()
                if str(count) in test_attempts
            ]
            
            print(f"✅ Найдено {len(valid_students)} студентов с нужным количеством прохождений")
            
            # Применяем фильтр
            results = results.filter(res_participant__in=valid_students)

        results_list = list(results)
        
        print(f"🔍 Найдено {len(results_list)} записей после всех фильтров")

        # Вычисляем VAM
        if analysis_type == "cross_sectional":
            vam_data = calculate_cross_sectional_vam(results_list, competencies)
        elif analysis_type == "longitudinal":
            vam_data = calculate_longitudinal_vam(results_list, competencies)
        else:
            return JsonResponse({"status": "error", "message": "Invalid analysis type"})
        
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
            "status": "success",
            "data": response_data["data"],
            "grouped": grouped_data,
            "total_students": response_data.get("total_students", len(response_data["data"])),
            "filtered_by_attempts": len(test_attempts) > 0,  # Флаг для фронта
            "selected_attempts": test_attempts  # Для отладки
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_vam_comparison: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)


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
        "by_institution": defaultdict(lambda: defaultdict(list)),
        "by_direction": defaultdict(lambda: defaultdict(list)),
        "by_institution_direction": defaultdict(lambda: defaultdict(list))
    }
    
    for item in data:
        course = item.get("course") or item.get("to_course")
        vam = item.get("mean_vam", 0)
        institution = item.get("institution_name", "Неизвестно")
        direction = item.get("direction", "Неизвестно")
        
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


# ============================================================
# UNIFIED VAM FUNCTION (вместо Cross-Sectional и Longitudinal)
# ============================================================

@method('GET')
@csrf_exempt  
def get_vam_unified(request):
    """
    ЕДИНЫЙ метод VAM, который автоматически определяет тип анализа
    на основе фильтра "Количество прохождений":
    
    - Если выбрано "1 прохождение" → Cross-Sectional VAM
    - Если выбрано "2+" прохождений → Longitudinal VAM
    - Если не выбрано → Mixed (оба подхода)
    """
    try:
        session_id = request.GET.get("session_id")
        
        # Фильтры
        institution_ids = request.GET.getlist('institution_ids[]')
        directions = request.GET.getlist('directions[]')
        courses = request.GET.getlist('courses[]')
        test_attempts = request.GET.getlist('test_attempts[]')
        selected_competencies = request.GET.getlist('competencies[]')
        student_ids = request.GET.getlist('student_ids[]')
        
        print(f"\n{'='*60}")
        print(f"📊 get_vam_unified вызван")
        print(f"   Институты: {institution_ids}")
        print(f"   Направления: {directions}")
        print(f"   Курсы: {courses}")
        print(f"   Прохождений: {test_attempts}")
        print(f"   Студенты: {student_ids}")
        print(f"{'='*60}\n")

        competencies = [
            "res_comp_leadership", "res_comp_communication", 
            "res_comp_self_development", "res_comp_result_orientation",
            "res_comp_stress_resistance", "res_comp_client_focus",
            "res_comp_planning", "res_comp_info_analysis",
            "res_comp_partnership", "res_comp_rules_compliance",
            "res_comp_emotional_intel", "res_comp_passive_vocab"
        ]

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

        if selected_competencies:
            # Фильтруем список компетенций
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
            "status": "success",
            "data": response_data["data"],
            "grouped": grouped_data,
            "total_students": response_data.get("total_students", len(response_data["data"])),
            "analysis_method": analysis_method,  # Для информации на фронте
            "selected_attempts": test_attempts,
            "selected_competencies": selected_competencies
        })
        
    except Exception as e:
        print(f"❌ Ошибка в get_vam_unified: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)

@method('GET')
@csrf_exempt
def get_latent_growth(request):
    """
    Получает данные Latent Growth Model (LGM) с фильтрацией.
    ОБНОВЛЕНО: Теперь поддерживает группировку по институтам/направлениям!
    """
    try:
        # Получаем фильтры
        institution_ids = request.GET.getlist('institution_ids[]')
        directions = request.GET.getlist('directions[]')
        courses = request.GET.getlist('courses[]')
        test_attempts = request.GET.getlist('test_attempts[]')
        selected_competencies = request.GET.getlist('competencies[]')

        print(f"\n{'='*60}")
        print(f"📊 get_latent_growth вызван")
        print(f"   Институты: {institution_ids}")
        print(f"   Направления: {directions}")
        print(f"{'='*60}\n")

        # Список всех компетенций
        all_competencies = [
            "res_comp_leadership", "res_comp_communication",
            "res_comp_self_development", "res_comp_result_orientation",
            "res_comp_stress_resistance", "res_comp_client_focus",
            "res_comp_planning", "res_comp_info_analysis",
            "res_comp_partnership", "res_comp_rules_compliance",
            "res_comp_emotional_intel", "res_comp_passive_vocab"
        ]

        # Фильтруем компетенции
        if selected_competencies:
            competencies = [c for c in all_competencies if c in selected_competencies]
        else:
            competencies = all_competencies

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
                "institutions": len(institution_ids),
                "directions": len(directions),
                "courses": len(courses),
                "test_attempts": len(test_attempts),
                "competencies": len(competencies)
            }

        return JsonResponse(growth_data)

    except Exception as e:
        print(f"❌ Ошибка в get_latent_growth: {str(e)}")
        import traceback
        traceback.print_exc()
        return exceptionResponse(e)

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
            "status": "success",
            "data": growth_trajectory,
            "model": "latent_growth",
            "total_records": len(results_list),
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
            "status": "success",
            "data": growth_trajectory,
            "model": "latent_growth",
            "group_by": group_by,
            "total_records": len(results_list),
            "groups_count": len(groups)
        }
    
    except Exception as e:
        print(f"❌ Ошибка в calculate_grouped_growth: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": str(e)
        }