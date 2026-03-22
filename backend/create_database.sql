
DROP TABLE IF EXISTS AcademicPerformances CASCADE;
DROP TABLE IF EXISTS CourseResults        CASCADE;
DROP TABLE IF EXISTS TestResults          CASCADE;
DROP TABLE IF EXISTS Participants         CASCADE;
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

-- Уровень образования (Бакалавриат, Магистратура, Аспирантура и т.д.)
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

-- Форма обучения (Очная, Заочная, Очно-заочная)
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
    edu_spec_name  VARCHAR(512)  NOT NULL
);

CREATE INDEX education_specialties_name ON EducationSpecialties(edu_spec_name);

-- Учебная дисциплина
CREATE TABLE EducationDisciplines
(
    edu_disc_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    edu_disc_name  VARCHAR(512)  NOT NULL
);

-- Участник тестирования
CREATE TABLE Participants
(
    part_id      INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    part_rsv_id  VARCHAR(512)  UNIQUE NOT NULL,  -- ID участника RSV
    part_name    VARCHAR(512),
    part_gender  INT
);

-- CREATE INDEX idx_participants_rsv_id ON Participants(part_rsv_id);

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
    -- курсы
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
    perf_current         DECIMAL(5,2), -- todo: CHECK                              -- итог текущей успеваемости
    perf_digital         DECIMAL(5,2), -- todo: CHECK                              -- цифровая культура ?????
    perf_main            INT           CHECK (perf_main          BETWEEN 1 AND 5),  -- основная аттестация  -- 1 = 'не явился'
    perf_first_retake    INT           CHECK (perf_first_retake  BETWEEN 1 AND 5),  -- первая повторная аттестация
    perf_second_retake   INT           CHECK (perf_second_retake BETWEEN 1 AND 5),  -- вторая повторная аттестация
    perf_grade_retake    INT           CHECK (perf_grade_retake  BETWEEN 1 AND 5),  -- пересдача на повышенную оценку
    perf_final           INT           CHECK (perf_final         BETWEEN 1 AND 5),  -- иоговая оценка
    UNIQUE(perf_participant, perf_year, perf_edu_discipline)
);

CREATE INDEX idx_academic_performances_participant ON AcademicPerformances(perf_participant);
