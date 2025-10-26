from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Students, Results

# Create your views here.

successResponse = lambda d: JsonResponse({**{"status": "success"}, **d})
errorResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=400)
notFoundResponse = lambda m: JsonResponse({"status": "error", "message": m}, status=404)
notAllowedResponse = lambda: JsonResponse({"status": "error", "message": "Method not allowed"}, status=405)
exceptionResponse = lambda e: JsonResponse({"status": "error", "message": str(e)}, status=500)

@csrf_exempt
def students(request):
    if request.method == 'GET':
        try:
            students_list = [
                {
                    "stud_id": student.stud_id,
                    "stud_name": student.stud_name,
                    "stud_enter_year": student.stud_enter_year,
                    "stud_major": student.stud_major,
                    "stud_edu_instit": student.stud_edu_instit
                }
                for student in Students.objects.all()
            ]
            return successResponse({"students": students_list})
        
        except Exception as e:
            return exceptionResponse(e)
    
    return notAllowedResponse()

@csrf_exempt
def results(request):
    if request.method == 'GET':
        stud_id = request.GET.get('stud_id')
        
        if not stud_id:
            return errorResponse("Parameter stud_id is required")
                
        try:
            stud_id = int(stud_id)
            
            try:
                student = Students.objects.get(stud_id=stud_id)
            except Students.DoesNotExist:
                return notFoundResponse("Student not found")
            
            results_list = []
            for result in Results.objects.filter(res_stud_id=stud_id):
                result_data = {
                    'res_id': result.res_id,
                    'res_year': result.res_year,
                    # Универсальный личностный опросник
                    'res_uni_communication': result.res_uni_communication,
                    'res_uni_complex_thinking': result.res_uni_complex_thinking,
                    'res_uni_command_work': result.res_uni_command_work,
                    'res_uni_methodicalness': result.res_uni_methodicalness,
                    'res_uni_stress_susceptib': result.res_uni_stress_susceptib,
                    'res_uni_ambitousness': result.res_uni_ambitousness,
                    'res_uni_rules_compliance': result.res_uni_rules_compliance,
                    # Мотивационно-ценностный профиль
                    'res_mot_purpose': result.res_mot_purpose,
                    'res_mot_cooperation': result.res_mot_cooperation,
                    'res_mot_creativity': result.res_mot_creativity,
                    'res_mot_challenge': result.res_mot_challenge,
                    'res_mot_autonomy': result.res_mot_autonomy,
                    'res_mot_self_development': result.res_mot_self_development,
                    'res_mot_recognition': result.res_mot_recognition,
                    'res_mot_career': result.res_mot_career,
                    'res_mot_management': result.res_mot_management,
                    'res_mot_altruism': result.res_mot_altruism,
                    'res_mot_relationships': result.res_mot_relationships,
                    'res_mot_affiliation': result.res_mot_affiliation,
                    'res_mot_tradition': result.res_mot_tradition,
                    'res_mot_health': result.res_mot_health,
                    'res_mot_stability': result.res_mot_stability,
                    'res_mot_salary': result.res_mot_salary,
                    # Компетенции
                    'res_comp_digital_analysis': result.res_comp_digital_analysis,
                    'res_comp_verbal_analysis': result.res_comp_verbal_analysis,
                    # Жизнестойкость
                    'res_vita_positive_self_attit': result.res_vita_positive_self_attit,
                    'res_vita_attit_twrd_future': result.res_vita_attit_twrd_future,
                    'res_vita_organization': result.res_vita_organization,
                    'res_vita_persistence': result.res_vita_persistence,
                    # Ценностные установки лидера
                    'res_lead_awareness': result.res_lead_awareness,
                    'res_lead_proactivity': result.res_lead_proactivity,
                    'res_lead_command_work': result.res_lead_command_work,
                    'res_lead_control': result.res_lead_control,
                    'res_lead_social_responsib': result.res_lead_social_responsib,
                    # Индивидуальный профиль
                    'res_prof_information_analysis': result.res_prof_information_analysis,
                    'res_prof_result_orientation': result.res_prof_result_orientation,
                    'res_prof_planning': result.res_prof_planning,
                    'res_prof_stress_resistance': result.res_prof_stress_resistance,
                    'res_prof_partnership': result.res_prof_partnership,
                    'res_prof_rules_compliance': result.res_prof_rules_compliance,
                    'res_prof_self_development': result.res_prof_self_development,
                    'res_prof_communication': result.res_prof_communication,
                }
                results_list.append(result_data)
            
            return successResponse({
                "student": {
                    "stud_id": student.stud_id,
                    "stud_name": student.stud_name
                },
                "results": results_list
            })
            
        except ValueError:
            return errorResponse("stud_id must be an integer")

        except Exception as e:
            return exceptionResponse(e)
    
    return notAllowedResponse()
