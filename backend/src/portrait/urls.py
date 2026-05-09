from django.urls import path

from .endpoints import (
    stat, dataload, datasesh, statsresult, ai_interp, gen_resume,
    gen_docx_resume, analysis_end, transfer_analysis, audit
)

urlpatterns = [
    path("courses/",                        statsresult.courses,                        name="courses"),
    path("get-institution-directions/",     statsresult.get_institution_directions,     name="get_institution_directions"),
    path("get-filter-options-with-counts/", statsresult.get_filter_options_with_counts, name="get_filter_options_with_counts"),
    path("student-results/",                statsresult.student_results,                name="student_results"),
    path("centers-by-region/",              statsresult.centers_by_region,              name='centers_by_region'),

    path('dashboard-stats/',   stat.get_dashboard_stats,   name='dashboard_stats'),
    path('motivation-counts/', stat.get_motivation_counts, name='motivation_counts'),
    path('filter-dash/',       stat.filter_dash,           name='filter_dash'),
    path('overall-stats/',     stat.overall_stats,         name='overall_stats'),
    path('scores-result/',     stat.get_scores_result,     name='scores_result'),

    path('import_excel/', dataload.import_excel, name="import_excel"),

    path("create-data-session/",     datasesh.create_data_session,     name="create_data_session"),
    path("get-session-data/",        datasesh.get_session_data,        name="get_session_data"),
    path("update-session-filters/",  datasesh.update_session_filters,  name="update_session_filters"),
    path("update-session-columns/",  datasesh.update_session_columns,  name="update_session_columns"),
    path("load-more-data/",          datasesh.load_more_data,          name="load_more_data"),
    path("export-selected-results/", datasesh.export_selected_results, name="export_session_data"),
    path("group-data/",              datasesh.group_data,              name="group_data"),
    path("stats/",                   datasesh.stats_with_filters,      name="stats"),

    path('ai-interpret/',     ai_interp.ai_interpret_competency,       name='ai_interpret'),
    path('ai-interpret-all/', ai_interp.ai_interpret_all_competencies, name='ai_interpret_all'),
    path('ai-generate/',      ai_interp.ai_generate_interpretation,    name='ai_generate_interpretation'),
    
    path('student-resume-data/',  gen_resume.get_student_resume_data,   name='student-resume-data'),
    path('generate-docx-resume/', gen_docx_resume.generate_docx_resume, name='generate_docx_resume'),

    # VAM и LGM базовые
    path('analyze-student-vam/', analysis_end.analyze_student_vam, name='analyze_student_vam'),
    path('analyze-cohort-lgm/',  analysis_end.analyze_cohort_lgm,  name='analyze_cohort_lgm'),
    path('get-vam-trend-data/',  analysis_end.get_vam_trend_data, name='get_vam_trend_data'),
    
    path('get-institutions/', analysis_end.get_institutions, name='get_institutions'),
    path('get-directions/',   analysis_end.get_directions, name='get_directions'),

    # Анализ дисциплин
    path('analyze-all-disciplines-impact/',     analysis_end.analyze_all_disciplines_impact,     name='analyze_all_disciplines_impact'),
    path('analyze-discipline-impact-advanced/', analysis_end.analyze_discipline_impact_advanced, name='analyze_discipline_impact_advanced'),
    path('get-discipline-heatmap-data/',        analysis_end.get_discipline_heatmap_data,        name='get_discipline_heatmap_data'),
    path('analyze-student-discipline-impact/',  analysis_end.analyze_student_discipline_impact, name='analyze_student_discipline_impact'),

    path('get-competency-level-flow/', analysis_end.get_competency_level_flow, name='get_competency_level_flow'),

    path('ai-analytics-summary/', analysis_end.ai_analytics_summary, name='ai_analytics_summary'),

    path('analyze-transfers/',          transfer_analysis.analyze_transfers,          name='analyze_transfers'),
    path('analyze-transfer-students/',  transfer_analysis.analyze_transfer_students,  name='analyze_transfer_students'),

    path('get-disciplines/', analysis_end.get_disciplines, name='get-disciplines'),

    # Загрузка данных
    path('get-expected-fields/',               dataload.get_expected_fields, name='get_expected_fields'),
    path('get-templates/',                     dataload.get_templates,        name='get_templates'),
    path('save-template/',                     dataload.save_template,        name='save_template'),
    path('delete-template/<int:template_id>/', dataload.delete_template, name='delete_template'),

    # Аудит базы данных
    path('audit/schema/',     audit.get_database_schema,   name='audit_schema'),
    path('audit/table-data/', audit.get_table_sample_data, name='audit_table_data'),
    path('audit/stats/',      audit.get_database_stats,    name='audit_stats'),
    path('audit/sql/',        audit.execute_raw_sql,       name='audit_sql')
]
