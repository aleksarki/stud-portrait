"""
Аналитические запросы Django ORM.
Исполнитель: Шляхтин Даниил Константинович
"""

from typing import Dict, List, Optional, Union
from django.db.models import Avg, Count, Q, F, IntegerField, Value
from django.db.models.functions import Cast, Coalesce
from portrait.models import Results, Participants, Institutions, Specialties, Course


COMPETENCY_FIELDS = [
    'res_comp_info_analysis', 'res_comp_planning', 'res_comp_result_orientation',
    'res_comp_stress_resistance', 'res_comp_partnership', 'res_comp_rules_compliance',
    'res_comp_self_development', 'res_comp_leadership', 'res_comp_emotional_intel',
    'res_comp_client_focus', 'res_comp_communication', 'res_comp_passive_vocab',
]

COMPETENCY_NAMES = {
    'res_comp_info_analysis': 'Анализ информации',
    'res_comp_planning': 'Планирование',
    'res_comp_result_orientation': 'Ориентация на результат',
    'res_comp_stress_resistance': 'Стрессоустойчивость',
    'res_comp_partnership': 'Партнерство/Сотрудничество',
    'res_comp_rules_compliance': 'Следование правилам',
    'res_comp_self_development': 'Саморазвитие',
    'res_comp_leadership': 'Лидерство',
    'res_comp_emotional_intel': 'Эмоциональный интеллект',
    'res_comp_client_focus': 'Клиентоориентированность',
    'res_comp_communication': 'Коммуникация',
    'res_comp_passive_vocab': 'Пассивный словарный запас',
}


def _cast_summary_report():
    """Вспомогательная функция для приведения res_summary_report к числу."""
    return Cast('res_summary_report', IntegerField())


def get_competency_distribution(
    academic_year: str,
    institution_id: Optional[int] = None
) -> List[Dict[str, Union[str, float]]]:
    """Распределение средних баллов по 12 компетенциям за учебный год."""
    queryset = Results.objects.filter(res_year=academic_year)
    if institution_id:
        queryset = queryset.filter(res_institution_id=institution_id)
    
    results = []
    for field, name in COMPETENCY_NAMES.items():
        avg = queryset.aggregate(avg=Avg(field))['avg']
        if avg is not None:
            results.append({'competency': name, 'avg_score': round(float(avg), 2)})
    return results


def get_university_rating(
    academic_year: str,
    top_n: int = 5
) -> List[Dict[str, Union[str, float, int]]]:
    """Рейтинг вузов по среднему баллу (сводный отчёт)."""
    queryset = (
        Results.objects
        .filter(res_year=academic_year)
        .exclude(res_summary_report__isnull=True)
        .exclude(res_summary_report='')
        .select_related('res_institution')
        .values('res_institution__inst_name')
        .annotate(
            avg_score=Avg(_cast_summary_report()),
            count=Count('res_id')
        )
        .order_by('-avg_score')[:top_n]
    )
    return [
        {
            'university': item['res_institution__inst_name'] or 'Не указано',
            'avg_score': round(float(item['avg_score']), 2) if item['avg_score'] else 0.0,
            'count': item['count']
        }
        for item in queryset
    ]


def get_participant_dynamics(
    participant_id: int,
    metric: str = 'res_comp_info_analysis'
) -> List[Dict[str, Union[str, Optional[int]]]]:
    """Динамика баллов участника по годам."""
    queryset = (
        Results.objects
        .filter(res_participant_id=participant_id)
        .exclude(**{f"{metric}__isnull": True})
        .order_by('res_year')
    )
    return [
        {'year': item.res_year, 'score': int(getattr(item, metric)) if getattr(item, metric) else None}
        for item in queryset
    ]


def get_top_participants(
    academic_year: str,
    top_n: int = 10
) -> List[Dict[str, Union[int, str, float]]]:
    """Топ-N участников по сумме баллов компетенций."""
    queryset = Results.objects.filter(res_year=academic_year)
    
    # Суммируем все 12 компетенций (исправляем генератор)
    total_expr = (
        F('res_comp_info_analysis') + F('res_comp_planning') + 
        F('res_comp_result_orientation') + F('res_comp_stress_resistance') +
        F('res_comp_partnership') + F('res_comp_rules_compliance') +
        F('res_comp_self_development') + F('res_comp_leadership') +
        F('res_comp_emotional_intel') + F('res_comp_client_focus') +
        F('res_comp_communication') + F('res_comp_passive_vocab')
    )
    
    queryset = queryset.annotate(
        total_score=Coalesce(total_expr, Value(0))
    ).exclude(total_score=0).order_by('-total_score')[:top_n]
    
    return [
        {
            'participant_id': item.res_participant_id,
            'total_score': float(item.total_score) if item.total_score else 0.0,
            'year': item.res_year
        }
        for item in queryset
    ]


def get_gender_stats_by_specialty(
    academic_year: Optional[str] = None
) -> List[Dict[str, Union[str, int, float]]]:
    """Гендерная статистика по специальностям."""
    queryset = Results.objects.select_related('res_spec', 'res_participant')
    if academic_year:
        queryset = queryset.filter(res_year=academic_year)
    
    queryset = (
        queryset
        .exclude(res_summary_report__isnull=True)
        .exclude(res_summary_report='')
        .values('res_spec__spec_name')
        .annotate(
            male_count=Count('res_id', filter=Q(res_participant__part_gender='М')),
            female_count=Count('res_id', filter=Q(res_participant__part_gender='Ж')),
            avg_score=Avg(_cast_summary_report())
        )
        .order_by('-avg_score')
    )
    return [
        {
            'specialty': item['res_spec__spec_name'] or 'Не указано',
            'male_count': item['male_count'],
            'female_count': item['female_count'],
            'avg_score': round(float(item['avg_score']), 2) if item['avg_score'] else 0.0
        }
        for item in queryset
    ]


def get_course_completion_stats(
    academic_year: Optional[str] = None
) -> List[Dict[str, Union[str, int, float]]]:
    """Статистика прохождения курсов (модель Course)."""
    course_fields = [
        ('course_an_dec', 'Анализ и принятие решений'),
        ('course_client_focus', 'Клиентоориентированность'),
        ('course_communication', 'Коммуникация'),
        ('course_leadership', 'Лидерство'),
        ('course_result_orientation', 'Ориентация на результат'),
        ('course_planning_org', 'Планирование и организация'),
        ('course_rules_culture', 'Культура правил'),
        ('course_self_dev', 'Саморазвитие'),
        ('course_collaboration', 'Сотрудничество'),
        ('course_stress_resistance', 'Стрессоустойчивость'),
    ]
    
    queryset = Course.objects.select_related('course_participant')
    
    results = []
    for field, name in course_fields:
        avg = queryset.aggregate(avg=Avg(field))['avg']
        count = queryset.exclude(**{f"{field}__isnull": True}).count()
        if avg is not None:
            results.append({
                'course_name': name,
                'avg_score': round(float(avg), 2),
                'completed_count': count
            })
    return results


def get_talent_category_stats(
    academic_year: Optional[str] = None
) -> List[Dict[str, Union[str, int, float]]]:
    """Статистика по категориям высокопотенциальных участников."""
    queryset = Results.objects.all()
    if academic_year:
        queryset = queryset.filter(res_year=academic_year)
    
    queryset = (
        queryset
        .exclude(res_summary_report__isnull=True)
        .exclude(res_summary_report='')
        .values('res_high_potential')
        .annotate(
            count=Count('res_id'),
            avg_score=Avg(_cast_summary_report())
        )
        .order_by('-count')
    )
    return [
        {
            'category': item['res_high_potential'] or 'Не указано',
            'count': item['count'],
            'avg_score': round(float(item['avg_score']), 2) if item['avg_score'] else 0.0
        }
        for item in queryset
    ]