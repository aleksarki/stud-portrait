
-- Удаляем старые таблицы (если они были)
DROP TABLE IF EXISTS ParticipantCourses CASCADE;
DROP TABLE IF EXISTS Course CASCADE;
DROP TABLE IF EXISTS Results CASCADE;
DROP TABLE IF EXISTS Participants CASCADE;
DROP TABLE IF EXISTS Specialties CASCADE;
DROP TABLE IF EXISTS Institutions CASCADE;
DROP TABLE IF EXISTS CompetenceCenters CASCADE;
DROP TABLE IF EXISTS EducationLevels CASCADE;
DROP TABLE IF EXISTS StudyForms CASCADE;

-- Учебное заведение
CREATE TABLE Institutions
(
    inst_id    INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    inst_name  VARCHAR(512) NOT NULL
);

-- Центр компетенций
CREATE TABLE CompetenceCenters
(
    center_id   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    center_name VARCHAR(512) NOT NULL
);

-- Уровень образования
CREATE TABLE EducationLevels
(
    edu_level_id   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_level_name VARCHAR(256) NOT NULL  -- Бакалавриат, Магистратура, Аспирантура и т.д.
);

-- Форма обучения
CREATE TABLE StudyForms
(
    form_id   INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    form_name VARCHAR(256) NOT NULL       -- Очная, Заочная, Очно-заочная
);

-- Специальность
CREATE TABLE Specialties
(
    spec_id    INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    spec_name  VARCHAR(512) NOT NULL
);

-- Участник
CREATE TABLE Participants
(
    part_id           INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    part_name         VARCHAR(512) NOT NULL,
    part_gender       VARCHAR(16),
    part_institution  INT REFERENCES Institutions(inst_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_spec         INT REFERENCES Specialties(spec_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    part_edu_level    INT REFERENCES EducationLevels(edu_level_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_form         INT REFERENCES StudyForms(form_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_course_num   INT
);

-- Результаты участников
CREATE TABLE Results
(
    res_id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    res_participant    INT NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,
    res_center         INT REFERENCES CompetenceCenters(center_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_institution    INT REFERENCES Institutions(inst_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_level      INT REFERENCES EducationLevels(edu_level_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_form           INT REFERENCES StudyForms(form_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_spec           INT REFERENCES Specialties(spec_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_course_num     INT,
    res_year           TEXT,
    res_high_potential TEXT,
    res_summary_report TEXT,

    -- === Профиль компетенций ===
    res_comp_info_analysis       INT,
    res_comp_planning            INT,
    res_comp_result_orientation  INT,
    res_comp_stress_resistance   INT,
    res_comp_partnership         INT,
    res_comp_rules_compliance    INT,
    res_comp_self_development    INT,
    res_comp_leadership          INT,
    res_comp_emotional_intel     INT,
    res_comp_client_focus        INT,
    res_comp_communication       INT,
    res_comp_passive_vocab       INT,

    -- === Мотиваторы ===
    res_mot_autonomy             DECIMAL(5,2),
    res_mot_altruism             DECIMAL(5,2),
    res_mot_challenge            DECIMAL(5,2),
    res_mot_salary               DECIMAL(5,2),
    res_mot_career               DECIMAL(5,2),
    res_mot_creativity           DECIMAL(5,2),
    res_mot_relationships        DECIMAL(5,2),
    res_mot_recognition          DECIMAL(5,2),
    res_mot_affiliation          DECIMAL(5,2),
    res_mot_self_development     DECIMAL(5,2),
    res_mot_purpose              DECIMAL(5,2),
    res_mot_cooperation          DECIMAL(5,2),
    res_mot_stability            DECIMAL(5,2),
    res_mot_tradition            DECIMAL(5,2),
    res_mot_management           DECIMAL(5,2),
    res_mot_work_conditions      DECIMAL(5,2),

    -- === Ценности ===
    res_val_honesty_justice      INT,
    res_val_humanism             INT,
    res_val_patriotism           INT,
    res_val_family               INT,
    res_val_health               INT,
    res_val_environment          INT
);

-- Результаты участников по курсам
CREATE TABLE Course
(
    course_id             INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    course_participant    INT NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- === Курсы (оценки по каждому курсу, от 0.00 до 1.00) ===
    course_an_dec                      DECIMAL(5,2),  -- Анализ информации для принятия решений
    course_client_focus                DECIMAL(5,2),  -- Клиентоориентированность
    course_communication               DECIMAL(5,2),  -- Коммуникативная грамотность
    course_leadership                  DECIMAL(5,2),  -- Лидерство: основы
    course_result_orientation          DECIMAL(5,2),  -- Ориентация на результат
    course_planning_org                DECIMAL(5,2),  -- Планирование и организация
    course_rules_culture               DECIMAL(5,2),  -- Роль культуры правил...
    course_self_dev                    DECIMAL(5,2),  -- Саморазвитие
    course_collaboration               DECIMAL(5,2),  -- Сотрудничество
    course_stress_resistance           DECIMAL(5,2),  -- Стрессоустойчивость
    course_emotions_communication      DECIMAL(5,2),  -- Эмоции и коммуникация
    course_negotiations                DECIMAL(5,2),  -- Искусство деловых переговоров
    course_digital_comm                DECIMAL(5,2),  -- Коммуникация в цифровой среде
    course_effective_learning          DECIMAL(5,2),  -- Навыки эффективного обучения
    course_entrepreneurship            DECIMAL(5,2),  -- Предпринимательское мышление
    course_creativity_tech             DECIMAL(5,2),  -- Технологии креативности
    course_trendwatching               DECIMAL(5,2),  -- Трендвотчинг
    course_conflict_management         DECIMAL(5,2),  -- Управление конфликтами
    course_career_management           DECIMAL(5,2),  -- Управляй своей карьерой
    course_burnout                     DECIMAL(5,2),  -- Эмоциональное выгорание
    course_cross_cultural_comm         DECIMAL(5,2),  -- Межкультурные коммуникации
    course_mentoring                   DECIMAL(5,2)   -- Я — наставник
);
