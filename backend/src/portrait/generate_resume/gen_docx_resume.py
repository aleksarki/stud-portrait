# ═══════════════════════════════════════════════════════════
# portrait/endpoints/generate_docx_resume.py
# Генератор DOCX резюме студента
# ═══════════════════════════════════════════════════════════

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from ..models import Participants, Results
from datetime import datetime
from io import BytesIO

# Импорт для DOCX
try:
    from docx import Document
    from docx.shared import Pt, Inches, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

from portrait.endpoints.ml_utils import (
    predict_competency_level,
    generate_interpretation,
    generate_recommendations,
    get_level_emoji
)

# Маппинг компетенций
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


def create_docx_resume(participant, results, interpretations):
    """
    Создаёт DOCX резюме студента.
    
    Args:
        participant: Объект Participants
        results: QuerySet результатов
        interpretations: Dict с AI-интерпретациями
    
    Returns:
        BytesIO: DOCX файл в памяти
    """
    
    doc = Document()
    
    # Настройка полей документа
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
    
    # ============================================================
    # ЗАГОЛОВОК
    # ============================================================
    
    title = doc.add_heading('ПРОФЕССИОНАЛЬНОЕ РЕЗЮМЕ', 0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.runs[0]
    title_run.font.color.rgb = RGBColor(25, 118, 210)  # Синий цвет
    
    doc.add_paragraph()  # Пустая строка
    
    # ============================================================
    # ЛИЧНАЯ ИНФОРМАЦИЯ
    # ============================================================
    
    heading = doc.add_heading('👤 ЛИЧНАЯ ИНФОРМАЦИЯ', level=1)
    heading.runs[0].font.color.rgb = RGBColor(51, 51, 51)
    
    # Таблица с личной информацией
    table = doc.add_table(rows=3, cols=2)
    table.style = 'Light Grid Accent 1'
    
    cells = [
        ('ФИО:', participant.part_name or 'Не указано'),
        ('Пол:', participant.part_gender or 'Не указан'),
        ('Уровень образования:', participant.part_edu_level.edu_level_name if participant.part_edu_level else 'Не указан')
    ]
    
    for i, (label, value) in enumerate(cells):
        table.rows[i].cells[0].text = label
        table.rows[i].cells[1].text = value
        
        # Жирный шрифт для меток
        table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
    
    doc.add_paragraph()
    
    # ============================================================
    # ОБРАЗОВАНИЕ
    # ============================================================
    
    heading = doc.add_heading('🎓 ОБРАЗОВАНИЕ', level=1)
    heading.runs[0].font.color.rgb = RGBColor(51, 51, 51)
    
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
    
    # ============================================================
    # ПРОФЕССИОНАЛЬНЫЕ КОМПЕТЕНЦИИ
    # ============================================================
    
    heading = doc.add_heading('💼 ПРОФЕССИОНАЛЬНЫЕ КОМПЕТЕНЦИИ', level=1)
    heading.runs[0].font.color.rgb = RGBColor(51, 51, 51)
    
    latest_result = results.first()
    
    if latest_result and interpretations:
        competencies_order = list(COMPETENCY_NAMES.keys())
        
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            
            if not score or score == 0:
                continue
            
            comp_name = COMPETENCY_NAMES.get(comp_field, comp_field)
            interp = interpretations.get(comp_field, {})
            
            if not interp:
                continue
            
            # Заголовок компетенции
            emoji = interp.get('emoji', '')
            level = interp.get('level', 'средний')
            
            comp_heading = doc.add_heading(f"{emoji} {comp_name}", level=2)
            comp_heading.runs[0].font.size = Pt(14)
            
            # Балл и прогресс-бар
            progress_percent = ((score - 200) / 600) * 100
            progress_blocks = int(progress_percent / 12.5)  # 8 блоков
            progress_bar = "█" * progress_blocks + "░" * (8 - progress_blocks)
            
            score_para = doc.add_paragraph()
            score_run = score_para.add_run(f"Балл: {score}/800  {progress_bar}")
            score_run.font.size = Pt(11)
            score_run.font.color.rgb = RGBColor(100, 100, 100)
            
            # AI-интерпретация
            if 'interpretation' in interp:
                ai_para = doc.add_paragraph()
                ai_run = ai_para.add_run("🤖 AI-анализ: ")
                ai_run.font.bold = True
                ai_run.font.size = Pt(10)
                
                # Берём первое предложение интерпретации
                interpretation_text = interp['interpretation']
                short_text = interpretation_text.split('\n')[0]  # Первый абзац
                
                ai_para.add_run(short_text)
                ai_para.paragraph_format.left_indent = Inches(0.25)
            
            # Рекомендации
            if 'recommendations' in interp and interp['recommendations']:
                rec_para = doc.add_paragraph()
                rec_run = rec_para.add_run("Рекомендации:")
                rec_run.font.bold = True
                rec_run.font.size = Pt(10)
                
                for rec in interp['recommendations'][:3]:  # Топ-3 рекомендации
                    rec_item = doc.add_paragraph(rec, style='List Bullet')
                    rec_item.paragraph_format.left_indent = Inches(0.5)
                    rec_item.runs[0].font.size = Pt(10)
            
            doc.add_paragraph()  # Разделитель между компетенциями
    
    else:
        doc.add_paragraph("Нет данных о компетенциях")
    
    # ============================================================
    # ФУТЕР
    # ============================================================
    
    doc.add_paragraph()
    footer = doc.add_paragraph()
    footer_run = footer.add_run(f"Дата формирования резюме: {datetime.now().strftime('%d.%m.%Y')}")
    footer_run.font.size = Pt(9)
    footer_run.font.color.rgb = RGBColor(150, 150, 150)
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    # ============================================================
    # СОХРАНЕНИЕ В ПАМЯТЬ
    # ============================================================
    
    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return buffer


@csrf_exempt
@require_http_methods(["GET"])
def generate_docx_resume(request):
    """
    Генерирует DOCX резюме студента.
    
    GET /portrait/generate-docx-resume/?student_id=123
    
    Query params:
        student_id (required): ID студента
    
    Returns:
        DOCX файл для скачивания
    """
    
    try:
        # Проверяем доступность библиотеки
        if not DOCX_AVAILABLE:
            return JsonResponse({
                'status': 'error',
                'message': 'Библиотека python-docx не установлена. Установите: pip install python-docx'
            }, status=500)
        
        # Получаем параметры
        student_id = request.GET.get('student_id')
        
        print(f"📄 Генерация DOCX резюме для студента {student_id}")
        
        if not student_id:
            return JsonResponse({
                'status': 'error',
                'message': 'Параметр student_id обязателен'
            }, status=400)
        
        # Получаем данные студента
        try:
            participant = Participants.objects.select_related(
                'part_institution',
                'part_spec',
                'part_form',
                'part_edu_level'
            ).get(part_id=student_id)
        except Participants.DoesNotExist:
            return JsonResponse({
                'status': 'error',
                'message': f'Студент с ID {student_id} не найден'
            }, status=404)
        
        # Получаем результаты
        results = Results.objects.filter(
            res_participant=participant
        ).order_by('-res_year', '-res_course_num')
        
        if not results.exists():
            return JsonResponse({
                'status': 'error',
                'message': 'У студента нет результатов тестирования'
            }, status=404)
        
        latest_result = results.first()
        
        # Получаем AI-интерпретации
        interpretations = {}
        
        competencies_order = list(COMPETENCY_NAMES.keys())
        
        # Собираем все баллы
        all_scores = {}
        for comp_field in competencies_order:
            score = getattr(latest_result, comp_field, None)
            if score and score > 0:
                all_scores[comp_field] = score
        
        course = latest_result.res_course_num or 1
        
        # Генерируем интерпретации
        for comp_field, score in all_scores.items():
            other_scores = [s for cf, s in all_scores.items() if cf != comp_field]
            
            try:
                prediction = predict_competency_level(score, course, other_scores)
                comp_name = COMPETENCY_NAMES.get(comp_field, comp_field)
                
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
                
                interpretations[comp_field] = {
                    'level': prediction['level'],
                    'emoji': get_level_emoji(prediction['level']),
                    'interpretation': interpretation,
                    'recommendations': recommendations
                }
                
            except Exception as e:
                print(f"   ⚠️ Ошибка AI для {comp_field}: {str(e)}")
                continue
        
        print(f"   ✅ AI-интерпретаций: {len(interpretations)}")
        
        # Создаём DOCX
        docx_buffer = create_docx_resume(participant, results, interpretations)
        
        # Возвращаем файл
        response = HttpResponse(
            docx_buffer,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
        # Имя файла
        filename = f"Resume_{participant.part_name.replace(' ', '_')}_{student_id}.docx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        print(f"   📤 DOCX файл отправлен: {filename}")
        
        return response
        
    except Exception as e:
        print(f"❌ Ошибка генерации DOCX: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'status': 'error',
            'message': f'Ошибка генерации резюме: {str(e)}'
        }, status=500)