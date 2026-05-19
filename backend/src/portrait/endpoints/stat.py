from django.db.models import Avg, Count, Q, F
from django.http import JsonResponse
from portrait.models import Results, Participants, Course, Institutions
import traceback
from .common import *
import numpy as np
from collections import defaultdict

def get_year_metrics(year, filter):
    res_queryset = Results.objects.filter(res_year=year, **filter)
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

    participant_ids = list(res_queryset.values_list('res_participant__part_id', flat=True).distinct())
    total_students = res_queryset.values('res_participant').distinct().count()
    students_with_courses = Course.objects.filter(
        course_participant__in=participant_ids 
    ).count()
    
    for f in MOT.list: ## мотиваторы
        cnt_high = res_queryset.filter(**{f"{f}__gte": 600}).count() 
        if cnt_high>max_mot["count"]: 
            max_mot["count"]=cnt_high
            max_mot["name"]=f
        
        cnt_low = res_queryset.filter(**{f"{f}__lt": 400}).count() 
        if cnt_low>max_demot["count"]: 
            max_demot["count"]=cnt_low
            max_demot["name"]=f
    
    course_percent = (students_with_courses / total_students * 100) if total_students > 0 else 0
    students_uni = total_students * 1.2 #тут должны быть обучающиеся в унике вообще
    return {
        "total_avg": round(total_avg, 2),
        "course_percent": round(course_percent, 1),
        "all_comps": {f: round(avgs.get(f'avg_{f}') or 0, 2) for f in COMP.list},
        "motivator": max_mot,
        "demotivator" : max_demot,
        "participated" : {"amount_in": total_students, "students_all": students_uni}
    }

def filter_dash(request): 
    try:
        inst = request.GET.get('institute')   
        if inst:
            base=Results.objects.filter(res_institution__inst_name=inst)
            specialties=list(base.values_list('res_spec__spec_name', flat=True).distinct())
            years = base.values_list('res_year', flat=True).distinct()
        else:
            specialties = list(Results.objects.values_list('res_spec__spec_name', flat=True).distinct())
            years = Results.objects.values_list('res_year', flat=True).distinct()
        
        institutes = list(Results.objects.values_list('res_institution__inst_name', flat=True).distinct())
        
        data = {
            "institutes": [{"value": i, "label": str(i)} for i in institutes if i],
            "specialties": [{"value": s, "label": str(s)} for s in specialties if s],
            "years": [{"value": y, "label": str(y)} for y in years if y],
        }
        return JsonResponse({"status": "success", "data": data})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def overall_stats(request):
    response_data={}
    try:
        unis = Results.objects.values_list('res_institution__inst_name', flat=True).distinct().count()
        results = Results.objects.values_list().distinct().count()
        centers = Results.objects.values_list('res_center', flat=True).distinct().count()
        years = Results.objects.values_list('res_year', flat=True).distinct()
        min_year = 3000
        max_year = 0
        for i in years:
            year=int(i.split('/')[0])
            min_year=min(min_year, year)
            max_year=max(max_year, year+1)
        response_data = {
            "status": "success", 
            'unis':unis,
            'results':results,
            'centers':centers,
            'years': {'min':min_year, 'max':max_year}
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
        if spec: base_filter['res_spec__spec_name'] = spec
        
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

        unis = Results.objects.filter(res_year=curr_year)         \
            .values_list('res_institution__inst_name', flat=True) \
            .distinct()

        rate_list = []
        for uni in unis:
            rows_data = Results.objects                                     \
                .filter(res_year=curr_year, res_institution__inst_name=uni) \
                .values_list(*COMP.list)
            rows=np.array([np.array([np.nan if i==0 else i for i in row]) for row in rows_data]).astype(float)
            avg = np.mean(np.delete(rows, np.where(np.isnan(rows))))
            rate_list.append({'uni_name': uni, 'overall_avg': round(avg,3)})
        rate_list=sorted(
            rate_list,
            key=lambda x: (x['overall_avg'] is None, -(x['overall_avg'] or 0))
        )
        if inst: #место выбранного в %
            place=[i for i, item in enumerate(rate_list) if item['uni_name'] == inst]
            if len(place)>0:
                uni_place = place[0]/len(rate_list) * 100
            else: uni_place = -1
            uni_score = curr_data['total_avg']
            uni_name = inst

        else: 
            uni_place = 0
            best_uni = next((r for r in rate_list if r['overall_avg'] is not None), None) #Лучший ВУЗ
            
            if best_uni:
                uni_name = best_uni['uni_name']
                uni_score = best_uni['overall_avg']
            else:
                uni_name = "Нет данных"
                uni_score = 0
        print(uni_name, uni_place, uni_score)
        sorted_comps = sorted(curr_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        sorted_comps_prev = sorted(prev_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_comps:
            best_comp = {"name": "-", "val": 0}
            worst_comp = {"name": "-", "val": 0}
            best_comp = {"name": "-", "val": 0}
            worst_comp = {"name": "-", "val": 0}
        else:
            best_comp_prev = {"name": sorted_comps_prev[0][0], "val": prev_data['all_comps'][sorted_comps_prev[0][0]]}
            worst_comp_prev = {"name": sorted_comps_prev[-1][0], "val": prev_data['all_comps'][sorted_comps_prev[-1][0]]}
            best_comp = {"name": sorted_comps[0][0], "val": sorted_comps[0][1]}
            worst_comp = {"name": sorted_comps[-1][0], "val": sorted_comps[-1][1]}
        chart=[]
        for k, v in curr_data['all_comps'].items():
            delta=v-prev_data['all_comps'][k]
            if prev_data['all_comps'][k]==0:
                delta=0
            chart.append({"name": k, "score": v, "prev_score": prev_data['all_comps'][k]})
            #table.append({"name": k, "score": v, "prev_score": prev_data['all_comps'][k], "delta": delta})
        
        base_filter['res_year'] = curr_year
        radar=get_competency_stats_courses(base_filter) #radar
        
        motiv={'name':{'prev': '-', 'curr':'-'}, 'count': {'prev': 0, 'curr': 0}}
        
        #топ мотиватор
        if prev_data["motivator"]["name"]==curr_data["motivator"]["name"]:
            motiv['name']={'prev': curr_data["motivator"]["name"], 'curr': curr_data["motivator"]["name"]}
            motiv['count']={'prev':prev_data["motivator"]["count"], 'curr':curr_data["motivator"]["count"]}
        else:
            motiv['name']={'prev':prev_data["motivator"]["name"], 'curr':curr_data["motivator"]["name"]}
            motiv['count']={'prev':prev_data["motivator"]["count"], 'curr':curr_data["motivator"]["count"]}
        
        #демотиватор
        demotiv={'name':{'prev': '-', 'curr':'-'}, 'count': {'prev': 0, 'curr': 0}}
        if prev_data["demotivator"]["name"]==curr_data["demotivator"]["name"]:
            demotiv['name']={'prev': curr_data["demotivator"]["name"], 'curr': curr_data["demotivator"]["name"]}
            demotiv['count']={'prev':prev_data["demotivator"]["count"], 'curr':curr_data["demotivator"]["count"]}
        else:
            demotiv['name']={'prev':prev_data["demotivator"]["name"], 'curr':curr_data["demotivator"]["name"]}
            demotiv['count']={'prev':prev_data["demotivator"]["count"], 'curr':curr_data["demotivator"]["count"]}
        

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


def get_competency_stats_courses(filter):
    courses = [1, 2, 3, 4]
    results = {}
    main = Results.objects.filter(**filter)
    for course in courses:
        qs = main.filter(res_course_num=course)
        if qs.exists():
            avgs = qs.aggregate(**{field: Avg(field) for field in COMP.list})
            results[course] = avgs
        else:
            results[course] = {f: 0 for f in COMP.list}
    #print(results)
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
        if spec: base_filter['res_spec__spec_name'] = spec
        if year:    base_filter['res_year'] = year
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
                                
                cnt_all = Results.objects.filter(res_course_num=course, **base_filter)
                cnt_low = cnt_all.filter(**{f"{field}__lt": 400}).count() 
                cnt_high = cnt_all.filter(**{f"{field}__gte": 600}).count() 
                cnt_mid = cnt_all.count() - cnt_low - cnt_high

                cnt_all_all += cnt_all.count() 
                cnt_low_all += cnt_low
                cnt_high_all += cnt_high
                cnt_mid_all += cnt_mid

                row[f"course_{course}_high"] = cnt_low/cnt_all.count() if (cnt_all !=0) else 0
                row[f"course_{course}_low"] = cnt_high/cnt_all.count() if (cnt_all !=0) !=0 else 0
                row[f"course_{course}_mid"] = cnt_mid/cnt_all.count() if cnt_all !=0 else 0
            row["all_high"] = cnt_high_all/cnt_all_all if cnt_all_all!=0 else 0
            row["all_low"] = cnt_low_all/cnt_all_all if cnt_all_all!=0 else 0
            row["all_mid"] = cnt_mid_all/cnt_all_all if cnt_all_all!=0 else 0
            bar_data.append(row)

        response_data={"status": "success", "data": bar_data}
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

scores={
    'неудовл.':2,
    'удовл.':3,
    'хор.':4,
    'отл.':5
}

@cached()
def get_scores_result(request):
    try:
        print(Academicperformance.objects.count())
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_spec__spec_name'] = spec
        if year:    base_filter['res_year'] = year

        main = Results.objects.filter(**base_filter)
        if not main:
            response_data={"status": "success", "data": 0, "names": 0}
            return JsonResponse(response_data) 
        participant_ids = list(main.values_list('res_participant__part_id', flat=True).distinct())
        result=[]
        avgs = {}
        avgs_qs = (
            main
            .values('res_participant__part_id')
            .annotate(**{f'avg_{f}': Avg(f) for f in COMP.list})
        )
        avgs = {
            r['res_participant__part_id']: round(
                sum(r[f'avg_{f}'] or 0 for f in COMP.list) / len(COMP.list)
            )
            for r in avgs_qs
        }
        ap = Academicperformance.objects.filter(
            perf_part__in=participant_ids
        ).values('perf_part_id', 'perf_discipline', 'perf_main_attestation')

        #disciplines = list({r['perf_discipline'] for r in ap})
        disciplines = ['ПИР','УП','Эксплуатационная практика','Преддипломная практика']
        by_discipline = defaultdict(list)
        comp_by_part=defaultdict(list)
        
        for record in ap:
            pid = record['perf_part_id']
            avg=avgs.get(pid)
            grade=scores.get(record['perf_main_attestation'])
            if avg is None or grade is None or avg <200:
                continue
            comp_by_part[pid] = {
                field: int(record.get(field)) if record.get(field) is not None else None
                for field in COMP.list
            }
            by_discipline[record['perf_discipline']].append({
                'participant_id': pid,
                'grade': grade,
                'avg': avg,
                **comp_by_part.get(pid, {}),
            })

        result = [
            {'discipline': disc, 'participants': parts}
            for disc, parts in by_discipline.items()
        ]
        #print('we tuta1?')  ## lol what # )))
        response_data={"status": "success", "data": result, "names":disciplines}
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
        int(np.min(non_outliers)), 
        int(q1),
        int(np.percentile(arr, 50)),
        int(q3),
        int(np.max(non_outliers)),  
    ], outliers

def get_data_boxplot(request):
    try:
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_spec__spec_name'] = spec
        if year:    base_filter['res_year'] = year
        
        data_all = list(  
            Results.objects.filter(**base_filter)
            .values('res_participant__part_id', *COMP.list)
        )
        data=[]
        for f in COMP.list:
            values = [row[f] for row in data_all]
            ids    = [row['res_participant__part_id'] for row in data_all]
            box, outliers = calc_boxplot(values, ids)
            if box:
                data.append({
                    'comp': f,
                    'box': box,  # min, q1, median, q3, max
                    'out': outliers #выбросы
                })
        response_data={"status": "success", "data": data}
        return JsonResponse(response_data) 
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
    g = str(grade_str).strip().lower()
    return ATTESTATION_MAP.get(g)


def get_grades_competency_correlation(request):
    try:
        from portrait.models import Academicperformance, Results
        # Шаг 1: соберём все оценки из Academicperformance + соответствующий результат компетенции
        perf_qs = Academicperformance.objects.select_related('perf_part').all()
        pairs_data = defaultdict(list)
        scatter_data = []
        results_map = {}
        results_qs = Results.objects.values(
            'res_participant_id', *COMP_KEYS
        )
        for r in results_qs:
            results_map.setdefault(r['res_participant_id'], r)
        
        disciplines_set = set()
        for perf in perf_qs.values('perf_part_id', 'perf_discipline', 'perf_main_attestation'):
            grade_num = _grade_to_number(perf['perf_main_attestation'])
            if grade_num is None:
                continue
            
            res = results_map.get(perf['perf_part_id'])
            if res is None:
                continue
            
            disc = perf['perf_discipline']
            disciplines_set.add(disc)
            
            for comp_key in COMP_KEYS:
                comp_val = res.get(comp_key)
                if comp_val is None:
                    continue
                pairs_data[(disc, comp_key)].append((grade_num, comp_val))
        
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


def get_competency_trend_by_year(request):
    try:
        filters = {}
        inst = request.GET.get('institute')
        spec = request.GET.get('specialty')
        if inst:
            filters['res_institution__inst_name'] = inst
        if spec:
            filters['res_spec__spec_name'] = spec
        
        results_qs = Results.objects.filter(**filters).exclude(res_course_num__isnull=True)
        
        courses = sorted(
            results_qs.values_list('res_course_num', flat=True).distinct()
        )
        
        trends = []
        for comp_key in COMP_KEYS:
            points = []
            for course_num in courses:
                course_qs = results_qs.filter(
                    res_course_num=course_num
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
