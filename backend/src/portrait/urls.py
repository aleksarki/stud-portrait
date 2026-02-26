from django.urls import path

from . import views

urlpatterns = [
    path('import_excel/', views.import_excel, name="import_excel"),

    path("value-added-improved/", views.value_added_improved, name="value_added_improved"),
    path("vam-summary-statistics/", views.vam_summary_statistics, name="vam_summary_statistics"),

    path("get-filter-options/", views.get_filter_options, name="get_filter_options"),

    path("get-institution-directions/", views.get_institution_directions, name="get_institution_directions"),
    path("get-vam-comparison/", views.get_vam_comparison, name="get_vam_comparison"),

    path("get-filter-options-with-counts/", views.get_filter_options_with_counts, name="get_filter_options_with_counts"),
    path("get-vam-unified/", views.get_vam_unified, name="get_vam_unified"),

    path("create-data-session/",     views.create_data_session,     name="create_data_session"),
    path("get-session-data/",        views.get_session_data,        name="get_session_data"),
    path("update-session-filters/",  views.update_session_filters,  name="update_session_filters"),
    path("update-session-columns/",  views.update_session_columns,  name="update_session_columns"),
    path("load-more-data/",          views.load_more_data,          name="load_more_data"),
    path("export-session-data/",     views.export_session_data,     name="export_session_data"),
    path("export-selected-results/", views.export_selected_results, name="export_session_data"),
    path("group-data/",              views.group_data,              name="group_data"),

    path("stats/",   views.stats_with_filters, name="stats"),
    path("courses/", views.courses,            name="courses"),

    path("students/", views.students, name="students"),
    path("student-results/", views.student_results, name="student_results"),

]
