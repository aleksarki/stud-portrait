from django.urls import path

from .endpoints import common, dataload, datasesh

urlpatterns = [
    path('import_excel/', dataload.import_excel, name="import_excel"),

    path("create-data-session/",     datasesh.create_data_session,     name="create_data_session"),
    path("get-session-data/",        datasesh.get_session_data,        name="get_session_data"),
    path("update-session-filters/",  datasesh.update_session_filters,  name="update_session_filters"),
    path("update-session-columns/",  datasesh.update_session_columns,  name="update_session_columns"),
    path("load-more-data/",          datasesh.load_more_data,          name="load_more_data"),
    path("export-session-data/",     datasesh.export_session_data,     name="export_session_data"),
    path("export-selected-results/", datasesh.export_selected_results, name="export_session_data"),
    path("group-data/",              datasesh.group_data,              name="group_data"),

    path("stats/",   datasesh.stats_with_filters, name="stats"),
    path("courses/", common.courses,            name="courses"),

    path("students/", common.students, name="students"),
    path("student-results/", common.student_results, name="student_results")
]
