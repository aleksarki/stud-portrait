from django.db.models import Avg, Count, Q, F
from django.http import JsonResponse
from portrait.models import Results, Participants, Course, Institutions
import traceback
from .common import *

comp_fields = [
    'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
    'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
    'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
    'res_comp_client_focus', 'res_comp_communication'
]

def get_year_metrics(year, filter):
    res_queryset = Results.objects.filter(res_year=year, **filter)
    if not res_queryset.exists():
        return {
            "total_avg": 0,
            "course_percent": 0,
            "all_comps": {f: 0 for f in comp_fields}
        }
    avgs = res_queryset.aggregate(**{f'avg_{f}': Avg(f) for f in comp_fields})
    
    valid_values = [v for v in avgs.values() if v is not None]
    total_avg = sum(valid_values) / len(comp_fields) if valid_values else 0

    total_students = res_queryset.values('res_participant').distinct().count()
    
    students_with_courses = Course.objects.filter(
        course_participant__results__res_year=year
    ).values('course_participant').distinct().count()
    
    max_mot={'name': "", 'count': 0}
    for f in MOT_FIELDS:
        cnt_high = res_queryset.filter(**{f"{f}__gte": 600}).count() #!!! нужен наибольший мотиватор. можно взять самый популярный кст
        if cnt_high>max_mot['count']: 
            max_mot['count']=cnt_high
            max_mot['name']=f

    course_percent = (students_with_courses / total_students * 100) if total_students > 0 else 0
    students_uni = total_students * 1.2 #тут должны быть обучающиеся в унике вообще
    return {
        "total_avg": round(total_avg, 2),
        "course_percent": round(course_percent, 1),
        "all_comps": {f: round(avgs.get(f'avg_{f}') or 0, 2) for f in comp_fields},
        "motivator": max_mot,
        "participated" : {"amount_in": total_students, "students_all": students_uni}
    }

def filter_dash(request):
    try:
        institutes = list(Results.objects.values_list('res_institution__inst_name', flat=True).distinct())
        specialties = Results.objects.values_list('res_spec__spec_name', flat=True).distinct()
        years = Results.objects.values_list('res_year', flat=True).distinct()
        
        data = {
            "institutes": [{"value": i, "label": str(i)} for i in institutes if i],
            "specialties": [{"value": s, "label": str(s)} for s in specialties if s],
            "years": [{"value": y, "label": str(y)} for y in years if y],
        }
        return JsonResponse({"status": "success", "data": data})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def get_dashboard_stats(request):
    response_data = {}

    try:
        inst = request.GET.get('institute')
        spec = request.GET.get('speciality')
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

        
        total_score_expression = sum(F(field) for field in comp_fields) / len(comp_fields)

        rate_uni_data = Results.objects.filter(res_year=curr_year) \
            .values(uni_name=F('res_institution__inst_name')) \
            .annotate(overall_avg=Avg(total_score_expression)) \
            .order_by('-overall_avg')
        rate_list=list(rate_uni_data)
        if inst: #место выбранного в %
            uni_place = (next((i for i, item in enumerate(rate_list) if item.get('uni_name') == inst), -1)+1)/len(rate_list) * 100
            uni_score = curr_data['total_avg']
            uni_name = inst
        else: 
            uni_place = 0
            best_uni_data = rate_uni_data.first() #Лучший ВУЗ
        
            if best_uni_data:
                uni_name = best_uni_data['uni_name']
                uni_score = round(best_uni_data['overall_avg'] or 0, 2)
            else:
                uni_name = "Нет данных"
                uni_score = 0

        sorted_comps = sorted(curr_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        sorted_comps_prev = sorted(prev_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_comps:
            best_comp = {"name": "-", "val": 0}
            worst_comp = {"name": "-", "val": 0}
            best_comp = {"name": "-", "val": 0}
            worst_comp = {"name": "-", "val": 0}
        else:
            best_comp_prev = {"name": sorted_comps[0][0], "val": prev_data['all_comps'][sorted_comps[0][0]]}
            worst_comp_prev = {"name": sorted_comps[-1][0], "val": prev_data['all_comps'][sorted_comps[-1][0]]}
            best_comp = {"name": sorted_comps[0][0], "val": sorted_comps[0][1]}
            worst_comp = {"name": sorted_comps[-1][0], "val": sorted_comps[-1][1]}
        chart=[]
        for k, v in curr_data['all_comps'].items():
            chart.append({"name": k, "score": v, "prev_score": prev_data['all_comps'][k]})
        
        base_filter['res_year'] = curr_year
        radar=get_competency_stats_courses(base_filter) #radar
        
        motiv={'same':True, 'name':{'prev': '-', 'curr':'-'}, 'count': {'prev': 0, 'curr': 0}}
        #топ мотиватор
        if prev_data['motivator']['name']==curr_data['motivator']['name']:
            motiv['same']=True
            motiv['name']={'prev': curr_data['motivator']['name'], 'curr': curr_data['motivator']['name']}
            motiv['count']={'prev':prev_data['motivator']['count'], 'curr':curr_data['motivator']['count']}
        else:
            motiv['same']=False
            motiv['name']={'prev':prev_data['motivator']['name'], 'curr':curr_data['motivator']['name']}
            motiv['count']={'prev':prev_data['motivator']['count'], 'curr':curr_data['motivator']['count']}

        response_data = {
            "status": "success",
            "col1": {
                "courses": {"val": curr_data['course_percent'], "prev": prev_data['course_percent']},
                "avg_lvl": {"val": curr_data['total_avg'], "prev": prev_data['total_avg']},
                "growth": {"val": round(growth, 1), "prev": 0},
                "motiv": motiv
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


MOT_FIELDS = [
    'res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
    'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
    'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
    'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions'
]


def get_competency_stats_courses(filter):
    courses = [1, 2, 3, 4]
    results = {}
    main = Results.objects.filter(**filter)
    for course in courses:
        qs = main.filter(res_course_num=course)
        if qs.exists():
            avgs = qs.aggregate(**{field: Avg(field) for field in comp_fields})
            results[course] = avgs
        else:
            results[course] = {f: 0 for f in comp_fields}
    #print(results)
    chart_data = []
    for field in comp_fields:
        row = {"name": field}
        for course in courses:
            val = results[course].get(field) or 0
            row[f"course_{course}"] = round(float(val), 2)
        chart_data.append(row)
    return chart_data


def get_motivation_counts(request):
    try:
        
        inst = request.GET.get('institute')
        spec = request.GET.get('speciality')
        year = request.GET.get('year')

        base_filter = {}
        if inst: base_filter['res_institution__inst_name'] = inst
        if spec: base_filter['res_spec__spec_name'] = spec
        if year:    base_filter['res_year'] = year
        courses = [1, 2, 3, 4]
        results = {}
        
        for course in courses:
            results[course] = {'low': {f: 0 for f in MOT_FIELDS},
                                'high': {f: 0 for f in MOT_FIELDS}}
            for field in MOT_FIELDS:
                cnt_low = Results.objects.filter(res_course_num=course, **base_filter).filter(**{f"{field}__lt": 400})
                cnt_high = Results.objects.filter(res_course_num=course, **base_filter).filter(**{f"{field}__gte": 600})
        
                if cnt_low.exists():
                    results[course]['low'][field] = cnt_low.count()
                if cnt_high.exists():
                    results[course]['high'][field] = cnt_high.count()
        bar_data = []
        for field in MOT_FIELDS:
            row = {"name": field}
            for course in courses:
                row[f"course_{course}_high"] = results[course]['high'].get(field, 0)
                row[f"course_{course}_low"] = results[course]['low'].get(field, 0)
            bar_data.append(row)
        #print("DATA:", results)
        response_data={"status": "success", "data": bar_data}
        return JsonResponse(response_data)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
