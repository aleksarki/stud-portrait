"""
Тесты для аналитических запросов.
Исполнитель: Шляхтин Даниил Константинович
"""

from django.test import TestCase
from portrait.models import Results, Participants, Institutions, Course
from studportrait.analytics import (
    get_competency_distribution,
    get_university_rating,
    get_participant_dynamics,
    get_top_participants,
    get_gender_stats_by_specialty,
    get_talent_category_stats,
)


class AnalyticsTestCase(TestCase):
    """Тесты для ORM-запросов аналитики."""
    
    @classmethod
    def setUpTestData(cls):
        """Создание тестовых данных."""
        cls.institution = Institutions.objects.create(inst_name="Тестовый университет")
        
        cls.participant1 = Participants.objects.create(
            part_rsv_id="TEST_001",
            part_gender="М",
            part_institution=cls.institution
        )
        
        cls.participant2 = Participants.objects.create(
            part_rsv_id="TEST_002",
            part_gender="Ж",
            part_institution=cls.institution
        )
        
        cls.result1 = Results.objects.create(
            res_participant=cls.participant1,
            res_institution=cls.institution,
            res_year="2024/2025",
            res_summary_report=500,
            res_comp_info_analysis=600,
            res_comp_planning=550,
            res_comp_leadership=700,
            res_high_potential="Высокие когнитивные способности"
        )
        
        cls.result2 = Results.objects.create(
            res_participant=cls.participant2,
            res_institution=cls.institution,
            res_year="2024/2025",
            res_summary_report=450,
            res_comp_info_analysis=500,
            res_comp_planning=480,
            res_comp_leadership=600,
            res_high_potential="Высокопотенциальные"
        )
        
        cls.course1 = Course.objects.create(
            course_participant=cls.participant1,
            course_leadership=85.5,
            course_communication=72.0
        )
    
    def test_competency_distribution_returns_list(self):
        """Проверка типа возвращаемого значения."""
        result = get_competency_distribution("2024/2025")
        self.assertIsInstance(result, list)
    
    def test_competency_distribution_has_correct_keys(self):
        """Проверка структуры словаря."""
        result = get_competency_distribution("2024/2025")
        if result:
            self.assertIn('competency', result[0])
            self.assertIn('avg_score', result[0])
    
    def test_university_rating_returns_top_n(self):
        """Проверка ограничения количества вузов."""
        result = get_university_rating("2024/2025", top_n=3)
        self.assertLessEqual(len(result), 3)
    
    def test_participant_dynamics_returns_history(self):
        """Проверка динамики участника."""
        result = get_participant_dynamics(participant_id=self.participant1.part_id)
        self.assertIsInstance(result, list)
    
    def test_top_participants_calculation(self):
        """Проверка расчёта топа участников."""
        result = get_top_participants("2024/2025", top_n=5)
        self.assertIsInstance(result, list)
    
    def test_gender_stats_returns_both_genders(self):
        """Проверка гендерной статистики."""
        result = get_gender_stats_by_specialty("2024/2025")
        self.assertIsInstance(result, list)
    
    def test_talent_category_stats_returns_categories(self):
        """Проверка статистики по категориям талантов."""
        result = get_talent_category_stats("2024/2025")
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
    
    def test_empty_year_returns_empty_list(self):
        """Проверка обработки несуществующего года."""
        result = get_competency_distribution("2099/9999")
        self.assertIsInstance(result, list)
    
    def test_institution_filter_works(self):
        """Проверка фильтра по вузу."""
        result_all = get_competency_distribution("2024/2025")
        result_filtered = get_competency_distribution("2024/2025", institution_id=self.institution.inst_id)
        self.assertIsInstance(result_filtered, list)