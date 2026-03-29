# Модуль просмотра и выгрузки данных тестирования.

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Avg, Min
from django.utils import timezone

import json
import pandas as pd
import uuid

from .common import *


# ====== SESSION STORAGE ====== #

class DataViewSession:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.created_at = timezone.now()
        self.last_activity = timezone.now()
        self.filters = []
        self.visible_columns = None  # None = all columns
        self.limit = 1000  # todo \ investigate
        self.offset = 0    # todo / its usage

    def to_dict(self):
        return {
            'session_id':      self.session_id,
            'filters':         self.filters,
            'visible_columns': self.visible_columns,
            'limit':           self.limit,
            'offset':          self.offset
        }

    def update_activity(self):
        self.last_activity = timezone.now()


DATA_SESSIONS_VAULT: dict[str, DataViewSession] = {}  # fixme ffs make it redis


# ====== ENDPOINTS ====== #

@method('POST')
@jsonResponse
@csrf_exempt
def create_data_session(request):
    """ Start new data session.
    """
    cleanup_old_sessions()

    session = DataViewSession()
    DATA_SESSIONS_VAULT[session.session_id] = session

    return session.to_dict()


@method('POST')
@jsonResponse
@csrf_exempt
def get_session_data(request):
    """ Get data meeting session conditions.
    """
    session, _ = retrieve_session(request)

    results_query = Results.objects \
        .all()                      \
        .select_related(
            RES.PARTICIPANT, RES.CENTER, RES.INSTITUTION,
            RES.EDU_LEVEL, RES.EDU_FORM, RES.EDU_SPEC
        )

    for filter_ in session.filters:
        if filter_['type'] == 'basic' and filter_['selectedValues']:
            if (field := filter_['field']) in RESULTS_FIELD_MAP:
                results_query = results_query.filter(**{f'{RESULTS_FIELD_MAP[field]}__in': filter_['selectedValues']})

        elif filter_['type'] == 'numeric':
            field, min_val, max_val = filter_['field'], filter_['min'], filter_['max']

            if field.startswith(('res_comp', 'res_mot_', 'res_val_')):
                results_query = results_query.filter(**{f'{field}__gte': min_val, f'{field}__lte': max_val})

    total_count = results_query.count()
    
    results_list = results_query[session.offset:session.offset + session.limit]

    results_data = [format_result_data(result, session.visible_columns) for result in results_list]

    return {
        "results":     results_data,
        "total_count": total_count,
        "session":     session.to_dict()
    }


@method('POST')
@jsonResponse
@csrf_exempt
def update_session_filters(request):
    """ Update filters applied to a data session.
    """
    session, data = retrieve_session(request)
    filters = data.get('filters', [])

    session.filters = filters
    session.offset =  0  # reset offset on filters change (why tho)

    return {
        "session_id": session.session_id,
        "filters":    session.filters,
        "message":    "Filters updated successfully"
    }


@method('POST')
@jsonResponse
@csrf_exempt
def update_session_columns(request):
    """ Update columns visible inside a data session.
    """
    session, data = retrieve_session(request)
    visible_columns = data.get('visible_columns')

    session.visible_columns = visible_columns

    return {
        "session_id":      session.session_id,
        "visible_columns": session.visible_columns,
        "message":         "Visible columns updated successfully"
    }


@method('POST')
@jsonResponse
@csrf_exempt
def load_more_data(request):
    """ Load more data rows within a session.
    """
    session, _ = retrieve_session(request)

    session.offset += session.limit  # fixme possible error?

    response = get_session_data(request)  # reuse get_session_data logic

    if response.status_code // 100 == 2:
        data = json.loads(response.content)
        if 'session' in data:
            data['session']['offset'] = session.offset
        return data
    
    elif response.status_code // 100 == 4:
        data = json.loads(response.content)
        raise ResponseError(data.get("message", ""), response.status_code)
    
    elif response.status_code // 100 == 5:
        data = json.loads(response.content)
        raise RuntimeError(data.get("message", ""), response.status_code)

    return {}


@method('POST')
@csrf_exempt
def export_selected_results(request):
    try:
        data = json.loads(request.body)

        if not (session_id := data.get('session_id')) or session_id not in DATA_SESSIONS_VAULT:
            return errorResponse("Invalid session ID")

        if not (selected_ids := data.get('selected_ids', [])):
            return errorResponse("No records selected for export")

        session = DATA_SESSIONS_VAULT[session_id]
        session.update_activity()

        results_query = Results.objects      \
            .filter(res_id__in=selected_ids) \
            .select_related(
                RES.PARTICIPANT, RES.CENTER, RES.INSTITUTION,
                RES.EDU_LEVEL, RES.EDU_FORM, RES.EDU_SPEC
            )

        df = pd.DataFrame([format_result_for_export(result, session.visible_columns) for result in results_query])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="selected_results_export.xlsx"'

        with pd.ExcelWriter(response, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Выбранные результаты")

        return response

    except Exception as e:
        return exceptionResponse(str(e))


@method('POST')
@jsonResponse
@csrf_exempt
def stats_with_filters(request):
    """ Calculate statistics of testing.
    """
    try:
        session, _ = retrieve_session(request)
        filters = session.filters
    except ResponseError:
        filters = []

    total_participants =  Participants.objects.count()
    total_tests =         Results.objects.count()
    unique_institutions = Institutions.objects.count()
    unique_centers =      Competencecenters.objects.count()

    # Участники по году получения первой оценки
    first_year_stats = Results.objects          \
        .values(RES.PARTICIPANT)                \
        .annotate(first_year=Min(RES.YEAR))     \
        .values('first_year')                   \
        .annotate(count=Count(RES.PARTICIPANT)) \
        .order_by('first_year')

    participants_by_first_year = {
        "years":  [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
        "counts": [stat['count']           for stat in first_year_stats if stat['first_year']]
    }

    # Участники по центрам компетенций (топ-15)
    centers_stats = Results.objects                            \
        .filter(res_center__isnull=False)                      \
        .values('res_center__center_name')                     \
        .annotate(count=Count(RES.PARTICIPANT, distinct=True)) \
        .order_by('-count')[:15]

    participants_by_center = {
        "centers": [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
        "counts":  [stat['count']                   for stat in centers_stats if stat['res_center__center_name']]
    }

    # Участники по учебным заведениям (топ-15)
    institutions_stats = Results.objects                       \
        .filter(res_institution__isnull=False)                 \
        .values('res_institution__inst_name')                  \
        .annotate(count=Count(RES.PARTICIPANT, distinct=True)) \
        .order_by('-count')[:15]

    participants_by_institution = {
        "institutions": [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
        "counts":       [stat['count']                      for stat in institutions_stats if stat['res_institution__inst_name']]
    }

    # Специальности участников
    specialties_stats = Results.objects                        \
        .filter(res_spec__isnull=False)                        \
        .values('res_spec__spec_name')                         \
        .annotate(count=Count(RES.PARTICIPANT, distinct=True)) \
        .order_by('-count')

    specialties_distribution = {
        "specialties": [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
        "counts":      [stat['count']               for stat in specialties_stats if stat['res_spec__spec_name']]
    }

    # Динамика тестирований по годам
    tests_by_year = Results.objects      \
        .filter(res_year__isnull=False)  \
        .values(RES.YEAR)                \
        .annotate(count=Count('res_id')) \
        .order_by(RES.YEAR)

    tests_by_year_data = {
        "years":  [str(stat['res_year']) for stat in tests_by_year if stat['res_year']],
        "counts": [stat['count']         for stat in tests_by_year if stat['res_year']]
    }

    competences_by_year = [
        {
            "name":   COMP.names[field],
            "years":  [str(stat['res_year'])              for stat in yearly_stats1 if stat['res_year']],
            "values": [round(float(stat['avg_value']), 1) for stat in yearly_stats1 if stat['res_year']]
        }
        for field in COMP.names.keys()
        if (
            yearly_stats1 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(RES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(RES.YEAR)
        )
    ]

    motivators_by_year = [
        {
            "name":   MOT.names[field],
            "years":  [str(stat['res_year'])              for stat in yearly_stats2 if stat['res_year']],
            "values": [round(float(stat['avg_value']), 1) for stat in yearly_stats2 if stat['res_year']]
        }
        for field in MOT.names.keys()
        if (
            yearly_stats2 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(RES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(RES.YEAR)
        )
    ]

    values_by_year = [
        {
            "name":   VAL.names[field],
            "years":  [str(stat['res_year'])              for stat in yearly_stats3 if stat['res_year']],
            "values": [round(float(stat['avg_value']), 1) for stat in yearly_stats3 if stat['res_year']]
        }
        for field in VAL.names.keys()
        if (
            yearly_stats3 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(RES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(RES.YEAR)
        )
    ]

    return {
        "stats": {
            "totalParticipants":  total_participants,
            "totalTests":         total_tests,
            "uniqueInstitutions": unique_institutions,
            "uniqueCenters":      unique_centers,

            "participantsByFirstYear":   participants_by_first_year,
            "participantsByCenter":      participants_by_center,
            "participantsByInstitution": participants_by_institution,
            "specialtiesDistribution":   specialties_distribution,

            "testsByYear":       tests_by_year_data,
            "competencesByYear": competences_by_year,
            "motivatorsByYear":  motivators_by_year,
            "valuesByYear":      values_by_year,
            "available_values":  extract_available_values_for_filters(filters)  # add available_values for filtering
        }
    }


@method('POST')
@jsonResponse
@csrf_exempt
def group_data(request):
    """ Group data within session.
    """
    data = json.loads(request.body)

    if not (selected_ids := data.get('selected_ids', [])):
        raise ResponseError("No records selected for grouping")

    if not (grouping_column := data.get('grouping_column')):
        raise ResponseError("Grouping column not specified")

    results_query = Results.objects      \
        .filter(res_id__in=selected_ids) \
        .select_related(
            RES.PARTICIPANT, RES.CENTER, RES.INSTITUTION,
            RES.EDU_LEVEL, RES.EDU_FORM, RES.EDU_SPEC
        )

    grouped_data = {
        "competences": {},
        "motivators":  {},
        "values":      {}
    }

    # get unique groups
    groups = {*[
        group_value for result in results_query
        if (group_value := get_group_value(result, grouping_column))
    ]}
    groups = sorted(list(groups))

    for field in COMP.names.keys():
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
            field_values =  [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value =     sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["competences"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    for field in MOT.names.keys():
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
            field_values =  [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value =     sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["motivators"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    for field in VAL.names.keys():
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, grouping_column) == group]
            field_values = [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value = sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["values"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    return {
        "grouped_data":  grouped_data,
        "groups":        groups,
        "total_records": len(selected_ids)
    }


# ====== CONSTANTS ====== #

RESULTS_FIELD_MAP = {
    'part_gender':    'res_participant__part_gender',
    'center':         'res_center__center_name',
    'institution':    'res_institution__inst_name',
    'edu_level':      'res_edu_level__edu_level_name',
    'study_form':     'res_form__form_name',
    'specialty':      'res_spec__spec_name',
    'res_year':       'res_year',
    'res_course_num': 'res_course_num'
}


# ====== UTILITIES ====== #

def retrieve_session(request) -> tuple[DataViewSession, dict]:
    """ Exctract session data from request and fail if there is no such session.
    """
    data: dict = json.loads(request.body)
    session_id = data.get('session_id')

    if session_id is None:
        raise ResponseError("Invalid session ID")

    if (session_id := str(session_id)) not in DATA_SESSIONS_VAULT:
        raise ResponseError("Invalid session ID", status=404)

    session = DATA_SESSIONS_VAULT[session_id]
    session.update_activity()

    return session, data


def cleanup_old_sessions():
    """ Erase expired data sessions (older than 1 hour).
    """
    for session_id, session in DATA_SESSIONS_VAULT.items():
        if (timezone.now() - session.last_activity).total_seconds() > 3600:
            del DATA_SESSIONS_VAULT[session_id]


def format_result_data(result, visible_columns=None):
    """ Format results data before dispatching it.
    """
    base_data = {
        "res_id": result.res_id,
        "participant": {
            "part_id":        result.res_participant.part_id,
            "part_rsv_id":      result.res_participant.part_rsv_id,
            "part_gender":    result.res_participant.part_gender,
        },
        "center":             result.res_center.center_name       if result.res_center      else None,
        "institution":        result.res_institution.inst_name    if result.res_institution else None,
        "edu_level":          result.res_edu_level.edu_level_name if result.res_edu_level   else None,
        "study_form":         result.res_form.form_name           if result.res_form        else None,
        "specialty":          result.res_spec.spec_name           if result.res_spec        else None,
        "res_year":           result.res_year,
        "res_course_num":     result.res_course_num,
        "res_high_potential": result.res_high_potential,
        "res_summary_report": result.res_summary_report,
    }

    if visible_columns:
        filtered_data = {}

        for field in visible_columns:
            if field in base_data:
                filtered_data[field] = base_data[field]

            elif field in COMP.names.keys():
                if 'competences' not in filtered_data:
                    filtered_data['competences'] = {}
                filtered_data['competences'][field] = getattr(result, field)

            elif field in MOT.names.keys():
                if 'motivators' not in filtered_data:
                    filtered_data['motivators'] = {}
                filtered_data['motivators'][field] = getattr(result, field)

            elif field in VAL.names.keys():
                if 'values' not in filtered_data:
                    filtered_data['values'] = {}
                filtered_data['values'][field] = getattr(result, field)

        return filtered_data

    base_data['competences'] = {field: getattr(result, field) for field in COMP.names.keys()}
    base_data['motivators'] =  {field: getattr(result, field) for field in MOT.names.keys()}
    base_data['values'] =      {field: getattr(result, field) for field in VAL.names.keys()}

    return base_data


def format_result_for_export(result, visible_columns=None):  # analogous to format_result_data()
    """ Format results data before putting it into Excel.
    """
    row = {
        "ID результата":       result.res_id,
        "ID РСВ результата":   result.res_participant.part_rsv_id,
        "Пол":                 result.res_participant.part_gender,
        "Центр компетенций":   result.res_center.center_name       if result.res_center      else "",
        "Учебное заведение":   result.res_institution.inst_name    if result.res_institution else "",
        "Уровень образования": result.res_edu_level.edu_level_name if result.res_edu_level   else "",
        "Форма обучения":      result.res_form.form_name           if result.res_form        else "",
        "Специальность":       result.res_spec.spec_name           if result.res_spec        else "",
        "Учебный год":         result.res_year,
        "Номер курса":         result.res_course_num,
        "Высокий потенциал":   result.res_high_potential or "",
        "Сводный отчет":       result.res_summary_report or "",
    }

    all_fields = {}
    all_fields.update(COMP.names)
    all_fields.update(MOT.names)
    all_fields.update(VAL.names)

    for field in all_fields.keys():
        if visible_columns is None or field in visible_columns:
            value = getattr(result, field)
            row[all_fields[field]] = value if value is not None else ''

    return row


def get_group_value(result, grouping_column):
    """ Get value for groupping from result.
    """ # what?
    match grouping_column:
        case 'part_gender':    return result.res_participant.part_gender  if result.res_participant else None
        case 'center':         return result.res_center.center_name       if result.res_center      else None
        case 'institution':    return result.res_institution.inst_name    if result.res_institution else None
        case 'edu_level':      return result.res_edu_level.edu_level_name if result.res_edu_level   else None
        case 'study_form':     return result.res_form.form_name           if result.res_form        else None
        case 'specialty':      return result.res_spec.spec_name           if result.res_spec        else None
        case 'res_year':       return result.res_year
        case 'res_course_num': return result.res_course_num
        case _:                return None


def extract_available_values_for_filters(current_filters):
    """ Extract values available for filtering.
    """
    values = {}

    # basic fields to filter
    basic_fields = [
        'res_year', 'part_gender', 'center', 'institution', 
        'edu_level', 'res_course_num', 'study_form', 'specialty'
    ]

    results_query = Results.objects.all()

    # apply current filters except the one we're extracting the values against (?)

    for filter_ in current_filters:
        if filter_['type'] == 'basic' and filter_['selectedValues']:
            if (field := filter_['field']) in RESULTS_FIELD_MAP:
                results_query = results_query.filter(**{f'{RESULTS_FIELD_MAP[field]}__in': filter_['selectedValues']})

    # extract unique values for each field
    for field in basic_fields:
        if field in RESULTS_FIELD_MAP:
            unique_values = results_query                                 \
                .filter(**{f'{RESULTS_FIELD_MAP[field]}__isnull': False}) \
                .values_list(RESULTS_FIELD_MAP[field], flat=True)         \
                .distinct()                                               \
                .order_by(RESULTS_FIELD_MAP[field])

        # turn into list of string and filter empty values
        values[field] = [str(val) for val in unique_values if val is not None and str(val).strip() != ""]

    return values
