/*
DROP TABLE IF EXISTS Results;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Programs;
DROP TABLE IF EXISTS Institutions;

-- Учебное заведение
CREATE TABLE Institutions
(
    inst_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    inst_name  VARCHAR(512)  NOT NULL
);

-- Направление
CREATE TABLE Programs
(
    prog_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    prog_name  VARCHAR(512)  NOT NULL
);

-- Студент
CREATE TABLE Students
(
    stud_id           INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    stud_name         VARCHAR(512)  NOT NULL,
    stud_enter_year   INT           NOT NULL,
    stud_program      INTEGER       NOT NULL REFERENCES Programs(prog_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    stud_institution  INTEGER       NOT NULL REFERENCES Institutions(inst_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Результат
CREATE TABLE Results
(
    res_id    INTEGER    PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    res_stud  INTEGER    NOT NULL REFERENCES Students(stud_id) ON DELETE CASCADE ON UPDATE CASCADE,
    res_year  INT        NOT NULL,
    -- Универсальный личностный опросник (Индивидуальный профиль)
    -- КОМПЕТЕНТНОСТНЫЙ
    res_uni_communication     INT, -- Коммуникативность
    res_uni_complex_thinking  INT, -- Комплексное мышление
    res_uni_command_work      INT, -- Работа в команде
    res_uni_methodicalness    INT, -- Методичность
    res_uni_stress_susceptib  INT, -- Подверженность стрессу
    res_uni_ambitousness      INT, -- Амбициозность
    res_uni_rules_compliance  INT, -- Следование правилам
    -- Мотивационно-ценностный профиль (Мотивационный профиль)
    -- МОТИВАЦИОННЫЙ
    res_mot_purpose           INT, -- Смысл
    res_mot_cooperation       INT, -- Сотрудничество
    res_mot_creativity        INT, -- Креативность
    res_mot_challenge         INT, -- Вызов
    res_mot_autonomy          INT, -- Автономия
    res_mot_self_development  INT, -- Саморазвитие
    res_mot_recognition       INT, -- Признание
    res_mot_career            INT, -- Карьера
    res_mot_management        INT, -- Управление
    res_mot_altruism          INT, -- Альтруизм
    res_mot_relationships     INT, -- Отношения
    res_mot_affiliation       INT, -- Принадлежность
    res_mot_tradition         INT, -- Традиция
    res_mot_health            INT, -- Здоровье
    res_mot_stability         INT, -- Стабильность
    res_mot_salary            INT, -- Заработок
    -- Компетенции
    -- КОМПЕТЕНТНОСТНЫЙ
    res_comp_digital_analysis  INT, -- Анализ числовой информации
    res_comp_verbal_analysis   INT, -- Анализ вербальной информации
    -- Жизнестойкость
    -- КОМПЕТЕНТНОСТНЫЙ
    res_vita_positive_self_attit  INT, -- Положительное отношение к себе
    res_vita_attit_twrd_future    INT, -- Отношение к будущему
    res_vita_organization         INT, -- Организованность
    res_vita_persistence          INT, -- Настойчивость
    -- Ценостные установки лидера
    -- ЦЕННОСТНЫЙ
    res_lead_awareness         INT, -- Осознанность
    res_lead_proactivity       INT, -- Проактивность
    res_lead_command_work      INT, -- Работа с командой
    res_lead_control           INT, -- Контроль
    res_lead_social_responsib  INT, -- Социальная ответственность
    -- Индивидуальный профиль
    -- КОМПЕТЕНТНОСТНЫЙ
    res_prof_information_analysis  INT, -- Анализ информации
    res_prof_result_orientation    INT, -- Ориентация на результат
    res_prof_planning              INT, -- Планирование
    res_prof_stress_resistance     INT, -- Стрессоустойчивость
    res_prof_partnership           INT, -- Партнёрство
    res_prof_rules_compliance      INT, -- Следование правилам
    res_prof_self_development      INT, -- Саморазвитие
    res_prof_communication         INT, -- Коммуникация
    -- Ценностные ориентации
    -- ЦЕННОСТНЫЙ
    res_val_honesty_justice  INT, -- Честность и справедливость
    res_val_humanism         INT, -- Гуманизм
    res_val_patriotism       INT, -- Патриотизм
    res_val_family           INT, -- Семейные ценности
    res_val_health           INT, -- Здоровый образ жизни
    res_val_environment      INT  -- Сохранение природы
);
*/

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
