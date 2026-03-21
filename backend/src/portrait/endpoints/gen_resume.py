from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from datetime import datetime

from .common import *
from .ml_utils import (
    predict_competency_level,
    generate_interpretation,
    generate_recommendations,
    get_level_emoji,
    get_level_color
)


# ====== ENDPOINTS ====== #

@method('GET')
@csrf_exempt
def get_student_resume_data(request):
    """
    Возвращает данные для резюме студента в формате JSON.
    Frontend сам решит как их отображать (HTML, PDF через браузер, и т.д.)
    
    GET /portrait/student-resume-data/?student_id=123&year=2021/2022&with_ai=true
    
    Query params:
        student_id (required): ID студента
        year (optional): учебный год (формат "2021/2022")
        with_ai (optional): true | false (default: true) - включать AI-интерпретации
    
    Returns:
        JSON с полными данными студента для резюме
    """
    
    try:
        # Получаем параметры
        student_id = request.GET.get('student_id')
        year = request.GET.get('year')
        with_ai = request.GET.get('with_ai', 'true').lower() == 'true'
        
        if not student_id:
            return JsonResponse({
                'status': 'error',
                'message': 'Параметр student_id обязателен'
            }, status=400)
        
        # Получаем данные студента
        try:
            participant = Participants.objects                                                  \
                .select_related('part_institution', 'part_spec', 'part_form', 'part_edu_level') \
                .get(part_id=student_id)
        except Participants.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': f'Студент с ID {student_id} не найден'
            }, status=404)
        
        # Получаем результаты студента с фильтрацией по году, если указан
        results = Results.objects.filter(res_participant=participant)
        if year:
            results = results.filter(res_year=year)
        results = results.order_by('-res_year', '-res_course_num')
        
        if not results.exists():
            return JsonResponse({
                'status': 'error',
                'message': f'Нет результатов тестирования за {year}' if year else 'У студента нет результатов тестирования'
            }, status=404)
        
        latest_result = results.first()
        
        # Формируем базовые данные
        resume_data = {
            'personal_info': {
                'name': participant.part_rsv_id or '',
                'gender': participant.part_gender or '',
                'student_id': student_id
            },
            'education': {
                'institution': participant.part_institution.inst_name if participant.part_institution else '',
                'direction': participant.part_spec.spec_name if participant.part_spec else '',
                'form': participant.part_form.form_name if participant.part_form else '',
                'level': participant.part_edu_level.edu_level_name if participant.part_edu_level else '',
                'course': participant.part_course_num
            },
            'competencies': [],
            'generated_at': datetime.now().isoformat(),
            'year': year or latest_result.res_year  # возвращаем год, по которому загружены данные
        }
        
        # Собираем компетенции
        competencies_order = [
            'res_comp_leadership',
            'res_comp_communication',
            'res_comp_self_development',
            'res_comp_result_orientation',
            'res_comp_stress_resistance',
            'res_comp_client_focus',
            'res_comp_planning',
            'res_comp_info_analysis',
            'res_comp_partnership',
            'res_comp_rules_compliance',
            'res_comp_emotional_intel',
            'res_comp_passive_vocab'
        ]
        
        # Собираем все баллы для контекста
        all_scores = {}
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if score and score > 0:
                all_scores[comp_field] = score
        
        # Обрабатываем каждую компетенцию
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            
            if not score or score == 0:
                continue
            
            comp_name = COMP.names[comp_field]
            
            # Базовые данные компетенции
            comp_data = {
                'field': comp_field,
                'name': comp_name,
                'score': score,
                'max_score': 800,
                'percentage': ((score - 200) / 600) * 100
            }
            
            # Если нужны AI-интерпретации
            if with_ai:
                # Баллы других компетенций для контекста
                other_scores = [s for cf, s in all_scores.items() if cf != comp_field]
                course = latest_result.res_course_num or 1
                
                try:
                    # Предсказание
                    prediction = predict_competency_level(score, course, other_scores)
                    
                    # Генерация текстов
                    interpretation = generate_interpretation(
                        score,
                        prediction['level'],
                        comp_name,
                        course,
                        prediction['percentile']
                    )
                    recommendations = generate_recommendations(
                        comp_field,
                        prediction['level'],
                        course
                    )
                    
                    comp_data['ai'] = {
                        'level': prediction['level'],
                        'level_code': prediction['level_code'],
                        'confidence': prediction['confidence'],
                        'percentile': prediction['percentile'],
                        'emoji': get_level_emoji(prediction['level']),
                        'color': get_level_color(prediction['level']),
                        'interpretation': interpretation,
                        'recommendations': recommendations
                    }
                    
                except Exception as e:
                    comp_data['ai'] = None
            
            resume_data['competencies'].append(comp_data)
        
        return JsonResponse({
            'status': 'success',
            'data': resume_data
        }, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'status': 'error',
            'message': f'Ошибка генерации резюме: {str(e)}',
            'traceback': traceback.format_exc()
        }, status=500)