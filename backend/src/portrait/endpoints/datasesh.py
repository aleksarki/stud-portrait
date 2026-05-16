# Модуль просмотра, выборки и выгрузки данных тестирования.

from datetime import datetime
import json
import uuid

from django.core.cache import cache
from django.db.models import Count, Avg, Min
from django.utils import timezone

from .common import *


# ! ================================================== DATA VIEW =================================================== ! #

class DataViewFilter:
    CATEGORIAL = 'categorial'
    NUMERIC = 'numeric'
    
    def __init__(
        self, id: str, type: str, field: str, categories: list[str] | None = None,
        min: int | None = None, max: int | None = None
    ):
        self.id = id
        self.type = type
        self.field = field
        self.categories = categories
        self.min = min
        self.max = max

    @classmethod
    def fromDict(cls, dict: dict) -> 'DataViewFilter':
        """ Deserialize data filter object from a dictionary.
        """
        categories = dict.get('categories')
        min = dict.get('min')
        max = dict.get('max')
        match dict['type']:
            case cls.CATEGORIAL:
                if categories is None:
                    raise ValueError("Categories not provided")
            case cls.NUMERIC:
                if min is None or max is None:
                    raise ValueError("Value limit not provided")
            case _:
                raise ValueError(f"Invalid filter type: {dict['type']}")
        return cls(
            id =         dict['id'],
            type =       dict['type'],
            field =      dict['field'],
            categories = categories,
            min =        min,
            max =        max
        )

    def toDict(self) -> dict:
        """ Serialize data filter object into a dictionary.
        """
        return {
            'id':         self.id,
            'type':       self.type,
            'field':      self.field,
            'categories': self.categories,
            'min':        self.min,
            'max':        self.max
        }


class DataViewSession:
    TIMEOUT = 3600

    def __init__(
        self, id: str, created_at: datetime, last_activity: datetime, filters: list[DataViewFilter],
        columns: list[str] | None, start: int, end: int, total_count: int
    ):
        self.id = id
        self.created_at = created_at
        self.last_activity = last_activity
        self.filters = filters
        self.columns = columns  # None = all columns
        self.start = start
        self.end = end
        self.total_count = total_count  # total table row count

    @classmethod
    def new(cls) -> 'DataViewSession':
        """ Create brand new data session.
        """
        return cls(
            id=str(uuid.uuid4()),
            created_at=(created := timezone.now()),
            last_activity=created,
            filters=[],
            columns=None,
            start=0,
            end=1000,
            total_count=Results.objects.count()
        )

    @classmethod
    def find(cls, id: str) -> 'DataViewSession | None':
        """ Get session stored in the vault.
        """
        serialized = cache.get(f"session:{id}")
        if serialized is None:
            return None
        return cls.fromDict(serialized)

    @classmethod
    def fromDict(cls, dict: dict) -> 'DataViewSession':
        """ Deserialize data session object from a dictionary.
        """
        return cls(
            id =            dict['id'],
            created_at =    dict['created_at'],
            last_activity = dict['last_activity'],
            filters =       [DataViewFilter.fromDict(f) for f in dict['filters']],
            columns =       dict['columns'],
            start =         dict['start'],
            end =           dict['end'],
            total_count =   dict['total_count']
        )

    def toDict(self) -> dict:
        """ Serialize data session object into a dictionary.
        """
        return {
            'id':            self.id,
            'created_at':    self.created_at,
            'last_activity': self.last_activity,
            'filters':       [f.toDict() for f in self.filters],
            'columns':       self.columns,
            'start':         self.start,
            'end':           self.end,
            'total_count':   self.total_count
        }

    def save(self):
        """ Store session in the vault.
        """
        cache.set(f"session:{self.id}", self.toDict(), timeout=self.TIMEOUT)

    def refresh(self):
        """ Refresh data session so that it does not expire.
        """
        self.last_activity = timezone.now()
        cache.set(f"session:{self.id}", self.toDict(), timeout=self.TIMEOUT)

    def setFilters(self, filters: list[dict]):
        """ Update filters applied.
        """
        self.filters = [DataViewFilter.fromDict(f) for f in filters]

    def setColumns(self, columns: list[str] | None):
        """ Update columns visible.
        """
        if (
            columns is not None and
            (type(columns) != list or any(type(c) != str for c in columns))
        ):
            raise ValueError(f"Invalid columns")
        self.columns = columns

    def setWindow(self, start: int, end: int):
        """ Update view window.
        """
        if (
            type(start) != int or type(end) != int or
            start < 0 or end < 0 or
            start > end
        ):
            raise ValueError("Invalid window limits")
        self.start = start
        self.end = end


# ! ================================================== ENDPOINTS =================================================== ! #

@method(POST)
@jsonResponse
@csrf_exempt
def create_data_session(request):
    """ Start new data session.
    """
    session = DataViewSession.new()
    session.save()
    return {"session": session.toDict()}


@method(POST)
@jsonResponse
@csrf_exempt
def extract_session_data(request):
    """ Get data meeting the session conditions.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')

    session = acquire_session(session_id)

    results_query = Results.objects \
        .all()                      \
        .select_related(
            TRES.PARTICIPANT, TRES.CENTER, TRES.INSTITUTION,
            TRES.EDU_LEVEL, TRES.EDU_FORM, TRES.EDU_SPEC
        )

    for filter in session.filters:
        match filter.type:
            case DataViewFilter.CATEGORIAL:
                if filter.field in RESULTS_FIELD_MAP:
                    results_query = results_query.filter(**{
                        join(RESULTS_FIELD_MAP[filter.field], IN): filter.categories
                    })
            case DataViewFilter.NUMERIC:
                if filter.field.startswith(('res_comp_', 'res_mot_', 'res_val_')):
                    results_query = results_query.filter(**{
                        join(filter.field, GTE): filter.min,
                        join(filter.field, LTE): filter.max
                    })

    filtered_count = results_query.count()
    results_slice = results_query[session.start:session.end]
    shown_count = results_slice.count()
    results_list = [result_to_json(result, session.columns) for result in results_slice]

    return {
        "session":        session.toDict(),
        "results":        results_list,
        "filtered_count": filtered_count,  # count of rows before slicing
        "shown_count":    shown_count
    }


@method(POST)
@jsonResponse
@csrf_exempt
def update_session_filters(request):
    """ Update filters applied to a data session.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')
    filters = data.get('filters', [])

    session = acquire_session(session_id)

    try:
        session.setFilters(filters)
    except Exception as e:
        raise ResponseError(f"Invalid filters provided: {str(e)}")

    session.save()

    return {"session": session.toDict()}


@method(POST)
@jsonResponse
@csrf_exempt
def update_session_columns(request):
    """ Update columns visible inside a data session.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')
    columns = data.get('columns', None)

    session = acquire_session(session_id)

    try:
        session.setColumns(columns)
    except Exception as e:
        raise ResponseError(f"Invalid columns provided: {str(e)}")

    session.save()

    return {"session": session.toDict()}


@method(POST)
@jsonResponse
@csrf_exempt
def update_session_window(request):
    """ Define borders of view window within a session.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')
    start = data.get('start')
    end = data.get('end')

    session = acquire_session(session_id)

    try:
        session.setWindow(start, end)
    except Exception as e:
        raise ResponseError(f"Invalid window provided: {str(e)}")

    session.save()

    return {"session": session.toDict()}


@method(POST)
@httpResponse
@csrf_exempt
def export_selected_results(request):
    data = json.loads(request.body)
    session_id = data.get('session_id')
    selected_ids = data.get('selected_ids')

    session = acquire_session(session_id)

    if not selected_ids:
        raise ResponseError("No records provided for export")

    results_query = Results.objects                  \
        .filter(**{join(TRES.ID, IN): selected_ids}) \
        .select_related(
            TRES.PARTICIPANT, TRES.CENTER, TRES.INSTITUTION,
            TRES.EDU_LEVEL, TRES.EDU_FORM, TRES.EDU_SPEC
        )

    return xlsxResponse(
        [format_result_for_export(result, session.columns) for result in results_query],
        "Выгрузка результатов", "results_export.xlsx"
    )


@method(POST)
@jsonResponse
@csrf_exempt
def group_data(request):  # REVIEW
    """ Group competencies, motivators and values within session.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')
    selected_ids = data.get('selected_ids')
    groupping_column = data.get('groupping_column')

    session = acquire_session(session_id)

    if not selected_ids:
        raise ResponseError("No records provided for groupping")
    if not groupping_column:
        raise ResponseError("Grouping column not specified")

    results_query = Results.objects                  \
        .filter(**{join(TRES.ID, IN): selected_ids}) \
        .select_related(
            TRES.PARTICIPANT, TRES.CENTER, TRES.INSTITUTION,
            TRES.EDU_LEVEL, TRES.EDU_FORM, TRES.EDU_SPEC
        )
    
    for filter in session.filters:
        match filter.type:
            case DataViewFilter.CATEGORIAL:
                if filter.field in RESULTS_FIELD_MAP:
                    results_query = results_query.filter(**{
                        join(RESULTS_FIELD_MAP[filter.field], IN): filter.categories
                    })
            case DataViewFilter.NUMERIC:
                if filter.field.startswith(('res_comp_', 'res_mot_', 'res_val_')):
                    results_query = results_query.filter(**{
                        join(filter.field, GTE): filter.min,
                        join(filter.field, LTE): filter.max
                    })

    grouped_data = {
        "competences": {},
        "motivators":  {},
        "values":      {}
    }

    # get unique groups
    groups = sorted(list({*[
        group_value for result in results_query
        if (group_value := get_group_value(result, groupping_column))
    ]}))

    for field in COMP.list:
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, groupping_column) == group]
            field_values =  [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value =     sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["competences"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    for field in MOT.list:
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, groupping_column) == group]
            field_values =  [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value =     sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["motivators"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    for field in VAL.list:
        values_by_group = []
        for group in groups:
            group_results = [r for r in results_query if get_group_value(r, groupping_column) == group]
            field_values =  [getattr(r, field) for r in group_results if getattr(r, field) is not None]
            avg_value =     sum(field_values) / len(field_values) if field_values else 0
            values_by_group.append(round(avg_value, 1))

        grouped_data["values"][field] = {
            "groups": groups,
            "values": values_by_group
        }

    return {
        "session":       session.toDict(),
        "groups":        groups,
        "grouped_data":  grouped_data
    }


@method(POST)
@jsonResponse
@csrf_exempt
def stats_with_filters(request):
    """ Calculate statistics of testing.
    """
    data = json.loads(request.body)
    session_id = data.get('session_id')

    session = acquire_session(session_id)

    total_participants =  Participants.objects.count()
    total_tests =         Results.objects.count()
    unique_institutions = Institutions.objects.count()
    unique_centers =      Competencecenters.objects.count()

    # Участники по году получения первой оценки
    first_year_stats = Results.objects           \
        .values(TRES.PARTICIPANT)                \
        .annotate(first_year=Min(TRES.YEAR))     \
        .values('first_year')                    \
        .annotate(count=Count(TRES.PARTICIPANT)) \
        .order_by('first_year')

    participants_by_first_year = {
        "years":  [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
        "counts": [stat['count']           for stat in first_year_stats if stat['first_year']]
    }

    # Участники по центрам компетенций (топ-15)
    centers_stats = Results.objects                             \
        .filter(**{join(TRES.CENTER, ISNULL): False})           \
        .values(join(TRES.CENTER, 'center_name'))               \
        .annotate(count=Count(TRES.PARTICIPANT, distinct=True)) \
        .order_by('-count')[:15]

    participants_by_center = {
        "centers": [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
        "centers": [stat['res_center__center_name'] for stat in centers_stats if stat['res_center__center_name']],
        "counts":  [stat['count']                   for stat in centers_stats if stat['res_center__center_name']]
    }

    # Участники по учебным заведениям (топ-15)
    institutions_stats = Results.objects                        \
        .filter(**{join(TRES.INSTITUTION, ISNULL): False})      \
        .values(join(TRES.INSTITUTION, 'inst_name'))            \
        .annotate(count=Count(TRES.PARTICIPANT, distinct=True)) \
        .order_by('-count')[:15]

    participants_by_institution = {
        "institutions": [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
        "counts":       [stat['count']                      for stat in institutions_stats if stat['res_institution__inst_name']]
    }

    # Специальности участников
    specialties_stats = Results.objects                         \
        .filter(**{join(TRES.EDU_SPEC, ISNULL): False})         \
        .values(join(TRES.EDU_SPEC, 'spec_name'))               \
        .annotate(count=Count(TRES.PARTICIPANT, distinct=True)) \
        .order_by('-count')

    specialties_distribution = {
        "specialties": [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
        "counts":      [stat['count']               for stat in specialties_stats if stat['res_spec__spec_name']]
    }

    # Динамика тестирований по годам
    tests_by_year = Results.objects                 \
        .filter(**{join(TRES.YEAR, ISNULL): False}) \
        .values(TRES.YEAR)                          \
        .annotate(count=Count(TRES.ID))             \
        .order_by(TRES.YEAR)

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
        for field in COMP.list
        if (
            yearly_stats1 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(TRES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(TRES.YEAR)
        )
    ]

    motivators_by_year = [
        {
            "name":   MOT.names[field],
            "years":  [str(stat['res_year'])              for stat in yearly_stats2 if stat['res_year']],
            "values": [round(float(stat['avg_value']), 1) for stat in yearly_stats2 if stat['res_year']]
        }
        for field in MOT.list
        if (
            yearly_stats2 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(TRES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(TRES.YEAR)
        )
    ]

    values_by_year = [
        {
            "name":   VAL.names[field],
            "years":  [str(stat['res_year'])              for stat in yearly_stats3 if stat['res_year']],
            "values": [round(float(stat['avg_value']), 1) for stat in yearly_stats3 if stat['res_year']]
        }
        for field in VAL.list
        if (
            yearly_stats3 := Results.objects                                   \
                .filter(**{f'{field}__isnull': False}, res_year__isnull=False) \
                .values(TRES.YEAR)                                              \
                .annotate(avg_value=Avg(field))                                \
                .order_by(TRES.YEAR)
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
            "available_values":  extract_available_values_for_filters(session.filters)  # add available_values for filtering
        }
    }


# ! ================================================== CONSTANTS =================================================== ! #

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


# ! ================================================== UTILITIES =================================================== ! #

def acquire_session(id: str) -> DataViewSession:
    """ Get data view session by ID, or fail doing so.
    """
    if id is None:
        raise ResponseError("Missing session ID")
    session = DataViewSession.find(id)
    if session is None:
        raise ResponseError("No such session exists", status=404)
    session.refresh()
    return session


def result_to_json(result, visible_columns=None):  # REVIEW
    """ Format results data before dispatching it.
    """
    base_data = {
        "res_id": result.res_id,
        "participant": {
            "part_id":        result.res_participant.part_id,
            "part_rsv_id":    result.res_participant.part_rsv_id,
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

            elif field in COMP.list:
                if 'competences' not in filtered_data:
                    filtered_data['competences'] = {}
                filtered_data['competences'][field] = getattr(result, field)

            elif field in MOT.list:
                if 'motivators' not in filtered_data:
                    filtered_data['motivators'] = {}
                filtered_data['motivators'][field] = getattr(result, field)

            elif field in VAL.list:
                if 'values' not in filtered_data:
                    filtered_data['values'] = {}
                filtered_data['values'][field] = getattr(result, field)

        return filtered_data

    base_data['competences'] = {field: getattr(result, field) for field in COMP.list}
    base_data['motivators'] =  {field: getattr(result, field) for field in MOT.list}
    base_data['values'] =      {field: getattr(result, field) for field in VAL.list}

    return base_data


def format_result_for_export(result, visible_columns=None):  # REVIEW
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
            row[all_fields[field]] = value if value is not None else ""

    return row


def get_group_value(result, grouping_column):  # REVIEW
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


def extract_available_values_for_filters(filters: list[DataViewFilter]):
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

    for filter in filters:
        if filter.type == DataViewFilter.CATEGORIAL and filter.categories:
            if filter.field in RESULTS_FIELD_MAP:
                results_query = results_query.filter(**{f'{RESULTS_FIELD_MAP[filter.field]}__in': filter.categories})

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
