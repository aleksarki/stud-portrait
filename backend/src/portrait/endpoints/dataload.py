# Модуль загрузки данных тестирования.

import openpyxl
import openpyxl.utils
import json

from django.db import transaction

from .common import *


# ====== ENDPOINTS ====== #

@method('POST')
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

            if sheet_name not in wb.sheetnames:
                print(f"Лист '{sheet_name}' отсутствует — пропуск")
                continue

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

                # === Итоги успеваемости участников ===
                elif sheet_name == "Итоги успеваемости участников":

                    participant_name = clean_value(row_data.get("part_name"))
                    if not participant_name:
                        continue

                    try:
                        participant = Participants.objects.get(part_name=participant_name)
                    except Participants.DoesNotExist:
                        print(f"Не найден участник '{participant_name}', пропуск")
                        continue

                    # Год
                    perf_year = clean_value(row_data.get("perf_year"))

                    # Средние значения
                    perf_current_avg = clean_value(row_data.get("perf_current_avg"), "float")
                    perf_digital_culture = clean_value(row_data.get("perf_digital_culture"), "float")

                    # Аттестации (строки)
                    perf_main_attestation = clean_value(row_data.get("perf_main_attestation"))
                    perf_first_retake = clean_value(row_data.get("perf_first_retake"))
                    perf_second_retake = clean_value(row_data.get("perf_second_retake"))
                    perf_high_grade_retake = clean_value(row_data.get("perf_high_grade_retake"))
                    perf_final_grade = clean_value(row_data.get("perf_final_grade"))

                    Academicperformance.objects.update_or_create(
                        perf_part_id=participant.part_id,
                        perf_year=perf_year,
                        defaults={
                            "perf_current_avg": perf_current_avg,
                            "perf_digital_culture": perf_digital_culture,
                            "perf_main_attestation": perf_main_attestation,
                            "perf_first_retake": perf_first_retake,
                            "perf_second_retake": perf_second_retake,
                            "perf_high_grade_retake": perf_high_grade_retake,
                            "perf_final_grade": perf_final_grade,
                        }
                    )

                    updated_count += 1

    return JsonResponse({"status": "success", "created": created_count, "updated": updated_count})


# ====== UTILITIES ====== #

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
