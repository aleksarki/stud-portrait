# ═══════════════════════════════════════════════════════════
# portrait/ml_api.py (ИСПРАВЛЕНО - БЕЗ УПОМИНАНИЙ AI)
# ═══════════════════════════════════════════════════════════

import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from ..models import Participants, Results
from datetime import datetime
from io import BytesIO

# Импорт ML утилит
from portrait.endpoints.ml_utils import (
    predict_competency_level,
    generate_interpretation,
    generate_recommendations,
    get_level_emoji,
    get_level_color
)

# Импорт для DOCX
try:
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False


# ============================================================
# МАППИНГ КОМПЕТЕНЦИЙ
# ============================================================

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


# ============================================================
# ENDPOINT 1: AI-интерпретация одной компетенции
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def ai_interpret_competency(request):
    """POST /portrait/ai-interpret/"""
    try:
        print(f"📨 ai_interpret_competency вызван")
        
        if not request.body:
            return JsonResponse({'status': 'error', 'message': 'Тело запроса пустое'}, status=400)
        
        try:
            data = json.loads(request.body.decode('utf-8'))
        except json.JSONDecodeError as e:
            return JsonResponse({'status': 'error', 'message': f'Некорректный JSON: {str(e)}'}, status=400)
        
        competency_field = data.get('competency')
        score = data.get('score')
        course = data.get('course', 1)
        other_scores = data.get('other_scores', [])
        
        if not competency_field or score is None:
            return JsonResponse({'status': 'error', 'message': 'Параметры competency и score обязательны'}, status=400)
        
        competency_name = COMPETENCY_NAMES.get(competency_field, competency_field)
        prediction = predict_competency_level(score, course, other_scores)
        interpretation = generate_interpretation(score, prediction['level'], competency_name, course, prediction['percentile'])
        recommendations = generate_recommendations(competency_field, prediction['level'], course)
        
        return JsonResponse({
            'status': 'success',
            'data': {
                'score': score,
                'competency': competency_name,
                'level': prediction['level'],
                'confidence': prediction['confidence'],
                'percentile': prediction['percentile'],
                'emoji': get_level_emoji(prediction['level']),
                'color': get_level_color(prediction['level']),
                'interpretation': interpretation,
                'recommendations': recommendations
            }
        }, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ============================================================
# ENDPOINT 2: Данные резюме студента (JSON)
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_student_resume_data(request):
    """GET /portrait/student-resume-data/?student_id=123&with_ai=true"""
    try:
        student_id = request.GET.get('student_id')
        with_ai = request.GET.get('with_ai', 'true').lower() == 'true'
        
        print(f"📄 get_student_resume_data для студента {student_id}")
        
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id обязателен'}, status=400)
        
        try:
            participant = Participants.objects.select_related(
                'part_institution', 'part_spec', 'part_form', 'part_edu_level'
            ).get(part_id=student_id)
        except Participants.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': f'Студент {student_id} не найден'}, status=404)
        
        results = Results.objects.filter(res_participant=participant).order_by('-res_year', '-res_course_num')
        
        if not results.exists():
            return JsonResponse({'status': 'error', 'message': 'Нет результатов'}, status=404)
        
        latest_result = results.first()
        
        resume_data = {
            'personal_info': {
                'name': participant.part_name or '',
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
            'generated_at': datetime.now().isoformat()
        }
        
        competencies_order = list(COMPETENCY_NAMES.keys())
        all_scores = {}
        
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if score and score > 0:
                all_scores[comp_field] = score
        
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if not score or score == 0:
                continue
            
            comp_name = COMPETENCY_NAMES.get(comp_field, comp_field)
            comp_data = {
                'field': comp_field,
                'name': comp_name,
                'score': score,
                'max_score': 800,
                'percentage': ((score - 200) / 600) * 100
            }
            
            if with_ai:
                other_scores = [s for cf, s in all_scores.items() if cf != comp_field]
                course = latest_result.res_course_num or 1
                
                try:
                    prediction = predict_competency_level(score, course, other_scores)
                    interpretation = generate_interpretation(score, prediction['level'], comp_name, course, prediction['percentile'])
                    recommendations = generate_recommendations(comp_field, prediction['level'], course)
                    
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
                    print(f"⚠️ Ошибка для {comp_name}: {str(e)}")
                    comp_data['ai'] = None
            
            resume_data['competencies'].append(comp_data)
        
        print(f"✅ Данные сформированы: {len(resume_data['competencies'])} компетенций")
        
        return JsonResponse({'status': 'success', 'data': resume_data}, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)


# ============================================================
# ENDPOINT 3: Генерация DOCX резюме (БЕЗ УПОМИНАНИЙ AI)
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def generate_docx_resume(request):
    """GET /portrait/generate-docx-resume/?student_id=123"""
    try:
        if not DOCX_AVAILABLE:
            return JsonResponse({
                'status': 'error',
                'message': 'python-docx не установлен. Выполните: pip install python-docx'
            }, status=500)
        
        student_id = request.GET.get('student_id')
        print(f"📄 DOCX резюме для студента {student_id}")
        
        if not student_id:
            return JsonResponse({'status': 'error', 'message': 'student_id обязателен'}, status=400)
        
        try:
            participant = Participants.objects.select_related(
                'part_institution', 'part_spec', 'part_form', 'part_edu_level'
            ).get(part_id=student_id)
        except Participants.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': f'Студент {student_id} не найден'}, status=404)
        
        results = Results.objects.filter(res_participant=participant).order_by('-res_year', '-res_course_num')
        
        if not results.exists():
            return JsonResponse({'status': 'error', 'message': 'Нет результатов'}, status=404)
        
        latest_result = results.first()
        
        # Создаём документ
        doc = Document()
        
        # Заголовок
        title = doc.add_heading('ПРОФЕССИОНАЛЬНОЕ РЕЗЮМЕ', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title.runs[0].font.color.rgb = RGBColor(25, 118, 210)
        
        doc.add_paragraph()
        
        # Личная информация
        doc.add_heading('👤 ЛИЧНАЯ ИНФОРМАЦИЯ', level=1)
        table = doc.add_table(rows=3, cols=2)
        table.style = 'Light Grid Accent 1'
        
        cells = [
            ('ФИО:', participant.part_name or 'Не указано'),
            ('Пол:', participant.part_gender or 'Не указан'),
            ('Уровень:', participant.part_edu_level.edu_level_name if participant.part_edu_level else 'Не указан')
        ]
        
        for i, (label, value) in enumerate(cells):
            table.rows[i].cells[0].text = label
            table.rows[i].cells[1].text = value
            table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
        
        doc.add_paragraph()
        
        # Образование
        doc.add_heading('🎓 ОБРАЗОВАНИЕ', level=1)
        table = doc.add_table(rows=3, cols=2)
        table.style = 'Light Grid Accent 1'
        
        cells = [
            ('Учебное заведение:', participant.part_institution.inst_name if participant.part_institution else 'Не указано'),
            ('Направление:', participant.part_spec.spec_name if participant.part_spec else 'Не указано'),
            ('Форма обучения:', participant.part_form.form_name if participant.part_form else 'Не указана')
        ]
        
        for i, (label, value) in enumerate(cells):
            table.rows[i].cells[0].text = label
            table.rows[i].cells[1].text = value
            table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
        
        doc.add_paragraph()
        
        # Компетенции
        doc.add_heading('💼 ПРОФЕССИОНАЛЬНЫЕ КОМПЕТЕНЦИИ', level=1)
        
        competencies_order = list(COMPETENCY_NAMES.keys())
        all_scores = {}
        
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if score and score > 0:
                all_scores[comp_field] = score
        
        course = latest_result.res_course_num or 1
        
        for comp_field, score in all_scores.items():
            comp_name = COMPETENCY_NAMES[comp_field]
            
            # Получаем аналитику (БЕЗ УПОМИНАНИЯ AI!)
            other_scores = [s for cf, s in all_scores.items() if cf != comp_field]
            try:
                prediction = predict_competency_level(score, course, other_scores)
                emoji = get_level_emoji(prediction['level'])
                
                comp_heading = doc.add_heading(f"{emoji} {comp_name}", level=2)
                comp_heading.runs[0].font.size = Pt(14)
                
                # Балл
                progress_percent = ((score - 200) / 600) * 100
                progress_blocks = int(progress_percent / 12.5)
                progress_bar = "█" * progress_blocks + "░" * (8 - progress_blocks)
                
                score_para = doc.add_paragraph()
                score_run = score_para.add_run(f"Балл: {score}/800  {progress_bar}")
                score_run.font.size = Pt(11)
                
                # УБРАЛИ "AI-анализ", теперь просто "Анализ"
                interpretation = generate_interpretation(score, prediction['level'], comp_name, course, prediction['percentile'])
                interp_para = doc.add_paragraph()
                interp_para.add_run("📊 Анализ: ").font.bold = True
                interp_para.add_run(interpretation.split('\n')[0])
                
                # Рекомендации
                recommendations = generate_recommendations(comp_field, prediction['level'], course)
                if recommendations:
                    rec_para = doc.add_paragraph()
                    rec_para.add_run("Рекомендации:").font.bold = True
                    
                    for rec in recommendations[:3]:
                        rec_item = doc.add_paragraph(rec, style='List Bullet')
                        rec_item.runs[0].font.size = Pt(10)
                
                doc.add_paragraph()
                
            except Exception as e:
                print(f"⚠️ Ошибка: {e}")
                continue
        
        # Футер
        footer = doc.add_paragraph()
        footer_run = footer.add_run(f"Дата: {datetime.now().strftime('%d.%m.%Y')}")
        footer_run.font.size = Pt(9)
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Сохраняем в память
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        # Возвращаем файл
        response = HttpResponse(
            buffer,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        filename = f"Resume_{participant.part_name.replace(' ', '_')}_{student_id}.docx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        print(f"✅ DOCX отправлен: {filename}")
        
        return response
        
    except Exception as e:
        print(f"❌ Ошибка DOCX: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)