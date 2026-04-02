
from django.urls import path

from .endpoints import stat, dataload, datasesh, statsresult, ai_interp, gen_resume, gen_docx_resume, analysis_end

urlpatterns = [
    path("courses/",                        statsresult.courses,                        name="courses"),
    path("get-institution-directions/",     statsresult.get_institution_directions,     name="get_institution_directions"),
    path("get-filter-options-with-counts/", statsresult.get_filter_options_with_counts, name="get_filter_options_with_counts"),
    path("student-results/",                statsresult.student_results,                name="student_results"),

    path('dashboard-stats/',  stat.get_dashboard_stats,  name='dashboard_stats'),
    path('motivation-stats/', stat.get_motivation_stats, name='motivation_stats'),

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
    
    # Анализ дисциплин
    path('analyze-discipline-impact/',          analysis_end.analyze_discipline_impact,          name='analyze_discipline_impact'),
    path('analyze-all-disciplines-impact/',     analysis_end.analyze_all_disciplines_impact,     name='analyze_all_disciplines_impact'),
    path('analyze-discipline-impact-advanced/', analysis_end.analyze_discipline_impact_advanced, name='analyze_discipline_impact_advanced'),
    path('get-discipline-heatmap-data/',        analysis_end.get_discipline_heatmap_data,        name='get_discipline_heatmap_data'),
    path('analyze-student-discipline-impact/', analysis_end.analyze_student_discipline_impact, name='analyze_student_discipline_impact'),

    # Кросс-секционный анализ
    path('analyze-by-dimension/', analysis_end.analyze_by_dimension, name='analyze_by_dimension'),
    
    # Продвинутые визуализации
    path('get-vam-dotplot-data/',        analysis_end.get_vam_dotplot_data, name='get_vam_dotplot_data'),
    path('get-lgm-spaghetti-data/',      analysis_end.get_lgm_spaghetti_data, name='get_lgm_spaghetti_data'),
    path('get-waterfall-decomposition/', analysis_end.get_waterfall_decomposition, name='get_waterfall_decomposition'),

    path('get-disciplines/', analysis_end.get_disciplines, name='get-disciplines'),
]
