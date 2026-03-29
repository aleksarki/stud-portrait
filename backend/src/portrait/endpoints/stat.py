from django.db.models import Avg, Count, Q, F
from django.http import JsonResponse
from portrait.models import Results, Participants, Course, Institutions
import traceback
        
comp_fields = [
    'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
    'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
    'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
    'res_comp_client_focus', 'res_comp_communication'
]

def get_year_metrics(year):
    res_queryset = Results.objects.filter(res_year=year)
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

    course_percent = (students_with_courses / total_students * 100) if total_students > 0 else 0

    return {
        "total_avg": round(total_avg, 2),
        "course_percent": round(course_percent, 1),
        "all_comps": {f: round(avgs.get(f'avg_{f}') or 0, 2) for f in comp_fields}
    }

def get_dashboard_stats(request):
    response_data = {}

    try:
        session_id = request.GET.get('session_id')
        inst_ids = request.GET.get('institutions', '')
        
        curr_year = "2025/2026"
        prev_year = "2024/2025"

        curr_data = get_year_metrics(curr_year)
        prev_data = get_year_metrics(prev_year)

        # прирост компетенций
        growth = 0
        if curr_data and prev_data:
            growth = ((curr_data['total_avg'] - prev_data['total_avg']) / prev_data['total_avg']) * 100

        # Лучший ВУЗ
        total_score_expression = sum(F(field) for field in comp_fields) / len(comp_fields)

        best_uni_data = Results.objects.filter(res_year=curr_year) \
            .values(uni_name=F('res_institution__inst_name')) \
            .annotate(overall_avg=Avg(total_score_expression)) \
            .order_by('-overall_avg') \
            .first()

        if best_uni_data:
            uni_name = best_uni_data['uni_name']
            uni_score = round(best_uni_data['overall_avg'] or 0, 2)
        else:
            uni_name = "Нет данных"
            uni_score = 0

        sorted_comps = sorted(curr_data['all_comps'].items(), key=lambda x: x[1], reverse=True)
        
        if not sorted_comps:
            best_comp = {"name": "Н/Д", "val": 0}
            worst_comp = {"name": "Н/Д", "val": 0}
        else:
            best_comp = {"name": sorted_comps[0][0], "val": sorted_comps[0][1]}
            worst_comp = {"name": sorted_comps[-1][0], "val": sorted_comps[-1][1]}

        response_data = {
            "status": "success",
            "col1": {
                "courses": {"val": curr_data['course_percent'], "prev": prev_data['course_percent']},
                "avg_lvl": {"val": curr_data['total_avg'], "prev": prev_data['total_avg']},
                "growth": {"val": round(growth, 1), "prev": 0} 
            },
            "col2": {
                "uni_name": uni_name,
                "uni_score": uni_score
            },
            "col3": {
                "best": best_comp,
                "worst": worst_comp
            },
            "chart": [{"name": k, "score": v} for k, v in curr_data['all_comps'].items()]
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

def get_motivation_stats(request):
    try:
        courses = [1, 2, 3, 4]
        results = {}
        
        for course in courses:
            qs = Results.objects.filter(res_course_num=course)
            if qs.exists():
                avgs = qs.aggregate(**{field: Avg(field) for field in MOT_FIELDS})
                results[course] = avgs
            else:
                results[course] = {f: 0 for f in MOT_FIELDS}

        chart_data = []
        for field in MOT_FIELDS:
            clean_name = field.replace('res_mot_', '').replace('_', ' ').capitalize()
            row = {"subject": clean_name}
            for course in courses:
                val = results[course].get(field) or 0
                row[f"course_{course}"] = round(float(val), 2)
            chart_data.append(row)
        response_data_={"status": "success", "data": chart_data}
        return JsonResponse(response_data_)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)