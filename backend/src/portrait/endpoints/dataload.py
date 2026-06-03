# Модуль загрузки данных

import openpyxl
import openpyxl.utils
import json

from django.db import transaction

from .common import *


# ============================== ENDPOINTS ============================== #

@method(POST)
@jsonResponse
@csrf_exempt
def import_excel(request):
    """
    Import data from an Excel file.
    Supported sheets:
    1. Связь ФИО и ID - маппинг RSV ID → ФИО
    2. Сравнение по компетенциям - результаты РСВ
    3. Мотивационный профиль
    4. Образовательные курсы
    5. Итоги успеваемости участников - данные по дисциплинам
    """
    excel_file = request.FILES.get("file")
    config_json = request.POST.get("config_json")

    if not excel_file:
        raise ResponseError("No file uploaded")
    if not config_json:
        raise ResponseError("Missing config_json")

    try:
        config = json.loads(config_json)
    except json.JSONDecodeError:
        raise ResponseError("Invalid JSON in config_json")

    wb = openpyxl.load_workbook(excel_file, data_only=True)

    created_count = 0
    updated_count = 0
    mapping_count = 0

    with transaction.atomic():
        for sheet_info in config["sheets"]:
            sheet_name = sheet_info["name"]
            start_row = sheet_info["start_row"]
            columns = sheet_info["columns"]

            if sheet_name not in wb.sheetnames:
                debugPrint(f"[xls load] (!):  лист '{sheet_name}' отсутствует в файле")
                continue

            ws = wb[sheet_name]

            debugPrint(f"[xls load] (i): *** ОБРАБОТКА ЛИСТА '{sheet_name}' ***")

            # Ключевое поле для определения конца данных
            KEY_FIELD = {
                "Связь ФИО и ID":                "rsv_id",
                "Сравнение по компетенциям":     "part_rsv_id",
                "Мотивационный профиль":         "part_rsv_id",
                "Образовательные курсы":         "part_rsv_id",
                "Ценностный профиль":            "part_rsv_id",
                "Итоги успеваемости участников": "student_name",
            }
            key_field = KEY_FIELD.get(sheet_name)
            EMPTY_ROWS_LIMIT = 5  # остановиться после N пустых строк подряд

            row_count = 0
            empty_streak = 0
            for row in ws.iter_rows(min_row=start_row):

                def get_col(col_letter):
                    """Получает значение ячейки по букве колонки."""
                    if not col_letter:
                        return None
                    try:
                        col_idx = openpyxl.utils.column_index_from_string(col_letter) - 1
                        if col_idx >= len(row):
                            return None
                        return row[col_idx].value
                    except:
                        return None

                row_data = {k: get_col(v) for k, v in columns.items()}

                # Остановка по пустым строкам: если ключевое поле пусто N раз подряд — конец данных
                if key_field:
                    key_value = clean_value(row_data.get(key_field))
                    if not key_value:
                        empty_streak += 1
                        if empty_streak >= EMPTY_ROWS_LIMIT:
                            debugPrint(f"[xls load] (i): {EMPTY_ROWS_LIMIT} пустых строк подряд — завершение; {row_count} строк обработано")
                            break
                        continue
                    else:
                        empty_streak = 0

                # ============================================================
                # ЛИСТ 1: "Связь ФИО и ID"
                # ============================================================
                if sheet_name == "Связь ФИО и ID":
                    rsv_id = clean_value(row_data.get("rsv_id"))
                    student_name = clean_value(row_data.get("student_name"))
                    student_gender = clean_value(row_data.get("student_gender"))
                    email = clean_value(row_data.get("email"))

                    if not rsv_id or not student_name:
                        continue

                    # Создаём или обновляем маппинг
                    mapping, created = Studentmapping.objects.update_or_create(
                        rsv_id=str(rsv_id),
                        defaults={
                            'student_name': student_name,
                            'student_gender': student_gender,
                            'email': email
                        }
                    )

                    mapping_count += 1
                    row_count += 1

                    if row_count % 100 == 0:
                        debugPrint(f"[xls load] (i): обработано {row_count} связей")

                    continue

                # ============================================================
                # ЛИСТ 2: "Сравнение по компетенциям" (РСВ)
                # ============================================================
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

                    # part_rsv_id - это ID из тестирования РСВ (НЕ ФИО!)
                    rsv_id = clean_value(row_data.get("part_rsv_id"))
                    if not rsv_id:
                        continue

                    # Получаем или создаём участника, сразу заполняя все part_* поля
                    participant, created = Participants.objects.get_or_create(
                        part_rsv_id=str(rsv_id),
                        defaults={
                            'part_gender': parse_gender(row_data.get("part_gender")),
                            'part_institution': institution,      # уже получен из inst_name
                            'part_spec': spec,                    # уже получен из spec_name
                            'part_edu_level': edu_level,          # уже получен из edu_level_name
                            'part_form': form,                    # уже получен из form_name
                            'part_course_num': clean_value(row_data.get("part_course_num"), int),
                        }
                    )

                    # Если участник уже существовал – обновляем все эти поля (кроме rsv_id)
                    if not created:
                        Participants.objects.filter(pk=participant.pk).update(
                            part_gender=parse_gender(row_data.get("part_gender")),
                            part_institution=institution,
                            part_spec=spec,
                            part_edu_level=edu_level,
                            part_form=form,
                            part_course_num=clean_value(row_data.get("part_course_num"), int),
                        )

                    # Создаём или обновляем результат
                    year = clean_value(row_data.get("res_year"))
                    course_num = clean_value(row_data.get("res_course_num"), int)

                    result, created_res = Results.objects.update_or_create(
                        res_participant=participant,
                        res_year=year,
                        res_course_num=course_num,
                        defaults={
                            TRES.CENTER:      center,
                            TRES.INSTITUTION: institution,
                            TRES.EDU_LEVEL:   edu_level,
                            TRES.EDU_FORM:    form,       # ForeignKey — объект OK
                            TRES.EDU_SPEC:    spec,       # ForeignKey — объект OK
                            TRES.POTENTIAL:   clean_value(row_data.get("res_high_potential")),
                            TRES.REPORT:      clean_value(row_data.get("res_summary_report")),
                        }
                    )

                    # Обновляем компетенции
                    Results.objects           \
                        .filter(pk=result.pk) \
                        .update(**{comp: clean_value(row_data.get(comp), int) for comp in COMP.list})

                    created_count += 1 if created_res else 0
                    updated_count += 0 if created_res else 1
                    row_count += 1

                    if row_count % 100 == 0:
                        debugPrint(f"[xls load] (i): обработано {row_count} результатов РСВ")

                # ============================================================
                # ЛИСТ 3: "Мотивационный профиль"
                # ============================================================
                elif sheet_name == "Мотивационный профиль":
                    rsv_id = clean_value(row_data.get("part_rsv_id"))
                    if not rsv_id:
                        continue

                    try:
                        participant = Participants.objects.get(part_rsv_id=str(rsv_id))
                    except Participants.DoesNotExist:
                        debugPrint(f"[xls load] (!): участник RSV ID {rsv_id} не найден")
                        continue

                    year = clean_value(row_data.get("res_year"))

                    Results.objects                                         \
                        .filter(res_participant=participant, res_year=year) \
                        .update(**{mot: clean_value(row_data.get(mot), float) for mot in MOT.list})
                    
                    updated_count += 1
                    row_count += 1

                # ============================================================
                # ЛИСТ 4: "Образовательные курсы"
                # ============================================================
                elif sheet_name == "Образовательные курсы":
                    rsv_id = clean_value(row_data.get("part_rsv_id"))
                    if not rsv_id:
                        continue

                    try:
                        participant = Participants.objects.get(part_rsv_id=str(rsv_id))
                    except Participants.DoesNotExist:
                        debugPrint(f"[xls load] (!): участник RSV ID {rsv_id} не найден")
                        continue

                    Course.objects.update_or_create(
                        course_participant=participant.part_id,
                        defaults={cur: clean_value(row_data.get(cur), float) for cur in CUR.list}
                    )
                    
                    updated_count += 1
                    row_count += 1

                # ============================================================
                # ЛИСТ: "Ценностный профиль"
                # ============================================================
                elif sheet_name == "Ценностный профиль":
                    rsv_id = clean_value(row_data.get("part_rsv_id"))
                    if not rsv_id:
                        continue

                    try:
                        participant = Participants.objects.get(part_rsv_id=str(rsv_id))
                    except Participants.DoesNotExist:
                        debugPrint(f"[xls load] (!): участник RSV ID {rsv_id} не найден")
                        continue

                    year = clean_value(row_data.get("res_year"))

                    # Обновляем только существующие записи Results — не создаём новые,
                    # т.к. unique_together(res_participant, res_year, res_course_num) требует
                    # res_course_num, которого в этом листе нет.
                    # Записи создаются листом "Сравнение по компетенциям".
                    updated = Results.objects                               \
                        .filter(res_participant=participant, res_year=year) \
                        .update(**{val: clean_value(row_data.get(val), float) for val in VAL.list})

                    if updated == 0:
                        debugPrint(f"[xls load] (!): ценности: Results для RSV ID {rsv_id} год {year} не найден, пропуск")
                    updated_count += updated
                    row_count += 1

                # ============================================================
                # ЛИСТ 5: "Итоги успеваемости участников" (ДИСЦИПЛИНЫ)
                # ============================================================
                elif sheet_name == "Итоги успеваемости участников":
                    # В дисциплинах указано ФИО студента
                    student_name = clean_value(row_data.get("student_name"))
                    if not student_name:
                        continue

                    # Ищем RSV ID по ФИО в таблице маппинга
                    try:
                        mapping = Studentmapping.objects.get(student_name=student_name)
                        rsv_id = mapping.rsv_id
                    except Studentmapping.DoesNotExist:
                        debugPrint(f"[xls load] (!): ФИО '{student_name}' не найдено в маппинге")
                        continue
                    except Studentmapping.MultipleObjectsReturned:
                        debugPrint(f"[xls load] (!): несколько записей для ФИО '{student_name}'")
                        mapping = Studentmapping.objects.filter(student_name=student_name).first()
                        rsv_id = mapping.rsv_id

                    # Ищем участника по RSV ID
                    try:
                        participant = Participants.objects.get(part_rsv_id=rsv_id)
                    except Participants.DoesNotExist:
                        debugPrint(f"[xls load] (!): участник RSV ID {rsv_id} не найден")
                        continue

                    year = clean_value(row_data.get("perf_year"))
                    discipline = clean_value(row_data.get("perf_discipline"))

                    if not year or not discipline:
                        continue

                    Academicperformance.objects.update_or_create(
                        perf_part_id=participant.part_id,
                        perf_year=year,
                        perf_discipline=discipline,
                        defaults={"perf_main_attestation": clean_value(row_data.get("perf_main_attestation"))}
                    )

                    updated_count += 1
                    row_count += 1
                    
                    if row_count % 100 == 0:
                        debugPrint(f"[xls load] (i): обработано {row_count} записей дисциплин")

            debugPrint(f"[xls load] (i): лист '{sheet_name}' завершён; {row_count} строк")

    debugPrint(f"[xls load] (i): импорт завершён")
    debugPrint(f"[xls load] (i): создано записей: {created_count}")
    debugPrint(f"[xls load] (i): обновлено записей: {updated_count}")
    debugPrint(f"[xls load] (i): связей ФИО→ID: {mapping_count}")

    return {
        "status": "success", 
        "created": created_count, 
        "updated": updated_count,
        "mapped": mapping_count
    }


# fixme: get rid of this endpoint, it should be hardcoded in frontend
@method(GET)
@jsonResponse
@csrf_exempt
def get_expected_fields(request):
    """ Return expected field for each sheet.
    """
    return {
        "Связь ФИО и ID":            ["rsv_id", "student_name", "student_gender", "email"],
        "Сравнение по компетенциям": [
            "center_name",   "edu_level_name",     "inst_name",          "part_rsv_id",
            "part_gender",   "part_institution",   "part_spec",          "part_edu_level",
            "part_form",     "part_course_num",    "res_center",         "res_institution",
            "res_edu_level", "res_form",           "res_spec",           "res_course_num",
            "res_year",      "res_high_potential", "res_summary_report", *COMP.list,
            "spec_name",     "form_name"
        ],
        "Мотивационный профиль":         ["part_rsv_id", "res_year", *MOT.list],
        "Ценностный профиль":            ["part_rsv_id", "res_year", *VAL.list],
        "Образовательные курсы":         ["part_rsv_id", *CUR.list],
        "Итоги успеваемости участников": [
            "perf_year", "student_name", "perf_discipline", "perf_main_attestation"
        ]
    }


@method(GET)
@jsonResponse
@csrf_exempt
def get_templates(request):
    """ Get list of all data load templates.
    """
    return {'templates': list(
        PortraitUploadtemplate.objects
            .all()
            .values('id', 'name', 'description', 'config', 'updated_at')
    )}


@method(POST)
@jsonResponse
@csrf_exempt
def save_template(request):
    """ Save or update data load template.
    """
    data = json.loads(request.body)
    name = data.get('name')
    config = data.get('config')
    description = data.get('description', '')

    if not name:
        raise ResponseError("Missing template name")
    if not config:
        raise ResponseError("Missing config")

    template, created = PortraitUploadtemplate.objects.update_or_create(
        name=name,
        defaults={'config': config, 'description': description}
    )

    return {
        'id':      template.id,  # fixme looks like error
        'name':    template.name,
        'created': created
    }


@method(DELETE)
@jsonResponse
@csrf_exempt
def delete_template(request, template_id):
    """ Delete data load template.
    """
    PortraitUploadtemplate.objects.get(id=template_id).delete()
    return {'status': 'deleted'}


# ============================== UTILITIES ============================== #

def parse_gender(value) -> int | None:
    """ Конвертирует обозначение пола в число: М/Муж/Male → 1, Ж/Жен/Female → 2.
    """
    if value is None:
        return None
    s = str(value).strip().lower()
    if s in ("м", "муж", "мужской", "male", "m", "1"):
        return 1
    if s in ("ж", "жен", "женский", "female", "f", "2"):
        return 2
    return None


def clean_value(value, value_type: type[str] | type[int] | type[float] = str) -> str | int | float | None:
    """ Преобразует значение из Excel ячейки в нужный формат.
    """
    if value is None:
        return None

    s = str(value).strip()

    # Маркеры пустых значений
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
