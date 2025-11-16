import json
import openpyxl

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Avg, Min
from django.db import transaction
from django.utils import timezone
import uuid
import pandas as pd



from .models import (
    Participants, Competencecenters as CompetenceCenters, Institutions,
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
@csrf_exempt
def results(request):
    part_id = request.GET.get('part_id')
    
    if not part_id:
        # Убираем пагинацию и загружаем все результаты
        results_query = Results.objects.all().select_related(
            'res_participant', 'res_center', 'res_institution',
            'res_edu_level', 'res_form', 'res_spec'
        )
        
        # Фильтры (оставляем для поиска)
        institution_filter = request.GET.get('institution')
        year_filter = request.GET.get('year')
        center_filter = request.GET.get('center')
        participant_filter = request.GET.get('participant')
        specialty_filter = request.GET.get('specialty')
        
        if institution_filter:
            results_query = results_query.filter(res_institution__inst_name__icontains=institution_filter)
        if year_filter:
            results_query = results_query.filter(res_year=year_filter)
        if center_filter:
            results_query = results_query.filter(res_center__center_name__icontains=center_filter)
        if participant_filter:
            results_query = results_query.filter(res_participant__part_name__icontains=participant_filter)
        if specialty_filter:
            results_query = results_query.filter(res_spec__spec_name__icontains=specialty_filter)
        
        # Убираем пагинацию - загружаем все результаты
        results_list = results_query
        
        results_data = []
        for result in results_list:
            result_data = {
                'res_id': result.res_id,
                'participant': {
                    'part_id': result.res_participant.part_id,
                    'part_name': result.res_participant.part_name,
                    'part_gender': result.res_participant.part_gender,
                },
                'center': result.res_center.center_name if result.res_center else None,
                'institution': result.res_institution.inst_name if result.res_institution else None,
                'edu_level': result.res_edu_level.edu_level_name if result.res_edu_level else None,
                'study_form': result.res_form.form_name if result.res_form else None,
                'specialty': result.res_spec.spec_name if result.res_spec else None,
                'res_year': result.res_year,
                'res_course_num': result.res_course_num,
                'res_high_potential': result.res_high_potential,
                'res_summary_report': result.res_summary_report,
                
                # Компетенции
                'competences': {
                    'res_comp_info_analysis': result.res_comp_info_analysis,
                    'res_comp_planning': result.res_comp_planning,
                    'res_comp_result_orientation': result.res_comp_result_orientation,
                    'res_comp_stress_resistance': result.res_comp_stress_resistance,
                    'res_comp_partnership': result.res_comp_partnership,
                    'res_comp_rules_compliance': result.res_comp_rules_compliance,
                    'res_comp_self_development': result.res_comp_self_development,
                    'res_comp_leadership': result.res_comp_leadership,
                    'res_comp_emotional_intel': result.res_comp_emotional_intel,
                    'res_comp_client_focus': result.res_comp_client_focus,
                    'res_comp_communication': result.res_comp_communication,
                    'res_comp_passive_vocab': result.res_comp_passive_vocab,
                },
                
                # Мотиваторы
                'motivators': {
                    'res_mot_autonomy': result.res_mot_autonomy,
                    'res_mot_altruism': result.res_mot_altruism,
                    'res_mot_challenge': result.res_mot_challenge,
                    'res_mot_salary': result.res_mot_salary,
                    'res_mot_career': result.res_mot_career,
                    'res_mot_creativity': result.res_mot_creativity,
                    'res_mot_relationships': result.res_mot_relationships,
                    'res_mot_recognition': result.res_mot_recognition,
                    'res_mot_affiliation': result.res_mot_affiliation,
                    'res_mot_self_development': result.res_mot_self_development,
                    'res_mot_purpose': result.res_mot_purpose,
                    'res_mot_cooperation': result.res_mot_cooperation,
                    'res_mot_stability': result.res_mot_stability,
                    'res_mot_tradition': result.res_mot_tradition,
                    'res_mot_management': result.res_mot_management,
                    'res_mot_work_conditions': result.res_mot_work_conditions,
                },
                
                # Ценности
                'values': {
                    'res_val_honesty_justice': result.res_val_honesty_justice,
                    'res_val_humanism': result.res_val_humanism,
                    'res_val_patriotism': result.res_val_patriotism,
                    'res_val_family': result.res_val_family,
                    'res_val_health': result.res_val_health,
                    'res_val_environment': result.res_val_environment,
                }
            }
            results_data.append(result_data)
            
        return successResponse({
            "results": results_data,
            "total_count": len(results_data)
        })
    
    try:
        part_id = int(part_id)
        
        try:
            participant = Participants.objects.select_related(
                'part_institution', 'part_spec', 'part_edu_level', 'part_form'
            ).get(part_id=part_id)
        except Participants.DoesNotExist:
            return notFoundResponse("Participant not found")
        
        results_list = []
        for result in Results.objects.filter(res_participant=part_id).select_related(
            'res_center', 'res_institution', 'res_edu_level', 'res_form', 'res_spec'
        ):
            result_data = {
                'res_id': result.res_id,
                'center': result.res_center.center_name if result.res_center else None,
                'institution': result.res_institution.inst_name if result.res_institution else None,
                'edu_level': result.res_edu_level.edu_level_name if result.res_edu_level else None,
                'study_form': result.res_form.form_name if result.res_form else None,
                'specialty': result.res_spec.spec_name if result.res_spec else None,
                'res_year': result.res_year,
                'res_course_num': result.res_course_num,
                'res_high_potential': result.res_high_potential,
                'res_summary_report': result.res_summary_report,
                
                # Компетенции
                'competences': {
                    'res_comp_info_analysis': result.res_comp_info_analysis,
                    'res_comp_planning': result.res_comp_planning,
                    'res_comp_result_orientation': result.res_comp_result_orientation,
                    'res_comp_stress_resistance': result.res_comp_stress_resistance,
                    'res_comp_partnership': result.res_comp_partnership,
                    'res_comp_rules_compliance': result.res_comp_rules_compliance,
                    'res_comp_self_development': result.res_comp_self_development,
                    'res_comp_leadership': result.res_comp_leadership,
                    'res_comp_emotional_intel': result.res_comp_emotional_intel,
                    'res_comp_client_focus': result.res_comp_client_focus,
                    'res_comp_communication': result.res_comp_communication,
                    'res_comp_passive_vocab': result.res_comp_passive_vocab,
                },
                
                # Мотиваторы
                'motivators': {
                    'res_mot_autonomy': result.res_mot_autonomy,
                    'res_mot_altruism': result.res_mot_altruism,
                    'res_mot_challenge': result.res_mot_challenge,
                    'res_mot_salary': result.res_mot_salary,
                    'res_mot_career': result.res_mot_career,
                    'res_mot_creativity': result.res_mot_creativity,
                    'res_mot_relationships': result.res_mot_relationships,
                    'res_mot_recognition': result.res_mot_recognition,
                    'res_mot_affiliation': result.res_mot_affiliation,
                    'res_mot_self_development': result.res_mot_self_development,
                    'res_mot_purpose': result.res_mot_purpose,
                    'res_mot_cooperation': result.res_mot_cooperation,
                    'res_mot_stability': result.res_mot_stability,
                    'res_mot_tradition': result.res_mot_tradition,
                    'res_mot_management': result.res_mot_management,
                    'res_mot_work_conditions': result.res_mot_work_conditions,
                },
                
                # Ценности
                'values': {
                    'res_val_honesty_justice': result.res_val_honesty_justice,
                    'res_val_humanism': result.res_val_humanism,
                    'res_val_patriotism': result.res_val_patriotism,
                    'res_val_family': result.res_val_family,
                    'res_val_health': result.res_val_health,
                    'res_val_environment': result.res_val_environment,
                }
            }
            results_list.append(result_data)
            
        return successResponse({
            "participant": {
                "part_id": participant.part_id,
                "part_name": participant.part_name,
                "part_gender": participant.part_gender,
                "part_institution": participant.part_institution.inst_name if participant.part_institution else None,
                "part_spec": participant.part_spec.spec_name if participant.part_spec else None,
                "part_edu_level": participant.part_edu_level.edu_level_name if participant.part_edu_level else None,
                "part_form": participant.part_form.form_name if participant.part_form else None,
                "part_course_num": participant.part_course_num
            },
            "results": results_list
        })
        
    except ValueError:
        return errorResponse("part_id must be an integer")
    except Exception as e:
        return exceptionResponse(e)


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
                    print(f"Достигнут итоговый ряд — стоп для {sheet_name}")
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

                    center, _ = CompetenceCenters.objects.get_or_create(center_name=center_name)
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
                        print(f"Не найден участник '{participant_name}', пропуск")
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


@method('GET')
@response
@csrf_exempt
def stats(request):
    try:
        # Общая статистика
        total_participants = Participants.objects.count()
        total_tests = Results.objects.count()
        unique_institutions = Institutions.objects.count()
        unique_centers = CompetenceCenters.objects.count()

        # Участники по году получения первой оценки
        first_year_stats = Results.objects.values('res_participant').annotate(
            first_year=Min('res_year')
        ).values('first_year').annotate(
            count=Count('res_participant')
        ).order_by('first_year')
        
        participants_by_first_year = {
            'years': [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
            'counts': [stat['count'] for stat in first_year_stats if stat['first_year']]
        }

        # Участники по центрам компетенций (топ-15)
        centers_stats = Results.objects.filter(
            res_center__isnull=False
        ).values('res_center__center_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_center = {
            'centers': [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
            'counts': [stat['count'] for stat in centers_stats if stat['res_center__center_name']]
        }

        # Участники по учебным заведениям (топ-15)
        institutions_stats = Results.objects.filter(
            res_institution__isnull=False
        ).values('res_institution__inst_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_institution = {
            'institutions': [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
            'counts': [stat['count'] for stat in institutions_stats if stat['res_institution__inst_name']]
        }

        # Специальности участников
        specialties_stats = Results.objects.filter(
            res_spec__isnull=False
        ).values('res_spec__spec_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')
        
        specialties_distribution = {
            'specialties': [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
            'counts': [stat['count'] for stat in specialties_stats if stat['res_spec__spec_name']]
        }

        # Динамика тестирований по годам
        tests_by_year = Results.objects.filter(
            res_year__isnull=False
        ).values('res_year').annotate(
            count=Count('res_id')
        ).order_by('res_year')
        
        tests_by_year_data = {
            'years': [str(stat['res_year']) for stat in tests_by_year if stat['res_year']],
            'counts': [stat['count'] for stat in tests_by_year if stat['res_year']]
        }

        # Средние оценки по компетенциям по годам
        competences_fields = [
            'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
            'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
            'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
            'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab'
        ]
        
        competence_names = {
            'res_comp_info_analysis': 'Анализ информации',
            'res_comp_planning': 'Планирование',
            'res_comp_result_orientation': 'Ориентация на результат',
            'res_comp_stress_resistance': 'Стрессоустойчивость',
            'res_comp_partnership': 'Партнерство',
            'res_comp_rules_compliance': 'Соблюдение правил',
            'res_comp_self_development': 'Саморазвитие',
            'res_comp_leadership': 'Лидерство',
            'res_comp_emotional_intel': 'Эмоциональный интеллект',
            'res_comp_client_focus': 'Клиентоориентированность',
            'res_comp_communication': 'Коммуникация',
            'res_comp_passive_vocab': 'Пассивный словарь'
        }
        
        competences_by_year = []
        for field in competences_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                competences_by_year.append({
                    'name': competence_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по мотиваторам по годам
        motivators_fields = [
            'res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
            'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
            'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
            'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions'
        ]
        
        motivator_names = {
            'res_mot_autonomy': 'Автономия',
            'res_mot_altruism': 'Альтруизм',
            'res_mot_challenge': 'Вызов',
            'res_mot_salary': 'Зарплата',
            'res_mot_career': 'Карьера',
            'res_mot_creativity': 'Креативность',
            'res_mot_relationships': 'Отношения',
            'res_mot_recognition': 'Признание',
            'res_mot_affiliation': 'Принадлежность',
            'res_mot_self_development': 'Саморазвитие',
            'res_mot_purpose': 'Цель',
            'res_mot_cooperation': 'Сотрудничество',
            'res_mot_stability': 'Стабильность',
            'res_mot_tradition': 'Традиции',
            'res_mot_management': 'Управление',
            'res_mot_work_conditions': 'Условия работы'
        }
        
        motivators_by_year = []
        for field in motivators_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                motivators_by_year.append({
                    'name': motivator_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по ценностям по годам
        values_fields = [
            'res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
            'res_val_family', 'res_val_health', 'res_val_environment'
        ]
        
        value_names = {
            'res_val_honesty_justice': 'Честность и справедливость',
            'res_val_humanism': 'Гуманизм',
            'res_val_patriotism': 'Патриотизм',
            'res_val_family': 'Семья',
            'res_val_health': 'Здоровье',
            'res_val_environment': 'Окружающая среда'
        }
        
        values_by_year = []
        for field in values_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                values_by_year.append({
                    'name': value_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        stats_data = {
            'totalParticipants': total_participants,
            'totalTests': total_tests,
            'uniqueInstitutions': unique_institutions,
            'uniqueCenters': unique_centers,
            'participantsByFirstYear': participants_by_first_year,
            'participantsByCenter': participants_by_center,
            'participantsByInstitution': participants_by_institution,
            'specialtiesDistribution': specialties_distribution,
            'testsByYear': tests_by_year_data,
            'competencesByYear': competences_by_year,
            'motivatorsByYear': motivators_by_year,
            'valuesByYear': values_by_year
        }
        
        return {"stats": stats_data}
        
    except Exception as e:
        return exceptionResponse(e)



######################## DATA VIEW SESSIONS ########################

data_view_sessions = {}  # ffs

class DataViewSession:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.created_at = timezone.now()
        self.last_activity = timezone.now()
        self.filters = []
        self.visible_columns = None  # None = все колонки
        self.limit = 1000
        self.offset = 0
        
    def to_dict(self):
        return {
            'session_id': self.session_id,
            'filters': self.filters,
            'visible_columns': self.visible_columns,
            'limit': self.limit,
            'offset': self.offset
        }
    
    def update_activity(self):
        self.last_activity = timezone.now()


def cleanup_old_sessions():
    now = timezone.now()
    expired_sessions = []
    for session_id, session in data_view_sessions.items():
        if (now - session.last_activity).total_seconds() > 3600:  # 1 час
            expired_sessions.append(session_id)
    
    for session_id in expired_sessions:
        del data_view_sessions[session_id]


@method('POST')
@csrf_exempt
def create_data_session(request):
    try:
        cleanup_old_sessions()  # Очищаем старые сессии
        
        session = DataViewSession()
        data_view_sessions[session.session_id] = session
        
        return successResponse({
            "session_id": session.session_id,
            "filters": session.filters,
            "visible_columns": session.visible_columns,
            "limit": session.limit
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def get_session_data(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        
        # Получаем данные с учетом фильтров и видимых колонок
        results_query = Results.objects.all().select_related(
            'res_participant', 'res_center', 'res_institution',
            'res_edu_level', 'res_form', 'res_spec'
        )
        
        # Применяем фильтры сессии
        for filter_obj in session.filters:
            if filter_obj['type'] == 'basic' and filter_obj['selectedValues']:
                field = filter_obj['field']
                if field == 'part_gender':
                    results_query = results_query.filter(
                        res_participant__part_gender__in=filter_obj['selectedValues']
                    )
                elif field == 'center':
                    results_query = results_query.filter(
                        res_center__center_name__in=filter_obj['selectedValues']
                    )
                elif field == 'institution':
                    results_query = results_query.filter(
                        res_institution__inst_name__in=filter_obj['selectedValues']
                    )
                elif field == 'edu_level':
                    results_query = results_query.filter(
                        res_edu_level__edu_level_name__in=filter_obj['selectedValues']
                    )
                elif field == 'study_form':
                    results_query = results_query.filter(
                        res_form__form_name__in=filter_obj['selectedValues']
                    )
                elif field == 'specialty':
                    results_query = results_query.filter(
                        res_spec__spec_name__in=filter_obj['selectedValues']
                    )
                elif field == 'res_year':
                    results_query = results_query.filter(
                        res_year__in=filter_obj['selectedValues']
                    )
                elif field == 'res_course_num':
                    results_query = results_query.filter(
                        res_course_num__in=filter_obj['selectedValues']
                    )
                    
            elif filter_obj['type'] == 'numeric':
                field = filter_obj['field']
                min_val = filter_obj['min']
                max_val = filter_obj['max']
                
                # Компетенции
                if field.startswith('res_comp_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
                # Мотиваторы
                elif field.startswith('res_mot_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
                # Ценности
                elif field.startswith('res_val_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
        
        total_count = results_query.count()
        
        # Применяем лимит и оффсет
        results_list = results_query[session.offset:session.offset + session.limit]
        
        # Формируем данные
        results_data = []
        for result in results_list:
            result_data = format_result_data(result, session.visible_columns)
            results_data.append(result_data)
        
        return successResponse({
            "results": results_data,
            "total_count": total_count,
            "session": session.to_dict()
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def update_session_filters(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        filters = data.get('filters', [])
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        session.filters = filters
        session.offset = 0  # Сбрасываем оффсет при изменении фильтров
        
        return successResponse({
            "session_id": session.session_id,
            "filters": session.filters,
            "message": "Filters updated successfully"
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def update_session_columns(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        visible_columns = data.get('visible_columns')
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        session.visible_columns = visible_columns
        
        return successResponse({
            "session_id": session.session_id,
            "visible_columns": session.visible_columns,
            "message": "Visible columns updated successfully"
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def load_more_data(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        session.offset += session.limit
        
        # Повторно используем логику get_session_data
        return get_session_data(request)
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def export_session_data(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        
        # Получаем ВСЕ данные с текущими фильтрами (без лимита)
        results_query = Results.objects.all().select_related(
            'res_participant', 'res_center', 'res_institution',
            'res_edu_level', 'res_form', 'res_spec'
        )
        
        # Применяем фильтры сессии
        for filter_obj in session.filters:
            if filter_obj['type'] == 'basic' and filter_obj['selectedValues']:
                field = filter_obj['field']
                if field == 'part_gender':
                    results_query = results_query.filter(
                        res_participant__part_gender__in=filter_obj['selectedValues']
                    )
                elif field == 'center':
                    results_query = results_query.filter(
                        res_center__center_name__in=filter_obj['selectedValues']
                    )
                elif field == 'institution':
                    results_query = results_query.filter(
                        res_institution__inst_name__in=filter_obj['selectedValues']
                    )
                elif field == 'edu_level':
                    results_query = results_query.filter(
                        res_edu_level__edu_level_name__in=filter_obj['selectedValues']
                    )
                elif field == 'study_form':
                    results_query = results_query.filter(
                        res_form__form_name__in=filter_obj['selectedValues']
                    )
                elif field == 'specialty':
                    results_query = results_query.filter(
                        res_spec__spec_name__in=filter_obj['selectedValues']
                    )
                elif field == 'res_year':
                    results_query = results_query.filter(
                        res_year__in=filter_obj['selectedValues']
                    )
                elif field == 'res_course_num':
                    results_query = results_query.filter(
                        res_course_num__in=filter_obj['selectedValues']
                    )
                    
            elif filter_obj['type'] == 'numeric':
                field = filter_obj['field']
                min_val = filter_obj['min']
                max_val = filter_obj['max']
                
                # Компетенции
                if field.startswith('res_comp_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
                # Мотиваторы
                elif field.startswith('res_mot_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
                # Ценности
                elif field.startswith('res_val_'):
                    results_query = results_query.filter(
                        **{f'{field}__gte': min_val, f'{field}__lte': max_val}
                    )
        
        results_list = results_query
        
        # Создаем DataFrame для экспорта
        export_data = []
        for result in results_list:
            row = format_result_for_export(result, session.visible_columns)
            export_data.append(row)
        
        df = pd.DataFrame(export_data)
        
        # Создаем HTTP response с Excel файлом
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="results_export.xlsx"'
        
        with pd.ExcelWriter(response, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Результаты тестирования')
        
        return response
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def export_selected_results(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        selected_ids = data.get('selected_ids', [])
        
        if not session_id or session_id not in data_view_sessions:
            return errorResponse("Invalid session ID")
        
        if not selected_ids:
            return errorResponse("No records selected for export")
        
        session = data_view_sessions[session_id]
        session.update_activity()
        
        # Получаем выбранные записи
        results_query = Results.objects.filter(
            res_id__in=selected_ids
        ).select_related(
            'res_participant', 'res_center', 'res_institution',
            'res_edu_level', 'res_form', 'res_spec'
        )
        
        # Создаем DataFrame для экспорта
        export_data = []
        for result in results_query:
            row = format_result_for_export(result, session.visible_columns)
            export_data.append(row)
        
        df = pd.DataFrame(export_data)
        
        # Создаем HTTP response с Excel файлом
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="selected_results_export.xlsx"'
        
        with pd.ExcelWriter(response, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Выбранные результаты')
        
        return response
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def stats_with_filters(request):
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        # Если есть session_id, используем фильтры из сессии
        filters = []
        if session_id and session_id in data_view_sessions:
            session = data_view_sessions[session_id]
            session.update_activity()
            filters = session.filters
        
        # Общая статистика
        total_participants = Participants.objects.count()
        total_tests = Results.objects.count()
        unique_institutions = Institutions.objects.count()
        unique_centers = CompetenceCenters.objects.count()

        # Участники по году получения первой оценки
        first_year_stats = Results.objects.values('res_participant').annotate(
            first_year=Min('res_year')
        ).values('first_year').annotate(
            count=Count('res_participant')
        ).order_by('first_year')
        
        participants_by_first_year = {
            'years': [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
            'counts': [stat['count'] for stat in first_year_stats if stat['first_year']]
        }

        # Участники по центрам компетенций (топ-15)
        centers_stats = Results.objects.filter(
            res_center__isnull=False
        ).values('res_center__center_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_center = {
            'centers': [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
            'counts': [stat['count'] for stat in centers_stats if stat['res_center__center_name']]
        }

        # Участники по учебным заведениям (топ-15)
        institutions_stats = Results.objects.filter(
            res_institution__isnull=False
        ).values('res_institution__inst_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_institution = {
            'institutions': [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
            'counts': [stat['count'] for stat in institutions_stats if stat['res_institution__inst_name']]
        }

        # Специальности участников
        specialties_stats = Results.objects.filter(
            res_spec__isnull=False
        ).values('res_spec__spec_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')
        
        specialties_distribution = {
            'specialties': [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
            'counts': [stat['count'] for stat in specialties_stats if stat['res_spec__spec_name']]
        }

        # Динамика тестирований по годам
        tests_by_year = Results.objects.filter(
            res_year__isnull=False
        ).values('res_year').annotate(
            count=Count('res_id')
        ).order_by('res_year')
        
        tests_by_year_data = {
            'years': [str(stat['res_year']) for stat in tests_by_year if stat['res_year']],
            'counts': [stat['count'] for stat in tests_by_year if stat['res_year']]
        }

        # Средние оценки по компетенциям по годам
        competences_fields = [
            'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
            'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
            'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
            'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab'
        ]
        
        competence_names = {
            'res_comp_info_analysis': 'Анализ информации',
            'res_comp_planning': 'Планирование',
            'res_comp_result_orientation': 'Ориентация на результат',
            'res_comp_stress_resistance': 'Стрессоустойчивость',
            'res_comp_partnership': 'Партнерство',
            'res_comp_rules_compliance': 'Соблюдение правил',
            'res_comp_self_development': 'Саморазвитие',
            'res_comp_leadership': 'Лидерство',
            'res_comp_emotional_intel': 'Эмоциональный интеллект',
            'res_comp_client_focus': 'Клиентоориентированность',
            'res_comp_communication': 'Коммуникация',
            'res_comp_passive_vocab': 'Пассивный словарь'
        }
        
        competences_by_year = []
        for field in competences_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                competences_by_year.append({
                    'name': competence_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по мотиваторам по годам
        motivators_fields = [
            'res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
            'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
            'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
            'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions'
        ]
        
        motivator_names = {
            'res_mot_autonomy': 'Автономия',
            'res_mot_altruism': 'Альтруизм',
            'res_mot_challenge': 'Вызов',
            'res_mot_salary': 'Зарплата',
            'res_mot_career': 'Карьера',
            'res_mot_creativity': 'Креативность',
            'res_mot_relationships': 'Отношения',
            'res_mot_recognition': 'Признание',
            'res_mot_affiliation': 'Принадлежность',
            'res_mot_self_development': 'Саморазвитие',
            'res_mot_purpose': 'Цель',
            'res_mot_cooperation': 'Сотрудничество',
            'res_mot_stability': 'Стабильность',
            'res_mot_tradition': 'Традиции',
            'res_mot_management': 'Управление',
            'res_mot_work_conditions': 'Условия работы'
        }
        
        motivators_by_year = []
        for field in motivators_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                motivators_by_year.append({
                    'name': motivator_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })

        # Средние оценки по ценностям по годам
        values_fields = [
            'res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
            'res_val_family', 'res_val_health', 'res_val_environment'
        ]
        
        value_names = {
            'res_val_honesty_justice': 'Честность и справедливость',
            'res_val_humanism': 'Гуманизм',
            'res_val_patriotism': 'Патриотизм',
            'res_val_family': 'Семья',
            'res_val_health': 'Здоровье',
            'res_val_environment': 'Окружающая среда'
        }
        
        values_by_year = []
        for field in values_fields:
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                values_by_year.append({
                    'name': value_names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })
        
        # Добавляем available_values для фильтрации
        stats_data = {
            'totalParticipants': total_participants,
            'totalTests': total_tests,
            'uniqueInstitutions': unique_institutions,
            'uniqueCenters': unique_centers,
            'participantsByFirstYear': participants_by_first_year,
            'participantsByCenter': participants_by_center,
            'participantsByInstitution': participants_by_institution,
            'specialtiesDistribution': specialties_distribution,
            'testsByYear': tests_by_year_data,
            'competencesByYear': competences_by_year,
            'motivatorsByYear': motivators_by_year,
            'valuesByYear': values_by_year,
            'available_values': extract_available_values_for_filters(filters)
        }
        
        return successResponse({"stats": stats_data})
        
    except Exception as e:
        return exceptionResponse(e)


@method('POST')
@csrf_exempt
def group_data(request):
    try:
        data = json.loads(request.body)
        selected_ids = data.get('selected_ids', [])
        grouping_column = data.get('grouping_column')
        
        if not selected_ids:
            return errorResponse("No records selected for grouping")
        if not grouping_column:
            return errorResponse("Grouping column not specified")
        
        # Получаем выбранные записи
        results_query = Results.objects.filter(
            res_id__in=selected_ids
        ).select_related(
            'res_participant', 'res_center', 'res_institution',
            'res_edu_level', 'res_form', 'res_spec'
        )
        
        # Группируем данные
        grouped_data = {
            'competences': {},
            'motivators': {},
            'values': {}
        }
        
        # Получаем уникальные группы
        groups = set()
        for result in results_query:
            group_value = get_group_value(result, grouping_column)
            if group_value:
                groups.add(group_value)
        
        groups = sorted(list(groups))
        
        # Компетенции
        competence_fields = ['res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
                            'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
                            'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
                            'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab']
        
        for field in competence_fields:
            values_by_group = []
            for group in groups:
                group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
                field_values = [getattr(r, field) for r in group_results if getattr(r, field) is not None]
                avg_value = sum(field_values) / len(field_values) if field_values else 0
                values_by_group.append(round(avg_value, 1))
            
            grouped_data['competences'][field] = {
                'groups': groups,
                'values': values_by_group
            }
        
        # Мотиваторы
        motivator_fields = ['res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
                           'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
                           'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
                           'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions']
        
        for field in motivator_fields:
            values_by_group = []
            for group in groups:
                group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
                field_values = [getattr(r, field) for r in group_results if getattr(r, field) is not None]
                avg_value = sum(field_values) / len(field_values) if field_values else 0
                values_by_group.append(round(avg_value, 1))
            
            grouped_data['motivators'][field] = {
                'groups': groups,
                'values': values_by_group
            }
        
        # Ценности
        value_fields = ['res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
                       'res_val_family', 'res_val_health', 'res_val_environment']
        
        for field in value_fields:
            values_by_group = []
            for group in groups:
                group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
                field_values = [getattr(r, field) for r in group_results if getattr(r, field) is not None]
                avg_value = sum(field_values) / len(field_values) if field_values else 0
                values_by_group.append(round(avg_value, 1))
            
            grouped_data['values'][field] = {
                'groups': groups,
                'values': values_by_group
            }
        
        return successResponse({
            "grouped_data": grouped_data,
            "groups": groups,
            "total_records": len(selected_ids)
        })
        
    except Exception as e:
        return exceptionResponse(e)


@method('GET')
@response
@csrf_exempt
def courses(request):
    try:
        # Получаем данные по курсам с информацией об участниках
        courses_query = Course.objects.all().select_related(
            'course_participant',
            'course_participant__part_institution',
            'course_participant__part_spec',
            'course_participant__part_edu_level',
            'course_participant__part_form'
        )
        
        courses_data = []
        for course in courses_query:
            course_data = {
                'course_id': course.course_id,
                'participant': {
                    'part_id': course.course_participant.part_id,
                    'part_name': course.course_participant.part_name,
                    'part_gender': course.course_participant.part_gender,
                    'institution': course.course_participant.part_institution.inst_name if course.course_participant.part_institution else None,
                    'specialty': course.course_participant.part_spec.spec_name if course.course_participant.part_spec else None,
                    'edu_level': course.course_participant.part_edu_level.edu_level_name if course.course_participant.part_edu_level else None,
                    'study_form': course.course_participant.part_form.form_name if course.course_participant.part_form else None,
                },
                # Данные по курсам
                'course_an_dec': float(course.course_an_dec) if course.course_an_dec is not None else 0,
                'course_client_focus': float(course.course_client_focus) if course.course_client_focus is not None else 0,
                'course_communication': float(course.course_communication) if course.course_communication is not None else 0,
                'course_leadership': float(course.course_leadership) if course.course_leadership is not None else 0,
                'course_result_orientation': float(course.course_result_orientation) if course.course_result_orientation is not None else 0,
                'course_planning_org': float(course.course_planning_org) if course.course_planning_org is not None else 0,
                'course_rules_culture': float(course.course_rules_culture) if course.course_rules_culture is not None else 0,
                'course_self_dev': float(course.course_self_dev) if course.course_self_dev is not None else 0,
                'course_collaboration': float(course.course_collaboration) if course.course_collaboration is not None else 0,
                'course_stress_resistance': float(course.course_stress_resistance) if course.course_stress_resistance is not None else 0,
                'course_emotions_communication': float(course.course_emotions_communication) if course.course_emotions_communication is not None else 0,
                'course_negotiations': float(course.course_negotiations) if course.course_negotiations is not None else 0,
                'course_digital_comm': float(course.course_digital_comm) if course.course_digital_comm is not None else 0,
                'course_effective_learning': float(course.course_effective_learning) if course.course_effective_learning is not None else 0,
                'course_entrepreneurship': float(course.course_entrepreneurship) if course.course_entrepreneurship is not None else 0,
                'course_creativity_tech': float(course.course_creativity_tech) if course.course_creativity_tech is not None else 0,
                'course_trendwatching': float(course.course_trendwatching) if course.course_trendwatching is not None else 0,
                'course_conflict_management': float(course.course_conflict_management) if course.course_conflict_management is not None else 0,
                'course_career_management': float(course.course_career_management) if course.course_career_management is not None else 0,
                'course_burnout': float(course.course_burnout) if course.course_burnout is not None else 0,
                'course_cross_cultural_comm': float(course.course_cross_cultural_comm) if course.course_cross_cultural_comm is not None else 0,
                'course_mentoring': float(course.course_mentoring) if course.course_mentoring is not None else 0,
            }
            courses_data.append(course_data)
        
        return {"courses": courses_data}
        
    except Exception as e:
        return exceptionResponse(e)


def get_group_value(result, grouping_column):
    """Получает значение для группировки из результата"""
    if grouping_column == 'part_gender':
        return result.res_participant.part_gender if result.res_participant else None
    elif grouping_column == 'center':
        return result.res_center.center_name if result.res_center else None
    elif grouping_column == 'institution':
        return result.res_institution.inst_name if result.res_institution else None
    elif grouping_column == 'edu_level':
        return result.res_edu_level.edu_level_name if result.res_edu_level else None
    elif grouping_column == 'study_form':
        return result.res_form.form_name if result.res_form else None
    elif grouping_column == 'specialty':
        return result.res_spec.spec_name if result.res_spec else None
    elif grouping_column == 'res_year':
        return result.res_year
    elif grouping_column == 'res_course_num':
        return result.res_course_num
    return None


def extract_available_values_for_filters(current_filters):
    """Извлекает доступные значения для фильтрации с учетом текущих фильтров"""
    values = {}
    
    # Базовые поля для фильтрации
    basic_fields = [
        'res_year', 'part_gender', 'center', 'institution', 
        'edu_level', 'res_course_num', 'study_form', 'specialty'
    ]
    
    # Создаем базовый запрос
    results_query = Results.objects.all()
    
    # Применяем текущие фильтры (кроме того, для которого извлекаем значения)
    for filter_obj in current_filters:
        if filter_obj['type'] == 'basic' and filter_obj['selectedValues']:
            field = filter_obj['field']
            if field == 'part_gender':
                results_query = results_query.filter(
                    res_participant__part_gender__in=filter_obj['selectedValues']
                )
            elif field == 'center':
                results_query = results_query.filter(
                    res_center__center_name__in=filter_obj['selectedValues']
                )
            elif field == 'institution':
                results_query = results_query.filter(
                    res_institution__inst_name__in=filter_obj['selectedValues']
                )
            elif field == 'edu_level':
                results_query = results_query.filter(
                    res_edu_level__edu_level_name__in=filter_obj['selectedValues']
                )
            elif field == 'study_form':
                results_query = results_query.filter(
                    res_form__form_name__in=filter_obj['selectedValues']
                )
            elif field == 'specialty':
                results_query = results_query.filter(
                    res_spec__spec_name__in=filter_obj['selectedValues']
                )
            elif field == 'res_year':
                results_query = results_query.filter(
                    res_year__in=filter_obj['selectedValues']
                )
            elif field == 'res_course_num':
                results_query = results_query.filter(
                    res_course_num__in=filter_obj['selectedValues']
                )
    
    # Извлекаем уникальные значения для каждого поля
    for field in basic_fields:
        if field == 'part_gender':
            unique_values = results_query.filter(
                res_participant__part_gender__isnull=False
            ).values_list('res_participant__part_gender', flat=True).distinct().order_by('res_participant__part_gender')
        elif field == 'center':
            unique_values = results_query.filter(
                res_center__isnull=False
            ).values_list('res_center__center_name', flat=True).distinct().order_by('res_center__center_name')
        elif field == 'institution':
            unique_values = results_query.filter(
                res_institution__isnull=False
            ).values_list('res_institution__inst_name', flat=True).distinct().order_by('res_institution__inst_name')
        elif field == 'edu_level':
            unique_values = results_query.filter(
                res_edu_level__isnull=False
            ).values_list('res_edu_level__edu_level_name', flat=True).distinct().order_by('res_edu_level__edu_level_name')
        elif field == 'study_form':
            unique_values = results_query.filter(
                res_form__isnull=False
            ).values_list('res_form__form_name', flat=True).distinct().order_by('res_form__form_name')
        elif field == 'specialty':
            unique_values = results_query.filter(
                res_spec__isnull=False
            ).values_list('res_spec__spec_name', flat=True).distinct().order_by('res_spec__spec_name')
        elif field == 'res_year':
            unique_values = results_query.filter(
                res_year__isnull=False
            ).values_list('res_year', flat=True).distinct().order_by('res_year')
        elif field == 'res_course_num':
            unique_values = results_query.filter(
                res_course_num__isnull=False
            ).values_list('res_course_num', flat=True).distinct().order_by('res_course_num')
        
        # Преобразуем в список строк и фильтруем пустые значения
        values[field] = [str(val) for val in unique_values if val is not None and str(val).strip() != '']
    
    return values


def format_result_data(result, visible_columns=None):
    """Форматирует данные результата для отправки на фронтенд"""
    base_data = {
        'res_id': result.res_id,
        'participant': {
            'part_id': result.res_participant.part_id,
            'part_name': result.res_participant.part_name,
            'part_gender': result.res_participant.part_gender,
        },
        'center': result.res_center.center_name if result.res_center else None,
        'institution': result.res_institution.inst_name if result.res_institution else None,
        'edu_level': result.res_edu_level.edu_level_name if result.res_edu_level else None,
        'study_form': result.res_form.form_name if result.res_form else None,
        'specialty': result.res_spec.spec_name if result.res_spec else None,
        'res_year': result.res_year,
        'res_course_num': result.res_course_num,
        'res_high_potential': result.res_high_potential,
        'res_summary_report': result.res_summary_report,
    }
    
    # Добавляем компетенции, мотиваторы и ценности
    competence_fields = ['res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
                        'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
                        'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
                        'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab']
    
    motivator_fields = ['res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
                       'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
                       'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
                       'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions']
    
    value_fields = ['res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
                   'res_val_family', 'res_val_health', 'res_val_environment']
    
    # Если указаны видимые колонки, фильтруем данные
    if visible_columns:
        filtered_data = {}
        for field in visible_columns:
            if field in base_data:
                filtered_data[field] = base_data[field]
            elif field in competence_fields:
                if 'competences' not in filtered_data:
                    filtered_data['competences'] = {}
                filtered_data['competences'][field] = getattr(result, field)
            elif field in motivator_fields:
                if 'motivators' not in filtered_data:
                    filtered_data['motivators'] = {}
                filtered_data['motivators'][field] = getattr(result, field)
            elif field in value_fields:
                if 'values' not in filtered_data:
                    filtered_data['values'] = {}
                filtered_data['values'][field] = getattr(result, field)
        return filtered_data
    else:
        # Возвращаем все данные
        base_data['competences'] = {field: getattr(result, field) for field in competence_fields}
        base_data['motivators'] = {field: getattr(result, field) for field in motivator_fields}
        base_data['values'] = {field: getattr(result, field) for field in value_fields}
        return base_data


def format_result_for_export(result, visible_columns=None):
    """Форматирует данные для экспорта в Excel"""
    # Аналогичная логика format_result_data, но в плоском формате для Excel
    row = {
        'ID результата': result.res_id,
        'ФИО участника': result.res_participant.part_name,
        'Пол': result.res_participant.part_gender,
        'Центр компетенций': result.res_center.center_name if result.res_center else '',
        'Учебное заведение': result.res_institution.inst_name if result.res_institution else '',
        'Уровень образования': result.res_edu_level.edu_level_name if result.res_edu_level else '',
        'Форма обучения': result.res_form.form_name if result.res_form else '',
        'Специальность': result.res_spec.spec_name if result.res_spec else '',
        'Учебный год': result.res_year,
        'Номер курса': result.res_course_num,
        'Высокий потенциал': result.res_high_potential or '',
        'Сводный отчет': result.res_summary_report or '',
    }
    
    # Добавляем все поля компетенций, мотиваторов и ценностей
    competence_fields = ['res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
                        'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
                        'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
                        'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab']
    
    motivator_fields = ['res_mot_autonomy', 'res_mot_altruism', 'res_mot_challenge', 'res_mot_salary',
                       'res_mot_career', 'res_mot_creativity', 'res_mot_relationships', 'res_mot_recognition',
                       'res_mot_affiliation', 'res_mot_self_development', 'res_mot_purpose', 'res_mot_cooperation',
                       'res_mot_stability', 'res_mot_tradition', 'res_mot_management', 'res_mot_work_conditions']
    
    value_fields = ['res_val_honesty_justice', 'res_val_humanism', 'res_val_patriotism',
                   'res_val_family', 'res_val_health', 'res_val_environment']
    
    field_names = {
        # Компетенции
        'res_comp_info_analysis': 'Анализ информации',
        'res_comp_planning': 'Планирование',
        'res_comp_result_orientation': 'Ориентация на результат',
        'res_comp_stress_resistance': 'Стрессоустойчивость',
        'res_comp_partnership': 'Партнерство',
        'res_comp_rules_compliance': 'Соблюдение правил',
        'res_comp_self_development': 'Саморазвитие',
        'res_comp_leadership': 'Лидерство',
        'res_comp_emotional_intel': 'Эмоциональный интеллект',
        'res_comp_client_focus': 'Клиентоориентированность',
        'res_comp_communication': 'Коммуникация',
        'res_comp_passive_vocab': 'Пассивный словарь',
        
        # Мотиваторы
        'res_mot_autonomy': 'Автономия',
        'res_mot_altruism': 'Альтруизм',
        'res_mot_challenge': 'Вызов',
        'res_mot_salary': 'Зарплата',
        'res_mot_career': 'Карьера',
        'res_mot_creativity': 'Креативность',
        'res_mot_relationships': 'Отношения',
        'res_mot_recognition': 'Признание',
        'res_mot_affiliation': 'Принадлежность',
        'res_mot_self_development': 'Саморазвитие (мотиватор)',
        'res_mot_purpose': 'Цель',
        'res_mot_cooperation': 'Сотрудничество',
        'res_mot_stability': 'Стабильность',
        'res_mot_tradition': 'Традиции',
        'res_mot_management': 'Управление',
        'res_mot_work_conditions': 'Условия работы',
        
        # Ценности
        'res_val_honesty_justice': 'Честность и справедливость',
        'res_val_humanism': 'Гуманизм',
        'res_val_patriotism': 'Патриотизм',
        'res_val_family': 'Семья',
        'res_val_health': 'Здоровье',
        'res_val_environment': 'Окружающая среда'
    }
    
    # Добавляем поля в row
    all_fields = competence_fields + motivator_fields + value_fields
    for field in all_fields:
        if not visible_columns or field in visible_columns:
            value = getattr(result, field)
            row[field_names[field]] = value if value is not None else ''
    
    return row


