# ═══════════════════════════════════════════════════════════
# portrait/analysis_end.py
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

from ..mlmodel import MlModel

# Ключ: название дисциплины, значение: множество кодов компетенций
# fixme this should not be hardcoded
DISCIPLINE_COMPETENCY_MAP = {
    'Проектно-исследовательская работа': {
        COMP.LEADERSHIP,
        COMP.RESULT_ORIENT,
        COMP.PASSIVE_VOCAB,
        COMP.PLANNING
    },
    'Управление проектами': {
        COMP.CLIENT_FOCUS,
        COMP.LEADERSHIP,
        COMP.RESULT_ORIENT,
        COMP.PLANNING
    },
    'Эксплуатационная практика': {
        COMP.INFO_ANALYSIS,
        COMP.LEADERSHIP,
        COMP.PASSIVE_VOCAB,
        COMP.PLANNING
    },
    'Преддипломная практика': {
        COMP.CLIENT_FOCUS,
        COMP.LEADERSHIP,
        COMP.RESULT_ORIENT,
        COMP.PASSIVE_VOCAB,
        COMP.PLANNING
    }
}

# ============================================================
# VAM для конкретного студента
# ============================================================

@cached()
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

@cached()
@csrf_exempt
@require_http_methods(["POST"])
def analyze_cohort_lgm(request):
    try:
        body = json.loads(request.body)
        competency = body.get('competency', 'res_comp_leadership')
        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', [])
        group_by = body.get('group_by', 'institution')  # ← теперь читаем явно от клиента

        # ---- 1. Приведение типов и поддержка названий ----
        clean_inst_ids = []
        for id_ in institution_ids:
            if str(id_).isdigit():
                clean_inst_ids.append(int(id_))
            else:
                inst = Institutions.objects.filter(inst_name=id_).first()
                if inst:
                    clean_inst_ids.append(inst.inst_id)

        clean_dir_ids = []
        for id_ in direction_ids:
            if str(id_).isdigit():
                clean_dir_ids.append(int(id_))
            else:
                spec = Specialties.objects.filter(spec_name=id_).first()
                if spec:
                    clean_dir_ids.append(spec.spec_id)

        # ---- 2. Определяем group_ids в зависимости от group_by ----
        if not clean_inst_ids and not clean_dir_ids:
            # Фильтры не выбраны — берём все группы нужного типа
            if group_by == 'institution':
                group_ids = list(Results.objects.filter(
                    **{f'{competency}__isnull': False}
                ).values_list('res_institution_id', flat=True).distinct())
            else:
                group_ids = list(Results.objects.filter(
                    **{f'{competency}__isnull': False}
                ).values_list('res_spec_id', flat=True).distinct())
            group_ids = [gid for gid in group_ids if gid is not None]

        elif group_by == 'direction':
            if clean_dir_ids:
                # Пользователь явно выбрал конкретные направления
                group_ids = clean_dir_ids
            else:
                # Направления не выбраны, но группировка по направлениям —
                # берём все направления в рамках выбранных вузов
                group_ids = list(Results.objects.filter(
                    res_institution_id__in=clean_inst_ids,
                    **{f'{competency}__isnull': False}
                ).values_list('res_spec_id', flat=True).distinct())
                group_ids = [gid for gid in group_ids if gid is not None]

        else:  # group_by == 'institution'
            if clean_inst_ids:
                group_ids = clean_inst_ids
            else:
                # Вузы не выбраны, но группировка по вузам —
                # берём все вузы в рамках выбранных направлений
                group_ids = list(Results.objects.filter(
                    res_spec_id__in=clean_dir_ids,
                    **{f'{competency}__isnull': False}
                ).values_list('res_institution_id', flat=True).distinct())
                group_ids = [gid for gid in group_ids if gid is not None]

        # ---- 3. Сбор данных и расчёт LGM для каждой группы ----
        results = []
        for gid in group_ids:
            query = Q()
            if group_by == 'institution':
                query &= Q(res_institution_id=gid)
            else:
                query &= Q(res_spec_id=gid)
                # Если вузы заданы как фильтр выборки — применяем
                if clean_inst_ids:
                    query &= Q(res_institution_id__in=clean_inst_ids)

            results_qs = Results.objects.filter(query).order_by(
                'res_participant_id', 'res_year', 'res_course_num'
            )
            data = []
            for r in results_qs:
                score = getattr(r, competency, None)
                if score is not None:
                    data.append({
                        'student_id': r.res_participant_id,
                        'time_point': r.res_course_num,
                        'competency_score': score
                    })

            if not data:
                continue

            df = pd.DataFrame(data)
            lgm = LatentGrowthModel()
            analysis = lgm.fit(df)

            if analysis['status'] == 'success':
                if group_by == 'institution':
                    inst = Institutions.objects.filter(inst_id=gid).first()
                    group_name = inst.inst_name if inst else f"ВУЗ {gid}"
                else:
                    spec = Specialties.objects.filter(spec_id=gid).first()
                    group_name = spec.spec_name if spec else f"Направление {gid}"

                results.append({
                    'group_id': gid,
                    'group_name': group_name,
                    'group_type': group_by,
                    'n_students': analysis['n_students'],
                    'mean_intercept': analysis['mean_intercept'],
                    'mean_slope': analysis['mean_slope'],
                    'std_intercept': analysis['std_intercept'],
                    'std_slope': analysis['std_slope'],
                    'interpretation': analysis.get('interpretation'),
                    'trajectories': analysis.get('trajectories', [])
                })

        if not results:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных для анализа LGM (возможно, недостаточно лонгитюдных измерений)'
            }, status=404)

        return JsonResponse({
            'status': 'success',
            'competency': competency,
            'group_by': group_by,
            'data': _convert_numpy_types(results)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


# ============================================================
# LGM: списки быстро- и медленнорастущих студентов для группы
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def get_lgm_growers(request):
    """
    Возвращает списки студентов (с именами), чей индивидуальный slope
    выше/ниже среднего по группе — т.е. быстро- и медленнорастущие.

    POST body:
    {
        "competency": "res_comp_leadership",
        "group_by": "institution" | "direction",
        "group_id": 42,
        "institution_ids": [],
        "direction_ids": []
    }
    """
    try:
        body = json.loads(request.body)
        competency = body.get('competency', 'res_comp_leadership')
        group_by = body.get('group_by', 'institution')
        group_id = body.get('group_id')
        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', [])

        if group_id is None:
            return JsonResponse({'status': 'error', 'message': 'group_id required'}, status=400)

        group_id = int(group_id)

        # Формируем запрос — те же условия, что в analyze_cohort_lgm
        query = Q()
        if group_by == 'institution':
            query &= Q(res_institution_id=group_id)
        else:
            query &= Q(res_spec_id=group_id)
            clean_inst_ids = [int(i) for i in institution_ids if str(i).isdigit()]
            if clean_inst_ids:
                query &= Q(res_institution_id__in=clean_inst_ids)

        results_qs = Results.objects.filter(query).order_by(
            'res_participant_id', 'res_year', 'res_course_num'
        )

        data = []
        for r in results_qs:
            score = getattr(r, competency, None)
            if score is not None:
                data.append({
                    'student_id': r.res_participant_id,
                    'time_point': r.res_course_num,
                    'competency_score': score
                })

        if not data:
            return JsonResponse({'status': 'error', 'message': 'Нет данных'}, status=404)

        df = pd.DataFrame(data)
        lgm = LatentGrowthModel()
        analysis = lgm.fit(df)

        if analysis['status'] != 'success':
            return JsonResponse({'status': 'error', 'message': analysis.get('message', 'Ошибка LGM')}, status=500)

        trajectories = analysis.get('trajectories', [])
        mean_slope = analysis.get('mean_slope', 0)

        # Разбиваем на fast/slow
        fast = [t for t in trajectories if t['slope'] > mean_slope]
        slow = [t for t in trajectories if t['slope'] <= mean_slope]

        # Подтягиваем имена студентов
        def enrich_with_names(student_list):
            enriched = []
            for t in student_list:
                sid = t['student_id']
                name = str(sid)
                institution_name = ''
                direction_name = ''
                try:
                    participant = Participants.objects.get(part_id=sid)
                    try:
                        mapping = Studentmapping.objects.get(rsv_id=participant.part_rsv_id)
                        name = mapping.student_name
                    except Studentmapping.DoesNotExist:
                        name = participant.part_rsv_id or str(sid)
                    # Берём последний результат для определения вуза/направления
                    last_result = Results.objects.filter(
                        res_participant_id=sid
                    ).select_related('res_institution', 'res_spec').order_by('-res_year', '-res_course_num').first()
                    if last_result:
                        institution_name = last_result.res_institution.inst_name if last_result.res_institution else ''
                        direction_name = last_result.res_spec.spec_name if last_result.res_spec else ''
                except Participants.DoesNotExist:
                    pass
                enriched.append({
                    'student_id': sid,
                    'name': name,
                    'slope': round(t['slope'], 4),
                    'intercept': round(t.get('intercept', 0), 2),
                    'institution': institution_name,
                    'direction': direction_name,
                })
            return enriched

        fast_enriched = enrich_with_names(fast)
        slow_enriched = enrich_with_names(slow)

        # Сортируем: быстрые — по убыванию slope, медленные — по возрастанию
        fast_enriched.sort(key=lambda x: x['slope'], reverse=True)
        slow_enriched.sort(key=lambda x: x['slope'])

        return JsonResponse({
            'status': 'success',
            'group_id': group_id,
            'mean_slope': round(mean_slope, 4),
            'fast_growers': fast_enriched,
            'slow_growers': slow_enriched,
            'fast_count': len(fast_enriched),
            'slow_count': len(slow_enriched),
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ============================================================
# Комплексный анализ всех дисциплин
# ============================================================

@cached()
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
            COMP.LEADERSHIP,
            COMP.PLANNING,
            COMP.RESULT_ORIENT,
            COMP.INFO_ANALYSIS,
            COMP.PASSIVE_VOCAB,
            COMP.CLIENT_FOCUS
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
                        'competency_label': COMP.names[comp],
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
                        'grade': perf.perf_main_attestation,
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


# ============================================================
# ENHANCED DISCIPLINE IMPACT ANALYSIS WITH FILTERS
# ============================================================

@cached()
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
                
                before_result = Results.objects                    \
                    .select_related('res_spec', 'res_institution') \
                    .filter(res_participant=student)               \
                    .filter(Q(res_year__lt=year))                  \
                    .order_by('-res_year', '-res_course_num').first()

                after_result = Results.objects                      \
                    .select_related('res_spec', 'res_institution')  \
                    .filter(res_participant=student, res_year=year) \
                    .order_by('-res_course_num').first()
                
                if before_result and after_result:
                    before_score = getattr(before_result, competency, None)
                    after_score = getattr(after_result, competency, None)
                    
                    if before_score is not None and after_score is not None:
                        # Направление: ищем в результате (res_spec), затем у участника (part_spec)
                        direction = (
                            (after_result.res_spec.spec_name  if after_result.res_spec  else None) or
                            (before_result.res_spec.spec_name if before_result.res_spec else None) or
                            (student.part_spec.spec_name      if student.part_spec      else None) or
                            'Не указано'
                        )
                        institution = (
                            (after_result.res_institution.inst_name  if after_result.res_institution  else None) or
                            (before_result.res_institution.inst_name if before_result.res_institution else None) or
                            (student.part_institution.inst_name      if student.part_institution      else None) or
                            'Не указано'
                        )
                        perf_data.append({
                            'student_id': student.part_id,
                            'discipline': perf.perf_discipline,
                            'grade': perf.perf_main_attestation,
                            'year': year,
                            'institution': institution,
                            'direction': direction,
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
                analysis['competency_label'] = COMP.names[competency]
                
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

@cached()
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
            COMP.LEADERSHIP,
            COMP.PLANNING,
            COMP.RESULT_ORIENT,
            COMP.INFO_ANALYSIS,
            COMP.COMMUNICATION
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
                # Направление: ищем в результате, затем у участника
                direction = (
                    (after_result.res_spec.spec_name  if after_result.res_spec  else None) or
                    (before_result.res_spec.spec_name if before_result.res_spec else None) or
                    (student.part_spec.spec_name      if student.part_spec      else None) or
                    'Не указано'
                )
                for comp in competencies:
                    before_score = getattr(before_result, comp, None)
                    after_score = getattr(after_result, comp, None)
                    
                    if before_score is not None and after_score is not None:
                        perf_data_by_disc[disc].append({
                            'competency': comp,
                            f'{comp}_before': before_score,
                            f'{comp}_after': after_score,
                            'grade': perf.perf_main_attestation,
                            'direction': direction,
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
                            'competency_label': COMP.names[comp],
                            'effect_size': float(cohens_d),
                            'mean_gain': float(mean_diff),
                            'p_value': float(p_value),
                            'significant': p_value < 0.05,
                            'n_students': len(before)
                        })
        
        # ── Эффект по направлениям ──
        heatmap_by_direction = {}   # { direction: [ {discipline, competency, effect_size, ...} ] }
        for disc in disciplines:
            if disc not in perf_data_by_disc or not perf_data_by_disc[disc]:
                continue
            df_all = pd.DataFrame(perf_data_by_disc[disc])
            if 'direction' not in df_all.columns:
                continue
            for direction, dir_df in df_all.groupby('direction'):
                for comp in competencies:
                    bcol, acol = f'{comp}_before', f'{comp}_after'
                    if bcol not in dir_df.columns or acol not in dir_df.columns:
                        continue
                    before = dir_df[bcol].dropna()
                    after  = dir_df[acol].dropna()
                    if len(before) < 3:
                        continue
                    mean_diff  = float(after.mean() - before.mean())
                    std_pooled = np.sqrt((before.std()**2 + after.std()**2) / 2)
                    cohens_d   = mean_diff / std_pooled if std_pooled > 0 else 0
                    t_stat, p_value = stats.ttest_rel(after, before)
                    heatmap_by_direction.setdefault(direction, []).append({
                        'discipline':       disc,
                        'competency':       comp,
                        'competency_label': COMP.names[comp],
                        'effect_size':      float(cohens_d),
                        'mean_gain':        mean_diff,
                        'p_value':          float(p_value),
                        'significant':      bool(p_value < 0.05),
                        'n_students':       len(before),
                    })

        heatmap_by_direction = {k: _convert_numpy_types(v) for k, v in heatmap_by_direction.items()}

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
                        'competency_label': COMP.names[comp],
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
            'data_by_direction': heatmap_by_direction,
            'directions': sorted(heatmap_by_direction.keys()),
            'disciplines': list(DISCIPLINE_COMPETENCY_MAP.keys()),
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
# GET DISCIPLINES - список всех дисциплин
# ============================================================

@cached()
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


@cached()
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
            before_result = Results.objects                             \
                .filter(res_participant=participant, res_year__lt=year) \
                .order_by('-res_year', '-res_course_num')               \
                .first()

            # Результат после (тот же год)
            after_result = Results.objects                          \
                .filter(res_participant=participant, res_year=year) \
                .order_by('-res_course_num')                        \
                .first()

            if not before_result or not after_result:
                continue  # недостаточно данных для этой дисциплины

            # Собираем баллы по всем компетенциям
            competencies_before = {}
            competencies_after = {}
            for comp in COMP.list:
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
                'grade': disc.perf_main_attestation,
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


@cached()
@method(POST)
@jsonResponse
@csrf_exempt
def get_competency_level_flow(request):
    """ Calculate flow in competency levels between courses
    """
    body = json.loads(request.body)
    competency = body.get('competency')
    institution_ids = body.get('institution_ids', [])
    direction_ids = body.get('direction_ids', [])

    if not competency:
        raise ResponseError("Competency required")

    # Фильтруем участников
    participants_qs = Participants.objects.all()
    if institution_ids:
        participants_qs = participants_qs.filter(**isIn(TPART.INSTITUTION, institution_ids))
    if direction_ids:
        participants_qs = participants_qs.filter(**isIn(TPART.EDU_SPEC, direction_ids))

    # Получаем все результаты выбранных участников, сортируем по студенту и курсу
    results = Results.objects                                                               \
        .filter(**isIn(TRES.PARTICIPANT, participants_qs.values_list(TPART.ID, flat=True))) \
        .order_by(TRES.PARTICIPANT, TRES.COURSE_NUM)

    # Группируем по студентам
    student_data = {}
    for r in results:
        sid = r.res_participant
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
        raise ResponseError("No scores found", status=404)

    # Пороги: начальный < p33, высокий > p66
    p33 = np.percentile(all_scores, 33)
    p66 = np.percentile(all_scores, 66)

    def get_level(score):
        if score <= p33:
            return 'Начальный'
        elif score <= p66:
            return 'Средний'
        else:
            return 'Высокий'

    courses = 1, 2, 3, 4
    levels = 'Начальный', 'Средний', 'Высокий'
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
        if len(sorted_courses) > 1:
            print(sid, scores)
        for i in range(len(sorted_courses)-1):
            c_from = sorted_courses[i]
            c_to = sorted_courses[i+1]
            if c_from != c_to - 1:
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

    return {"nodes": nodes, "links": links}


@cached()
@method(POST)
@jsonResponse
@csrf_exempt
def get_competency_level_flow_yearly(request):
    """ Calculate flow in competency levels between years
    """
    body = json.loads(request.body)
    competency = body.get('competency')
    institution_ids = body.get('institution_ids', [])
    direction_ids = body.get('direction_ids', [])

    if not competency:
        raise ResponseError("Competency required")

    # Фильтруем участников
    participants_qs = Participants.objects.all()
    if institution_ids:
        participants_qs = participants_qs.filter(**isIn(TPART.INSTITUTION, institution_ids))
    if direction_ids:
        participants_qs = participants_qs.filter(**isIn(TPART.EDU_SPEC, direction_ids))

    # Получаем все результаты выбранных участников, сортируем по студенту и курсу
    results = Results.objects                                                               \
        .filter(**isIn(TRES.PARTICIPANT, participants_qs.values_list(TPART.ID, flat=True))) \
        .order_by(TRES.PARTICIPANT, TRES.COURSE_NUM)

    # Группируем по студентам
    student_data = {}
    for r in results:
        sid = r.res_participant
        score = getattr(r, competency, None)
        if score is None:
            continue
        year = r.res_year
        if sid not in student_data:
            student_data[sid] = {}
        student_data[sid][year] = score

    all_scores = [score for d in student_data.values() for score in d.values()]
    if not all_scores:
        raise ResponseError("No scores found", status=404)

    # Пороги: начальный < p33, высокий > p66
    p33 = np.percentile(all_scores, 33)
    p66 = np.percentile(all_scores, 66)

    def get_level(score):
        if score <= p33:
            return 'Начальный'
        elif score <= p66:
            return 'Средний'
        else:
            return 'Высокий'

    years = '2021/2022', '2022/2023', '2023/2024', '2024/2025', '2025/2026'
    levels = 'Начальный', 'Средний', 'Высокий'
    nodes = []
    node_index = {}
    for year in years:
        for level in levels:
            name = f"{year} год - {level}"
            node_index[(year, level)] = len(nodes)
            nodes.append({'name': name})

    # Подсчёт переходов между последовательными годами
    transition_counts = {}
    for sid, scores in student_data.items():
        sorted_courses = sorted(scores.keys())
        if len(sorted_courses) > 1:
            print(sid, scores)
        for i in range(len(sorted_courses)-1):
            c_from = sorted_courses[i]
            c_to = sorted_courses[i+1]
            if int(c_from.split('/')[0]) != int(c_to.split('/')[0]) - 1:
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

    return {"nodes": nodes, "links": links}


# ============================================================
# VAM TREND DATA - для линейных графиков по курсам
# ============================================================

@cached()
@csrf_exempt
@require_http_methods(["POST"])
def get_vam_trend_data(request):
    """
    Возвращает данные для отображения VAM в разрезе курсов для каждой группы.
    value_added здесь — реальный Value-Added (прирост минус ожидаемый),
    агрегированный по студентам внутри каждой группы и курса.
    """
    try:
        body = json.loads(request.body)
        group_by = body.get('group_by', 'institution')
        competency = body.get('competency', 'res_comp_leadership')
        selected_groups = body.get('selected_groups', [])

        filter_institutions = body.get('filter_institutions', [])
        filter_directions = body.get('filter_directions', [])
        filter_courses = body.get('filter_courses', [])

        # Базовый queryset
        results = Results.objects.select_related('res_institution', 'res_spec')

        if filter_institutions:
            results = results.filter(res_institution_id__in=filter_institutions)
        if filter_directions:
            dir_ids = []
            for d in filter_directions:
                if str(d).isdigit():
                    dir_ids.append(int(d))
                else:
                    spec = Specialties.objects.filter(spec_name=d).first()
                    if spec:
                        dir_ids.append(spec.spec_id)
            if dir_ids:
                results = results.filter(res_spec_id__in=dir_ids)
        if filter_courses:
            results = results.filter(res_course_num__in=filter_courses)

        if selected_groups:
            if group_by == 'institution':
                inst_ids = [int(g) for g in selected_groups if str(g).isdigit()]
                results = results.filter(res_institution_id__in=inst_ids) if inst_ids else results.none()
            else:
                spec_ids = []
                for g in selected_groups:
                    if str(g).isdigit():
                        spec_ids.append(int(g))
                    else:
                        spec = Specialties.objects.filter(spec_name=g).first()
                        if spec:
                            spec_ids.append(spec.spec_id)
                results = results.filter(res_spec_id__in=spec_ids) if spec_ids else results.none()

        # Собираем данные с лонгитюдной структурой: student -> курс -> балл
        data = []
        for r in results:
            score = getattr(r, competency, None)
            if score is None:
                continue
            data.append({
                'group_id':   r.res_institution_id if group_by == 'institution' else r.res_spec_id,
                'group_name': (r.res_institution.inst_name if r.res_institution else 'Неизвестно')
                              if group_by == 'institution'
                              else (r.res_spec.spec_name if r.res_spec else 'Неизвестно'),
                'student_id': r.res_participant_id,
                'year':       r.res_year,
                'course':     r.res_course_num,
                'comp_score': score,
            })

        if not data:
            return JsonResponse({'status': 'error', 'message': 'Нет данных'}, status=404)

        df = pd.DataFrame(data)
        vam_model = ValueAddedModel()
        # Переименовываем course → course (уже так), добавляем year если нет
        cohort_for_baseline = df.rename(columns={'comp_score': 'competency_score'})
        global_baseline = vam_model.compute_global_baseline(cohort_for_baseline)
        result_data = []

        for (group_id, group_name), group_df in df.groupby(['group_id', 'group_name']):
            # Словарь: course -> список value_added отдельных студентов
            va_by_course = {}

            for student_id, student_df in group_df.groupby('student_id'):
                # Нужно минимум 2 замера для расчёта VAM
                if len(student_df) < 2:
                    continue

                # Приводим к формату, который ожидает fit_for_student
                student_input = student_df[['year', 'course', 'comp_score']].rename(
                    columns={'comp_score': 'competency_score'}
                ).copy()

                analysis = vam_model.fit_for_student(student_input, expected_growth=global_baseline)
                if analysis['status'] != 'success':
                    continue

                # Разносим VA по курсам (берём course из growth_by_period)
                for period in analysis['growth_by_period']:
                    course = period['course']
                    va = period['value_added']
                    if course not in va_by_course:
                        va_by_course[course] = []
                    va_by_course[course].append(va)

            # Агрегируем VA по курсам
            courses_data = []
            for course, va_values in sorted(va_by_course.items()):
                if len(va_values) < 3:
                    continue
                va_arr = np.array(va_values)
                mean_va = va_arr.mean()
                se = va_arr.std() / np.sqrt(len(va_arr))
                courses_data.append({
                    'course':      int(course),
                    'value_added': float(mean_va),
                    'ci_lower':    float(mean_va - 1.96 * se),
                    'ci_upper':    float(mean_va + 1.96 * se),
                    'n':           int(len(va_values)),
                })

            if courses_data:
                result_data.append({
                    'group_id':   int(group_id),
                    'group_name': str(group_name),
                    'courses':    courses_data,
                })

        if not result_data:
            return JsonResponse({
                'status': 'error',
                'message': 'Недостаточно лонгитюдных данных для VAM (нужны студенты с 2+ замерами)'
            }, status=404)

        return JsonResponse({
            'status':     'success',
            'group_by':   group_by,
            'competency': competency,
            'data':       _convert_numpy_types(result_data),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@cached()
@csrf_exempt
@require_http_methods(["GET"])
def get_institutions(request):
    """Возвращает список всех учебных заведений."""
    try:
        institutions = Institutions.objects.all().values('inst_id', 'inst_name')
        return JsonResponse({
            'status': 'success',
            'institutions': list(institutions)
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@cached()
@csrf_exempt
@require_http_methods(["GET"])
def get_directions(request):
    """Возвращает список всех направлений (специальностей)."""
    try:
        directions = Specialties.objects.all().values('spec_id', 'spec_name')
        return JsonResponse({
            'status': 'success',
            'directions': list(directions)
        })
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@cached()
@csrf_exempt
@require_http_methods(["POST"])
def ai_analytics_summary(request):
    """
    Генерирует аналитическую сводку для администратора.
    """
    try:
        import json
        # COMP уже доступен из from .common import *
        # используем COMP.names для названий компетенций

        body = json.loads(request.body)
        context_type = body.get('context_type', 'general')
        filters = body.get('filters', {})

        inst_ids = filters.get('institutions', [])
        dir_ids = filters.get('directions', [])
        courses = filters.get('courses', [])
        competency = filters.get('competency', 'res_comp_leadership')
        year = filters.get('year', None)

        results_qs = Results.objects.select_related('res_institution', 'res_spec')
        if inst_ids:
            results_qs = results_qs.filter(res_institution_id__in=inst_ids)
        if dir_ids:
            results_qs = results_qs.filter(res_spec_id__in=dir_ids)
        if courses:
            results_qs = results_qs.filter(res_course_num__in=courses)
        if year:
            results_qs = results_qs.filter(res_year=year)

        prompt = ""
        if context_type == 'general':
            total_students = results_qs.values('res_participant_id').distinct().count()
            avg_scores = {}
            for comp in COMP.list[:6]:
                avg = results_qs.aggregate(Avg(comp))[f'{comp}__avg']
                if avg:
                    comp_name = COMP.names.get(comp, comp)
                    avg_scores[comp_name] = round(avg, 1)

            scores = results_qs.exclude(**{f'{competency}__isnull': True}).values_list(competency, flat=True)
            if scores:
                low = sum(1 for s in scores if s < 400)
                medium = sum(1 for s in scores if 400 <= s < 600)
                high = sum(1 for s in scores if s >= 600)
                total = len(scores)
                low_pct = round(low / total * 100, 1) if total else 0
                medium_pct = round(medium / total * 100, 1) if total else 0
                high_pct = round(high / total * 100, 1) if total else 0
            else:
                low_pct = medium_pct = high_pct = 0

            comp_display = COMP.names.get(competency, competency)
            prompt = f"""
Ты — аналитик образовательной платформы. На основе следующих данных напиши краткий аналитический отчёт (3-5 предложений) для администратора.

Данные:
- Всего участников: {total_students}
- Средние баллы по компетенциям: {avg_scores}
- Распределение по уровням для компетенции "{comp_display}": высокий {high_pct}%, средний {medium_pct}%, начальный {low_pct}%

Выдели основные тренды, сильные стороны и зоны роста.
"""

        elif context_type == 'institution_comparison':
            if not inst_ids:
                inst_agg = results_qs.values('res_institution_id', 'res_institution__inst_name') \
                    .annotate(avg_score=Avg(competency), student_count=Count('res_participant_id', distinct=True)) \
                    .order_by('-student_count')[:5]
            else:
                inst_agg = results_qs.values('res_institution_id', 'res_institution__inst_name') \
                    .annotate(avg_score=Avg(competency), student_count=Count('res_participant_id', distinct=True)) \
                    .filter(res_institution_id__in=inst_ids)

            comparison = []
            for item in inst_agg:
                comparison.append(f"- {item['res_institution__inst_name']}: средний балл {item['avg_score']:.1f}, студентов {item['student_count']}")

            comp_display = COMP.names.get(competency, competency)
            prompt = f"""
Сравни учебные заведения по компетенции "{comp_display}".

Данные:
{chr(10).join(comparison)}

Выдели лидеров и отстающих, дай рекомендации.
"""

        elif context_type == 'discipline_impact':
            from .datanal import DisciplineImpactAnalyzer
            analyzer = DisciplineImpactAnalyzer()
            perf_data = []
            perf_qs = Academicperformance.objects.select_related('perf_part')
            if inst_ids:
                perf_qs = perf_qs.filter(perf_part__part_institution_id__in=inst_ids)
            if dir_ids:
                perf_qs = perf_qs.filter(perf_part__part_spec_id__in=dir_ids)

            for perf in perf_qs[:200]:
                year_perf = perf.perf_year
                student = perf.perf_part
                try:
                    year_start = int(year_perf.split('/')[0])
                except:
                    continue
                before = Results.objects.filter(res_participant=student, res_year__lt=year_perf).order_by('-res_year').first()
                after = Results.objects.filter(res_participant=student, res_year=year_perf).order_by('-res_course_num').first()
                if before and after:
                    before_score = getattr(before, competency, None)
                    after_score = getattr(after, competency, None)
                    if before_score and after_score:
                        perf_data.append({
                            'discipline': perf.perf_discipline,
                            'grade': perf.perf_main_attestation,
                            f'{competency}_before': before_score,
                            f'{competency}_after': after_score
                        })
            if perf_data:
                df = pd.DataFrame(perf_data)
                analysis = analyzer.analyze_discipline_impact(df, competency)
                impact_text = ""
                for disc_res in analysis.get('results', []):
                    impact_text += f"\nДисциплина: {disc_res['discipline']}\n"
                    for grade, impact in disc_res.get('grade_impacts', {}).items():
                        impact_text += f"  Оценка {grade}: прирост {impact['mean_gain']:.1f} баллов, эффект {impact['cohens_d']:.2f} (p={impact['p_value']:.3f})\n"
                comp_display = COMP.names.get(competency, competency)
                prompt = f"""
Проанализируй влияние дисциплин на компетенцию "{comp_display}".

Данные анализа:
{impact_text}

Сделай выводы: какие дисциплины наиболее эффективны, какие требуют доработки.
"""
            else:
                prompt = "Недостаточно данных для анализа влияния дисциплин."

        elif context_type == 'vam_trend':
            # Прямой вызов get_vam_trend_data (функция уже определена в этом модуле)
            from django.http import HttpRequest
            mock_request = HttpRequest()
            mock_request.method = "POST"
            mock_request.body = json.dumps({
                'group_by': 'institution',
                'competency': competency,
                'filter_institutions': inst_ids,
                'filter_directions': dir_ids,
                'filter_courses': courses
            }).encode()
            response = get_vam_trend_data(mock_request)
            content = json.loads(response.content)
            if content.get('status') == 'success':
                data_points = []
                for group in content.get('data', []):
                    for course in group.get('courses', []):
                        data_points.append(f"{group['group_name']}, курс {course['course']}: {course['value_added']:.1f} баллов")
                comp_display = COMP.names.get(competency, competency)
                prompt = f"""
Проанализируй динамику развития компетенции "{comp_display}" по курсам.

Данные (средний балл на курсе для каждой группы):
{chr(10).join(data_points[:20])}

Выдели общий тренд (рост, падение, стагнацию), укажи группы с лучшей и худшей динамикой.
"""
            else:
                prompt = "Недостаточно данных для анализа VAM."

        else:
            prompt = "Неизвестный тип анализа."

        result = MlModel.generate(prompt, max_length=600, temperature=0.2)
        if result is None:
            result = "⚠️ Модель временно недоступна. Попробуйте позже."

        return JsonResponse({
            'status': 'success',
            'summary': result,
            'context_type': context_type
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


@cached()
def get_student_comparison_stats(request):
    """
    Получение сравнительной статистики студента.
    GET параметры:
        - student_id: ID студента
        - year: год тестирования
    """
    try:
        student_id = request.GET.get('student_id')
        year = request.GET.get('year')
        
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id required'}, status=400)
        
        # Получаем данные студента
        student_results = Results.objects.filter(
            res_participant__part_id=student_id
        )
        
        if year:
            student_results = student_results.filter(res_year=year)
        
        if not student_results.exists():
            return JsonResponse({'status': 'error', 'message': 'Student results not found'}, status=404)
        
        student = student_results.first()
        student_participant = student.res_participant
        
        # Определяем контекст сравнения
        institution = student_participant.part_institution
        specialty = student_participant.part_spec
        course_num = student.res_course_num
        
        # Получаем всех студентов для сравнения
        all_results = Results.objects.filter(res_year=student.res_year)
        
        # Фильтруем по институту
        institution_results = all_results.filter(
            res_participant__part_institution=institution
        ) if institution else None
        
        # Фильтруем по направлению
        specialty_results = all_results.filter(
            res_participant__part_spec=specialty
        ) if specialty else None
        
        # Фильтруем по курсу
        course_results = all_results.filter(res_course_num=course_num)
        
        # Функция расчета процентиля
        def calculate_percentile(student_value, all_values):
            if student_value is None:
                return None
            sorted_values = sorted([v for v in all_values if v is not None])
            if not sorted_values:
                return None
            count_less = sum(1 for v in sorted_values if v < student_value)
            percentile = (count_less / len(sorted_values)) * 100
            return round(percentile)
        
        # Функция расчета статистики для списка полей
        def calculate_stats(results_queryset, fields):
            stats = {}
            all_values = {field: [] for field in fields}
            
            # Собираем все значения
            for result in results_queryset:
                for field in fields:
                    value = getattr(result, field, None)
                    if value is not None:
                        all_values[field].append(value)
            
            # Рассчитываем статистику для каждого поля
            for field in fields:
                student_value = getattr(student, field, None)
                stats[field] = {
                    'student_score': student_value,
                    'percentile_institution': None,
                    'percentile_specialty': None,
                    'percentile_course': None,
                    'avg_institution': None,
                    'avg_specialty': None,
                    'avg_course': None,
                    'min_institution': None,
                    'max_institution': None
                }
                
                if student_value is not None:
                    # Процентили
                    if institution_results:
                        stats[field]['percentile_institution'] = calculate_percentile(
                            student_value, all_values[field]
                        )
                    if specialty_results:
                        stats[field]['percentile_specialty'] = calculate_percentile(
                            student_value, [getattr(r, field) for r in specialty_results if getattr(r, field) is not None]
                        )
                    if course_results:
                        stats[field]['percentile_course'] = calculate_percentile(
                            student_value, [getattr(r, field) for r in course_results if getattr(r, field) is not None]
                        )
                    
                    # Средние значения
                    if institution_results and all_values[field]:
                        stats[field]['avg_institution'] = round(sum(all_values[field]) / len(all_values[field]), 1)
                        stats[field]['min_institution'] = min(all_values[field])
                        stats[field]['max_institution'] = max(all_values[field])
                    
                    if specialty_results:
                        specialty_values = [getattr(r, field) for r in specialty_results if getattr(r, field) is not None]
                        if specialty_values:
                            stats[field]['avg_specialty'] = round(sum(specialty_values) / len(specialty_values), 1)
                    
                    if course_results:
                        course_values = [getattr(r, field) for r in course_results if getattr(r, field) is not None]
                        if course_values:
                            stats[field]['avg_course'] = round(sum(course_values) / len(course_values), 1)
            
            return stats
        
        # Рассчитываем статистику
        competencies_stats = calculate_stats(all_results, COMP.list)
        motivators_stats = calculate_stats(all_results, MOT.list)
        
        # Формируем результат
        result = {
            'student_info': {
                'name': student_participant.part_rsv_id,
                'institution': institution.inst_name if institution else 'Не указан',
                'specialty': specialty.spec_name if specialty else 'Не указано',
                'course': course_num,
                'year': student.res_year
            },
            'comparison_context': {
                'institution_students': institution_results.count() if institution_results else 0,
                'specialty_students': specialty_results.count() if specialty_results else 0,
                'course_students': course_results.count()
            },
            'competencies': [],
            'motivators': []
        }
        
        for field, stats in competencies_stats.items():
            result['competencies'].append({
                'name':                   COMP.names.get(field, field),
                'score':                  stats['student_score'],
                'percentile_institution': stats['percentile_institution'],
                'percentile_specialty':   stats['percentile_specialty'],
                'percentile_course':      stats['percentile_course'],
                'avg_institution':        stats['avg_institution'],
                'avg_specialty':          stats['avg_specialty'],
                'avg_course':             stats['avg_course'],
                'min_institution':        stats['min_institution'],
                'max_institution':        stats['max_institution']
            })
        
        for field, stats in motivators_stats.items():
            result['motivators'].append({
                'name':                   MOT.names.get(field, field),
                'score':                  stats['student_score'],
                'percentile_institution': stats['percentile_institution'],
                'percentile_specialty':   stats['percentile_specialty'],
                'percentile_course':      stats['percentile_course'],
                'avg_institution':        stats['avg_institution'],
                'avg_specialty':          stats['avg_specialty'],
                'avg_course':             stats['avg_course'],
                'min_institution':        stats['min_institution'],
                'max_institution':        stats['max_institution']
            })
        
        return JsonResponse({
            'status': 'success',
            'data': result
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


@cached()
def get_education_profiles_comparison(request):
    """
    Получение усреднённых профилей по направлениям подготовки.
    GET параметры:
        - specialties: список ID направлений через запятую (опционально)
        - year: год тестирования (опционально)
        - include_motivators: включить мотиваторы (true/false)
        - include_values: включить ценности (true/false)
    """
    try:
        specialties_param = request.GET.get('specialties', '')
        year = request.GET.get('year')
        include_motivators = request.GET.get('include_motivators', 'true').lower() == 'true'
        include_values = request.GET.get('include_values', 'true').lower() == 'true'
        
        # Получаем список направлений
        if specialties_param:
            specialty_ids = [int(x) for x in specialties_param.split(',') if x]
            specialties = Specialties.objects.filter(spec_id__in=specialty_ids)
        else:
            # Если не указаны, берем топ-10 по количеству студентов
            specialties = Specialties.objects.all()
        
        # Поля для анализа
        motivator_fields = MOT.list if include_motivators else []
        value_fields = VAL.list if include_values else []
        all_fields = motivator_fields + value_fields
        
        results = []
        
        for specialty in specialties:
            # Получаем результаты по направлению
            queryset = Results.objects.filter(
                res_participant__part_spec=specialty
            ).select_related('res_participant')
            
            if year:
                queryset = queryset.filter(res_year=year)
            
            if not queryset.exists():
                continue
            
            total_students = queryset.count()
            
            # Рассчитываем средние значения по каждому полю
            profile = {}
            for field in all_fields:
                values = [getattr(r, field) for r in queryset if getattr(r, field) is not None]
                if values:
                    avg_value = round(sum(values) / len(values), 1)
                    profile[field] = {
                        'avg': avg_value,
                        'count': len(values),
                        'std': round(StdDevCalculation(values), 1) if len(values) > 1 else 0
                    }
                else:
                    profile[field] = {'avg': None, 'count': 0, 'std': 0}
            
            results.append({
                'id': specialty.spec_id,
                'name': specialty.spec_name,
                'total_students': total_students,
                'profile': profile
            })
        
        # Рассчитываем дельты между направлениями
        deltas = {}
        if len(results) >= 2:
            for i, spec1 in enumerate(results):
                for j, spec2 in enumerate(results):
                    if i >= j:
                        continue
                    
                    key = f"{spec1['id']}_{spec2['id']}"
                    deltas[key] = {
                        'specialty1': spec1['name'],
                        'specialty2': spec2['name'],
                        'motivators_delta': {},
                        'values_delta': {}
                    }
                    
                    # Рассчитываем дельты для мотиваторов
                    for field in motivator_fields:
                        val1 = spec1['profile'].get(field, {}).get('avg')
                        val2 = spec2['profile'].get(field, {}).get('avg')
                        if val1 is not None and val2 is not None:
                            delta = round(val2 - val1, 1)
                            deltas[key]['motivators_delta'][field] = {
                                'delta': delta,
                                'abs_delta': abs(delta),
                                'spec1_avg': val1,
                                'spec2_avg': val2,
                                'name': MOT.names[field]
                            }
                    
                    # Рассчитываем дельты для ценностей
                    for field in value_fields:
                        val1 = spec1['profile'].get(field, {}).get('avg')
                        val2 = spec2['profile'].get(field, {}).get('avg')
                        if val1 is not None and val2 is not None:
                            delta = round(val2 - val1, 1)
                            deltas[key]['values_delta'][field] = {
                                'delta': delta,
                                'abs_delta': abs(delta),
                                'spec1_avg': val1,
                                'spec2_avg': val2,
                                'name': VAL.names[field]
                            }
        
        return JsonResponse({
            'status': 'success',
            'data': {
                'specialties': results,
                'deltas': deltas,
                'fields': {
                    'motivators': MOT.names,
                    'values': VAL.names
                }
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


def StdDevCalculation(values):
    """Рассчет стандартного отклонения"""
    import math
    n = len(values)
    if n < 2:
        return 0
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / (n - 1)
    return math.sqrt(variance)


# portrait/analysis_end.py

# portrait/analysis_end.py

@csrf_exempt
@require_http_methods(["POST"])
def get_boxplot_data(request):
    """
    Возвращает данные для boxplot и список аномальных студентов.
    POST body:
    {
        "competency": "res_comp_leadership",
        "institution_ids": [1,2],
        "direction_ids": [10,20],
        "group_by": "auto" | "institution" | "direction" | None
    }
    group_by = "auto" – автоматический выбор:
        - если выбрано несколько вузов -> группировка по вузам
        - если выбран один вуз и несколько направлений -> по направлениям
        - иначе общий boxplot
    """
    import numpy as np
    from scipy import stats

    try:
        body = json.loads(request.body)
        competency = body.get('competency')
        institution_ids = body.get('institution_ids', [])
        direction_ids = body.get('direction_ids', [])
        group_by = body.get('group_by', 'auto')  # 'auto', 'institution', 'direction', None

        if not competency:
            return JsonResponse({'status': 'error', 'message': 'competency required'}, status=400)

        # Базовый queryset результатов
        qs = Results.objects.select_related('res_participant', 'res_institution', 'res_spec')
        if institution_ids:
            qs = qs.filter(res_institution_id__in=institution_ids)
        if direction_ids:
            qs = qs.filter(res_spec_id__in=direction_ids)

        # Определяем группировку
        effective_group_by = None
        if group_by == 'institution':
            effective_group_by = 'institution'
        elif group_by == 'direction':
            effective_group_by = 'direction'
        elif group_by == 'auto':
            if len(institution_ids) > 1:
                effective_group_by = 'institution'
            elif len(institution_ids) == 1 and len(direction_ids) > 1:
                effective_group_by = 'direction'
            # иначе оставляем None – общий боксплот

        # Если групповая разбивка не нужна – возвращаем один общий ящик
        if effective_group_by is None:
            scores = []
            students_data = []
            for r in qs:
                score = getattr(r, competency, None)
                if score is None:
                    continue
                scores.append(score)
                participant = r.res_participant
                try:
                    mapping = Studentmapping.objects.get(rsv_id=participant.part_rsv_id)
                    student_name = mapping.student_name
                except Studentmapping.DoesNotExist:
                    student_name = participant.part_rsv_id
                students_data.append({
                    'student_id': participant.part_id,
                    'name': student_name,
                    'score': score,
                    'institution': r.res_institution.inst_name if r.res_institution else 'Не указан',
                    'direction': r.res_spec.spec_name if r.res_spec else 'Не указано',
                })

            if len(scores) < 5:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Недостаточно данных для построения ящика с усами (нужно минимум 5 студентов)'
                }, status=400)

            scores_array = np.array(scores)
            q1, median, q3 = np.percentile(scores_array, [25, 50, 75])
            iqr = q3 - q1
            lower_fence = q1 - 1.5 * iqr
            upper_fence = q3 + 1.5 * iqr
            whisker_low = float(max(scores_array.min(), lower_fence))
            whisker_high = float(min(scores_array.max(), upper_fence))
            outliers = [s for s in students_data if s['score'] < lower_fence or s['score'] > upper_fence]

            return JsonResponse({
                'status': 'success',
                'competency': competency,
                'grouped': False,
                'statistics': {
                    'min': float(scores_array.min()),
                    'q1': float(q1),
                    'median': float(median),
                    'q3': float(q3),
                    'max': float(scores_array.max()),
                    'iqr': float(iqr),
                    'lower_fence': float(lower_fence),
                    'upper_fence': float(upper_fence),
                    'whisker_low': whisker_low,
                    'whisker_high': whisker_high,
                    'count': len(scores),
                    'mean': float(np.mean(scores_array)),
                    'std': float(np.std(scores_array)),
                },
                'outliers': outliers,
                'all_students': students_data,
            }, json_dumps_params={'ensure_ascii': False})

        # Групповая разбивка
        groups_data = {}
        for r in qs:
            score = getattr(r, competency, None)
            if score is None:
                continue
            if effective_group_by == 'institution':
                group_id = r.res_institution_id
                group_name = r.res_institution.inst_name if r.res_institution else 'Не указан'
            else:  # direction
                group_id = r.res_spec_id
                group_name = r.res_spec.spec_name if r.res_spec else 'Не указано'

            if group_id not in groups_data:
                groups_data[group_id] = {
                    'group_id': group_id,
                    'group_name': group_name,
                    'scores': [],
                    'students': []
                }
            groups_data[group_id]['scores'].append(score)
            # собираем информацию о студенте
            participant = r.res_participant
            try:
                mapping = Studentmapping.objects.get(rsv_id=participant.part_rsv_id)
                student_name = mapping.student_name
            except Studentmapping.DoesNotExist:
                student_name = participant.part_rsv_id
            groups_data[group_id]['students'].append({
                'student_id': participant.part_id,
                'name': student_name,
                'score': score,
                'institution': r.res_institution.inst_name if r.res_institution else 'Не указан',
                'direction': r.res_spec.spec_name if r.res_spec else 'Не указано',
            })

        # Вычисляем статистику для каждой группы
        result_groups = []
        for gid, gdata in groups_data.items():
            scores_array = np.array(gdata['scores'])
            if len(scores_array) < 5:  # недостаточно данных для ящика
                continue
            q1, median, q3 = np.percentile(scores_array, [25, 50, 75])
            iqr = q3 - q1
            lower_fence = q1 - 1.5 * iqr
            upper_fence = q3 + 1.5 * iqr
            whisker_low = max(min(scores_array), lower_fence)
            whisker_high = min(max(scores_array), upper_fence)
            outliers = [s for s in gdata['students'] if s['score'] < lower_fence or s['score'] > upper_fence]

            result_groups.append({
                'group_id': gid,
                'group_name': gdata['group_name'],
                'statistics': {
                    'min': float(min(scores_array)),
                    'q1': float(q1),
                    'median': float(median),
                    'q3': float(q3),
                    'max': float(max(scores_array)),
                    'iqr': float(iqr),
                    'lower_fence': float(lower_fence),
                    'upper_fence': float(upper_fence),
                    'whisker_low': float(whisker_low),
                    'whisker_high': float(whisker_high),
                    'count': len(scores_array),
                    'mean': float(np.mean(scores_array)),
                    'std': float(np.std(scores_array)),
                },
                'outliers': outliers,
                'all_students': gdata['students']
            })

        return JsonResponse({
            'status': 'success',
            'competency': competency,
            'grouped': True,
            'group_by': effective_group_by,
            'groups': result_groups,
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    
@csrf_exempt
@require_http_methods(["GET"])
def get_duplicate_accounts(request):
    """
    Возвращает студентов, у которых один email соответствует нескольким rsv_id.

    Исправления:
    - Убран @cached(): данные должны читаться свежими, иначе кнопка «Обновить» не работает.
    - Устранён N+1: все Participants и Results подгружаются двумя запросами вместо O(n*m).
    """
    try:
        # Находим email, которые встречаются более одного раза в StudentMapping
        duplicate_emails = list(
            Studentmapping.objects.values('email')
            .annotate(count=Count('rsv_id'))
            .filter(count__gt=1, email__isnull=False)
            .exclude(email__exact='')
            .values_list('email', flat=True)
        )

        if not duplicate_emails:
            return JsonResponse({
                'status': 'success',
                'message': 'Нет студентов с несколькими аккаунтами',
                'students': []
            })

        # Загружаем все нужные маппинги одним запросом
        all_mappings = Studentmapping.objects.filter(email__in=duplicate_emails)

        # Группируем маппинги по email и собираем все rsv_id
        from collections import defaultdict
        email_to_mappings = defaultdict(list)
        all_rsv_ids = []
        for m in all_mappings:
            email_to_mappings[m.email].append(m)
            all_rsv_ids.append(m.rsv_id)

        # Загружаем всех участников одним запросом и индексируем по rsv_id
        participants_by_rsv = {
            p.part_rsv_id: p
            for p in Participants.objects.filter(part_rsv_id__in=all_rsv_ids)
        }

        # Загружаем все результаты одним запросом и группируем по participant_id
        participant_ids = [p.part_id for p in participants_by_rsv.values()]
        results_by_participant = defaultdict(list)
        results_qs = (
            Results.objects
            .filter(res_participant_id__in=participant_ids)
            .select_related('res_institution', 'res_spec')
            .order_by('res_year', 'res_course_num')
        )
        for r in results_qs:
            results_by_participant[r.res_participant_id].append(r)

        # Формируем ответ
        result_students = []
        for email in duplicate_emails:
            mappings = email_to_mappings[email]
            rsv_ids = [m.rsv_id for m in mappings]

            accounts_info = []
            for rsv_id in rsv_ids:
                participant = participants_by_rsv.get(rsv_id)
                if not participant:
                    accounts_info.append({
                        'rsv_id': rsv_id,
                        'exists_in_participants': False,
                        'results': []
                    })
                    continue

                results_data = [
                    {
                        'year': r.res_year,
                        'course': r.res_course_num,
                        'institution': r.res_institution.inst_name if r.res_institution else None,
                        'specialty': r.res_spec.spec_name if r.res_spec else None,
                        'competency_leadership': r.res_comp_leadership,
                    }
                    for r in results_by_participant.get(participant.part_id, [])
                ]

                accounts_info.append({
                    'rsv_id': rsv_id,
                    'exists_in_participants': True,
                    'participant_id': participant.part_id,
                    'gender': participant.part_gender,
                    'results': results_data
                })

            student_name = mappings[0].student_name
            result_students.append({
                'email': email,
                'student_name': student_name,
                'accounts_count': len(rsv_ids),
                'accounts': accounts_info
            })

        return JsonResponse({
            'status': 'success',
            'students': result_students
        }, json_dumps_params={'ensure_ascii': False})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)