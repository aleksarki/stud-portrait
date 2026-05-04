from django.db.models import Avg, Count, Q, F
from django.http import JsonResponse
from portrait.models import Results, Participants, Course, Institutions
import traceback
from .common import *
import numpy as np

comp_fields = [
    'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
    'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
    'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
    'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab'
]

def get_year_metrics(year, filter):
    res_queryset = Results.objects.filter(res_year=year, **filter)
    max_mot={"name": "-", "count": 0}
    if not res_queryset.exists():
        return {
            "total_avg": 0,
            "course_percent": 0,
            "all_comps": {f: 0 for f in comp_fields},
            "motivator": max_mot,
            "participated" : {"amount_in": 0, "students_all": 0}
        }
    avgs = res_queryset.aggregate(**{f'avg_{f}': Avg(f) for f in comp_fields})
    
    valid_values = [v for v in avgs.values() if v is not None]
    total_avg = sum(valid_values) / len(comp_fields) if valid_values else 0

    participant_ids = list(res_queryset.values_list('res_participant__part_id', flat=True).distinct())
    total_students = res_queryset.values('res_participant').distinct().count()
    students_with_courses = Course.objects.filter(
        course_participant__in=participant_ids 
    ).count()
    
    for f in MOT_FIELDS:
        cnt_high = res_queryset.filter(**{f"{f}__gte": 600}).count() 
        if cnt_high>max_mot["count"]: 
            max_mot["count"]=cnt_high
            max_mot["name"]=f
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
        specialties = list(Results.objects.values_list('res_spec__spec_name', flat=True).distinct())
        years = Results.objects.values_list('res_year', flat=True).distinct()
        
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

        unis = Results.objects.filter(res_year=curr_year) \
            .values_list('res_institution__inst_name', flat=True) \
            .distinct()

        rate_list = []
        for uni in unis:
            rows_data = Results.objects.filter(res_year=curr_year, res_institution__inst_name=uni) \
                    .values_list(*comp_fields)
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
        table=[]
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
        spec = request.GET.get('specialty')
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
    
def get_scores_result(request):
    try:


        response_data={"status": "success", "data": 0}
        return JsonResponse(response_data) 
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
