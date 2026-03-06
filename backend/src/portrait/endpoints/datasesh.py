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
            'session_id':      self.session_id,
            'filters':         self.filters,
            'visible_columns': self.visible_columns,
            'limit':           self.limit,
            'offset':          self.offset
        }
    
    def update_activity(self):
        self.last_activity = timezone.now()


# ====== ENDPOINTS ====== #

@method('POST')
@csrf_exempt
def create_data_session(request):
    try:
        cleanup_old_sessions()  # Очищаем старые сессии
        
        session = DataViewSession()
        data_view_sessions[session.session_id] = session
        
        return successResponse({
            "session_id":      session.session_id,
            "filters":         session.filters,
            "visible_columns": session.visible_columns,
            "limit":           session.limit
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
                match filter_obj['field']:
                    case 'part_gender':
                        results_query = results_query.filter(
                            res_participant__part_gender__in=filter_obj['selectedValues']
                        )
                    case 'center':
                        results_query = results_query.filter(
                            res_center__center_name__in=filter_obj['selectedValues']
                        )
                    case 'institution':
                        results_query = results_query.filter(
                            res_institution__inst_name__in=filter_obj['selectedValues']
                        )
                    case 'edu_level':
                        results_query = results_query.filter(
                            res_edu_level__edu_level_name__in=filter_obj['selectedValues']
                        )
                    case 'study_form':
                        results_query = results_query.filter(
                            res_form__form_name__in=filter_obj['selectedValues']
                        )
                    case 'specialty':
                        results_query = results_query.filter(
                            res_spec__spec_name__in=filter_obj['selectedValues']
                        )
                    case 'res_year':
                        results_query = results_query.filter(
                            res_year__in=filter_obj['selectedValues']
                        )
                    case 'res_course_num':
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
            "results":     results_data,
            "total_count": total_count,
            "session":     session.to_dict()
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
            "session_id":      session.session_id,
            "visible_columns": session.visible_columns,
            "message":         "Visible columns updated successfully"
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
        total_participants =  Participants.objects.count()
        total_tests =         Results.objects.count()
        unique_institutions = Institutions.objects.count()
        unique_centers =      Competencecenters.objects.count()

        # Участники по году получения первой оценки
        first_year_stats = Results.objects.values('res_participant').annotate(
            first_year=Min('res_year')
        ).values('first_year').annotate(
            count=Count('res_participant')
        ).order_by('first_year')
        
        participants_by_first_year = {
            'years':  [str(stat['first_year']) for stat in first_year_stats if stat['first_year']],
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
            'counts':  [stat['count'] for stat in centers_stats if stat['res_center__center_name']]
        }

        # Участники по учебным заведениям (топ-15)
        institutions_stats = Results.objects.filter(
            res_institution__isnull=False
        ).values('res_institution__inst_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')[:15]
        
        participants_by_institution = {
            'institutions': [stat['res_institution__inst_name'] for stat in institutions_stats if stat['res_institution__inst_name']],
            'counts':       [stat['count'] for stat in institutions_stats if stat['res_institution__inst_name']]
        }

        # Специальности участников
        specialties_stats = Results.objects.filter(
            res_spec__isnull=False
        ).values('res_spec__spec_name').annotate(
            count=Count('res_participant', distinct=True)
        ).order_by('-count')
        
        specialties_distribution = {
            'specialties': [stat['res_spec__spec_name'] for stat in specialties_stats if stat['res_spec__spec_name']],
            'counts':       [stat['count'] for stat in specialties_stats if stat['res_spec__spec_name']]
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
        
        competences_by_year = []
        for field in COMP.names.keys():
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                competences_by_year.append({
                    'name': COMP.names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })
        
        motivators_by_year = []
        for field in MOT.names.keys():
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                motivators_by_year.append({
                    'name': MOT.names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })
        
        values_by_year = []
        for field in VAL.names.keys():
            yearly_stats = Results.objects.filter(
                **{f'{field}__isnull': False},
                res_year__isnull=False
            ).values('res_year').annotate(
                avg_value=Avg(field)
            ).order_by('res_year')
            
            if yearly_stats:
                values_by_year.append({
                    'name': VAL.names[field],
                    'years': [str(stat['res_year']) for stat in yearly_stats if stat['res_year']],
                    'values': [round(float(stat['avg_value']), 1) for stat in yearly_stats if stat['res_year']]
                })
        
        # Добавляем available_values для фильтрации
        stats_data = {
            'totalParticipants':         total_participants,
            'totalTests':                total_tests,
            'uniqueInstitutions':        unique_institutions,
            'uniqueCenters':             unique_centers,
            'participantsByFirstYear':   participants_by_first_year,
            'participantsByCenter':      participants_by_center,
            'participantsByInstitution': participants_by_institution,
            'specialtiesDistribution':   specialties_distribution,
            'testsByYear':               tests_by_year_data,
            'competencesByYear':         competences_by_year,
            'motivatorsByYear':          motivators_by_year,
            'valuesByYear':              values_by_year,
            'available_values':          extract_available_values_for_filters(filters)
        }
        
        return successResponse({"stats": stats_data})
        
    except Exception as e:
        return exceptionResponse(e)


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
        
        for field in COMP.names.keys():
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
        
        for field in MOT.names.keys():
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
        
        for field in VAL.names.keys():
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
            "grouped_data":  grouped_data,
            "groups":        groups,
            "total_records": len(selected_ids)
        })
        
    except Exception as e:
        return exceptionResponse(e)


# ====== UTILITIES ====== #

def cleanup_old_sessions():
    now = timezone.now()
    expired_sessions = []
    for session_id, session in data_view_sessions.items():
        if (now - session.last_activity).total_seconds() > 3600:  # 1 час
            expired_sessions.append(session_id)
    
    for session_id in expired_sessions:
        del data_view_sessions[session_id]


def format_result_data(result, visible_columns=None):
    """Форматирует данные результата для отправки на фронтенд"""
    base_data = {
        'res_id': result.res_id,
        'participant': {
            'part_id':     result.res_participant.part_id,
            'part_name':   result.res_participant.part_name,
            'part_gender': result.res_participant.part_gender,
        },
        'center':             result.res_center.center_name       if result.res_center      else None,
        'institution':        result.res_institution.inst_name    if result.res_institution else None,
        'edu_level':          result.res_edu_level.edu_level_name if result.res_edu_level   else None,
        'study_form':         result.res_form.form_name           if result.res_form        else None,
        'specialty':          result.res_spec.spec_name           if result.res_spec        else None,
        'res_year':           result.res_year,
        'res_course_num':     result.res_course_num,
        'res_high_potential': result.res_high_potential,
        'res_summary_report': result.res_summary_report,
    }
    
    # Если указаны видимые колонки, фильтруем данные
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
    else:
        # Возвращаем все данные
        base_data['competences'] = {field: getattr(result, field) for field in COMP.names.keys()}
        base_data['motivators'] =  {field: getattr(result, field) for field in MOT.names.keys()}
        base_data['values'] =      {field: getattr(result, field) for field in VAL.names.keys()}
        return base_data


def format_result_for_export(result, visible_columns=None):
    """Форматирует данные для экспорта в Excel"""
    # Аналогичная логика format_result_data, но в плоском формате для Excel
    row = {
        'ID результата':       result.res_id,
        'ФИО участника':       result.res_participant.part_name,
        'Пол':                 result.res_participant.part_gender,
        'Центр компетенций':   result.res_center.center_name       if result.res_center      else '',
        'Учебное заведение':   result.res_institution.inst_name    if result.res_institution else '',
        'Уровень образования': result.res_edu_level.edu_level_name if result.res_edu_level   else '',
        'Форма обучения':      result.res_form.form_name           if result.res_form        else '',
        'Специальность':       result.res_spec.spec_name           if result.res_spec        else '',
        'Учебный год':         result.res_year,
        'Номер курса':         result.res_course_num,
        'Высокий потенциал':   result.res_high_potential or '',
        'Сводный отчет':       result.res_summary_report or '',
    }
    
    all_fields = {}
    all_fields.update(COMP.names)
    all_fields.update(MOT.names)
    all_fields.update(VAL.names)
    
    # Добавляем поля в row
    for field in all_fields.keys():
        if not visible_columns or field in visible_columns:
            value = getattr(result, field)
            row[all_fields[field]] = value if value is not None else ''
    
    return row


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
