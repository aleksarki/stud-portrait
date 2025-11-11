import json
import openpyxl

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction



from .models import (
    Participants, Competencecenters, Institutions,
    Educationlevels, Studyforms, Specialties,
    Results, Course
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

def clean_value(value, value_type="str"):
    """
    Преобразует данные из Excel к нормальному виду:
    - заменяет "-", "Отсутствует" и т.п. на None
    - преобразует числа из строк (в т.ч. с запятой)
    - убирает пробелы
    """
    if value is None:
        return None

    # Приводим к строке и чистим пробелы
    s = str(value).strip()

    # Маркеры отсутствующих значений
    empty_markers = {"", "-", "–", "—", "Отсутствует", "н/д", "н/п", "нет", "na", "n/a"}
    if s.lower() in {m.lower() for m in empty_markers}:
        return None

    # Тип int
    if value_type == "int":
        try:
            return int(float(s.replace(",", ".")))
        except ValueError:
            return None

    # Тип float / decimal
    if value_type == "float":
        try:
            return float(s.replace(",", "."))
        except ValueError:
            return None

    # Строка
    return s or None

@method('GET')
@response
@csrf_exempt
def students(request):
    students_list = [
        {
            "stud_id": student.stud_id,
            "stud_name": student.stud_name,
            "stud_enter_year": student.stud_enter_year,
            "stud_program": {
                "prog_id": student.stud_program.prog_id,
                "prog_name": student.stud_program.prog_name
            },
            "stud_institution": {
                "inst_id": student.stud_institution.inst_id,
                "inst_name": student.stud_institution.inst_name
            }
        }
        for student in Students.objects.all().select_related('stud_program', 'stud_institution')
    ]
    return {"students": students_list}


@method('GET')
@csrf_exempt
def results(request):
    stud_id = request.GET.get('stud_id')
    
    if not stud_id:
        return errorResponse("Parameter stud_id is required")
            
    try:
        stud_id = int(stud_id)
        
        try:
            student = Students.objects.select_related('stud_program', 'stud_institution').get(stud_id=stud_id)
        except Students.DoesNotExist:
            return notFoundResponse("Student not found")
        
        results_list = []
        for result in Results.objects.filter(res_stud_id=stud_id):
            result_data = {
                'res_id': result.res_id,
                'res_year': result.res_year,
                # Универсальный личностный опросник
                'universal' : {
                    'res_uni_communication': result.res_uni_communication,
                    'res_uni_complex_thinking': result.res_uni_complex_thinking,
                    'res_uni_command_work': result.res_uni_command_work,
                    'res_uni_methodicalness': result.res_uni_methodicalness,
                    'res_uni_stress_susceptib': result.res_uni_stress_susceptib,
                    'res_uni_ambitousness': result.res_uni_ambitousness,
                    'res_uni_rules_compliance': result.res_uni_rules_compliance
                },
                # Мотивационно-ценностный профиль
                'motivation': {
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
                    'res_mot_salary': result.res_mot_salary
                },
                # Компетенции
                'competence' : {
                    'res_comp_digital_analysis': result.res_comp_digital_analysis,
                    'res_comp_verbal_analysis': result.res_comp_verbal_analysis
                },
                # Жизнестойкость
                'vitality': {
                    'res_vita_positive_self_attit': result.res_vita_positive_self_attit,
                    'res_vita_attit_twrd_future': result.res_vita_attit_twrd_future,
                    'res_vita_organization': result.res_vita_organization,
                    'res_vita_persistence': result.res_vita_persistence
                },
                # Ценностные установки лидера
                'leadership': {
                    'res_lead_awareness': result.res_lead_awareness,
                    'res_lead_proactivity': result.res_lead_proactivity,
                    'res_lead_command_work': result.res_lead_command_work,
                    'res_lead_control': result.res_lead_control,
                    'res_lead_social_responsib': result.res_lead_social_responsib
                },
                # Индивидуальный профиль
                'profile': {
                    'res_prof_information_analysis': result.res_prof_information_analysis,
                    'res_prof_result_orientation': result.res_prof_result_orientation,
                    'res_prof_planning': result.res_prof_planning,
                    'res_prof_stress_resistance': result.res_prof_stress_resistance,
                    'res_prof_partnership': result.res_prof_partnership,
                    'res_prof_rules_compliance': result.res_prof_rules_compliance,
                    'res_prof_self_development': result.res_prof_self_development,
                    'res_prof_communication': result.res_prof_communication
                },
                # Ценностные ориентации
                'values': {
                    'res_val_honesty_justice': result.res_val_honesty_justice,
                    'res_val_humanism': result.res_val_humanism,
                    'res_val_patriotism': result.res_val_patriotism,
                    'res_val_family': result.res_val_family,
                    'res_val_health': result.res_val_health,
                    'res_val_environment': result.res_val_environment
                }
            }
            results_list.append(result_data)
        # 
        return successResponse({
            "student": {
                "stud_id": student.stud_id,
                "stud_name": student.stud_name,
                "stud_enter_year": student.stud_enter_year,
                "stud_program": {
                    "prog_id": student.stud_program.prog_id,
                    "prog_name": student.stud_program.prog_name
                },
                "stud_institution": {
                    "inst_id": student.stud_institution.inst_id,
                    "inst_name": student.stud_institution.inst_name
                }
            },
            "results": results_list
        })
        
    except ValueError:
        return errorResponse("stud_id must be an integer")

    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@response
@csrf_exempt
def institutions(request):
    institutions_list = [
        {
            "inst_id": institution.inst_id,
            "inst_name": institution.inst_name
        }
        for institution in Institutions.objects.all()
    ]
    return {"institutions": institutions_list}


@method('GET')
@response
@csrf_exempt
def programs(request):
    programs_list = [
        {
            "prog_id": program.prog_id,
            "prog_name": program.prog_name
        }
        for program in Programs.objects.all()
    ]
    return {"programs": programs_list}

@method('POST')
@csrf_exempt
@csrf_exempt
def import_excel(request):
    if request.method != "POST":
        return JsonResponse({"error": "Use POST"}, status=405)

    excel_file = request.FILES.get("file")
    if not excel_file:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    config_json = request.POST.get("config_json")
    if not config_json:
        return JsonResponse({"error": "Missing config_json"}, status=400)

    try:
        config = json.loads(config_json)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON in config_json"}, status=400)

    wb = openpyxl.load_workbook(excel_file, data_only=True)

    created_count = 0
    updated_count = 0

    with transaction.atomic():
        for sheet_info in config["sheets"]:
            sheet_name = sheet_info["name"]
            start_row = sheet_info["start_row"]
            columns = sheet_info["columns"]
            ws = wb[sheet_name]

            print(f"\n=== Обработка листа: {sheet_name} ===")

            for row in ws.iter_rows(min_row=start_row):
                # Проверка на "Итог"
                b_value = row[1].value
                if b_value and str(b_value).strip().lower() == "итог":
                    print(f"⛔ Достигнут итоговый ряд — стоп для {sheet_name}")
                    break

                def get_col(col_letter):
                    if not col_letter:
                        return None
                    cell = row[openpyxl.utils.column_index_from_string(col_letter) - 1]
                    return cell.value

                row_data = {k: get_col(v) for k, v in columns.items()}

                # === Сравнение по компетенциям ===
                if sheet_name == "Сравнение по компетенциям":
                    center_name = clean_value(row_data.get("center_name"))
                    if not center_name:
                        continue

                    center, _ = Competencecenters.objects.get_or_create(center_name=center_name)
                    institution = None
                    if (inst_name := clean_value(row_data.get("inst_name"))):
                        institution, _ = Institutions.objects.get_or_create(inst_name=inst_name)
                    edu_level = None
                    if (edu_level_name := clean_value(row_data.get("edu_level_name"))):
                        edu_level, _ = Educationlevels.objects.get_or_create(edu_level_name=edu_level_name)
                    form = None
                    if (form_name := clean_value(row_data.get("form_name"))):
                        form, _ = Studyforms.objects.get_or_create(form_name=form_name)
                    spec = None
                    if (spec_name := clean_value(row_data.get("spec_name"))):
                        spec, _ = Specialties.objects.get_or_create(spec_name=spec_name)

                    participant_name = clean_value(row_data.get("part_name"))
                    if not participant_name:
                        continue

                    participant, created = Participants.objects.get_or_create(
                        part_name=participant_name,
                        defaults={
                            "part_gender": clean_value(row_data.get("part_gender")),
                            "part_institution": institution,
                            "part_spec": spec,
                            "part_edu_level": edu_level,
                            "part_form": form,
                            "part_course_num": clean_value(row_data.get("part_course_num"), "int"),
                        },
                    )

                    # Создаём или обновляем результат
                    result, created_res = Results.objects.get_or_create(
                        res_participant=participant,
                        defaults={
                            "res_center": center,
                            "res_institution": institution,
                            "res_edu_level": edu_level,
                            "res_form": form,
                            "res_spec": spec,
                            "res_course_num": clean_value(row_data.get("res_course_num"), "int"),
                            "res_year": clean_value(row_data.get("res_year")),
                            "res_high_potential": clean_value(row_data.get("res_high_potential")),
                            "res_summary_report": clean_value(row_data.get("res_summary_report")),
                        },
                    )

                    # Обновляем компетенции
                    Results.objects.filter(pk=result.pk).update(
                        res_comp_info_analysis=clean_value(row_data.get("res_comp_info_analysis"), "int"),
                        res_comp_planning=clean_value(row_data.get("res_comp_planning"), "int"),
                        res_comp_result_orientation=clean_value(row_data.get("res_comp_result_orientation"), "int"),
                        res_comp_stress_resistance=clean_value(row_data.get("res_comp_stress_resistance"), "int"),
                        res_comp_partnership=clean_value(row_data.get("res_comp_partnership"), "int"),
                        res_comp_rules_compliance=clean_value(row_data.get("res_comp_rules_compliance"), "int"),
                        res_comp_self_development=clean_value(row_data.get("res_comp_self_development"), "int"),
                        res_comp_leadership=clean_value(row_data.get("res_comp_leadership"), "int"),
                        res_comp_emotional_intel=clean_value(row_data.get("res_comp_emotional_intel"), "int"),
                        res_comp_client_focus=clean_value(row_data.get("res_comp_client_focus"), "int"),
                        res_comp_communication=clean_value(row_data.get("res_comp_communication"), "int"),
                        res_comp_passive_vocab=clean_value(row_data.get("res_comp_passive_vocab"), "int"),
                    )
                    created_count += 1

                # === Мотивационный профиль ===
                elif sheet_name == "Мотивационный профиль":
                    participant_name = clean_value(row_data.get("part_name"))
                    if not participant_name:
                        continue

                    try:
                        participant = Participants.objects.get(part_name=participant_name)
                    except Participants.DoesNotExist:
                        print(f"❌ Не найден участник '{participant_name}', пропуск")
                        continue

                    Results.objects.filter(res_participant=participant).update(
                        res_mot_autonomy=clean_value(row_data.get("res_mot_autonomy"), "float"),
                        res_mot_altruism=clean_value(row_data.get("res_mot_altruism"), "float"),
                        res_mot_challenge=clean_value(row_data.get("res_mot_challenge"), "float"),
                        res_mot_salary=clean_value(row_data.get("res_mot_salary"), "float"),
                        res_mot_career=clean_value(row_data.get("res_mot_career"), "float"),
                        res_mot_creativity=clean_value(row_data.get("res_mot_creativity"), "float"),
                        res_mot_relationships=clean_value(row_data.get("res_mot_relationships"), "float"),
                        res_mot_recognition=clean_value(row_data.get("res_mot_recognition"), "float"),
                        res_mot_affiliation=clean_value(row_data.get("res_mot_affiliation"), "float"),
                        res_mot_self_development=clean_value(row_data.get("res_mot_self_development"), "float"),
                        res_mot_purpose=clean_value(row_data.get("res_mot_purpose"), "float"),
                        res_mot_cooperation=clean_value(row_data.get("res_mot_cooperation"), "float"),
                        res_mot_stability=clean_value(row_data.get("res_mot_stability"), "float"),
                        res_mot_tradition=clean_value(row_data.get("res_mot_tradition"), "float"),
                        res_mot_management=clean_value(row_data.get("res_mot_management"), "float"),
                        res_mot_work_conditions=clean_value(row_data.get("res_mot_work_conditions"), "float"),
                    )
                    updated_count += 1

                # === Образовательные курсы ===
                elif sheet_name == "Образовательные курсы":
                    participant_name = clean_value(row_data.get("part_name"))
                    if not participant_name:
                        continue
                    try:
                        participant = Participants.objects.get(part_name=participant_name)
                    except Participants.DoesNotExist:
                        continue

                    Course.objects.update_or_create(
                        course_participant=participant,
                        defaults={
                            "course_an_dec": clean_value(row_data.get("course_an_dec"), "float"),
                            "course_client_focus": clean_value(row_data.get("course_client_focus"), "float"),
                            "course_communication": clean_value(row_data.get("course_communication"), "float"),
                            "course_leadership": clean_value(row_data.get("course_leadership"), "float"),
                            "course_result_orientation": clean_value(row_data.get("course_result_orientation"), "float"),
                            "course_planning_org": clean_value(row_data.get("course_planning_org"), "float"),
                            "course_rules_culture": clean_value(row_data.get("course_rules_culture"), "float"),
                            "course_self_dev": clean_value(row_data.get("course_self_dev"), "float"),
                            "course_collaboration": clean_value(row_data.get("course_collaboration"), "float"),
                            "course_stress_resistance": clean_value(row_data.get("course_stress_resistance"), "float"),
                            "course_emotions_communication": clean_value(row_data.get("course_emotions_communication"), "float"),
                            "course_negotiations": clean_value(row_data.get("course_negotiations"), "float"),
                            "course_digital_comm": clean_value(row_data.get("course_digital_comm"), "float"),
                            "course_effective_learning": clean_value(row_data.get("course_effective_learning"), "float"),
                            "course_entrepreneurship": clean_value(row_data.get("course_entrepreneurship"), "float"),
                            "course_creativity_tech": clean_value(row_data.get("course_creativity_tech"), "float"),
                            "course_trendwatching": clean_value(row_data.get("course_trendwatching"), "float"),
                            "course_conflict_management": clean_value(row_data.get("course_conflict_management"), "float"),
                            "course_career_management": clean_value(row_data.get("course_career_management"), "float"),
                            "course_burnout": clean_value(row_data.get("course_burnout"), "float"),
                            "course_cross_cultural_comm": clean_value(row_data.get("course_cross_cultural_comm"), "float"),
                            "course_mentoring": clean_value(row_data.get("course_mentoring"), "float"),
                        },
                    )
                    updated_count += 1

    return JsonResponse({"status": "success", "created": created_count, "updated": updated_count})