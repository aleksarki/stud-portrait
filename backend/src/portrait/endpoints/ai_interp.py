# ═══════════════════════════════════════════════════════════
# portrait/endpoints/ai_interpret.py (ИСПРАВЛЕННАЯ ВЕРСИЯ)
# ═══════════════════════════════════════════════════════════

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .ml_utils import (
    predict_competency_level,
    generate_interpretation,
    generate_recommendations,
    get_level_emoji,
    get_level_color
)

# Маппинг полей компетенций на русские названия
COMPETENCY_NAMES = {
    'res_comp_leadership': 'Лидерство',
    'res_comp_communication': 'Коммуникация',
    'res_comp_self_development': 'Саморазвитие',
    'res_comp_result_orientation': 'Ориентация на результат',
    'res_comp_stress_resistance': 'Стрессоустойчивость',
    'res_comp_client_focus': 'Клиентоориентированность',
    'res_comp_planning': 'Планирование',
    'res_comp_info_analysis': 'Анализ информации',
    'res_comp_partnership': 'Партнёрство',
    'res_comp_rules_compliance': 'Соблюдение правил',
    'res_comp_emotional_intel': 'Эмоциональный интеллект',
    'res_comp_passive_vocab': 'Пассивный словарь'
}


@csrf_exempt
@require_http_methods(["POST"])
def ai_interpret_competency(request):
    """
    AI-интерпретация одной компетенции.
    
    POST /portrait/ai-interpret/
    Content-Type: application/json
    
    Body:
    {
        "competency": "res_comp_leadership",
        "score": 678,
        "course": 3,
        "other_scores": [534, 612, 456, 590, 622, 511, 478, 599, 545, 487, 623, 402]
    }
    """
    
    try:
        # Логирование для отладки
        print(f"📨 Получен запрос ai_interpret_competency")
        print(f"   Content-Type: {request.META.get('CONTENT_TYPE')}")
        print(f"   Body: {request.body}")
        
        # Проверяем что body не пустое
        if not request.body:
            return JsonResponse({
                'status': 'error',
                'message': 'Тело запроса пустое'
            }, status=400)
        
        # Парсим JSON
        try:
            data = json.loads(request.body.decode('utf-8'))
            print(f"   ✅ JSON распарсен: {data}")
        except json.JSONDecodeError as e:
            print(f"   ❌ Ошибка парсинга JSON: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': f'Некорректный JSON: {str(e)}',
                'received_body': request.body.decode('utf-8', errors='ignore')[:200]
            }, status=400)
        
        # Получаем параметры
        competency_field = data.get('competency')
        score = data.get('score')
        course = data.get('course', 1)
        other_scores = data.get('other_scores', [])
        
        # Валидация
        if not competency_field:
            return JsonResponse({
                'status': 'error',
                'message': 'Параметр "competency" обязателен'
            }, status=400)
        
        if score is None:
            return JsonResponse({
                'status': 'error',
                'message': 'Параметр "score" обязателен'
            }, status=400)
        
        # Получаем русское название компетенции
        competency_name = COMPETENCY_NAMES.get(competency_field, competency_field)
        
        print(f"   🔮 Предсказываем: {competency_name} = {score}")
        
        # Предсказание уровня с помощью ML
        prediction = predict_competency_level(score, course, other_scores)
        
        print(f"   ✅ Предсказание: {prediction['level']} (уверенность: {prediction['confidence']:.2f})")
        
        # Генерация интерпретации
        interpretation = generate_interpretation(
            score,
            prediction['level'],
            competency_name,
            course,
            prediction['percentile']
        )
        
        # Генерация рекомендаций
        recommendations = generate_recommendations(
            competency_field,
            prediction['level'],
            course
        )
        
        # Формируем ответ
        response_data = {
            'status': 'success',
            'data': {
                'score': score,
                'competency': competency_name,
                'competency_field': competency_field,
                'level': prediction['level'],
                'level_code': prediction['level_code'],
                'confidence': prediction['confidence'],
                'percentile': prediction['percentile'],
                'emoji': get_level_emoji(prediction['level']),
                'color': get_level_color(prediction['level']),
                'interpretation': interpretation,
                'recommendations': recommendations,
                'probabilities': prediction['probabilities']
            }
        }
        
        print(f"   📤 Отправляем ответ")
        
        return JsonResponse(response_data, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        print(f"❌ Ошибка в ai_interpret_competency: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def ai_interpret_all_competencies(request):
    """
    AI-интерпретация всех компетенций студента сразу.
    
    POST /portrait/ai-interpret-all/
    Content-Type: application/json
    
    Body:
    {
        "student_id": 123,
        "course": 3,
        "competencies": {
            "res_comp_leadership": 678,
            "res_comp_communication": 534,
            ...
        }
    }
    """
    
    try:
        print(f"📨 Получен запрос ai_interpret_all_competencies")
        
        # Парсим JSON
        if not request.body:
            return JsonResponse({
                'status': 'error',
                'message': 'Тело запроса пустое'
            }, status=400)
        
        try:
            data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError as e:
            return JsonResponse({
                'status': 'error',
                'message': f'Некорректный JSON: {str(e)}'
            }, status=400)
        
        student_id = data.get('student_id')
        course = data.get('course', 1)
        competencies = data.get('competencies', {})
        
        if not competencies:
            return JsonResponse({
                'status': 'error',
                'message': 'Нет данных о компетенциях'
            }, status=400)
        
        print(f"   Студент ID: {student_id}, Курс: {course}")
        print(f"   Компетенций: {len(competencies)}")
        
        # Интерпретируем каждую компетенцию
        results = {}
        
        for comp_field, score in competencies.items():
            if score is None or score == 0:
                continue
            
            # Баллы других компетенций (исключая текущую)
            other_scores = [s for cf, s in competencies.items() 
                          if cf != comp_field and s is not None and s > 0]
            
            # Предсказание
            prediction = predict_competency_level(score, course, other_scores)
            
            # Генерация текстов
            comp_name = COMPETENCY_NAMES.get(comp_field, comp_field)
            interpretation = generate_interpretation(
                score,
                prediction['level'],
                comp_name,
                course,
                prediction['percentile']
            )
            recommendations = generate_recommendations(comp_field, prediction['level'], course)
            
            results[comp_field] = {
                'score': score,
                'competency': comp_name,
                'level': prediction['level'],
                'level_code': prediction['level_code'],
                'confidence': prediction['confidence'],
                'percentile': prediction['percentile'],
                'emoji': get_level_emoji(prediction['level']),
                'color': get_level_color(prediction['level']),
                'interpretation': interpretation,
                'recommendations': recommendations,
                'probabilities': prediction['probabilities']
            }
        
        print(f"   ✅ Обработано {len(results)} компетенций")
        
        return JsonResponse({
            'status': 'success',
            'data': results,
            'summary': {
                'total_competencies': len(results),
                'high_level': sum(1 for r in results.values() if r['level'] == 'высокий'),
                'medium_level': sum(1 for r in results.values() if r['level'] == 'средний'),
                'low_level': sum(1 for r in results.values() if r['level'] == 'низкий'),
                'avg_percentile': sum(r['percentile'] for r in results.values()) / len(results) if results else 0
            }
        }, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        print(f"❌ Ошибка в ai_interpret_all_competencies: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'status': 'error',
            'message': str(e),
            'traceback': traceback.format_exc()
        }, status=500)