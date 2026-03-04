from django.urls import path

from .endpoints import dataload, datanal, datasesh, statsresult

urlpatterns = [
    path("courses/",                        statsresult.courses,                        name="courses"),
    path("get-institution-directions/",     statsresult.get_institution_directions,     name="get_institution_directions"),
    path("get-filter-options-with-counts/", statsresult.get_filter_options_with_counts, name="get_filter_options_with_counts"),
    path("students/",                       statsresult.students,                       name="students"),
    path("student-results/",                statsresult.student_results,                name="student_results"),

    path('import_excel/', dataload.import_excel, name="import_excel"),

    path("create-data-session/",     datasesh.create_data_session,     name="create_data_session"),
    path("get-session-data/",        datasesh.get_session_data,        name="get_session_data"),
    path("update-session-filters/",  datasesh.update_session_filters,  name="update_session_filters"),
    path("update-session-columns/",  datasesh.update_session_columns,  name="update_session_columns"),
    path("load-more-data/",          datasesh.load_more_data,          name="load_more_data"),
    path("export-session-data/",     datasesh.export_session_data,     name="export_session_data"),
    path("export-selected-results/", datasesh.export_selected_results, name="export_session_data"),
    path("group-data/",              datasesh.group_data,              name="group_data"),
    path("stats/",                   datasesh.stats_with_filters,      name="stats"),
    path("get-filter-options/",      datasesh.get_filter_options,      name="get_filter_options"),

    path("value-added-improved/",   datanal.value_added_improved, name="value_added_improved"),
    path("vam-summary-statistics/", datanal.vam_summary_statistics, name="vam_summary_statistics"),
    path("get-vam-comparison/",     datanal.get_vam_comparison, name="get_vam_comparison"),
    path("get-vam-unified/",        datanal.get_vam_unified, name="get_vam_unified"),
    path('get-latent-growth/',      datanal.get_latent_growth, name='get_latent_growth')
]
