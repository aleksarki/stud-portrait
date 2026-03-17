-- Удаляем старые таблицы (если они были)
DROP TABLE IF EXISTS StudentMapping CASCADE;
DROP TABLE IF EXISTS Course CASCADE;
DROP TABLE IF EXISTS Results CASCADE;
DROP TABLE IF EXISTS Participants CASCADE;
DROP TABLE IF EXISTS Specialties CASCADE;
DROP TABLE IF EXISTS Institutions CASCADE;
DROP TABLE IF EXISTS CompetenceCenters CASCADE;
DROP TABLE IF EXISTS EducationLevels CASCADE;
DROP TABLE IF EXISTS StudyForms CASCADE;
DROP TABLE IF EXISTS AcademicPerformance CASCADE;

-- Учебное заведение
CREATE TABLE Institutions
(
    inst_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    inst_name  VARCHAR(512)  NOT NULL
);

-- Центр компетенций
CREATE TABLE CompetenceCenters
(
    center_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    center_name  VARCHAR(512)  NOT NULL
);

-- Уровень образования (Бакалавриат, Магистратура, Аспирантура и т.д.)
CREATE TABLE EducationLevels
(
    edu_level_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_level_name  VARCHAR(256)  NOT NULL
);

-- Форма обучения (Очная, Заочная, Очно-заочная)
CREATE TABLE StudyForms
(
    form_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    form_name  VARCHAR(256)  NOT NULL
);

-- Специальность
CREATE TABLE Specialties
(
    spec_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    spec_name  VARCHAR(512)  NOT NULL
);

-- НОВАЯ ТАБЛИЦА: Связь ID РСВ → ФИО студента
CREATE TABLE StudentMapping
(
    mapping_id      INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    rsv_id          VARCHAR(512)  NOT NULL UNIQUE,  -- ID из тестирования РСВ
    student_name    VARCHAR(512)  NOT NULL,         -- Полное ФИО студента
    student_gender  VARCHAR(16),                    -- Пол студента
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по RSV ID
CREATE INDEX idx_student_mapping_rsv_id ON StudentMapping(rsv_id);

-- Участник
CREATE TABLE Participants
(
    part_id           INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    part_rsv_id       VARCHAR(512)  NOT NULL,  -- ID из тестирования РСВ (не ФИО!)
    part_gender       VARCHAR(16),
    part_institution  INT           REFERENCES Institutions(inst_id)         ON DELETE RESTRICT ON UPDATE CASCADE,
    part_spec         INT           REFERENCES Specialties(spec_id)          ON DELETE RESTRICT ON UPDATE CASCADE,
    part_edu_level    INT           REFERENCES EducationLevels(edu_level_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_form         INT           REFERENCES StudyForms(form_id)           ON DELETE RESTRICT ON UPDATE CASCADE,
    part_course_num   INT,
    
    UNIQUE(part_rsv_id)  -- Уникальность по RSV ID
);

-- Индекс для быстрого поиска
CREATE INDEX idx_participants_rsv_id ON Participants(part_rsv_id);

-- Результаты участников
CREATE TABLE Results
(
    res_id              INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    res_participant     INT      NOT NULL REFERENCES Participants(part_id)  ON DELETE CASCADE  ON UPDATE CASCADE,
    res_center          INT      REFERENCES CompetenceCenters(center_id)    ON DELETE RESTRICT ON UPDATE CASCADE,
    res_institution     INT      REFERENCES Institutions(inst_id)           ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_level       INT      REFERENCES EducationLevels(edu_level_id)   ON DELETE RESTRICT ON UPDATE CASCADE,
    res_form            INT      REFERENCES StudyForms(form_id)             ON DELETE RESTRICT ON UPDATE CASCADE,
    res_spec            INT      REFERENCES Specialties(spec_id)            ON DELETE RESTRICT ON UPDATE CASCADE,
    res_course_num      INT,
    res_year            TEXT,
    res_high_potential  TEXT,
    res_summary_report  TEXT,

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
    res_mot_autonomy          DECIMAL(5,2),
    res_mot_altruism          DECIMAL(5,2),
    res_mot_challenge         DECIMAL(5,2),
    res_mot_salary            DECIMAL(5,2),
    res_mot_career            DECIMAL(5,2),
    res_mot_creativity        DECIMAL(5,2),
    res_mot_relationships     DECIMAL(5,2),
    res_mot_recognition       DECIMAL(5,2),
    res_mot_affiliation       DECIMAL(5,2),
    res_mot_self_development  DECIMAL(5,2),
    res_mot_purpose           DECIMAL(5,2),
    res_mot_cooperation       DECIMAL(5,2),
    res_mot_stability         DECIMAL(5,2),
    res_mot_tradition         DECIMAL(5,2),
    res_mot_management        DECIMAL(5,2),
    res_mot_work_conditions   DECIMAL(5,2),

    -- === Ценности ===
    res_val_honesty_justice  INT,
    res_val_humanism         INT,
    res_val_patriotism       INT,
    res_val_family           INT,
    res_val_health           INT,
    res_val_environment      INT,
    
    -- Уникальность: один результат на участника + год + курс
    UNIQUE(res_participant, res_year, res_course_num)
);

-- Результаты участников по курсам
CREATE TABLE Course
(
    course_id           INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    course_participant  INT      NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,

    -- === Курсы (оценки по каждому курсу, от 0.00 до 1.00) ===
    course_an_dec                  DECIMAL(5,2),
    course_client_focus            DECIMAL(5,2),
    course_communication           DECIMAL(5,2),
    course_leadership              DECIMAL(5,2),
    course_result_orientation      DECIMAL(5,2),
    course_planning_org            DECIMAL(5,2),
    course_rules_culture           DECIMAL(5,2),
    course_self_dev                DECIMAL(5,2),
    course_collaboration           DECIMAL(5,2),
    course_stress_resistance       DECIMAL(5,2),
    course_emotions_communication  DECIMAL(5,2),
    course_negotiations            DECIMAL(5,2),
    course_digital_comm            DECIMAL(5,2),
    course_effective_learning      DECIMAL(5,2),
    course_entrepreneurship        DECIMAL(5,2),
    course_creativity_tech         DECIMAL(5,2),
    course_trendwatching           DECIMAL(5,2),
    course_conflict_management     DECIMAL(5,2),
    course_career_management       DECIMAL(5,2),
    course_burnout                 DECIMAL(5,2),
    course_cross_cultural_comm     DECIMAL(5,2),
    course_mentoring               DECIMAL(5,2)
);

-- Итоги успеваемости участников
CREATE TABLE AcademicPerformance
(
    perf_id       INTEGER  PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    perf_part_id  INT      NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,

    perf_year        VARCHAR(9)   NOT NULL,      -- формат "2023/2024"
    perf_discipline  VARCHAR(200) NOT NULL,      -- НОВОЕ: название дисциплины

    perf_current_avg      DECIMAL(5,2),  -- итог текущей успеваемости
    perf_digital_culture  DECIMAL(5,2),  -- цифровая культура

    perf_main_attestation   VARCHAR(16),
    perf_first_retake       VARCHAR(16),
    perf_second_retake      VARCHAR(16),
    perf_high_grade_retake  VARCHAR(16),
    perf_final_grade        VARCHAR(16),

    -- Уникальность: один результат на студента + год + дисциплина
    UNIQUE(perf_part_id, perf_year, perf_discipline),

    -- Ограничение допустимых значений аттестаций
    CONSTRAINT chk_attestation_values CHECK (
        perf_main_attestation IN ('отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился') OR perf_main_attestation IS NULL
    ),
    CONSTRAINT chk_first_retake CHECK (
        perf_first_retake IN ('отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился') OR perf_first_retake IS NULL
    ),
    CONSTRAINT chk_second_retake CHECK (
        perf_second_retake IN ('отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился') OR perf_second_retake IS NULL
    ),
    CONSTRAINT chk_high_grade_retake CHECK (
        perf_high_grade_retake IN ('отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился') OR perf_high_grade_retake IS NULL
    ),
    CONSTRAINT chk_final_grade CHECK (
        perf_final_grade IN ('отл.', 'хор.', 'удовл.', 'неудовл.', 'не явился') OR perf_final_grade IS NULL
    )
);

-- Индекс для быстрого поиска
CREATE INDEX idx_academic_performance_discipline ON AcademicPerformance(perf_discipline);

-- ═══════════════════════════════════════════════════════════
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ УДОБСТВА
-- ═══════════════════════════════════════════════════════════

-- VIEW: Участники с их ФИО
CREATE OR REPLACE VIEW participants_with_names AS
SELECT 
    p.part_id,
    p.part_rsv_id,
    COALESCE(sm.student_name, 'Участник ' || p.part_rsv_id) as student_name,
    p.part_gender,
    p.part_institution,
    p.part_spec,
    p.part_edu_level,
    p.part_form,
    p.part_course_num
FROM Participants p
LEFT JOIN StudentMapping sm ON p.part_rsv_id = sm.rsv_id;

-- VIEW: Результаты с ФИО студентов
CREATE OR REPLACE VIEW results_with_names AS
SELECT 
    r.*,
    COALESCE(sm.student_name, 'Участник ' || p.part_rsv_id) as student_name
FROM Results r
JOIN Participants p ON r.res_participant = p.part_id
LEFT JOIN StudentMapping sm ON p.part_rsv_id = sm.rsv_id;

-- VIEW: Успеваемость с ФИО студентов
CREATE OR REPLACE VIEW academic_performance_with_names AS
SELECT 
    ap.*,
    COALESCE(sm.student_name, 'Участник ' || p.part_rsv_id) as student_name
FROM AcademicPerformance ap
JOIN Participants p ON ap.perf_part_id = p.part_id
LEFT JOIN StudentMapping sm ON p.part_rsv_id = sm.rsv_id;