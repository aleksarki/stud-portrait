from django.urls import path

from .endpoints import (
    audit,
    dataload,
    datasesh,
    analysis_end, transfer_analysis,
    statsresult, stat,
    ainterp,
    gendox
)

urlpatterns = [

    # AUDIT module
    path('audit/schema/',      audit.get_database_schema,   name='audit_schema'),
    path('audit/table-data/',  audit.get_table_sample_data, name='audit_table_data'),
    path('audit/execute-sql/', audit.execute_raw_sql,       name='audit_sql'),
    path('audit/stats/',       audit.get_database_stats,    name='audit_stats'),

    # DATALOAD module
    path('dataload/import-excel/',                      dataload.import_excel,        name="dataload_import_excel"),
    path('dataload/expected-fields/',                   dataload.get_expected_fields, name='dataload_expected_fields'),
    path('dataload/templates/',                         dataload.get_templates,       name='dataload_templates'),
    path('dataload/template-save/',                     dataload.save_template,       name='dataload_template_save'),
    path('dataload/template-delete/<int:template_id>/', dataload.delete_template,     name='dataload_template_delete'),

    # DATASESH module
    path("datasesh/new/",             datasesh.create_data_session,     name="datasesh_new"),
    path("datasesh/extract-data/",    datasesh.extract_session_data,    name="datasesh_extract_data"),
    path("datasesh/update-filters/",  datasesh.update_session_filters,  name="datasesh_update_filters"),
    path("datasesh/update-columns/",  datasesh.update_session_columns,  name="datasesh_update_columns"),
    path("datasesh/update-window/",   datasesh.update_session_window,   name="datasesh_update_window"),
    path("datasesh/export-selected/", datasesh.export_selected_results, name="datasesh_export_selected"),
    path("datasesh/group-selected/",  datasesh.group_data,              name="datasesh_group_selected"),
    path("datasesh/count-stats/",     datasesh.stats_with_filters,      name="datasesh_count_stats"),

    # DATANAL module
    path('analyze-student-vam/', analysis_end.analyze_student_vam, name='analyze_student_vam'),
    path('analyze-cohort-lgm/',  analysis_end.analyze_cohort_lgm,  name='analyze_cohort_lgm'),
    path('get-vam-trend-data/',  analysis_end.get_vam_trend_data,  name='get_vam_trend_data'),
    path('get-lgm-growers/',  analysis_end.get_lgm_growers,  name='get_lgm_growers'),
    
    path('get-institutions/', analysis_end.get_institutions, name='get_institutions'),
    path('get-directions/',   analysis_end.get_directions,   name='get_directions'),

    path('analyze-all-disciplines-impact/',     analysis_end.analyze_all_disciplines_impact,     name='analyze_all_disciplines_impact'),
    path('analyze-discipline-impact-advanced/', analysis_end.analyze_discipline_impact_advanced, name='analyze_discipline_impact_advanced'),
    path('get-discipline-heatmap-data/',        analysis_end.get_discipline_heatmap_data,        name='get_discipline_heatmap_data'),
    path('analyze-student-discipline-impact/',  analysis_end.analyze_student_discipline_impact,  name='analyze_student_discipline_impact'),

    path('get-competency-level-flow/',        analysis_end.get_competency_level_flow,        name='get_competency_level_flow'),
    path('get-competency-level-flow-yearly/', analysis_end.get_competency_level_flow_yearly, name='get_competency_level_flow'),
    path('ai-analytics-summary/',             analysis_end.ai_analytics_summary,             name='ai_analytics_summary'),
    path('get-disciplines/',                  analysis_end.get_disciplines,                  name='get-disciplines'),   
    
    path('education-profiles-comparison/', analysis_end.get_education_profiles_comparison, name='education_profiles_comparison'),
    path('get-boxplot-data/',              analysis_end.get_boxplot_data,                  name='get_boxplot_data'),

    path('analyze-transfers/',          transfer_analysis.analyze_transfers,          name='analyze_transfers'),
    path('analyze-transfer-students/',  transfer_analysis.analyze_transfer_students,  name='analyze_transfer_students'),

    path('duplicate-accounts/', analysis_end.get_duplicate_accounts, name='duplicate_accounts'),

    # STATSRESULT module
    path("courses/",                        statsresult.courses,                        name="courses"),
    path("get-institution-directions/",     statsresult.get_institution_directions,     name="get_institution_directions"),
    path("get-filter-options-with-counts/", statsresult.get_filter_options_with_counts, name="get_filter_options_with_counts"),
    path("student-results/",                statsresult.student_results,                name="student_results"),
    path("centers-by-region/",              statsresult.centers_by_region,              name='centers_by_region'),
    path('students/list/',                  statsresult.get_students_list,              name='students_list'),
    path('students/portrait/',              statsresult.get_student_portrait,           name='student_portrait'),

    path('dashboard-stats/',   stat.get_dashboard_stats,   name='dashboard_stats'),
    path('motivation-counts/', stat.get_motivation_counts, name='motivation_counts'),
    path('filter-dash/',       stat.filter_dash,           name='filter_dash'),
    path('overall-stats/',     stat.overall_stats,         name='overall_stats'),
    path('scores-result/',     stat.get_scores_result,     name='scores_result'),
    path('comp-boxplot/',      stat.get_data_boxplot, name='comp_boxplot'),
    
    path('grades-competency-correlation/', stat.get_grades_competency_correlation, name='grades_competency_correlation'),
    path('competency-trend-by-year/',      stat.get_competency_trend_by_year,      name='competency_trend_by_year'),

    # AINTERP module
    # *empty*

    # GENDOX module
    path('gendox/generate-resume-docx/', gendox.generate_docx_resume,      name='gendox_generate_resume_docx'),
    path('gendox/student-resume-data/',  gendox.get_student_resume_data,   name='gendox_student_resume_data'),
    path('gendox/geography-report/',     gendox.generate_geography_report, name='gendox_geography_report'),

]
