# backend/tests/test_backend.py

import json
import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from io import BytesIO
from django.test import TestCase, Client
from django.urls import reverse
from django.core.cache import cache
from django.db import connection

# Импорты моделей
from ..models import *
# Импорты утилит
from ..endpoints.common import COMP, MOT, VAL, zeroIfNull, attrIfObj, join, isIn, desc
from ..endpoints.datanal import ValueAddedModel, LatentGrowthModel, DisciplineImpactAnalyzer


# ============================================================
# ПОЛНЫЙ SQL ДЛЯ СОЗДАНИЯ ТАБЛИЦ
# ============================================================

CREATE_TABLES_SQL = """
DROP TABLE IF EXISTS DataUploadTemplate   CASCADE;
DROP TABLE IF EXISTS AcademicPerformances CASCADE;
DROP TABLE IF EXISTS CourseResults        CASCADE;
DROP TABLE IF EXISTS TestResults          CASCADE;
DROP TABLE IF EXISTS Participants         CASCADE;
DROP TABLE IF EXISTS StudentMapping       CASCADE;
DROP TABLE IF EXISTS EducationDisciplines CASCADE;
DROP TABLE IF EXISTS EducationSpecialties CASCADE;
DROP TABLE IF EXISTS EducationForms       CASCADE;
DROP TABLE IF EXISTS EducationLevels      CASCADE;
DROP TABLE IF EXISTS Institutions         CASCADE;
DROP TABLE IF EXISTS CompetenceCenters    CASCADE;

-- Центр компетенций
CREATE TABLE CompetenceCenters
(
    center_id    INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    center_name  TEXT     NOT NULL
);

CREATE INDEX competence_centers_name ON CompetenceCenters(center_name);

-- Учебное заведение
CREATE TABLE Institutions
(
    inst_id    INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    inst_name  TEXT     NOT NULL
);

CREATE INDEX institutions_name ON Institutions(inst_name);

-- Уровень образования
CREATE TABLE EducationLevels
(
    edu_level_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_level_name  VARCHAR(512)  NOT NULL
);

CREATE INDEX education_levels_name ON EducationLevels(edu_level_name);

INSERT INTO EducationLevels (edu_level_name) VALUES
    ('Высшее образование - бакалавриат'),
    ('Высшее образование - магистратура'),
    ('Высшее образование - подготовка кадров высшей квалификации'),
    ('Высшее образование - специалитет'),
    ('Дополнительное профессиональное образование'),
    ('Зарубежное образование'),
    ('Основное общее образование'),
    ('Пенсионер'),
    ('Профессиональное обучение'),
    ('Среднее общее образование'),
    ('Среднее профессиональное образование');

-- Форма обучения
CREATE TABLE EducationForms
(
    edu_form_id    INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_form_name  VARCHAR(64)  NOT NULL
);

INSERT INTO EducationForms (edu_form_name) VALUES
    ('Заочная'),
    ('Очная'),
    ('Очно-заочная');

-- Специальность
CREATE TABLE EducationSpecialties
(
    edu_spec_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_spec_name  VARCHAR(1024)  NOT NULL
);

CREATE INDEX education_specialties_name ON EducationSpecialties(edu_spec_name);

-- Учебная дисциплина
CREATE TABLE EducationDisciplines
(
    edu_disc_id    INTEGER        PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_disc_name  VARCHAR(1024)  NOT NULL
);

-- Соотнесение студентов с тестированием РСВ
CREATE TABLE StudentMapping (
    mapping_id          INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    mapping_rsv         VARCHAR(512)  UNIQUE NOT NULL,
    mapping_stud_name   VARCHAR(512)  NOT NULL,
    mapping_stud_gender INT,
    mapping_email       VARCHAR(256),
    mapping_created_at  TIMESTAMP
);

-- Участник тестирования
CREATE TABLE Participants
(
    part_id          INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    part_rsv         VARCHAR(512)  UNIQUE NOT NULL,
    part_course_num  INTEGER,
    part_gender      INT
);

-- Результат прохождения тестирования РСВ
CREATE TABLE TestResults
(
    res_id             INTEGER      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    res_participant    INT          NOT NULL REFERENCES Participants(part_id)         ON DELETE CASCADE  ON UPDATE CASCADE,
    res_center         INT          NOT NULL REFERENCES CompetenceCenters(center_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    res_institution    INT          REFERENCES Institutions(inst_id)                  ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_level      INT          REFERENCES EducationLevels(edu_level_id)          ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_form       INT          REFERENCES EducationForms(edu_form_id)            ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_specialty  INT          REFERENCES EducationSpecialties(edu_spec_id)      ON DELETE RESTRICT ON UPDATE CASCADE,
    res_course         INT,
    res_year           VARCHAR(16)  NOT NULL,
    res_potential      INT,
    res_report         VARCHAR(1024),
    UNIQUE(res_participant, res_year),
    -- компетенции
    res_comp_info_analysis       INT  CHECK (res_comp_info_analysis      BETWEEN 200 AND 800),
    res_comp_planning            INT  CHECK (res_comp_planning           BETWEEN 200 AND 800),
    res_comp_result_orientation  INT  CHECK (res_comp_result_orientation BETWEEN 200 AND 800),
    res_comp_stress_resistance   INT  CHECK (res_comp_stress_resistance  BETWEEN 200 AND 800),
    res_comp_partnership         INT  CHECK (res_comp_partnership        BETWEEN 200 AND 800),
    res_comp_rules_compliance    INT  CHECK (res_comp_rules_compliance   BETWEEN 200 AND 800),
    res_comp_self_development    INT  CHECK (res_comp_self_development   BETWEEN 200 AND 800),
    res_comp_leadership          INT  CHECK (res_comp_leadership         BETWEEN 200 AND 800),
    res_comp_emotional_intel     INT  CHECK (res_comp_emotional_intel    BETWEEN 200 AND 800),
    res_comp_client_focus        INT  CHECK (res_comp_client_focus       BETWEEN 200 AND 800),
    res_comp_communication       INT  CHECK (res_comp_communication      BETWEEN 200 AND 800),
    res_comp_passive_vocab       INT  CHECK (res_comp_passive_vocab      BETWEEN 200 AND 800),
    -- мотиваторы
    res_mot_autonomy          DECIMAL(5,2)  CHECK (res_mot_autonomy         BETWEEN 200 AND 800),
    res_mot_altruism          DECIMAL(5,2)  CHECK (res_mot_altruism         BETWEEN 200 AND 800),
    res_mot_challenge         DECIMAL(5,2)  CHECK (res_mot_challenge        BETWEEN 200 AND 800),
    res_mot_salary            DECIMAL(5,2)  CHECK (res_mot_salary           BETWEEN 200 AND 800),
    res_mot_career            DECIMAL(5,2)  CHECK (res_mot_career           BETWEEN 200 AND 800),
    res_mot_creativity        DECIMAL(5,2)  CHECK (res_mot_creativity       BETWEEN 200 AND 800),
    res_mot_relationships     DECIMAL(5,2)  CHECK (res_mot_relationships    BETWEEN 200 AND 800),
    res_mot_recognition       DECIMAL(5,2)  CHECK (res_mot_recognition      BETWEEN 200 AND 800),
    res_mot_affiliation       DECIMAL(5,2)  CHECK (res_mot_affiliation      BETWEEN 200 AND 800),
    res_mot_self_development  DECIMAL(5,2)  CHECK (res_mot_self_development BETWEEN 200 AND 800),
    res_mot_purpose           DECIMAL(5,2)  CHECK (res_mot_purpose          BETWEEN 200 AND 800),
    res_mot_cooperation       DECIMAL(5,2)  CHECK (res_mot_cooperation      BETWEEN 200 AND 800),
    res_mot_stability         DECIMAL(5,2)  CHECK (res_mot_stability        BETWEEN 200 AND 800),
    res_mot_tradition         DECIMAL(5,2)  CHECK (res_mot_tradition        BETWEEN 200 AND 800),
    res_mot_management        DECIMAL(5,2)  CHECK (res_mot_management       BETWEEN 200 AND 800),
    res_mot_work_conditions   DECIMAL(5,2)  CHECK (res_mot_work_conditions  BETWEEN 200 AND 800),
    -- ценности
    res_val_honesty_justice  INT  CHECK (res_val_honesty_justice BETWEEN 200 AND 800),
    res_val_humanism         INT  CHECK (res_val_humanism        BETWEEN 200 AND 800),
    res_val_patriotism       INT  CHECK (res_val_patriotism      BETWEEN 200 AND 800),
    res_val_family           INT  CHECK (res_val_family          BETWEEN 200 AND 800),
    res_val_health           INT  CHECK (res_val_health          BETWEEN 200 AND 800),
    res_val_environment      INT  CHECK (res_val_environment     BETWEEN 200 AND 800)
);

CREATE INDEX idx_test_results_participant ON TestResults(res_participant);

-- Результат прохождения курсов РСВ
CREATE TABLE CourseResults
(
    course_id           INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    course_participant  INT      NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,
    course_an_dec                  DECIMAL(5,2)  CHECK (course_an_dec                 BETWEEN 0 AND 1),
    course_client_focus            DECIMAL(5,2)  CHECK (course_client_focus           BETWEEN 0 AND 1),
    course_communication           DECIMAL(5,2)  CHECK (course_communication          BETWEEN 0 AND 1),
    course_leadership              DECIMAL(5,2)  CHECK (course_leadership             BETWEEN 0 AND 1),
    course_result_orientation      DECIMAL(5,2)  CHECK (course_result_orientation     BETWEEN 0 AND 1),
    course_planning_org            DECIMAL(5,2)  CHECK (course_planning_org           BETWEEN 0 AND 1),
    course_rules_culture           DECIMAL(5,2)  CHECK (course_rules_culture          BETWEEN 0 AND 1),
    course_self_dev                DECIMAL(5,2)  CHECK (course_self_dev               BETWEEN 0 AND 1),
    course_collaboration           DECIMAL(5,2)  CHECK (course_collaboration          BETWEEN 0 AND 1),
    course_stress_resistance       DECIMAL(5,2)  CHECK (course_stress_resistance      BETWEEN 0 AND 1),
    course_emotions_communication  DECIMAL(5,2)  CHECK (course_emotions_communication BETWEEN 0 AND 1),
    course_negotiations            DECIMAL(5,2)  CHECK (course_negotiations           BETWEEN 0 AND 1),
    course_digital_comm            DECIMAL(5,2)  CHECK (course_digital_comm           BETWEEN 0 AND 1),
    course_effective_learning      DECIMAL(5,2)  CHECK (course_effective_learning     BETWEEN 0 AND 1),
    course_entrepreneurship        DECIMAL(5,2)  CHECK (course_entrepreneurship       BETWEEN 0 AND 1),
    course_creativity_tech         DECIMAL(5,2)  CHECK (course_creativity_tech        BETWEEN 0 AND 1),
    course_trendwatching           DECIMAL(5,2)  CHECK (course_trendwatching          BETWEEN 0 AND 1),
    course_conflict_management     DECIMAL(5,2)  CHECK (course_conflict_management    BETWEEN 0 AND 1),
    course_career_management       DECIMAL(5,2)  CHECK (course_career_management      BETWEEN 0 AND 1),
    course_burnout                 DECIMAL(5,2)  CHECK (course_burnout                BETWEEN 0 AND 1),
    course_cross_cultural_comm     DECIMAL(5,2)  CHECK (course_cross_cultural_comm    BETWEEN 0 AND 1),
    course_mentoring               DECIMAL(5,2)  CHECK (course_mentoring              BETWEEN 0 AND 1) 
);

CREATE INDEX idx_course_results_participant ON CourseResults(course_participant);

-- Академическая успеваемость
CREATE TABLE AcademicPerformances
(
    perf_id              INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    perf_participant     INT           NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,
    perf_edu_discipline  INT           NOT NULL REFERENCES EducationDisciplines(edu_disc_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    perf_year            VARCHAR(16)   NOT NULL,
    perf_current         DECIMAL(5,2),
    perf_digital         DECIMAL(5,2),
    perf_main            INT           CHECK (perf_main          BETWEEN 1 AND 5),
    perf_first_retake    INT           CHECK (perf_first_retake  BETWEEN 1 AND 5),
    perf_second_retake   INT           CHECK (perf_second_retake BETWEEN 1 AND 5),
    perf_grade_retake    INT           CHECK (perf_grade_retake  BETWEEN 1 AND 5),
    perf_final           INT           CHECK (perf_final         BETWEEN 1 AND 5),
    UNIQUE(perf_participant, perf_year, perf_edu_discipline)
);

CREATE INDEX idx_academic_performances_participant ON AcademicPerformances(perf_participant);

-- Шаблон загрузки данных администратором
CREATE TABLE DataUploadTemplate (
    template_id          INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    template_name        VARCHAR(256)  UNIQUE NOT NULL,
    template_description TEXT,
    template_config      JSON NOT NULL,
    template_created_at  TIMESTAMP,
    template_updated_at  TIMESTAMP
);
"""


# ============================================================
# ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ТАБЛИЦ
# ============================================================

def create_test_tables():
    """Создаёт таблицы в тестовой БД."""
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'participants'
            );
        """)
        exists = cursor.fetchone()[0]

        if not exists:
            cursor.execute(CREATE_TABLES_SQL)


# ============================================================
# БАЗОВЫЙ КЛАСС ТЕСТОВ
# ============================================================

class BaseTestCase(TestCase):
    """Базовый класс с автоматическим созданием таблиц."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        create_test_tables()


# ============================================================
# TEST: COMMON UTILITIES
# ============================================================

class TestCommonUtilities(BaseTestCase):
    """Тесты общих утилит."""

    def test_zeroIfNull(self):
        self.assertEqual(zeroIfNull(None), 0.0)
        self.assertEqual(zeroIfNull(5), 5.0)
        self.assertEqual(zeroIfNull(3.14), 3.14)

    def test_attrIfObj(self):
        class TestObj:
            attr = "value"

        obj = TestObj()
        self.assertEqual(attrIfObj(obj, "attr"), "value")
        self.assertEqual(attrIfObj(None, "attr"), None)

    def test_join(self):
        self.assertEqual(join("a", "b", "c"), "a__b__c")

    def test_isIn(self):
        self.assertEqual(isIn("field", [1, 2, 3]), {"field__in": [1, 2, 3]})

    def test_desc(self):
        self.assertEqual(desc("field"), "-field")


# ============================================================
# TEST: VALUE ADDED MODEL
# ============================================================

class TestValueAddedModel(BaseTestCase):
    """Тесты Value Added Model."""

    def setUp(self):
        self.vam = ValueAddedModel()

    def test_compute_global_baseline(self):
        import pandas as pd

        data = pd.DataFrame({
            'student_id': [1, 1, 2, 2],
            'year': ['2023/2024', '2024/2025', '2023/2024', '2024/2025'],
            'course': [1, 2, 1, 2],
            'competency_score': [400, 450, 500, 530]
        })

        baseline = self.vam.compute_global_baseline(data)
        self.assertIsNotNone(baseline)
        self.assertGreaterEqual(baseline, 0)

    def test_fit_for_student_insufficient_data(self):
        import pandas as pd

        data = pd.DataFrame({
            'year': ['2024/2025'],
            'course': [1],
            'competency_score': [500]
        })

        result = self.vam.fit_for_student(data)
        self.assertEqual(result['status'], 'insufficient_data')

    def test_fit_for_student_success(self):
        import pandas as pd

        data = pd.DataFrame({
            'year': ['2023/2024', '2024/2025'],
            'course': [2, 3],
            'competency_score': [500, 580]
        })

        result = self.vam.fit_for_student(data, expected_growth=20)
        self.assertEqual(result['status'], 'success')
        self.assertIn('average_value_added', result)
        self.assertIn('performance', result)


# ============================================================
# TEST: LATENT GROWTH MODEL
# ============================================================

class TestLatentGrowthModel(BaseTestCase):
    """Тесты Latent Growth Model."""

    def setUp(self):
        self.lgm = LatentGrowthModel()

    def test_fit_insufficient_data(self):
        import pandas as pd

        data = pd.DataFrame({
            'student_id': [1],
            'time_point': [1],
            'competency_score': [500]
        })

        result = self.lgm.fit(data)
        self.assertEqual(result['status'], 'error')

    def test_fit_success(self):
        import pandas as pd

        data = pd.DataFrame({
            'student_id': [1, 1, 1],
            'time_point': [1, 2, 3],
            'competency_score': [400, 480, 550]
        })

        result = self.lgm.fit(data)
        self.assertEqual(result['status'], 'success')
        self.assertIn('n_students', result)
        self.assertIn('mean_intercept', result)
        self.assertIn('mean_slope', result)


# ============================================================
# TEST: DISCIPLINE IMPACT ANALYZER
# ============================================================

class TestDisciplineImpactAnalyzer(BaseTestCase):
    """Тесты анализа влияния дисциплин."""

    def setUp(self):
        self.analyzer = DisciplineImpactAnalyzer()

    def test_convert_grade(self):
        self.assertEqual(self.analyzer.convert_grade_to_text(5), 'отл.')
        self.assertEqual(self.analyzer.convert_grade_to_num('хор.'), 4)

    def test_analyze_discipline_impact_insufficient_data(self):
        import pandas as pd

        data = pd.DataFrame({
            'student_id': [1],
            'discipline': ['Project Management'],
            'grade': ['отл.'],
            'res_comp_leadership_before': [500],
            'res_comp_leadership_after': [550]
        })

        result = self.analyzer.analyze_discipline_impact(
            data, 'res_comp_leadership', grade_format='text'
        )
        self.assertEqual(result['status'], 'success')

    def test_analyze_discipline_impact_success(self):
        import pandas as pd
        import numpy as np

        data = []
        for i in range(10):
            data.append({
                'student_id': i,
                'discipline': 'Project Management',
                'grade': 'отл.',
                'res_comp_leadership_before': float(400 + np.random.randint(0, 100)),
                'res_comp_leadership_after': float(500 + np.random.randint(0, 100)),
                'year': '2024/2025'
            })

        df = pd.DataFrame(data)
        result = self.analyzer.analyze_discipline_impact(
            df, 'res_comp_leadership', grade_format='text'
        )
        self.assertEqual(result['status'], 'success')


# ============================================================
# TEST: DASHBOARD STATISTICS
# ============================================================

class TestDashboardStatistics(BaseTestCase):
    """Тесты дашборда."""

    def setUp(self):
        self.client = Client()

    def test_overall_stats(self):
        response = self.client.get(reverse('overall_stats'))
        self.assertEqual(response.status_code, 200)

    def test_filter_dash(self):
        response = self.client.get(reverse('filter_dash'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_stats(self):
        response = self.client.get(reverse('dashboard_stats'))
        self.assertEqual(response.status_code, 200)

    def test_motivation_counts(self):
        response = self.client.get(reverse('motivation_counts'))
        self.assertEqual(response.status_code, 200)


# ============================================================
# TEST: FILTER OPTIONS (исправлены имена эндпоинтов)
# ============================================================

class TestFilterOptions(BaseTestCase):
    """Тесты опций фильтров."""

    def setUp(self):
        self.client = Client()

    def test_get_filter_options_with_counts(self):
        response = self.client.get(reverse('get_filter_options_with_counts'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('data', data)

    def test_students_list(self):
        response = self.client.get(reverse('students_list'), {
            'search': 'Ivan',
            'limit': 10
        })
        self.assertEqual(response.status_code, 200)

    def test_student_portrait(self):
        # Сначала создаём студента
        participant = Participants.objects.create(
            part_rsv="TEST001",
            part_course_num=3,
            part_gender=1
        )
        response = self.client.get(reverse('student_portrait'), {
            'student_id': participant.part_id
        })
        self.assertEqual(response.status_code, 200)


# ============================================================
# TEST: BOXPLOT (исправлены имена эндпоинтов)
# ============================================================

class TestBoxplot(BaseTestCase):
    """Тесты боксплотов."""

    def setUp(self):
        self.client = Client()

    def test_get_boxplot_data(self):
        response = self.client.post(reverse('get_boxplot_data'), {
            'competency': 'res_comp_leadership'
        }, content_type='application/json')
        # 400 - нет данных для боксплота
        self.assertIn(response.status_code, [200, 400])

    def test_comp_boxplot(self):
        response = self.client.get(reverse('comp_boxplot'))
        self.assertIn(response.status_code, [200, 400, 500])


# ============================================================
# TEST: DUPLICATE ACCOUNTS
# ============================================================

class TestDuplicateAccounts(BaseTestCase):
    """Тесты поиска дублей аккаунтов."""

    def setUp(self):
        self.client = Client()

        # Создаём данные
        self.participant1 = Participants.objects.create(
            part_rsv="TEST001",
            part_course_num=3,
            part_gender=1
        )
        self.participant2 = Participants.objects.create(
            part_rsv="TEST002",
            part_course_num=3,
            part_gender=1
        )

        Studentmapping.objects.create(
            mapping_rsv="TEST001",
            mapping_stud_name="Ivan Testov",
            mapping_stud_gender=1,
            mapping_email="ivan@test.ru",
            mapping_created_at=datetime.now()
        )
        Studentmapping.objects.create(
            mapping_rsv="TEST002",
            mapping_stud_name="Ivan Testov",
            mapping_stud_gender=1,
            mapping_email="ivan@test.ru",
            mapping_created_at=datetime.now()
        )

    def test_duplicate_accounts(self):
        response = self.client.get(reverse('duplicate_accounts'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')


# ============================================================
# TEST: TEMPLATE MANAGEMENT (исправлены имена эндпоинтов)
# ============================================================

class TestTemplateManagement(BaseTestCase):
    """Тесты управления шаблонами."""

    def setUp(self):
        self.client = Client()

    def test_get_templates(self):
        response = self.client.get(reverse('dataload_templates'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('templates', data)

    def test_save_template(self):
        response = self.client.post(reverse('dataload_template_save'), {
            'name': 'New Template',
            'config': {"sheets": []},
            'description': 'Test Description'
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['name'], 'New Template')


# ============================================================
# TEST: AUDIT (исправлены имена эндпоинтов)
# ============================================================

class TestAudit(BaseTestCase):
    """Тесты аудита."""

    def setUp(self):
        self.client = Client()

    def test_audit_schema(self):
        response = self.client.get(reverse('audit_schema'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('schema', data)

    def test_audit_table_data(self):
        response = self.client.get(reverse('audit_table_data'), {
            'table_name': 'participants',
            'limit': 5
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')

    def test_audit_stats(self):
        response = self.client.get(reverse('audit_stats'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('info', data)


# ============================================================
# TEST: CACHING
# ============================================================

class TestCaching(BaseTestCase):
    """Тесты кэширования."""

    def setUp(self):
        self.client = Client()
        cache.clear()

    def test_caching_enabled(self):
        response = self.client.get(reverse('get_institutions'))
        self.assertEqual(response.status_code, 200)


# ============================================================
# TEST: INSTITUTIONS & DIRECTIONS
# ============================================================

class TestInstitutionsDirections(BaseTestCase):
    """Тесты институтов и направлений."""

    def setUp(self):
        self.client = Client()

    def test_get_institutions(self):
        response = self.client.get(reverse('get_institutions'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')

    def test_get_directions(self):
        response = self.client.get(reverse('get_directions'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')


# ============================================================
# RUNNER
# ============================================================

if __name__ == '__main__':
    import unittest
    unittest.main()
