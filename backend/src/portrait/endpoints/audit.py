from django.http import JsonResponse
from django.db import connections
from django.apps import apps

import datetime
import decimal
import json

from .common import *

@csrf_exempt
def get_database_schema(request):
    """
    Получение схемы базы данных: список таблиц, колонок, количества строк.
    GET параметры:
        - table_name: имя конкретной таблицы (опционально)
    """
    try:
        table_name = request.GET.get('table_name')
        
        # Получаем все модели Django
        all_models = apps.get_models()
        
        result = {
            'tables': [],
            'total_tables': 0,
            'total_rows': 0
        }
        
        for model in all_models:
            db_table = model._meta.db_table
            
            # Фильтрация по имени таблицы
            if table_name and db_table != table_name:
                continue
            
            # Получаем количество строк
            try:
                row_count = model.objects.count()
                result['total_rows'] += row_count
            except Exception as e:
                row_count = 0
                print(f"Error counting rows for {db_table}: {e}")
            
            # Получаем информацию о колонках - только реальные поля, не обратные связи
            columns = []
            for field in model._meta.get_fields():
                # Пропускаем обратные связи и многие-ко-многим (у них нет column)
                if field.auto_created and not field.concrete:
                    continue
                if field.is_relation and not field.many_to_many and not field.concrete:
                    continue
                    
                try:
                    column_info = {
                        'name': field.name,
                        'type': field.get_internal_type(),
                        'db_type': field.db_type(connection=connections['default']) if hasattr(field, 'db_type') else None,
                        'null': field.null if hasattr(field, 'null') else False,
                        'primary_key': getattr(field, 'primary_key', False),
                        'unique': getattr(field, 'unique', False),
                        'blank': getattr(field, 'blank', False),
                        'verbose_name': str(field.verbose_name) if hasattr(field, 'verbose_name') else field.name,
                    }
                    
                    # Для ForeignKey полей добавляем связанную таблицу
                    if hasattr(field, 'remote_field') and field.remote_field and hasattr(field.remote_field, 'model'):
                        if field.remote_field.model:
                            column_info['references'] = field.remote_field.model._meta.db_table
                    
                    columns.append(column_info)
                except Exception as e:
                    print(f"Error processing field {field.name}: {e}")
                    continue
            
            result['tables'].append({
                'name': db_table,
                'full_name': f"{model._meta.app_label}.{model.__name__}",
                'verbose_name': str(model._meta.verbose_name) if model._meta.verbose_name else db_table,
                'row_count': row_count,
                'columns': columns,
                'column_count': len(columns)
            })
        
        # Сортируем таблицы по имени
        result['tables'].sort(key=lambda x: x['name'])
        result['total_tables'] = len(result['tables'])
        
        return JsonResponse({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
def get_table_sample_data(request):
    """
    Получение выборочных данных из таблицы.
    GET параметры:
        - table_name: имя таблицы
        - limit: количество строк (по умолчанию 10)
    """
    try:
        table_name = request.GET.get('table_name')
        limit = int(request.GET.get('limit', 10))
        
        if not table_name:
            return JsonResponse({'status': 'error', 'message': 'table_name required'}, status=400)
        
        # Находим модель по имени таблицы
        model = None
        for app_model in apps.get_models():
            if app_model._meta.db_table == table_name:
                model = app_model
                break
        
        if not model:
            return JsonResponse({'status': 'error', 'message': f'Table {table_name} not found'}, status=404)
        
        # Получаем выборочные данные
        queryset = model.objects.all().values()[:limit]
        
        # Преобразуем в список словарей
        data = list(queryset)
        
        # Преобразуем datetime и другие несериализуемые объекты
        for row in data:
            for key, value in row.items():
                if isinstance(value, datetime.datetime):
                    row[key] = value.isoformat()
                elif isinstance(value, datetime.date):
                    row[key] = value.isoformat()
                elif isinstance(value, decimal.Decimal):
                    row[key] = float(value)
        
        return JsonResponse({
            'status': 'success',
            'data': {
                'table_name': table_name,
                'limit': limit,
                'rows': data,
                'total_rows': model.objects.count(),
                'columns': list(data[0].keys()) if data else []
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
def execute_raw_sql(request):
    """
    Выполнение произвольного SQL запроса (только для суперадминов).
    POST параметры:
        - query: SQL запрос
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        query = data.get('query', '')
        
        if not query:
            return JsonResponse({'status': 'error', 'message': 'Query required'}, status=400)
        
        # Проверка на опасные операции (можно добавить больше проверок)
        query_upper = query.upper().strip()
        dangerous_keywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']
        
        for keyword in dangerous_keywords:
            if query_upper.startswith(keyword) or f' {keyword} ' in query_upper:
                return JsonResponse({
                    'status': 'error',
                    'message': f'Опасная операция {keyword} запрещена'
                }, status=400)
        
        # Выполняем запрос
        with connections['default'].cursor() as cursor:
            cursor.execute(query)
            
            # Получаем результаты
            if query_upper.startswith('SELECT'):
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                # Преобразуем в список словарей
                result_data = []
                for row in rows:
                    row_dict = {}
                    for idx, col in enumerate(columns):
                        value = row[idx]
                        if isinstance(value, datetime.datetime):
                            value = value.isoformat()
                        elif isinstance(value, datetime.date):
                            value = value.isoformat()
                        elif isinstance(value, decimal.Decimal):
                            value = float(value)
                        row_dict[col] = value
                    result_data.append(row_dict)
                
                return JsonResponse({
                    'status': 'success',
                    'data': {
                        'rows': result_data,
                        'row_count': len(result_data),
                        'columns': columns
                    }
                })
            else:
                return JsonResponse({
                    'status': 'success',
                    'data': {
                        'message': f'Query executed successfully',
                        'rows_affected': cursor.rowcount
                    }
                })
                
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
def get_database_stats(request):
    """
    Получение общей статистики базы данных.
    """
    try:
        total_models = len(apps.get_models())
        total_tables = 0
        total_rows = 0
        
        for model in apps.get_models():
            total_tables += 1
            try:
                total_rows += model.objects.count()
            except:
                pass
        
        # Получаем размер базы данных (для SQLite, PostgreSQL, MySQL)
        db_size = 0
        db_engine = connections['default'].vendor
        
        if db_engine == 'sqlite':
            from django.conf import settings
            import os
            db_path = settings.DATABASES['default']['NAME']
            if os.path.exists(db_path):
                db_size = os.path.getsize(db_path) / (1024 * 1024)  # MB
        elif db_engine in ['postgresql', 'mysql']:
            with connections['default'].cursor() as cursor:
                if db_engine == 'postgresql':
                    cursor.execute("SELECT pg_database_size(current_database())")
                    db_size = cursor.fetchone()[0] / (1024 * 1024)  # MB
                elif db_engine == 'mysql':
                    cursor.execute("SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()")
                    db_size = cursor.fetchone()[0] / (1024 * 1024) if cursor.fetchone()[0] else 0
        
        return JsonResponse({
            'status': 'success',
            'data': {
                'total_tables': total_tables,
                'total_models': total_models,
                'total_rows': total_rows,
                'db_size_mb': round(db_size, 2),
                'db_engine': db_engine
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)
