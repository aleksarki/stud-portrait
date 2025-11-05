import json

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openpyxl import load_workbook

from .models import (
    Participants, Results, Institutions, Specialties,
    EducationLevels, StudyForms, CompetenceCenters
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
def import_excel(request):
    """
    Импорт данных из Excel в БД.
    Ожидает:
    - file: Excel (.xlsx)
    - structure: JSON с описанием листов и колонок
    """
    excel_file = request.FILES.get("file")
    structure_json = request.POST.get("structure")

    if not excel_file or not structure_json:
        return errorResponse("File and structure config are required")

    try:
        structure = json.loads(structure_json)
    except json.JSONDecodeError:
        return errorResponse("Invalid JSON structure")

    try:
        wb = load_workbook(excel_file, data_only=True)

        for sheet_conf in structure.get("sheets", []):
            sheet_name = sheet_conf["name"]
            start_row = sheet_conf.get("start_row", 3)
            columns = sheet_conf.get("columns", {})

            if sheet_name not in wb.sheetnames:
                available_sheets = ", ".join(wb.sheetnames)
                return errorResponse(f"Sheet '{sheet_name}' not found in Excel file. Available sheets: {available_sheets}")

            ws = wb[sheet_name]
            row = start_row

            while True:
                # Проверка конца таблицы — пустая ячейка в первой колонке (например, B)
                first_cell = ws[f"B{row}"].value
                if not first_cell:
                    break

                # Читаем данные по колонкам
                data = {}
                for model_field, col_letter in columns.items():
                    cell_value = ws[f"{col_letter}{row}"].value
                    data[model_field] = cell_value

                # Создание участника (пример — базовые данные)
                participant, _ = Participants.objects.get_or_create(
                    part_name=data.get("name"),
                    defaults={
                        "part_gender": data.get("gender", "Не указано"),
                        "part_enter_year": data.get("year", 2020),
                        "part_institution": Institutions.objects.first(),
                        "part_spec": Specialties.objects.first(),
                        "part_edu_level": EducationLevels.objects.first(),
                        "part_form": StudyForms.objects.first(),
                        "part_course_num": data.get("course_num", 1)
                    }
                )

                # Добавляем пустой результат — потом можно доработать для профилей
                Results.objects.create(
                    res_participant=participant,
                    res_center=CompetenceCenters.objects.first(),
                    res_institution=participant.part_institution,
                    res_edu_level=participant.part_edu_level,
                    res_form=participant.part_form,
                    res_spec=participant.part_spec,
                    res_course_num=participant.part_course_num,
                    res_year=data.get("year", 2020),
                    res_high_potential=False
                )

                row += 1

        return successResponse({"message": "Data imported successfully"})

    except Exception as e:
        return exceptionResponse(e)