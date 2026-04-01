from .common import *
from ..ml_model import generate_text


# ====== UTILITIES ====== #

def predict_competency_level(score, course=None, other_scores=None):
    # (оставляем без изменений)
    if score < 400:
        level = "низкий"
        level_code = 0
    elif score < 600:
        level = "средний"
        level_code = 1
    else:
        level = "высокий"
        level_code = 2
    percentile = calculate_percentile(score)
    return {
        "level": level,
        "level_code": level_code,
        "confidence": 1.0,
        "percentile": percentile,
        "probabilities": {
            "низкий": 1.0 if level_code == 0 else 0.0,
            "средний": 1.0 if level_code == 1 else 0.0,
            "высокий": 1.0 if level_code == 2 else 0.0
        }
    }

def calculate_percentile(score):
    percentile = ((score - 200) / 600) * 100
    return int(max(0, min(100, percentile)))

def generate_interpretation(score, level, competency_name, course, percentile):
    # (оставляем шаблонный метод как fallback)
    level_templates = {
        'низкий': {
            'intro': f"Ваш результат по компетенции '{competency_name}' находится на начальном уровне развития ({score} баллов).",
            'context': f"Для студента {course} курса это типичный показатель на этапе формирования базовых навыков.",
            'outlook': "У вас есть хороший потенциал для роста! С регулярной практикой и обучением вы сможете значительно улучшить этот показатель.",
            'emoji': '🔴'
        },
        'средний': {
            'intro': f"Ваш результат по компетенции '{competency_name}' находится на среднем уровне ({score} баллов, {percentile}-й процентиль).",
            'context': f"Вы демонстрируете хорошее базовое владение этой компетенцией, что соответствует ожиданиям для {course} курса.",
            'outlook': "Вы на правильном пути! Продолжайте развивать эти навыки, и вы достигнете высокого уровня.",
            'emoji': '🟡'
        },
        'высокий': {
            'intro': f"Отличный результат! Ваша компетенция '{competency_name}' развита на высоком уровне ({score} баллов).",
            'context': f"Вы находитесь в топ-{100-percentile}% студентов вашего курса. Это выдающийся показатель!",
            'outlook': "Поздравляем! Продолжайте развиваться в этом направлении и делитесь опытом с другими студентами.",
            'emoji': '🟢'
        }
    }
    template = level_templates.get(level, level_templates['средний'])
    interpretation = f"{template['emoji']} {template['intro']}\n\n{template['context']}\n\n{template['outlook']}"
    return interpretation.strip()

def generate_recommendations(competency_field, level, course):
    comp_name = COMP.names.get(competency_field, 'Компетенция')
    recommendations_db = {
        'Лидерство': {
            'низкий': [
                "Примите участие в групповых проектах в роли координатора задач",
                "Пройдите онлайн-курс по основам лидерства (Coursera, Stepik)",
                "Присоединитесь к студенческому самоуправлению или волонтёрским проектам",
                "Начните с малого: возглавьте учебную группу или подгруппу"
            ],
            'средний': [
                "Возглавьте студенческий проект или инициативу в университете",
                "Развивайте навыки делегирования и мотивации команды",
                "Изучите различные стили лидерства и попробуйте их на практике",
                "Примите участие в деловых играх и симуляциях управления"
            ],
            'высокий': [
                "Станьте ментором для студентов младших курсов",
                "Участвуйте в молодёжных лидерских программах и конкурсах",
                "Развивайте стратегическое лидерство через сложные проекты",
                "Рассмотрите возможность стажировки на управленческих позициях"
            ]
        },
        'Коммуникация': {
            'низкий': [
                "Активно участвуйте в семинарах и групповых дискуссиях",
                "Тренируйте публичные выступления (начните с коротких докладов)",
                "Посетите тренинг по эффективной коммуникации",
                "Практикуйте активное слушание в повседневном общении"
            ],
            'средний': [
                "Развивайте навыки презентации проектов перед аудиторией",
                "Участвуйте в дебатах или дискуссионных клубах",
                "Изучите техники невербальной коммуникации",
                "Попробуйте себя в роли ведущего студенческих мероприятий"
            ],
            'высокий': [
                "Выступайте на студенческих конференциях и форумах",
                "Развивайте кросс-культурные коммуникации",
                "Станьте спикером или модератором на крупных мероприятиях",
                "Делитесь опытом: проводите мастер-классы по коммуникации"
            ]
        },
        'Саморазвитие': {
            'низкий': [
                "Составьте план личностного развития на семестр",
                "Начните читать профессиональную литературу",
                "Определите 2-3 навыка для развития",
                "Ведите дневник достижений и рефлексии"
            ],
            'средний': [
                "Пройдите курсы повышения квалификации",
                "Установите систему регулярного самообразования",
                "Найдите ментора в профессиональной сфере",
                "Участвуйте в профессиональных сообществах"
            ],
            'высокий': [
                "Делитесь знаниями: пишите статьи, ведите блог",
                "Изучайте смежные области для расширения компетенций",
                "Участвуйте в научных исследованиях",
                "Станьте наставником для других студентов"
            ]
        }
    }
    # Для других компетенций возвращаем общий список
    default_recs = [
        "Продолжайте развивать эту компетенцию через практику",
        "Ищите возможности для применения навыков в реальных проектах",
        "Получайте обратную связь от преподавателей и сокурсников"
    ]
    comp_recs = recommendations_db.get(comp_name, {})
    return comp_recs.get(level, default_recs)[:4]

def get_level_emoji(level):
    emoji_map = {'низкий': '🔴', 'средний': '🟡', 'высокий': '🟢'}
    return emoji_map.get(level, '⚪')

def get_level_color(level):
    color_map = {'низкий': '#f44336', 'средний': '#ff9800', 'высокий': '#4caf50'}
    return color_map.get(level, '#9e9e9e')

# ===== AI-функции (инструкционные) =====

def generate_interpretation_with_ai(score, level, competency_name, course, percentile):
    prompt = (
        f"Ты — карьерный консультант. Дай краткую интерпретацию уровня развития компетенции.\n\n"
        f"Компетенция: {competency_name}\n"
        f"Балл: {score}/800\n"
        f"Курс: {course}\n"
        f"Процентиль: {percentile}\n"
        f"Уровень: {level}\n\n"
        f"Интерпретация (1-2 предложения):"
    )
    text = generate_text(prompt, max_length=100)
    if not text or len(text) < 20 or text.startswith(prompt):
        return generate_interpretation(score, level, competency_name, course, percentile)
    return text

def generate_recommendations_with_ai(competency_field, level, course):
    comp_name = COMP.names.get(competency_field, competency_field)
    prompt = (
        f"Ты — карьерный консультант. Дай 3-4 конкретные рекомендации по развитию компетенции.\n\n"
        f"Компетенция: {comp_name}\n"
        f"Уровень развития: {level}\n"
        f"Курс: {course}\n\n"
        f"Рекомендации (списком):"
    )
    text = generate_text(prompt, max_length=200)
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if line and (line.startswith('-') or line.startswith('*') or (line[0].isdigit() and line[1] in '. ')):
            clean = line.lstrip('-*•0123456789. ').strip()
            if clean:
                lines.append(clean)
        elif line and len(lines) < 4:
            lines.append(line)
    if not lines:
        return generate_recommendations(competency_field, level, course)
    return lines[:4]

def generate_general_interpretation_with_ai(student_info, competencies_dict):
    # Сортируем компетенции по баллам
    sorted_comps = sorted(competencies_dict.items(), key=lambda x: x[1], reverse=True)
    strong = [f"{name} ({score})" for name, score in sorted_comps[:3]]
    weak = [f"{name} ({score})" for name, score in sorted_comps[-3:]]

    prompt = (
        f"Ты — карьерный консультант. Напиши краткую характеристику студента, используя только данные о компетенциях. "
        f"Не добавляй никакой информации о внешности, возрасте или личных качествах, не указанных в данных.\n\n"
        f"Курс: {student_info.get('course', 'X')}\n"
        f"Направление: {student_info.get('direction', 'не указано')}\n"
        f"Сильные стороны (наиболее высокие баллы): {', '.join(strong)}\n"
        f"Зоны роста (наиболее низкие баллы): {', '.join(weak)}\n\n"
        f"Характеристика (2-3 предложения):"
    )
    text = generate_text(prompt, max_length=150, temperature=0.6, top_p=0.85)
    # Если ответ содержит явные признаки галлюцинаций, возвращаем заглушку
    if not text or any(phrase in text.lower() for phrase in ['внешность', 'возраст', 'рост', 'характер', 'build']):
        return "Студент демонстрирует сильные стороны в области {}. Рекомендуется обратить внимание на развитие {}.".format(
            ', '.join(strong[:2]), ', '.join(weak[:2])
        )
    # Очистка от лишних символов
    text = text.split('\n')[0].strip()
    if text.endswith(','):
        text = text[:-1]
    return text