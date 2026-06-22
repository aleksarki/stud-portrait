from collections import defaultdict
import numpy as np
import traceback

from django.db.models import Avg, Count, Q, F
from django.http import JsonResponse

from .common import *

# 
def get_year_metrics(year, filter):
    res_queryset = TestResults.objects.filter(res_year=year, **filter)
    max_mot={"name": "-", "count": 0}
    max_demot={"name": "-", "count": 0}
    if not res_queryset.exists():
        return {
            "total_avg": 0,
            "course_percent": 0,
            "all_comps": {f: 0 for f in COMP.list},
            "motivator": max_mot,
            "demotivator" : max_demot,
            "participated" : {"amount_in": 0, "students_all": 0}
        }
    avgs = res_queryset.aggregate(**{f'avg_{f}': Avg(f) for f in COMP.list})
    
    valid_values = [v for v in avgs.values() if v is not None]
    total_avg = sum(valid_values) / len(COMP.list) if valid_values else 0

    participant_ids = list(res_queryset.values_list('res_participant_id', flat=True).distinct())
    total_students = res_queryset.values('res_participant').distinct().count()
    students_with_courses = CourseResults.objects.filter(
        course_participant_id__in=participant_ids 
    ).count()
    
    for f in MOT.list: ## мотиваторы
        all = res_queryset.values(f).count()
        cnt_high = res_queryset.filter(**{f"{f}__gte": 600}).count() / all if all!=0 else 0
        cnt_high = round(cnt_high *10000)/100
        if cnt_high>max_mot["count"]: 
            max_mot["count"]= cnt_high
            max_mot["name"]=f
        
        cnt_low = res_queryset.filter(**{f"{f}__lt": 400}).count() / all if all!=0 else 0
        cnt_low = round(cnt_low *10000)/100
        if cnt_low>max_demot["count"]: 
            max_demot["count"]=cnt_low
            max_demot["name"]=f
    
    course_percent = (students_with_courses / total_students * 100) if total_students > 0 else 0
    students_uni = total_students * 1.2  # тут должны быть обучающиеся в унике вообще
    return {
        "total_avg": round(total_avg, 2),
        "course_percent": round(course_percent, 1),
        "all_comps": {f: round(avgs.get(f'avg_{f}') or 0, 2) for f in COMP.list},
        "motivator": max_mot,
        "demotivator" : max_demot,
        "participated" : {"amount_in": total_students, "students_all": students_uni}
    }


@cached()
def filter_dash(request): 
    try:
        inst = request.GET.get('institute')   
        if inst:
            base = TestResults.objects.filter(res_institution__inst_name=inst)
            specialties = list(base.values_list('res_edu_specialty__edu_spec_name', flat=True).distinct())
            years = base.values_list('res_year', flat=True).distinct()
        else:
            specialties = list(TestResults.objects.values_list('res_edu_specialty__edu_spec_name', flat=True).distinct())
            years = TestResults.objects.values_list('res_year', flat=True).distinct()
        
        institutes = list(TestResults.objects.values_list('res_institution__inst_name', flat=True).distinct())
        
        data = {
            "institutes": [{"value": i, "label": str(i)} for i in institutes if i],
            "specialties": [{"value": s, "label": str(s)} for s in specialties if s],
            "years": [{"value": y, "label": str(y)} for y in years if y],
        }
        return JsonResponse({"status": "success", "data": data})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@cached()
def overall_stats(request):
    response_data={}
    try:
        unis = TestResults.objects.values_list('res_institution__inst_name', flat=True).distinct().count()
        results = TestResults.objects.values_list().distinct().count()
        centers = TestResults.objects.values_list('res_center', flat=True).distinct().count()
        years = TestResults.objects.values_list('res_year', flat=True).distinct()
        min_year = 3000
        max_year = 0
        for i in years:
            year=int(i.split('/')[0])
            min_year=min(min_year, year)
            max_year=max(max_year, year+1)
        response_data = {
            "status": "success", 
            'unis': unis,
            'results': results,
            'centers': centers,
            'years': {'min': min_year, 'max': max_year}
        }
        return JsonResponse(response_data)
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@cached()
def get_dashboard_stats(request):
    response_data = {}

    try:
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_edu_specialty__edu_spec_name'] = spec
        
        if year:
            curr_year = year
            prev_year = str(int(year.split('/')[0])-1) + '/' + year.split('/')[0]
        else:
            curr_year = "2025/2026"
            prev_year = "2024/2025"

        curr_data = get_year_metrics(curr_year, base_filter)
        prev_data = get_year_metrics(prev_year, base_filter)

        # прирост компетенций
        growth = 0
        if curr_data and prev_data:
            growth = ((curr_data['total_avg'] - prev_data['total_avg']) / prev_data['total_avg']) * 100 if prev_data['total_avg']!=0 else 0

        unis = TestResults.objects.filter(res_year=curr_year)         \
            .values_list('res_institution__inst_name', flat=True) \
            .distinct()

        rate_list = []
        for uni in unis:
            rows_data = TestResults.objects                                     \
                .filter(res_year=curr_year, res_institution__inst_name=uni) \
                .values_list(*COMP.list)
            rows = np.array([np.array([np.nan if i is None or i == 0 else i for i in row]) for row in rows_data]).astype(float)
            avg = np.mean(np.delete(rows, np.where(np.isnan(rows))))
            rate_list.append({'uni_name': uni, 'overall_avg': round(avg,3)})
        rate_list = sorted(
            rate_list,
            key=lambda x: (x['overall_avg'] is None, -(x['overall_avg'] or 0))
        )
        if inst:  # место выбранного в %
            place = [i for i, item in enumerate(rate_list) if item['uni_name'] == inst]
            if len(place)>0:
                uni_place = place[0]/len(rate_list) * 100
            else: uni_place = -1
            uni_score = curr_data['total_avg']
            uni_name = inst

        else: 
            uni_place = 0
            best_uni = next((r for r in rate_list if r['overall_avg'] is not None), None)  # Лучший ВУЗ
            
            if best_uni:
                uni_name = best_uni['uni_name']
                uni_score = best_uni['overall_avg']
            else:
                uni_name = "Нет данных"
                uni_score = 0
        
        sorted_comps = sorted(curr_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        sorted_comps_prev = sorted(prev_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_comps:
            best_comp = {"name": "-", "val": 0}
            worst_comp = {"name": "-", "val": 0}
            best_comp_prev = {"name": "-", "val": 0}
            worst_comp_prev = {"name": "-", "val": 0}
        else:
            best_comp_prev = {"name": sorted_comps_prev[0][0], "val": prev_data['all_comps'][sorted_comps_prev[0][0]]}
            worst_comp_prev = {"name": sorted_comps_prev[-1][0], "val": prev_data['all_comps'][sorted_comps_prev[-1][0]]}
            best_comp = {"name": sorted_comps[0][0], "val": sorted_comps[0][1]}
            worst_comp = {"name": sorted_comps[-1][0], "val": sorted_comps[-1][1]}
        
        chart = []
        for k, v in curr_data['all_comps'].items():
            delta = v - prev_data['all_comps'][k]
            if prev_data['all_comps'][k] == 0:
                delta = 0
            chart.append({"name": k, "score": v, "prev_score": prev_data['all_comps'][k]})
        
        base_filter['res_year'] = curr_year
        radar = get_competency_stats_courses(base_filter)  # radar
        
        motiv = {'name': {'prev': '-', 'curr': '-'}, 'count': {'prev': 0, 'curr': 0}}
        
        # топ мотиватор
        if prev_data["motivator"]["name"] == curr_data["motivator"]["name"]:
            motiv['name'] = {'prev': curr_data["motivator"]["name"], 'curr': curr_data["motivator"]["name"]}
            motiv['count'] = {'prev': prev_data["motivator"]["count"], 'curr': curr_data["motivator"]["count"]}
        else:
            motiv['name'] = {'prev': prev_data["motivator"]["name"], 'curr': curr_data["motivator"]["name"]}
            motiv['count'] = {'prev': prev_data["motivator"]["count"], 'curr': curr_data["motivator"]["count"]}
        
        # демотиватор
        demotiv = {'name': {'prev': '-', 'curr': '-'}, 'count': {'prev': 0, 'curr': 0}}
        if prev_data["demotivator"]["name"] == curr_data["demotivator"]["name"]:
            demotiv['name'] = {'prev': curr_data["demotivator"]["name"], 'curr': curr_data["demotivator"]["name"]}
            demotiv['count'] = {'prev': prev_data["demotivator"]["count"], 'curr': curr_data["demotivator"]["count"]}
        else:
            demotiv['name'] = {'prev': prev_data["demotivator"]["name"], 'curr': curr_data["demotivator"]["name"]}
            demotiv['count'] = {'prev': prev_data["demotivator"]["count"], 'curr': curr_data["demotivator"]["count"]}
        
        response_data = {
            "status": "success",
            "col1": {
                "courses": {"val": curr_data['course_percent'], "prev": prev_data['course_percent']},
                "avg_lvl": {"val": curr_data['total_avg'], "prev": prev_data['total_avg']},
                "growth": {"val": round(growth, 1), "prev": 0},
                "motiv": motiv,
                "demotiv" : demotiv
            },
            "col2": {
                "uni_name": uni_name,
                "uni_score": uni_score,
                "uni_place": uni_place,
                "participated": curr_data['participated']
            },
            "col3": {
                "best": best_comp,
                "worst": worst_comp,
                "best_prev": best_comp_prev,
                "worst_prev": worst_comp_prev
            },
            "year": curr_year.split('/')[1],
            "chart": chart,
            "radar": radar
        }
        return JsonResponse(response_data)
        
    except Exception as e:
        print(traceback.format_exc())
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


# это вспомогательная
def get_competency_stats_courses(filter):
    courses = [1, 2, 3, 4]
    results = {}
    main = TestResults.objects.filter(**filter)
    for course in courses:
        qs = main.filter(res_course=course)  # ИЗМЕНЕНО: res_course вместо res_course_num
        if qs.exists():
            avgs = qs.aggregate(**{field: Avg(field) for field in COMP.list})
            results[course] = avgs
        else:
            results[course] = {f: 0 for f in COMP.list}
    
    chart_data = []
    for field in COMP.list:
        row = {"name": field}
        for course in courses:
            val = results[course].get(field) or 0
            row[f"course_{course}"] = round(float(val), 2)
        chart_data.append(row)
    return chart_data


@cached()
def get_motivation_counts(request):
    try:
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_edu_specialty__edu_spec_name'] = spec
        if year: base_filter['res_year'] = year
        
        courses = [1, 2, 3, 4]
        results = {}
        bar_data = []
        
        for field in MOT.list:
            row = {"name": field}
            cnt_all_all = 0
            cnt_low_all = 0
            cnt_high_all = 0
            cnt_mid_all = 0

            for course in courses:
                results[course] = {'low': {f: 0 for f in MOT.list},
                                'high': {f: 0 for f in MOT.list},
                                'mid': {f: 0 for f in MOT.list}}
                                
                cnt_all = TestResults.objects.filter(res_course=course, **base_filter)  # ИЗМЕНЕНО: res_course
                cnt_low = cnt_all.filter(**{f"{field}__lt": 400}).count() 
                cnt_high = cnt_all.filter(**{f"{field}__gte": 600}).count() 
                cnt_mid = cnt_all.count() - cnt_low - cnt_high

                cnt_all_all += cnt_all.count() 
                cnt_low_all += cnt_low
                cnt_high_all += cnt_high
                cnt_mid_all += cnt_mid

                row[f"course_{course}_high"] = cnt_low / cnt_all.count() if (cnt_all.count() != 0) else 0
                row[f"course_{course}_low"] = cnt_high / cnt_all.count() if (cnt_all.count() != 0) else 0
                row[f"course_{course}_mid"] = cnt_mid / cnt_all.count() if cnt_all.count() != 0 else 0
            
            row["all_high"] = cnt_high_all / cnt_all_all if cnt_all_all != 0 else 0
            row["all_low"] = cnt_low_all / cnt_all_all if cnt_all_all != 0 else 0
            row["all_mid"] = cnt_mid_all / cnt_all_all if cnt_all_all != 0 else 0
            bar_data.append(row)

        response_data = {"status": "success", "data": bar_data}
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


scores = {
    'неудовл.': 2,
    'удовл.': 3,
    'хор.': 4,
    'отл.': 5,
    # Добавляем числовые варианты для новой БД
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    'не явился': 1,
    '1': 1
}


@cached()
def get_scores_result(request):
    try:
        if (AcademicPerformances.objects.count() == 0):
            return JsonResponse({"status": "error", "message": 'no performance data'}, status=500)
    
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_edu_specialty__edu_spec_name'] = spec
        if year: base_filter['res_year'] = year

        main = TestResults.objects.filter(**base_filter)
        if not main:
            response_data = {"status": "error", "message": "empty results queryset", "data": [], "names": []}
            return JsonResponse(response_data, status=500) 
        
        participant_ids = list(main.values_list('res_participant_id', flat=True).distinct())
        result = []
        avgs = {}
        comp_by_part = {}

        for pid in participant_ids:
            part_comps = main.filter(res_participant_id=pid)
            if part_comps.count() > 1:
                part_comps = part_comps.aggregate(**{field: Avg(field) for field in COMP.list})
            else:
                part_comps = list(part_comps.values(*COMP.list))[0]
            count = 0
            sum_val = 0 
            comp_by_part[pid] = {}
            for comp in COMP.list:
                comp_by_part[pid][comp] = part_comps.get(comp) if part_comps.get(comp) is not None else 0
                if part_comps.get(comp) is not None and part_comps.get(comp) != 0:
                    count += 1
                    sum_val += part_comps.get(comp)
            comp_by_part[pid]['avg'] = sum_val / count if count != 0 else 0
            
        ap = AcademicPerformances.objects.filter(
            perf_participant_id__in=participant_ids  # ИЗМЕНЕНО: perf_participant_id
        ).values('perf_participant_id', 'perf_edu_discipline__edu_disc_name', 'perf_main')

        # disciplines - берем из таблицы EducationDisciplines
        disciplines = ['ПИР', 'УП', 'Эксплуатационная практика', 'Преддипломная практика']
        by_discipline = defaultdict(list)
        
        for record in ap:
            pid = record['perf_participant_id']
            grade = record['perf_main']  # ИЗМЕНЕНО: теперь число (1-5), не строка
            if grade is None or comp_by_part[pid]['avg'] is None:
                continue
            by_discipline[record['perf_edu_discipline__edu_disc_name']].append({
                'participant_id': pid,
                'grade': grade,
                **comp_by_part.get(pid, {}),
            })

        result = [
            {'discipline': disc, 'participants': parts}
            for disc, parts in by_discipline.items()
        ]
        response_data = {"status": "success", "data": result, "names": disciplines}
        return JsonResponse(response_data) 
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


def calc_boxplot(values, ids):
    vals_with_ids = [
        (v, i) for v, i in zip(values, ids)
        if v is not None and v > 0 and (v < 300 or v > 700)
    ]
    if not vals_with_ids:
        return None, []

    arr = np.array([v for v, _ in vals_with_ids])
    q1  = np.percentile(arr, 25)
    q3  = np.percentile(arr, 75)
    iqr = q3 - q1
    lo  = q1 - 1.5 * iqr
    hi  = q3 + 1.5 * iqr

    non_outliers = arr[(arr >= lo) & (arr <= hi)]
    outliers = [
        {'y': int(v), 'id': pid}
        for v, pid in vals_with_ids
        if v < lo or v > hi
    ]

    return [
        int(np.min(non_outliers)) if len(non_outliers) > 0 else int(np.min(arr)),
        int(q1),
        int(np.percentile(arr, 50)),
        int(q3),
        int(np.max(non_outliers)) if len(non_outliers) > 0 else int(np.max(arr)),
    ], outliers


@cached()
def get_data_boxplot(request):
    try:
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_edu_specialty__edu_spec_name'] = spec
        if year: base_filter['res_year'] = year
        
        data_all = list(  
            TestResults.objects.filter(**base_filter)
            .values('res_participant_id', *COMP.list)  # ИЗМЕНЕНО: res_participant_id
        )
        data = []
        for f in COMP.list:
            values = [row[f] for row in data_all]
            ids    = [row['res_participant_id'] for row in data_all]
            box, outliers = calc_boxplot(values, ids)
            if box:
                data.append({
                    'comp': f,
                    'box': box,  # min, q1, median, q3, max
                    'out': outliers  # выбросы
                })
        response_data = {"status": "success", "data": data}
        return JsonResponse(response_data) 
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


@cached()
def get_grades_competency_correlation_v0(request):  # review need for this?
    try:
        # 1. Чтение фильтров из запроса
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_edu_specialty__edu_spec_name'] = spec
        if year: base_filter['res_year'] = year

        # 2. Формирование объединённой выборки
        # Получаем для каждого студента: его компетенции (12 шт.) + курс
        res_qs = TestResults.objects.filter(**base_filter)
        if not res_qs.exists():
            return JsonResponse({
                "status": "success",
                "correlations": [],
                "scatter": [],
                "trends": [],
                "disciplines": [],
                "competencies": list(COMP.list),
            })

        participant_ids = list(
            res_qs.values_list('res_participant_id', flat=True).distinct()  # ИЗМЕНЕНО: res_participant_id
        )

        # Средний балл компетенций по каждому студенту (если у студента несколько
        # записей за разные курсы — берём среднее значение, как уже сделано
        # в get_scores_result для агрегации)
        comp_qs = (
            res_qs
            .values('res_participant_id', 'res_course')  # ИЗМЕНЕНО: res_course
            .annotate(**{f'avg_{f}': Avg(f) for f in COMP.list})
        )
        # Словарь pid -> {competency_field: avg_score, "course": N}
        comp_by_part = {}
        for r in comp_qs:
            pid = r['res_participant_id']
            comp_by_part[pid] = {
                f: (float(r[f'avg_{f}']) if r.get(f'avg_{f}') is not None else None)
                for f in COMP.list
            }
            comp_by_part[pid]['__course'] = r.get('res_course')

        # Академические оценки по дисциплинам, отфильтрованные по тем же студентам
        ap_qs = (
            AcademicPerformances.objects
            .filter(perf_participant_id__in=participant_ids)  # ИЗМЕНЕНО: perf_participant_id
            .values('perf_participant_id', 'perf_edu_discipline__edu_disc_name', 'perf_main')  # ИЗМЕНЕНО: поля
        )

        # 3. Собираем таблицу наблюдений и сырые точки scatter
        # paired[(discipline, competency_field)] = [(grade, comp_score, course, pid), ...]
        paired = defaultdict(list)
        scatter = []
        disciplines_set = set()

        for row in ap_qs:
            pid = row['perf_participant_id']
            disc = row['perf_edu_discipline__edu_disc_name']
            grade = row['perf_main']  # ИЗМЕНЕНО: теперь число
            if grade is None or grade == 1:  # 'не явился'
                continue

            comps = comp_by_part.get(pid)
            if not comps:
                continue

            course = comps.get('__course')
            disciplines_set.add(disc)

            for f in COMP.list:
                cs = comps.get(f)
                if cs is None or cs == 0:
                    continue
                paired[(disc, f)].append((grade, cs, course, pid))
                scatter.append({
                    "discipline": disc,
                    "competency": f,
                    "grade": grade,
                    "competency_score": round(cs, 2),
                    "course": course,
                    "participant_id": pid,
                })

        # 4. Вычисление матрицы корреляций Пирсона
        correlations = []
        trends = []
        for (disc, f), pairs in paired.items():
            if len(pairs) < 3:
                # При очень малой выборке корреляция нестабильна — отмечаем как NaN
                correlations.append({
                    "discipline": disc,
                    "competency": f,
                    "r": None,
                    "n": len(pairs),
                })
                continue

            grades_arr = np.array([p[0] for p in pairs], dtype=float)
            scores_arr = np.array([p[1] for p in pairs], dtype=float)

            # np.corrcoef вернёт матрицу 2x2; r — это элемент [0, 1]
            # Если у одного из массивов нулевая дисперсия (все оценки одинаковые) — будет деление на ноль, ловим это через np.errstate
            with np.errstate(divide='ignore', invalid='ignore'):
                r_matrix = np.corrcoef(grades_arr, scores_arr)
                r = r_matrix[0, 1]
            if np.isnan(r):
                r_val = None
            else:
                r_val = round(float(r), 3)

            correlations.append({
                "discipline": disc,
                "competency": f,
                "r": r_val,
                "n": len(pairs),
            })

            # Линия тренда (простая линейная регрессия y = a*x + b)
            # Считаем только при достаточном количестве точек и ненулевой дисперсии X
            if r_val is not None and grades_arr.std() > 0:
                slope, intercept = np.polyfit(grades_arr, scores_arr, 1)
                trends.append({
                    "discipline": disc,
                    "competency": f,
                    "slope": round(float(slope), 3),
                    "intercept": round(float(intercept), 3),
                    "x_min": int(grades_arr.min()),
                    "x_max": int(grades_arr.max()),
                })

        # 5. Возврат JSON-ответа
        return JsonResponse({
            "status": "success",
            "correlations": correlations,
            "scatter": scatter,
            "trends": trends,
            "disciplines": sorted(disciplines_set),
            "competencies": list(COMP.list),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"status": "error", "message": str(e)}, status=500)    


COMP_KEYS = [
    'res_comp_info_analysis',
    'res_comp_planning',
    'res_comp_result_orientation',
    'res_comp_stress_resistance',
    'res_comp_partnership',
    'res_comp_rules_compliance',
    'res_comp_self_development',
    'res_comp_leadership',
    'res_comp_emotional_intel',
    'res_comp_client_focus',
    'res_comp_communication',
    'res_comp_passive_vocab',
]


ATTESTATION_MAP = {
    '5': 5, '4': 4, '3': 3, '2': 2,
    'отлично': 5, 'хорошо': 4, 'удовлетворительно': 3, 'неудовлетворительно': 2,
    'отл.': 5, 'хор.': 4, 'удовл.': 3, 'неудовл.': 2,
    'отл': 5, 'хор': 4, 'удовл': 3, 'неудовл': 2,
    'зачёт': 5, 'зачет': 5, 'зач.': 5, 'зач': 5,
    'незачёт': 2, 'незачет': 2, 'незач.': 2, 'незач': 2,
}


def _grade_to_number(grade_str):
    # Преобразует строку оценки в число. Возвращает None, если не распознано
    if grade_str is None:
        return None
    # Если это уже число, возвращаем его
    if isinstance(grade_str, (int, float)):
        return int(grade_str) if 1 <= int(grade_str) <= 5 else None
    g = str(grade_str).strip().lower()
    return ATTESTATION_MAP.get(g)


@cached()
def get_grades_competency_correlation(request):
    try:
        perf_qs = AcademicPerformances.objects.select_related('perf_participant', 'perf_edu_discipline').all()
        pairs_data = defaultdict(list)
        scatter_data = []
        results_map = {}
        results_qs = TestResults.objects.values(
            'res_participant_id', *COMP_KEYS
        )
        for r in results_qs:
            results_map.setdefault(r['res_participant_id'], r)
        
        disciplines_set = set()
        for perf in perf_qs:
            pid = perf.perf_participant_id
            disc = perf.perf_edu_discipline.edu_disc_name if perf.perf_edu_discipline else None
            grade = perf.perf_main  # ИЗМЕНЕНО: теперь число напрямую
            if grade is None or grade == 1:  # 'не явился'
                continue
            
            res = results_map.get(pid)
            if res is None:
                continue
            
            if not disc:
                continue
            disciplines_set.add(disc)
            
            for comp_key in COMP_KEYS:
                comp_val = res.get(comp_key)
                if comp_val is None:
                    continue
                pairs_data[(disc, comp_key)].append((grade, comp_val))
        
        # Шаг 2: считаем корреляцию Пирсона по каждой паре (дисциплина, компетенция)
        correlations = []
        for (disc, comp_key), pairs in pairs_data.items():
            if len(pairs) < 3:
                continue
            grades = np.array([p[0] for p in pairs], dtype=float)
            comps = np.array([p[1] for p in pairs], dtype=float)
            
            if grades.std() == 0 or comps.std() == 0:
                corr_value = 0.0
            else:
                corr_value = float(np.corrcoef(grades, comps)[0, 1])
                if np.isnan(corr_value):
                    corr_value = 0.0
            
            correlations.append({
                'discipline': disc,
                'competency': comp_key,
                'value': round(corr_value, 3),
                'n': len(pairs),
            })
        
       # Шаг 3: scatter — данные для выбранной (или автовыбранной) пары
        requested_disc = request.GET.get('discipline')
        requested_comp = request.GET.get('competency')
        
        scatter_data = []
        
        # Если пользователь указал конкретную пару — берём её
        if requested_disc and requested_comp:
            key = (requested_disc, requested_comp)
            if key in pairs_data:
                scatter_data = [
                    {
                        'discipline': requested_disc,
                        'competency': requested_comp,
                        'grade': p[0],
                        'comp_value': p[1],
                    }
                    for p in pairs_data[key]
                ]
        # Иначе — пара с максимальным n
        elif correlations:
            top = max(correlations, key=lambda c: c['n'])
            top_pairs = pairs_data[(top['discipline'], top['competency'])]
            scatter_data = [
                {
                    'discipline': top['discipline'],
                    'competency': top['competency'],
                    'grade': p[0],
                    'comp_value': p[1],
                }
                for p in top_pairs
            ]
        
        return JsonResponse({
            'status': 'success',
            'correlations': correlations,
            'scatter': scatter_data,
            'disciplines': sorted(list(disciplines_set)),
            'competencies': COMP_KEYS,
        })
    
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'correlations': [],
            'scatter': [],
            'disciplines': [],
            'competencies': COMP_KEYS,
        }, status=500)


@cached()
def get_competency_trend_by_year(request):
    try:
        filters = {}
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        if inst:
            filters['res_institution__inst_name'] = inst
        if spec:
            filters['res_edu_specialty__edu_spec_name'] = spec
        
        results_qs = TestResults.objects.filter(**filters).exclude(res_course__isnull=True)  # ИЗМЕНЕНО: res_course
        
        courses = sorted(
            results_qs.values_list('res_course', flat=True).distinct()  # ИЗМЕНЕНО: res_course
        )
        
        trends = []
        for comp_key in COMP_KEYS:
            points = []
            for course_num in courses:
                course_qs = results_qs.filter(
                    res_course=course_num  # ИЗМЕНЕНО: res_course
                ).exclude(**{f'{comp_key}__isnull': True})
                
                agg = course_qs.aggregate(avg=Avg(comp_key), n=Count('res_id'))
                avg_val = agg['avg']
                n_val = agg['n'] or 0
                
                if avg_val is None or n_val == 0:
                    continue
                
                points.append({
                    'course': int(course_num),
                    'avg': round(float(avg_val), 2),
                    'n': n_val,
                })
            
            if points: 
                trends.append({
                    'competency': comp_key,
                    'points': points,
                })
        
        return JsonResponse({
            'status': 'success',
            'trends': trends,
            'competencies': COMP_KEYS,
        })
    
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'trends': [],
            'competencies': COMP_KEYS,
        }, status=500)


def get_top_correlations(request):
    try:
        # Параметры запроса
        try:
            top_n = int(request.GET.get('top_n', 20))
        except (TypeError, ValueError):
            top_n = 20
        top_n = max(1, min(top_n, 500))

        sort_by = request.GET.get('sort_by', 'abs').lower()
        if sort_by not in ('abs', 'positive', 'negative'):
            sort_by = 'abs'

        try:
            min_n = int(request.GET.get('min_n', 30))
        except (TypeError, ValueError):
            min_n = 30
        min_n = max(3, min_n)

        institute = request.GET.get('institute')
        specialty = request.GET.get('specialty')
        year = request.GET.get('year')

        # Фильтры для Results (нужны, чтобы взять только тех студентов, которые
        # подходят под выбранные институт/специальность/год)
        results_filter = {}
        if institute:
            results_filter['res_institution__inst_name'] = institute
        if specialty:
            results_filter['res_edu_specialty__edu_spec_name'] = specialty
        if year:
            try:
                results_filter['res_year'] = int(year)
            except (TypeError, ValueError):
                pass

        # Шаг 1. Соберём результаты тестирования (баллы 12 компетенций) в словарь: participant_id -> {comp_key: value, ...}
        results_qs = TestResults.objects.filter(**results_filter).values(
            'res_participant_id', *COMP.list
        )
        results_map = {}
        for r in results_qs:
            # один студент мог сдавать несколько раз — берём первый
            results_map.setdefault(r['res_participant_id'], r)

        if not results_map:
            return JsonResponse({
                'status': 'success',
                'top': [],
                'params': {
                    'top_n': top_n, 'sort_by': sort_by, 'min_n': min_n,
                    'institute': institute, 'specialty': specialty, 'year': year,
                },
                'total_pairs': 0,
                'message': 'Нет студентов под выбранные фильтры',
            })

        # Шаг 2. Идём по Academicperformance, агрегируем пары (оценка, балл) по ключу (дисциплина, компетенция).
        perf_qs = AcademicPerformances.objects.values(
            'perf_participant_id', 'perf_edu_discipline__edu_disc_name', 'perf_main'
        )
        pairs_data = defaultdict(list)
        disciplines_set = set()

        for perf in perf_qs:
            grade = perf['perf_main']
            if grade is None or grade == 1:  # 'не явился'
                continue
            res = results_map.get(perf['perf_participant_id'])
            if res is None:
                continue
            disc = perf['perf_edu_discipline__edu_disc_name']
            if not disc:
                continue
            disciplines_set.add(disc)
            for comp_key in COMP.list:
                comp_val = res.get(comp_key)
                if comp_val is None:
                    continue
                pairs_data[(disc, comp_key)].append((grade, comp_val))

        # Шаг 3. Считаем корреляцию Пирсона по каждой паре
        all_correlations = []
        for (disc, comp_key), pairs in pairs_data.items():
            n = len(pairs)
            if n < min_n:
                continue
            grades = np.array([p[0] for p in pairs], dtype=float)
            comps = np.array([p[1] for p in pairs], dtype=float)
            if grades.std() == 0 or comps.std() == 0:
                continue
            corr = float(np.corrcoef(grades, comps)[0, 1])
            if np.isnan(corr):
                continue
            all_correlations.append({
                'discipline': disc,
                'competency_key': comp_key,
                'competency_name': COMP.names.get(comp_key, comp_key),
                'value': round(corr, 3),
                'abs_value': round(abs(corr), 3),
                'n': n,
                'direction': 'positive' if corr > 0 else ('negative' if corr < 0 else 'neutral'),
            })

        total_pairs = len(all_correlations)

        # Шаг 4. Сортировка и обрезка топ-N
        if sort_by == 'positive':
            filtered = [c for c in all_correlations if c['value'] > 0]
            filtered.sort(key=lambda c: c['value'], reverse=True)
        elif sort_by == 'negative':
            filtered = [c for c in all_correlations if c['value'] < 0]
            filtered.sort(key=lambda c: c['value'])
        else:
            filtered = list(all_correlations)
            filtered.sort(key=lambda c: c['abs_value'], reverse=True)

        top = filtered[:top_n]
        for i, item in enumerate(top, start=1):
            item['rank'] = i

        return JsonResponse({
            'status': 'success',
            'top': top,
            'params': {
                'top_n': top_n,
                'sort_by': sort_by,
                'min_n': min_n,
                'institute': institute,
                'specialty': specialty,
                'year': year,
            },
            'total_pairs': total_pairs,
            'total_disciplines': len(disciplines_set),
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'top': [],
            'total_pairs': 0,
        }, status=500)


def get_competency_segmentation(request):
    try:
        # Параметры
        competency = request.GET.get('competency')
        if not competency or competency not in COMP.list:
            return JsonResponse({
                'status': 'error',
                'message': f'Параметр competency обязателен и должен быть одним из: {COMP.list}',
            }, status=400)

        institute = request.GET.get('institute')
        specialty = request.GET.get('specialty')
        year = request.GET.get('year')

        try:
            motivator_threshold = int(request.GET.get('motivator_threshold', 600))
        except (TypeError, ValueError):
            motivator_threshold = 600

        # Фильтры
        results_filter = {}
        if institute:
            results_filter['res_institution__inst_name'] = institute
        if specialty:
            results_filter['res_edu_specialty__edu_spec_name'] = specialty
        if year:
            results_filter['res_year'] = year

        # Шаг 1. Берём студентов с непустой компетенцией
        # Получаем сразу все нужные поля (балл компетенции + все мотиваторы)
        select_fields = ['res_participant_id', competency] + list(MOT.list)
        results_qs = TestResults.objects.filter(**results_filter).exclude(
            **{f'{competency}__isnull': True}
        ).exclude(
            **{competency: 0}
        ).values(*select_fields)

        # Один студент мог сдавать несколько раз — берём первый
        results_map = {}
        for r in results_qs:
            results_map.setdefault(r['res_participant_id'], r)

        if not results_map:
            return JsonResponse({
                'status': 'success',
                'competency': competency,
                'competency_name': COMP.names.get(competency, competency),
                'total_n': 0,
                'q1': None,
                'q3': None,
                'groups': [],
                'message': 'Нет студентов под выбранные фильтры',
            })

        # Шаг 2. Считаем квартили распределения
        comp_values = np.array([r[competency] for r in results_map.values()], dtype=float)
        q1 = float(np.percentile(comp_values, 25))
        q3 = float(np.percentile(comp_values, 75))
        total_n = len(comp_values)

        # Шаг 3. Разбиваем студентов на 3 групп
        groups_def = [
            {'name': 'low',    'label': f'Низкий уровень (< {round(q1)})',         'lo': None, 'hi': q1},
            {'name': 'middle', 'label': f'Средний уровень ({round(q1)}–{round(q3)})', 'lo': q1,   'hi': q3},
            {'name': 'high',   'label': f'Высокий уровень (> {round(q3)})',        'lo': q3,   'hi': None},
        ]

        # Для каждой группы — множество participant_id
        group_participants = {g['name']: set() for g in groups_def}
        group_records = {g['name']: [] for g in groups_def}

        for pid, r in results_map.items():
            v = r[competency]
            if v < q1:
                grp = 'low'
            elif v > q3:
                grp = 'high'
            else:
                grp = 'middle'
            group_participants[grp].add(pid)
            group_records[grp].append(r)

        # Шаг 4. Подгружаем академические оценки один раз
        all_participant_ids = set(results_map.keys())
        perf_qs = AcademicPerformances.objects.filter(
            perf_participant_id__in=all_participant_ids
        ).values('perf_participant_id', 'perf_edu_discipline__edu_disc_name', 'perf_main')

        raw_grades = {g['name']: defaultdict(list) for g in groups_def}
        for perf in perf_qs:
            pid = perf['perf_participant_id']
            grade = perf['perf_main']
            if grade is None or grade == 1:
                continue
            disc = perf['perf_edu_discipline__edu_disc_name']
            if not disc:
                continue
            for g in groups_def:
                if pid in group_participants[g['name']]:
                    raw_grades[g['name']][disc].append(grade)
                    break

        # Шаг 5. Собираем итоговый JSON по группам
        groups_out = []
        for g in groups_def:
            records = group_records[g['name']]
            n = len(records)

            # Средний балл самой компетенции в группе
            if records:
                avg_competency = round(
                    float(np.mean([r[competency] for r in records])), 2
                )
            else:
                avg_competency = 0

            # Средние оценки по дисциплинам
            disc_avgs = []
            for disc, grades in raw_grades[g['name']].items():
                if len(grades) < 3:
                    continue
                disc_avgs.append({
                    'discipline': disc,
                    'avg': round(float(np.mean(grades)), 2),
                    'n': len(grades),
                })

            # Сортируем по убыванию средней оценки
            disc_avgs.sort(key=lambda x: x['avg'], reverse=True)

            # Топ-5 лучших + 2 худших (если дисциплин > 7)
            if len(disc_avgs) > 7:
                top_disc = disc_avgs[:5]
                bottom_disc = disc_avgs[-2:]
                # Помечаем для удобства фронта
                for d in top_disc:
                    d['kind'] = 'top'
                for d in bottom_disc:
                    d['kind'] = 'bottom'
                avg_grades = top_disc + bottom_disc
            else:
                for d in disc_avgs:
                    d['kind'] = 'top'
                avg_grades = disc_avgs

            # Топ-3 мотиваторов
            motiv_stats = []
            if n > 0:
                for mot_key in MOT.list:
                    # Считаем студентов в группе с баллом мотиватора >= threshold
                    high_count = sum(
                        1 for r in records
                        if r.get(mot_key) is not None and r.get(mot_key) >= motivator_threshold
                    )
                    percent = round(high_count / n * 100, 1) if n > 0 else 0
                    if percent > 0:
                        motiv_stats.append({
                            'key': mot_key,
                            'name': MOT.names.get(mot_key, mot_key),
                            'percent': percent,
                            'count': high_count,
                        })
                motiv_stats.sort(key=lambda x: x['percent'], reverse=True)
            top_motivators = motiv_stats[:3]

            groups_out.append({
                'name': g['name'],
                'label': g['label'],
                'range': [
                    None if g['lo'] is None else round(g['lo'], 1),
                    None if g['hi'] is None else round(g['hi'], 1),
                ],
                'n': n,
                'avg_competency': avg_competency,
                'avg_grades': avg_grades,
                'top_motivators': top_motivators,
            })

        return JsonResponse({
            'status': 'success',
            'competency': competency,
            'competency_name': COMP.names.get(competency, competency),
            'q1': round(q1, 1),
            'q3': round(q3, 1),
            'total_n': total_n,
            'motivator_threshold': motivator_threshold,
            'params': {
                'institute': institute,
                'specialty': specialty,
                'year': year,
            },
            'groups': groups_out,
        })

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'groups': [],
        }, status=500)
