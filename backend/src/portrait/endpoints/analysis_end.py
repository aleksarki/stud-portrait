# ═══════════════════════════════════════════════════════════
# portrait/analysis_endpoints.py
# API endpoints для статистического анализа
# ═══════════════════════════════════════════════════════════

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Avg, Count
import pandas as pd
import json

from .common import *
from .datanal import (
    ValueAddedModel,
    LatentGrowthModel,
    DisciplineImpactAnalyzer,
    CrossSectionalAnalyzer
)


# ============================================================
# VAM для конкретного студента
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def analyze_student_vam(request):
    """
    Value-Added Model для конкретного студента.
    
    GET /portrait/analyze-student-vam/?student_id=123&competency=res_comp_leadership
    """
    try:
        student_id = request.GET.get('student_id')
        competency = request.GET.get('competency', 'res_comp_leadership')
        
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id required'}, status=400)
        
        # Получаем все результаты студента
        results = Results.objects.filter(
            res_participant_id=student_id
        ).order_by('res_year', 'res_course_num').values(
            'res_year', 'res_course_num',
            competency_score=f'{competency}'
        )
        
        if not results:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных для студента'
            }, status=404)
        
        # Преобразуем в DataFrame
        df = pd.DataFrame(list(results))
        df['year'] = df['res_year']
        df['course'] = df['res_course_num']
        
        # Применяем VAM
        vam = ValueAddedModel()
        analysis = vam.fit_for_student(df)
        
        # Добавляем информацию о студенте
        participant = Participants.objects.get(part_id=student_id)
        
        # Получаем ФИО из маппинга
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
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


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
            query &= Q(res_spec_id=spec_id)
        
        # Получаем лонгитюдные данные
        results = Results.objects.filter(query).order_by(
            'res_participant_id', 'res_year', 'res_course_num'
        ).values(
            'res_participant_id', 'res_year', 'res_course_num',
            competency_score=f'{competency}'
        )
        
        if not results:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных для анализа'
            }, status=404)
        
        # Преобразуем в DataFrame
        df = pd.DataFrame(list(results))
        df['student_id'] = df['res_participant_id']
        df['time_point'] = df['res_course_num']
        
        # Применяем LGM
        lgm = LatentGrowthModel()
        analysis = lgm.fit(df)
        
        return JsonResponse(analysis)
        
    except Exception as e:
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
                
                if before_score and after_score:
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
                
                if before_score and after_score:
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
    """
    Анализ компетенций в различных разрезах.
    
    GET /portrait/analyze-by-dimension/?dimension=institution&competency=res_comp_leadership
    """
    try:
        dimension = request.GET.get('dimension', 'institution')
        competency = request.GET.get('competency', 'res_comp_leadership')
        
        # Маппинг измерений на поля модели
        dimension_map = {
            'institution': 'res_institution__inst_name',
            'spec': 'res_spec__spec_name',
            'form': 'res_form__form_name',
            'course': 'res_course_num'
        }
        
        if dimension not in dimension_map:
            return JsonResponse({
                'status': 'error',
                'message': f'Неверное измерение: {dimension}'
            }, status=400)
        
        # Получаем данные
        results = Results.objects.select_related(
            'res_institution', 'res_spec', 'res_form'
        ).values(
            dimension_field=dimension_map[dimension],
            competency_score=f'{competency}'
        )
        
        df = pd.DataFrame(list(results))
        df.columns = ['dimension_value', 'competency_score']
        
        # Группируем и анализируем
        grouped = df.groupby('dimension_value')['competency_score'].agg([
            ('n', 'count'),
            ('mean', 'mean'),
            ('std', 'std'),
            ('median', 'median'),
            ('min', 'min'),
            ('max', 'max')
        ]).reset_index()
        
        return JsonResponse({
            'status': 'success',
            'dimension': dimension,
            'competency': competency,
            'groups': grouped.to_dict('records')
        })
        
    except Exception as e:
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)