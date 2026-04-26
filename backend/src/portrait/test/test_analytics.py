"""
Тесты для аналитических функций.
Запуск: python manage.py test portrait.tests.test_analytics
"""

from django.test import TestCase
from django.db import transaction
from portrait.models import Results, Participants, Institutions, EducationLevels
from portrait.analytics import CompetencyAnalytics
from portrait.constants import RsvCompetencies


class CompetencyAnalyticsTest(TestCase):
    """Тесты для CompetencyAnalytics."""

    @classmethod
    def setUpTestData(cls):
      # 1. Создаём вузы
      cls.inst1 = Institutions.objects.create(inst_name="ВУЗ №1")
      cls.inst2 = Institutions.objects.create(inst_name="ВУЗ №2")
      
      # 2. Уровень образования
      cls.edu_level = EducationLevels.objects.create(edu_level_name="Бакалавриат")
      
      # 3. Участники
      cls.part1 = Participants.objects.create(
          part_rsv_id="RSV001",
          part_gender="м",
          part_institution=cls.inst1,
          part_edu_level=cls.edu_level
      )
      cls.part2 = Participants.objects.create(
          part_rsv_id="RSV002",
          part_gender="ж",
          part_institution=cls.inst2,
          part_edu_level=cls.edu_level
      )
      
      # 4. Результаты (✅ ВАЖНО: явно указываем res_institution!)
      cls.results_2023 = Results.objects.create(
          res_participant=cls.part1,
          res_institution=cls.inst1,  # <-- привязка к ВУЗ №1
          res_year="2023",
          res_comp_info_analysis=70,
          res_comp_planning=65,
          res_comp_result_orientation=80,
      )
      cls.results_2024 = Results.objects.create(
          res_participant=cls.part1,
          res_institution=cls.inst1,  # <-- привязка к ВУЗ №1
          res_year="2024",
          res_comp_info_analysis=85,
          res_comp_planning=70,
          res_comp_result_orientation=75,
      )
      
      # Результаты для второго участника (чтобы демография увидела ВУЗ №2)
      Results.objects.create(
          res_participant=cls.part2,
          res_institution=cls.inst2,  # <-- привязка к ВУЗ №2
          res_year="2023",
          res_comp_info_analysis=60,
          res_comp_planning=55,
          res_comp_result_orientation=70,
      )

    def test_competency_growth_positive(self):
        """Тест прироста компетенций с положительными изменениями."""
        result = CompetencyAnalytics.get_competency_growth(
            rsv_id="RSV001",
            period_before="2023",
            period_after="2024",
            competencies=[RsvCompetencies.INFO_ANALYSIS]
        )
        
        self.assertNotIn("error", result)
        comp_data = result["competencies"]["Анализ информации"]
        self.assertEqual(comp_data["before"], 70)
        self.assertEqual(comp_data["after"], 85)
        self.assertEqual(comp_data["growth"], 15)
        self.assertAlmostEqual(comp_data["growth_percent"], 21.43, places=2)

    def test_competency_growth_missing_data(self):
        """Тест обработки отсутствия данных за период."""
        result = CompetencyAnalytics.get_competency_growth(
            rsv_id="RSV999",  # Не существует
            period_before="2023",
            period_after="2024"
        )
        self.assertIn("error", result)

    def test_demographic_stats_grouping(self):
        """Тест демографической статистики с группировкой."""
        result = CompetencyAnalytics.get_demographic_stats(
            group_by="institution"
        )
        
        self.assertEqual(result["group_by"], "institution")
        self.assertIsInstance(result["data"], list)
        # Должны быть данные по обоим вузам
        self.assertGreaterEqual(len(result["data"]), 2)

    def test_compare_institutions_ranking(self):
        """Тест сравнения вузов и формирования рейтинга."""
        result = CompetencyAnalytics.compare_institutions(
            institution_ids=[self.inst1.inst_id, self.inst2.inst_id]
        )
        
        self.assertIn("ranking", result)
        self.assertIsInstance(result["ranking"], list)
        # Рейтинг должен быть отсортирован по убыванию
        if len(result["ranking"]) > 1:
            self.assertGreaterEqual(
                result["ranking"][0]["score"],
                result["ranking"][1]["score"]
            )

    def test_data_structure_consistency(self):
        """Тест структуры возвращаемых данных."""
        result = CompetencyAnalytics.get_competency_growth(
            rsv_id="RSV001",
            period_before="2023",
            period_after="2024"
        )
        
        # Проверка обязательных ключей
        required_keys = ["rsv_id", "periods", "competencies", "summary"]
        for key in required_keys:
            self.assertIn(key, result)
        
        # Проверка структуры summary
        summary_keys = ["avg_growth", "positive_changes", "negative_changes"]
        for key in summary_keys:
            self.assertIn(key, result["summary"])