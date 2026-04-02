# ═══════════════════════════════════════════════════════════
# portrait/analysis_endpoints.py
# API endpoints для статистического анализа
# ═══════════════════════════════════════════════════════════

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Avg, Count
import pandas as pd
import numpy as np
from scipy import stats

import json

from .common import *
from .datanal import (
    ValueAddedModel,
    LatentGrowthModel,
    DisciplineImpactAnalyzer,
    CrossSectionalAnalyzer
)

COMPETENCIES = [
    'res_comp_info_analysis',
    'res_comp_planning',
    'res_comp_result_orientation',
    'res_comp_stress_resistance',
    'res_comp_partnership',
    'res_comp_rules_compliance',
    'res_comp_self_development',
    'res_comp_leadership',
    'res_comp_emotional_intel',
    'res_comp_client_focus',
    'res_comp_communication',
    'res_comp_passive_vocab'
]

# Ключ: название дисциплины, значение: множество кодов компетенций
DISCIPLINE_COMPETENCY_MAP = {
    'Проектно-исследовательская работа': {
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_passive_vocab',
        'res_comp_planning'
    },
    'Управление проектами': {
        'res_comp_client_focus',
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_planning'
    },
    'Эксплуатационная практика': {
        'res_comp_info_analysis',
        'res_comp_leadership',
        'res_comp_passive_vocab',
        'res_comp_planning'
    },
    'Преддипломная практика': {
        'res_comp_client_focus',
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_passive_vocab',
        'res_comp_planning'
    }
}

# ============================================================
# VAM для конкретного студента
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_student_vam(request):
    try:
        student_id = request.GET.get('student_id')
        competency = request.GET.get('competency', 'res_comp_leadership')
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id required'}, status=400)

        # Получаем все результаты студента, сортируем по году/курсу
        results = Results.objects.filter(res_participant_id=student_id).order_by('res_year', 'res_course_num')
        if not results:
            return JsonResponse({'status': 'error', 'message': 'Нет данных для студента'}, status=404)

        data = []
        for r in results:
            score = getattr(r, competency, None)
            if score is not None:
                data.append({
                    'year': r.res_year,
                    'course': r.res_course_num,
                    'competency_score': score
                })

        if len(data) < 2:
            return JsonResponse({
                'status': 'insufficient_data',
                'message': 'Недостаточно данных для VAM (нужно минимум 2 замера)'
            }, status=400)

        df = pd.DataFrame(data)
        vam = ValueAddedModel()
        analysis = vam.fit_for_student(df)

        if analysis['status'] != 'success':
            return JsonResponse({
                'status': 'error',
                'message': analysis.get('message', 'Ошибка расчёта VAM')
            })

        participant = Participants.objects.get(part_id=student_id)
        try:
            mapping = Studentmapping.objects.get(rsv_id=participant.part_rsv_id)
            student_name = mapping.student_name
        except:
            student_name = f"Участник {participant.part_rsv_id}"

        analysis['student_info'] = {
            'student_id': student_id,
            'rsv_id': participant.part_rsv_id,
            'name': student_name,
            'competency': competency
        }
        return JsonResponse(analysis)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ============================================================
# LGM для когорты студентов
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_cohort_lgm(request):
    """
    Latent Growth Model для когорты студентов.
    
    GET /portrait/analyze-cohort-lgm/?competency=res_comp_leadership&institution_id=1
    """
    try:
        competency = request.GET.get('competency', 'res_comp_leadership')
        institution_id = request.GET.get('institution_id')
        spec_id = request.GET.get('spec_id')
        
        # Фильтруем результаты
        query = Q()
        
        if institution_id:
            query &= Q(res_institution_id=institution_id)
        
        if spec_id:
            if str(spec_id).isdigit():
                query &= Q(res_spec_id=int(spec_id))
            else:
                spec = Specialties.objects.filter(spec_name=spec_id).first()
                if spec:
                    query &= Q(res_spec_id=spec.spec_id)
        
        # Получаем лонгитюдные данные
        results = Results.objects.filter(query).order_by(
            'res_participant_id', 'res_year', 'res_course_num'
        )
        
        # Собираем данные вручную
        data = []
        for result in results:
            score = getattr(result, competency, None)
            if score is not None:
                data.append({
                    'student_id': result.res_participant_id,  # переименовали сразу
                    'res_year': result.res_year,
                    'time_point': result.res_course_num,      # переименовали сразу
                    'competency_score': score                  # переименовали сразу
                })
        
        if not data:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных для анализа'
            }, status=404)
        
        # Преобразуем в DataFrame
        df = pd.DataFrame(data)
        
        # Применяем LGM
        lgm = LatentGrowthModel()
        analysis = lgm.fit(df)
        
        return JsonResponse(analysis)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


# ============================================================
# Анализ влияния дисциплин
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_discipline_impact(request):
    """
    Анализирует влияние дисциплин на компетенции.
    
    GET /portrait/analyze-discipline-impact/?discipline=ПИР&competency=res_comp_leadership
    """
    try:
        discipline_filter = request.GET.get('discipline')
        competency = request.GET.get('competency', 'res_comp_leadership')
        
        # Получаем данные по успеваемости
        perf_query = Academicperformance.objects.select_related('perf_part')
        
        if discipline_filter:
            perf_query = perf_query.filter(perf_discipline__icontains=discipline_filter)
        
        perf_data = []
        
        for perf in perf_query:
            # Получаем результаты РСВ до и после дисциплины
            year = perf.perf_year
            student = perf.perf_part
            
            # Парсим год (формат "2021/2022")
            try:
                year_start = int(year.split('/')[0])
            except:
                continue
            
            # Результат до дисциплины (предыдущий год или тот же год, но меньший курс)
            before_result = Results.objects.filter(
                res_participant=student
            ).filter(
                Q(res_year__lt=year) | 
                Q(res_year=year, res_course_num__lt=perf.perf_part.part_course_num)
            ).order_by('-res_year', '-res_course_num').first()
            
            # Результат после дисциплины (следующий год)
            after_year = f"{year_start+1}/{year_start+2}"
            after_result = Results.objects.filter(
                res_participant=student,
                res_year=after_year
            ).first()
            
            if before_result and after_result:
                before_score = getattr(before_result, competency, None)
                after_score = getattr(after_result, competency, None)
                
                if before_score is not None and after_score is not None:
                    perf_data.append({
                        'student_id': student.part_id,
                        'discipline': perf.perf_discipline,
                        'grade': perf.perf_final_grade,
                        'year': year,
                        f'{competency}_before': before_score,
                        f'{competency}_after': after_score
                    })
        
        if not perf_data:
            return JsonResponse({
                'status': 'error',
                'message': 'Недостаточно данных для анализа влияния дисциплин'
            }, status=404)
        
        # Преобразуем в DataFrame
        df = pd.DataFrame(perf_data)
        
        # Применяем анализ
        analyzer = DisciplineImpactAnalyzer()
        analysis = analyzer.analyze_discipline_impact(df, competency)
        
        return JsonResponse(analysis)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


# ============================================================
# Комплексный анализ всех дисциплин
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_all_disciplines_impact(request):
    """
    Комплексный анализ влияния всех дисциплин на все компетенции.
    
    GET /portrait/analyze-all-disciplines-impact/
    """
    try:
        # Список компетенций для анализа
        competencies = [
            'res_comp_leadership',
            'res_comp_planning',
            'res_comp_result_orientation',
            'res_comp_info_analysis',
            'res_comp_passive_vocab',
            'res_comp_client_focus'
        ]
        
        all_results = {}
        
        for comp in competencies:
            # Используем вспомогательную функцию для каждой компетенции
            comp_analysis = _get_discipline_impact_for_competency(comp)
            all_results[comp] = comp_analysis
        
        # Создаём сводную матрицу
        impact_matrix = []
        
        for comp, comp_data in all_results.items():
            if comp_data and 'results' in comp_data:
                for disc_result in comp_data['results']:
                    impact_matrix.append({
                        'competency': comp,
                        'competency_label': _get_competency_label(comp),
                        'discipline': disc_result['discipline'],
                        'impact_data': disc_result['grade_impacts']
                    })
        
        return JsonResponse({
            'status': 'success',
            'impact_matrix': impact_matrix,
            'competencies_analyzed': len(competencies)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


def _get_discipline_impact_for_competency(competency):
    """Вспомогательная функция для получения влияния дисциплин на компетенцию."""
    try:
        perf_data = []
        
        for perf in Academicperformance.objects.select_related('perf_part').all():
            year = perf.perf_year
            student = perf.perf_part
            
            try:
                year_start = int(year.split('/')[0])
            except:
                continue
            
            # До и после
            before_result = Results.objects.filter(
                res_participant=student
            ).filter(
                Q(res_year__lt=year)
            ).order_by('-res_year', '-res_course_num').first()
            
            after_year = f"{year_start+1}/{year_start+2}"
            after_result = Results.objects.filter(
                res_participant=student,
                res_year=after_year
            ).first()
            
            if before_result and after_result:
                before_score = getattr(before_result, competency, None)
                after_score = getattr(after_result, competency, None)
                
                if before_score is not None and after_score is not None:
                    perf_data.append({
                        'student_id': student.part_id,
                        'discipline': perf.perf_discipline,
                        'grade': perf.perf_final_grade,
                        'year': year,
                        f'{competency}_before': before_score,
                        f'{competency}_after': after_score
                    })
        
        if not perf_data:
            return None
        
        df = pd.DataFrame(perf_data)
        analyzer = DisciplineImpactAnalyzer()
        return analyzer.analyze_discipline_impact(df, competency)
        
    except:
        return None


def _get_competency_label(competency_field):
    """Возвращает читаемое название компетенции."""
    labels = {
        'res_comp_leadership': 'Лидерство',
        'res_comp_planning': 'Планирование',
        'res_comp_result_orientation': 'Ориентация на результат',
        'res_comp_info_analysis': 'Анализ информации',
        'res_comp_passive_vocab': 'Пассивный словарь',
        'res_comp_client_focus': 'Клиентоориентированность',
        'res_comp_communication': 'Коммуникация',
        'res_comp_stress_resistance': 'Стрессоустойчивость'
    }
    return labels.get(competency_field, competency_field)


# ============================================================
# Анализ в разрезе (cross-sectional)
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_by_dimension(request):
    try:
        dimension = request.GET.get('dimension', 'institution')
        competency = request.GET.get('competency', 'res_comp_leadership')
        
        dimension_map = {
            'institution': 'res_institution__inst_name',
            'spec': 'res_spec__spec_name',
            'form': 'res_form__form_name',
            'course': 'res_course_num'
        }
        if dimension not in dimension_map:
            return JsonResponse({'status': 'error', 'message': f'Неверное измерение: {dimension}'}, status=400)
        
        results = Results.objects.select_related('res_institution', 'res_spec', 'res_form').all()
        
        data = []
        for r in results:
            score = getattr(r, competency, None)
            if score is not None:
                if dimension == 'institution':
                    dim_value = r.res_institution.inst_name if r.res_institution else 'Неизвестно'
                elif dimension == 'spec':
                    dim_value = r.res_spec.spec_name if r.res_spec else 'Неизвестно'
                elif dimension == 'form':
                    dim_value = r.res_form.form_name if r.res_form else 'Неизвестно'
                else:  # course
                    dim_value = str(r.res_course_num) if r.res_course_num else 'Неизвестно'
                data.append({
                    'dimension_value': dim_value,
                    'comp_score': score
                })
        
        if not data:
            return JsonResponse({'status': 'error', 'message': 'Нет данных'}, status=404)
        
        df = pd.DataFrame(data)
        grouped = df.groupby('dimension_value')['comp_score'].agg([
            ('n', 'count'),
            ('mean', 'mean'),
            ('std', 'std'),
            ('median', 'median'),
            ('min', 'min'),
            ('max', 'max')
        ]).reset_index()
        
        grouped = grouped.sort_values('mean', ascending=False)
        
        anova_result = None
        if len(grouped) >= 2:
            groups_data = []
            for group_value in grouped['dimension_value']:
                group_scores = df[df['dimension_value'] == group_value]['comp_score'].dropna()
                if len(group_scores) > 0:
                    groups_data.append(group_scores)
            if len(groups_data) >= 2:
                f_stat, p_value = stats.f_oneway(*groups_data)
                anova_result = {
                    'f_statistic': float(f_stat),
                    'p_value': float(p_value),
                    'significant_difference': p_value < 0.05
                }
        
        response_data = {
            'status': 'success',
            'dimension': dimension,
            'competency': competency,
            'groups': grouped.to_dict('records'),
            'anova': anova_result
        }
        
        return JsonResponse(_convert_numpy_types(response_data))
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

# ============================================================
# ENHANCED DISCIPLINE IMPACT ANALYSIS WITH FILTERS
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def analyze_discipline_impact_advanced(request):
    """
    Продвинутый анализ влияния дисциплин с фильтрацией.
    """
    try:
        body = json.loads(request.body)
        competencies = body.get('competencies', ['res_comp_leadership'])
        disciplines = body.get('disciplines', [])
        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', []) 
        min_students = body.get('min_students', 5)
        
        results = []
        
        for competency in competencies:
            perf_query = Academicperformance.objects.select_related('perf_part')
            
            if disciplines:
                q = Q()
                for disc in disciplines:
                    q |= Q(perf_discipline__icontains=disc)
                perf_query = perf_query.filter(q)
            
            # Фильтрация по institution_ids и direction_ids
            if institution_ids or direction_ids:
                filters = Q()
                if institution_ids:
                    # Проверяем, что institution_ids - это числа
                    inst_ids = [int(id) for id in institution_ids if str(id).isdigit()]
                    if inst_ids:
                        filters &= Q(perf_part__part_institution_id__in=inst_ids)
                
                if direction_ids:
                    dir_ids = []
                    for dir_id in direction_ids:
                        if str(dir_id).isdigit():
                            dir_ids.append(int(dir_id))
                        else:
                            # Ищем ID по названию направления
                            try:
                                spec = Specialties.objects.filter(spec_name=dir_id).first()
                                if spec:
                                    dir_ids.append(spec.spec_id)
                            except:
                                pass
                    if dir_ids:
                        filters &= Q(perf_part__part_spec_id__in=dir_ids)
                
                perf_query = perf_query.filter(filters)
            
            perf_data = []
            
            for perf in perf_query:
                year = perf.perf_year
                student = perf.perf_part
                
                try:
                    year_start = int(year.split('/')[0])
                except:
                    continue
                
                before_result = Results.objects.filter(
                    res_participant=student
                ).filter(
                    Q(res_year__lt=year)
                ).order_by('-res_year', '-res_course_num').first()
                
                after_year = f"{year_start+1}/{year_start+2}"
                after_result = Results.objects.filter(
                    res_participant=student,
                    res_year=year
                ).order_by('-res_course_num').first()
                
                if before_result and after_result:
                    before_score = getattr(before_result, competency, None)
                    after_score = getattr(after_result, competency, None)
                    
                    if before_score is not None and after_score is not None:
                        perf_data.append({
                            'student_id': student.part_id,
                            'discipline': perf.perf_discipline,
                            'grade': perf.perf_final_grade,
                            'year': year,
                            'institution': student.part_institution.inst_name if student.part_institution else 'Unknown',
                            'direction': student.part_spec.spec_name if student.part_spec else 'Unknown',
                            f'{competency}_before': before_score,
                            f'{competency}_after': after_score
                        })
            
            if not perf_data:
                continue
            print(f"[{competency}] Всего записей: {len(perf_data)}")
            print(f"[{competency}] Дисциплины: {set(d['discipline'] for d in perf_data)}")
            
            filtered_perf_data = [
                record for record in perf_data
                if record['discipline'] in DISCIPLINE_COMPETENCY_MAP and
                competency in DISCIPLINE_COMPETENCY_MAP[record['discipline']]
            ]

            if not filtered_perf_data:
                continue

            df = pd.DataFrame(filtered_perf_data)

            analyzer = DisciplineImpactAnalyzer()
            analysis = analyzer.analyze_discipline_impact(df, competency)
            
            if analysis['status'] == 'success':
                analysis['competency'] = competency
                analysis['competency_label'] = _get_competency_label(competency)
                
                # Конвертируем bool значения в строки JSON
                analysis = _convert_numpy_types(analysis)
                
                results.append(analysis)
        
        return JsonResponse({
            'status': 'success',
            'competencies_analyzed': len(results),
            'results': results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


def _convert_numpy_types(obj):
    """Конвертирует numpy/pandas типы в Python типы для JSON сериализации"""
    if isinstance(obj, dict):
        return {k: _convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_numpy_types(item) for item in obj]
    elif isinstance(obj, (np.bool_, bool)):  # Добавлена обработка bool
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return float(obj)
    elif isinstance(obj, str):
        return obj
    elif obj is None:
        return None
    elif pd.isna(obj):  # Обработка NaN
        return None
    else:
        try:
            # Пробуем преобразовать в базовый тип
            return obj.item() if hasattr(obj, 'item') else obj
        except:
            return str(obj)

# ============================================================
# HEATMAP DATA - Матрица влияния дисциплин x компетенций
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def get_discipline_heatmap_data(request):
    """
    Получить данные для тепловой карты: дисциплины x компетенции
    
    POST /portrait/get-discipline-heatmap-data/
    Body: {
        "institution_ids": [1, 2],
        "direction_ids": [10, 20]
    }
    """
    try:
        body = json.loads(request.body)
        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', [])
        
        competencies = [
            'res_comp_leadership',
            'res_comp_planning',
            'res_comp_result_orientation',
            'res_comp_info_analysis',
            'res_comp_communication'
        ]
        
        # Собираем все дисциплины и их эффекты
        heatmap_data = []
        
        perf_query = Academicperformance.objects.select_related('perf_part')
        
        if institution_ids:
            # Преобразуем в числа
            inst_ids = [int(id) for id in institution_ids if str(id).isdigit()]
            if inst_ids:
                perf_query = perf_query.filter(perf_part__part_institution_id__in=inst_ids)
        
        if direction_ids:
            dir_ids = []
            for dir_id in direction_ids:
                if str(dir_id).isdigit():
                    dir_ids.append(int(dir_id))
                else:
                    # Ищем ID по названию направления
                    try:
                        spec = Specialties.objects.filter(spec_name=dir_id).first()
                        if spec:
                            dir_ids.append(spec.spec_id)
                    except:
                        pass
            if dir_ids:
                perf_query = perf_query.filter(perf_part__part_spec_id__in=dir_ids)
        
        # Группируем по дисциплинам
        disciplines = set()
        perf_data_by_disc = {}
        
        for perf in perf_query:
            disc = perf.perf_discipline
            disciplines.add(disc)
            
            if disc not in perf_data_by_disc:
                perf_data_by_disc[disc] = []
            
            year = perf.perf_year
            student = perf.perf_part
            
            # Результат до (предыдущий год)
            before_result = Results.objects.filter(
                res_participant=student
            ).filter(Q(res_year__lt=year)).order_by('-res_year', '-res_course_num').first()
            
            # Результат после – за тот же год, самая поздняя запись
            after_result = Results.objects.filter(
                res_participant=student,
                res_year=year
            ).order_by('-res_course_num').first()
            
            if before_result and after_result:
                for comp in competencies:
                    before_score = getattr(before_result, comp, None)
                    after_score = getattr(after_result, comp, None)
                    
                    if before_score is not None and after_score is not None:
                        perf_data_by_disc[disc].append({
                            'competency': comp,
                            f'{comp}_before': before_score,
                            f'{comp}_after': after_score,
                            'grade': perf.perf_final_grade
                        })
        
        # Вычисляем эффект для каждой пары (дисциплина, компетенция)
        for disc in disciplines:
            if disc not in perf_data_by_disc or not perf_data_by_disc[disc]:
                continue
            
            df = pd.DataFrame(perf_data_by_disc[disc])
            
            for comp in competencies:
                if f'{comp}_before' in df.columns and f'{comp}_after' in df.columns:
                    before = df[f'{comp}_before'].dropna()
                    after = df[f'{comp}_after'].dropna()
                    
                    if len(before) >= 3 and len(after) >= 3:
                        # Cohen's d effect size
                        mean_diff = after.mean() - before.mean()
                        std_pooled = np.sqrt((before.std()**2 + after.std()**2) / 2)
                        cohens_d = mean_diff / std_pooled if std_pooled > 0 else 0
                        
                        # t-test
                        t_stat, p_value = stats.ttest_rel(after, before)
                        
                        heatmap_data.append({
                            'discipline': disc,
                            'competency': comp,
                            'competency_label': _get_competency_label(comp),
                            'effect_size': float(cohens_d),
                            'mean_gain': float(mean_diff),
                            'p_value': float(p_value),
                            'significant': p_value < 0.05,
                            'n_students': len(before)
                        })
        
        heatmap_data = _convert_numpy_types(heatmap_data)
        
        full_heatmap = []
        for disc, expected_comps in DISCIPLINE_COMPETENCY_MAP.items():
            for comp in competencies:
                # Проверяем, ожидаема ли эта компетенция для дисциплины
                if comp not in expected_comps:
                    continue
                # Ищем существующую запись
                existing = next((item for item in heatmap_data if item['discipline'] == disc and item['competency'] == comp), None)
                if existing:
                    full_heatmap.append(existing)
                else:
                    full_heatmap.append({
                        'discipline': disc,
                        'competency': comp,
                        'competency_label': _get_competency_label(comp),
                        'effect_size': None,
                        'mean_gain': None,
                        'p_value': None,
                        'significant': False,
                        'n_students': 0
                    })

        # Используем full_heatmap в ответе
        return JsonResponse({
            'status': 'success',
            'data': full_heatmap,
            'disciplines': list(DISCIPLINE_COMPETENCY_MAP.keys()),  # возвращаем все дисциплины из словаря
            'competencies': competencies
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


# ============================================================
# DOT PLOT DATA - для сравнения VAM с доверительными интервалами
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def get_vam_dotplot_data(request):
    try:
        body = json.loads(request.body)
        group_by = body.get('group_by', 'institution')
        competency = body.get('competency', 'res_comp_leadership')
        filter_institutions = body.get('filter_institutions', [])
        filter_directions = body.get('filter_directions', [])
        filter_courses = body.get('filter_courses', [])
        filter_test_attempts = body.get('filter_test_attempts', [])
        
        # Базовый queryset
        results = Results.objects.select_related('res_institution', 'res_spec').all()
        
        # Применяем фильтры
        if filter_institutions:
            results = results.filter(res_institution_id__in=filter_institutions)
        
        if filter_directions:
            # Преобразуем названия в ID, если нужно, или предполагаем, что приходят ID
            # Для простоты будем считать, что приходят ID (числа)
            results = results.filter(res_spec_id__in=filter_directions)
        
        if filter_courses:
            results = results.filter(res_course_num__in=filter_courses)
        
        # filter_test_attempts - можно интерпретировать как количество записей на студента, 
        # но для VAM мы используем все записи, поэтому этот фильтр пока игнорируем.
        
        # Собираем данные
        data = []
        for result in results:
            score = getattr(result, competency, None)
            if score is not None:
                data.append({
                    'res_participant_id': result.res_participant_id,
                    'res_course_num': result.res_course_num,
                    'comp_score': score,
                    'inst_name': result.res_institution.inst_name if result.res_institution else 'Неизвестно',
                    'spec_name': result.res_spec.spec_name if result.res_spec else 'Неизвестно'
                })
        
        if not data:
            return JsonResponse({'status': 'error', 'message': 'Нет данных'}, status=404)
        
        df = pd.DataFrame(data)
        
        # Определяем колонку для группировки
        if group_by == 'institution':
            group_col = 'inst_name'
        elif group_by == 'direction':
            group_col = 'spec_name'
        else:
            group_col = 'res_course_num'
        
        dotplot_data = []
        for group_value, group_df in df.groupby(group_col):
            scores = group_df['comp_score'].dropna()
            if len(scores) < 5:
                continue
            mean_score = scores.mean()
            std_score = scores.std()
            n = len(scores)
            se = std_score / np.sqrt(n)
            ci_lower = mean_score - 1.96 * se
            ci_upper = mean_score + 1.96 * se
            dotplot_data.append({
                'group': str(group_value),
                'value_added': float(mean_score),
                'ci_lower': float(ci_lower),
                'ci_upper': float(ci_upper),
                'std_error': float(se),
                'n': int(n),
                'significant': ci_lower > 0 or ci_upper < 0
            })
        
        dotplot_data = sorted(dotplot_data, key=lambda x: x['value_added'], reverse=True)
        dotplot_data = _convert_numpy_types(dotplot_data)
        
        return JsonResponse({
            'status': 'success',
            'group_by': group_by,
            'competency': competency,
            'data': dotplot_data
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ============================================================
# SPAGHETTI PLOT DATA - траектории развития
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def get_lgm_spaghetti_data(request):
    """
    Получить данные для паутинного графика траекторий развития
    
    POST /portrait/get-lgm-spaghetti-data/
    Body: {
        "competency": "res_comp_leadership",
        "group_by": "institution",  # или null для всех
        "include_trend": true,
        "filter_institutions": [1, 2]
    }
    """
    try:
        body = json.loads(request.body)
        competency = body.get('competency', 'res_comp_leadership')
        group_by = body.get('group_by', None)  # institution или direction
        include_trend = body.get('include_trend', True)
        filter_institutions = body.get('filter_institutions', [])
        
        # Получаем результаты
        results = Results.objects.select_related(
            'res_participant', 'res_institution', 'res_spec'
        ).order_by('res_participant_id', 'res_course_num')
        
        if filter_institutions:
            results = results.filter(res_institution_id__in=filter_institutions)
        
        # Собираем данные вручную, чтобы избежать проблем с annotate
        data = []
        for result in results:
            score = getattr(result, competency, None)
            if score is not None:
                data.append({
                    'student_id': result.res_participant_id,
                    'time_point': result.res_course_num,
                    'competency_score': score,
                    'inst_name': result.res_institution.inst_name if result.res_institution else 'Неизвестно',
                    'spec_name': result.res_spec.spec_name if result.res_spec else 'Неизвестно'
                })
        
        if not data:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных для анализа'
            }, status=404)
        
        df = pd.DataFrame(data)
        
        spaghetti_data = {
            'individual_trajectories': [],
            'trend_lines': []
        }
        
        # Индивидуальные траектории
        for student_id, student_df in df.groupby('student_id'):
            student_df = student_df.sort_values('time_point')
            
            trajectory = {
                'student_id': int(student_id),
                'points': [
                    {
                        'course': int(row['time_point']),
                        'score': float(row['competency_score']) if pd.notna(row['competency_score']) else None
                    }
                    for _, row in student_df.iterrows()
                ]
            }
            
            # Фильтруем null значения
            trajectory['points'] = [p for p in trajectory['points'] if p['score'] is not None]
            
            if len(trajectory['points']) >= 2:
                if group_by == 'institution':
                    trajectory['group'] = student_df.iloc[0]['inst_name']
                elif group_by == 'direction':
                    trajectory['group'] = student_df.iloc[0]['spec_name']
                
                spaghetti_data['individual_trajectories'].append(trajectory)
        
        # Тренд-линии (если requested)
        if include_trend:
            if group_by:
                # По группам
                for group_value, group_df in df.groupby(
                    'inst_name' if group_by == 'institution' else 'spec_name'
                ):
                    trend = _calculate_trend_line(group_df, group_value)
                    if trend:
                        spaghetti_data['trend_lines'].append(trend)
            else:
                # Общий тренд
                trend = _calculate_trend_line(df, 'Все студенты')
                if trend:
                    spaghetti_data['trend_lines'].append(trend)
        
        spaghetti_data = _convert_numpy_types(spaghetti_data)
        
        return JsonResponse({
            'status': 'success',
            'competency': competency,
            'group_by': group_by,
            'data': spaghetti_data
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


def _calculate_trend_line(df, group_name):
    """Вспомогательная функция для вычисления тренд-линии"""
    try:
        by_course = df.groupby('time_point')['competency_score'].mean()
        
        if len(by_course) < 2:
            return None
        
        courses = by_course.index.values
        scores = by_course.values
        
        # Линейная регрессия
        z = np.polyfit(courses, scores, 1)
        p = np.poly1d(z)
        
        trend_points = [
            {'course': int(c), 'score': float(p(c))}
            for c in range(int(courses.min()), int(courses.max()) + 1)
        ]
        
        return {
            'group': group_name,
            'points': trend_points,
            'slope': float(z[0]),
            'intercept': float(z[1])
        }
    except Exception as e:
        print(f"Error calculating trend line: {e}")
        return None


# ============================================================
# WATERFALL DATA - Декомпозиция прироста
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def get_waterfall_decomposition(request):
    """
    Получить данные для ватерфалльной диаграммы
    
    POST /portrait/get-waterfall-decomposition/
    Body: {
        "institution_id": 1,
        "direction_id": 10,
        "competency": "res_comp_leadership"
    }
    """
    try:
        body = json.loads(request.body)
        institution_id = body.get('institution_id')
        direction_id = body.get('direction_id')
        competency = body.get('competency', 'res_comp_leadership')
        
        # Получаем все результаты студентов
        results = Results.objects.filter(
            res_institution_id=institution_id,
            res_spec_id=direction_id
        ).order_by('res_course_num')
        
        df = pd.DataFrame(list(results.values(
            'res_participant_id',
            'res_course_num',
            comp_score=competency
        )))
        
        # Начальный балл (1 курс)
        course1 = df[df['res_course_num'] == 1][competency].mean()
        
        waterfall_data = {
            'initial': float(course1) if not np.isnan(course1) else 0,
            'stages': []
        }
        
        current_value = course1 if not np.isnan(course1) else 0
        
        # Для каждого курса
        for course in sorted(df['res_course_num'].unique()):
            if course == 1:
                continue
            
            course_data = df[df['res_course_num'] == course][competency].mean()
            
            if not np.isnan(course_data):
                increment = course_data - current_value
                
                waterfall_data['stages'].append({
                    'course': int(course),
                    'value': float(course_data),
                    'increment': float(increment),
                    'label': f'После курса {course}'
                })
                
                current_value = course_data
        
        waterfall_data['final'] = float(current_value)
        waterfall_data['total_gain'] = float(current_value - waterfall_data['initial'])

        waterfall_data = _convert_numpy_types(waterfall_data)
        
        return JsonResponse({
            'status': 'success',
            'competency': competency,
            'data': waterfall_data
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

# ============================================================
# GET DISCIPLINES - список всех дисциплин
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_disciplines(request):
    """
    Получить список всех дисциплин из таблицы Academicperformance
    
    GET /portrait/get-disciplines/
    """
    try:
        # Получаем уникальные дисциплины
        disciplines = Academicperformance.objects.values_list('perf_discipline', flat=True).distinct().order_by('perf_discipline')
        
        # Преобразуем в список
        disciplines_list = list(disciplines)
        
        # Для каждой дисциплины можно также получить количество студентов
        disciplines_with_counts = []
        for disc in disciplines_list:
            count = Academicperformance.objects.filter(perf_discipline=disc).values('perf_part').distinct().count()
            disciplines_with_counts.append({
                'id': disc,
                'name': disc,
                'count': count
            })
        
        return JsonResponse({
            'status': 'success',
            'disciplines': disciplines_with_counts,
            'total_count': len(disciplines_list)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def analyze_student_discipline_impact(request):
    """
    Возвращает для студента список дисциплин с баллами компетенций до и после.

    GET /portrait/analyze-student-discipline-impact/?student_id=123
    """
    try:
        student_id = request.GET.get('student_id')
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id required'}, status=400)

        # Получаем участника
        try:
            participant = Participants.objects.get(part_id=student_id)
        except Participants.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Студент не найден'}, status=404)

        # Получаем все дисциплины студента, отсортированные по году
        disciplines = Academicperformance.objects.filter(perf_part=participant).order_by('perf_year')

        results = []
        for disc in disciplines:
            year = disc.perf_year
            # Результат до (предыдущий год)
            before_result = Results.objects.filter(
                res_participant=participant,
                res_year__lt=year
            ).order_by('-res_year', '-res_course_num').first()

            # Результат после (тот же год)
            after_result = Results.objects.filter(
                res_participant=participant,
                res_year=year
            ).order_by('-res_course_num').first()

            if not before_result or not after_result:
                continue  # недостаточно данных для этой дисциплины

            # Собираем баллы по всем компетенциям
            competencies_before = {}
            competencies_after = {}
            for comp in COMPETENCIES:
                before_score = getattr(before_result, comp, None)
                after_score = getattr(after_result, comp, None)
                if before_score is not None and after_score is not None:
                    competencies_before[comp] = before_score
                    competencies_after[comp] = after_score

            if not competencies_before or not competencies_after:
                continue  # нет данных по компетенциям

            # Формируем запись
            results.append({
                'discipline': disc.perf_discipline,
                'year': year,
                'grade': disc.perf_final_grade,
                'competencies_before': competencies_before,
                'competencies_after': competencies_after,
            })

        return JsonResponse({
            'status': 'success',
            'data': results
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def get_competency_level_flow(request):
    """
    POST /portrait/get-competency-level-flow/
    Body: {
        "competency": "res_comp_leadership",
        "institution_ids": [1,2],
        "direction_ids": [10,20]
    }
    Returns: {
        "nodes": [{"name": "1 курс - Низкий"}, ...],
        "links": [{"source": 0, "target": 5, "value": 42}, ...]
    }
    """
    try:
        body = json.loads(request.body)
        competency = body.get('competency')
        if not competency:
            return JsonResponse({'status': 'error', 'message': 'competency required'}, status=400)

        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', [])

        # Фильтруем участников
        participants_qs = Participants.objects.all()
        if institution_ids:
            participants_qs = participants_qs.filter(part_institution_id__in=institution_ids)
        if direction_ids:
            participants_qs = participants_qs.filter(part_spec_id__in=direction_ids)

        # Получаем все результаты выбранных участников, сортируем по студенту и курсу
        results = Results.objects.filter(
            res_participant_id__in=participants_qs.values_list('part_id', flat=True)
        ).order_by('res_participant_id', 'res_course_num')

        # Группируем по студентам
        student_data = {}
        for r in results:
            sid = r.res_participant_id
            score = getattr(r, competency, None)
            if score is None:
                continue
            course = r.res_course_num
            if course not in [1,2,3,4]:
                continue
            if sid not in student_data:
                student_data[sid] = {}
            student_data[sid][course] = score

        all_scores = [score for d in student_data.values() for score in d.values()]
        if not all_scores:
            return JsonResponse({'status': 'error', 'message': 'No scores found'}, status=404)

        # Пороги: низкий < p33, высокий > p66
        p33 = np.percentile(all_scores, 33)
        p66 = np.percentile(all_scores, 66)

        def get_level(score):
            if score <= p33:
                return 'Низкий'
            elif score <= p66:
                return 'Средний'
            else:
                return 'Высокий'

        courses = [1,2,3,4]
        levels = ['Низкий', 'Средний', 'Высокий']
        nodes = []
        node_index = {}
        for course in courses:
            for level in levels:
                name = f"{course} курс - {level}"
                node_index[(course, level)] = len(nodes)
                nodes.append({'name': name})

        # Подсчёт переходов между последовательными курсами
        transition_counts = {}
        for sid, scores in student_data.items():
            sorted_courses = sorted(scores.keys())
            for i in range(len(sorted_courses)-1):
                c_from = sorted_courses[i]
                c_to = sorted_courses[i+1]
                if c_to != c_from + 1:
                    continue
                level_from = get_level(scores[c_from])
                level_to = get_level(scores[c_to])
                key = (c_from, level_from, c_to, level_to)
                transition_counts[key] = transition_counts.get(key, 0) + 1

        links = []
        for (c_from, level_from, c_to, level_to), count in transition_counts.items():
            links.append({
                'source': node_index[(c_from, level_from)],
                'target': node_index[(c_to, level_to)],
                'value': count
            })

        return JsonResponse({
            'status': 'success',
            'nodes': nodes,
            'links': links
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)