from django.db import connections
from django.apps import apps

import datetime
import decimal
import json

from .common import *


# ============================== ENDPOINTS ============================== #

@method(GET)
@jsonResponse
@csrf_exempt
def get_database_schema(request):
    """ Get schema of the database: tables, columns, rows.
    
    GET /portrait/get-database-schema/?table_name=optional_table_name
    
    Returns:
        - tables: list of tables with their columns, row counts, and metadata
        - total_tables: total number of tables
        - total_rows: total number of rows across all tables
    """
    table_name = request.GET.get('table_name')

    result = {
        'tables':       [],
        'total_tables': 0,
        'total_rows':   0
    }
    for model in apps.get_models():  # all django models
        try:
            db_table = model._meta.db_table

            if table_name and db_table != table_name:
                continue

            row_count = model.objects.count()
            result['total_rows'] += row_count

            columns = []
            for field in model._meta.get_fields():
                # skip обратные связи and many-to-many (they have no column)
                if field.auto_created and not field.concrete:
                    continue
                if field.is_relation and not field.many_to_many and not field.concrete:
                    continue

                column_info = {
                    'name':         field.name,
                    'type':         field.get_internal_type(),
                    'db_type':      field.db_type(connection=connections['default']) if hasattr(field, 'db_type') else None,
                    'null':         field.null if hasattr(field, 'null') else False,
                    'primary_key':  getattr(field, 'primary_key', False),
                    'unique':       getattr(field, 'unique', False),
                    'blank':        getattr(field, 'blank', False),
                    'verbose_name': str(field.verbose_name) if hasattr(field, 'verbose_name') else field.name,
                }
                # for ForeignKey add related table
                if hasattr(field, 'remote_field') and field.remote_field and hasattr(field.remote_field, 'model'):
                    if field.remote_field.model:
                        column_info['references'] = field.remote_field.model._meta.db_table
                columns.append(column_info)
    
            result['tables'].append({
                'name': db_table,
                'full_name': f"{model._meta.app_label}.{model.__name__}",
                'verbose_name': str(model._meta.verbose_name) if model._meta.verbose_name else db_table,
                'row_count': row_count,
                'columns': columns,
                'column_count': len(columns)
            })

        except:
            pass

    result['tables'].sort(key=lambda x: x['name'])
    result['total_tables'] = len(result['tables'])

    return {"schema": result}


@method(GET)
@jsonResponse
@csrf_exempt
def get_table_sample_data(request):
    """ Get selected data from a table.
    
    GET /portrait/get-table-sample-data/?table_name=table_name&limit=10
    
    Returns:
        - sample: dictionary containing table data, column info, and row counts
    """
    table_name = request.GET.get('table_name')
    limit =  int(request.GET.get('limit', 10))

    if not table_name:
        raise ResponseError("Parameter table_name required")
    
    model = None
    for app_model in apps.get_models():
        if app_model._meta.db_table == table_name:
            model = app_model
            break
    if not model:
        raise ResponseError(f"Table {table_name} not found", status=404)
    
    query_set = model.objects.all().values()[:limit]
    data = list(query_set)

    # convert datetime and several other non-seriable objects
    for row in data:
        for key, value in row.items():
            if isinstance(value, datetime.datetime):
                row[key] = value.isoformat()
            elif isinstance(value, datetime.date):
                row[key] = value.isoformat()
            elif isinstance(value, decimal.Decimal):
                row[key] = float(value)
    
    return {"sample": {
        "table_name": table_name,
        "limit":      limit,
        "rows":       data,
        "total_rows": model.objects.count(),
        "columns":    list(data[0].keys()) if data else []
    }}


@method(POST)
@jsonResponse
@csrf_exempt
def execute_raw_sql(request):
    """ Execute an SQL query.
    
    POST /portrait/execute-raw-sql/
    Body: {"query": "SELECT * FROM table_name"}
    
    Returns:
        - data: query results or execution status
    """
    data = json.loads(request.body)
    query = data.get('query', '')

    if not query:
        raise ResponseError("Query required")

    query_upper = query.upper().strip()
    forbidden_words = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE']

    for keyword in forbidden_words:
        if query_upper.startswith(keyword) or f' {keyword} ' in query_upper:
            raise ResponseError(f"{keyword} if forbidden to execute")

    with connections['default'].cursor() as cursor:
        cursor.execute(query)

        if cursor.description:  # cursor.description
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

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

            return {"data": {
                "rows":      result_data,
                "row_count": len(result_data),
                "columns":   columns
            }}

        return {"data": {
            "message":       f"Query executed successfully",
            "rows_affected": cursor.rowcount
        }}


@method(GET)
@jsonResponse
@csrf_exempt
def get_database_stats(request):
    """ Get general info about the database.
    
    GET /portrait/get-database-stats/
    
    Returns:
        - info: total tables, models, rows, database size, and engine
    """
    total_models = len(apps.get_models())
    total_tables = 0
    total_rows = 0
    
    for model in apps.get_models():
        total_tables += 1
        try:
            total_rows += model.objects.count()
        except:
            pass
    
    db_size = 0
    db_engine = connections['default'].vendor
    
    if db_engine == 'sqlite':
        from django.conf import settings
        import os
        db_path = settings.DATABASES['default']['NAME']
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path) / (1024 * 1024)  # MB
    
    elif db_engine in ('postgresql', 'mysql'):
        with connections['default'].cursor() as cursor:
            if db_engine == 'postgresql':
                cursor.execute("SELECT pg_database_size(current_database())")
                db_size = cursor.fetchone()[0] / (1024 * 1024)  # MB
            elif db_engine == 'mysql':
                cursor.execute("SELECT SUM(data_length + index_length) FROM information_schema.tables WHERE table_schema = DATABASE()")
                result = cursor.fetchone()
                db_size = result[0] / (1024 * 1024) if result and result[0] else 0
    
    return {"info": {
        "total_tables": total_tables,
        "total_models": total_models,
        "total_rows": total_rows,
        "db_size_mb": round(db_size, 2),
        "db_engine": db_engine
    }}
