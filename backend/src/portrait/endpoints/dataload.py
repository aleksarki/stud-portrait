# Модуль загрузки данных тестирования.

import openpyxl
import openpyxl.utils
import json

from django.db import transaction

from .common import *


# ====== ENDPOINTS ====== #

@method('POST')
@jsonResponse
@csrf_exempt
def import_excel(request):
    excel_file = request.FILES.get("file")
    if not excel_file:
        raise ResponseError("No file uploaded")

    config_json = request.POST.get("config_json")
    if not config_json:
        raise ResponseError("Missing config_json")

    try:
        config = json.loads(config_json)
    except json.JSONDecodeError:
        raise ResponseError("Invalid JSON in config_json")

    wb = openpyxl.load_workbook(excel_file, data_only=True)

    created_count = 0
    updated_count = 0

    DEBUG = True

    with transaction.atomic():
        for sheet_info in config["sheets"]:
            sheet_name = sheet_info["name"]
            start_row =  sheet_info["start_row"]
            columns =    sheet_info["columns"]

            if sheet_name not in wb.sheetnames:
                if DEBUG: print(f"Sheet '{sheet_name}' specified in config is missing the file")
                continue

            ws = wb[sheet_name]

            if DEBUG: print(f"\n=== PARSING SHEET '{sheet_name}' ===")

            for row in ws.iter_rows(min_row=start_row):
                if (b_value := row[1].value) and str(b_value).strip().lower() == "итог":  # Проверка на "Итог"
                    if DEBUG: print(f"Summary row reached for sheet '{sheet_name}'")
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
                            PART.GENDER:      clean_value(row_data.get("part_gender")),
                            PART.INSTITUTION: institution,
                            PART.EDU_SPEC:    spec,
                            PART.EDU_LEVEL:   edu_level,
                            PART.EDU_FORM:    form,
                            PART.COURSE_NUM:  clean_value(row_data.get("part_course_num"), int),
                        }
                    )

                    result, created_res = Results.objects.get_or_create(
                        res_participant=participant,
                        defaults={
                            RES.CENTER:      center,
                            RES.INSTITUTION: institution,
                            RES.EDU_LEVEL:   edu_level,
                            RES.EDU_FORM:    form,
                            RES.EDU_SPEC:    spec,
                            RES.COURSE_NUM:  clean_value(row_data.get("res_course_num"), int),
                            RES.YEAR:        clean_value(row_data.get("res_year")),
                            RES.POTENTIAL:   clean_value(row_data.get("res_high_potential")),
                            RES.REPORT:      clean_value(row_data.get("res_summary_report")),
                        }
                    )

                    Results.objects.filter(pk=result.pk).update(**{
                        comp: clean_value(row_data.get(comp), int) for comp in COMP.names.keys()
                    })
                    created_count += 1

                # === Мотивационный профиль ===
                elif sheet_name == "Мотивационный профиль":
                    participant_name = clean_value(row_data.get("part_name"))
                    if not participant_name:
                        continue

                    try:
                        participant = Participants.objects.get(part_name=participant_name)
                    except Participants.DoesNotExist:
                        if DEBUG: print(f"Participant '{participant_name}' not found")
                        continue

                    Results.objects.filter(res_participant=participant).update(**{
                        mot: clean_value(row_data.get(mot), float) for mot in MOT.names.keys()
                    })
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
                        defaults={cur: clean_value(row_data.get(cur), float) for cur in CUR.names.keys()}
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
                        if DEBUG: print(f"Participant '{participant_name}' not found")
                        continue

                    Academicperformance.objects.update_or_create(
                        perf_part_id=participant.part_id,
                        perf_year=clean_value(row_data.get("perf_year")),
                        defaults={
                            "perf_current_avg":       clean_value(row_data.get("perf_current_avg"),     float),
                            "perf_digital_culture":   clean_value(row_data.get("perf_digital_culture"), float),
                            "perf_main_attestation":  clean_value(row_data.get("perf_main_attestation")),
                            "perf_first_retake":      clean_value(row_data.get("perf_first_retake")),
                            "perf_second_retake":     clean_value(row_data.get("perf_second_retake")),
                            "perf_high_grade_retake": clean_value(row_data.get("perf_high_grade_retake")),
                            "perf_final_grade":       clean_value(row_data.get("perf_final_grade"))
                        }
                    )

                    updated_count += 1

    return {"status": "success", "created": created_count, "updated": updated_count}


# ====== UTILITIES ====== #

def clean_value(value, value_type: type[str] | type[int] | type[float] = str) -> str | int | float | None:
    """ Transforms value from an Excel cell to valid format.
    """
    if value is None:
        return None

    s = str(value).strip()

    # missing value markers
    if s.lower() in ("", "-", "–", "—", "отсутствует", "н/д", "н/п", "нет", "na", "n/a"):
        return None
    
    try:
        if value_type == int:
            return int(float(s.replace(",", ".")))
        
        if value_type == float:
            return float(s.replace(",", "."))
    
    except ValueError:
        return None

    return s or None
