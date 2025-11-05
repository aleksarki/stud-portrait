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
DROP TABLE IF EXISTS ParticipantCourses;
DROP TABLE IF EXISTS Courses;
DROP TABLE IF EXISTS Results;
DROP TABLE IF EXISTS Participants;
DROP TABLE IF EXISTS Specialties;
DROP TABLE IF EXISTS Institutions;
DROP TABLE IF EXISTS CompetenceCenters;
DROP TABLE IF EXISTS EducationLevels;
DROP TABLE IF EXISTS StudyForms;

-- Учебное заведение
CREATE TABLE Institutions
(
    inst_id    SERIAL PRIMARY KEY,
    inst_name  VARCHAR(512)
);

-- Центр компетенций
CREATE TABLE CompetenceCenters
(
    center_id   SERIAL PRIMARY KEY,
    center_name VARCHAR(512) NOT NULL
);

-- Уровень образования
CREATE TABLE EducationLevels
(
    edu_level_id   SERIAL PRIMARY KEY,
    edu_level_name VARCHAR(256)
);

-- Форма обучения
CREATE TABLE StudyForms
(
    form_id   SERIAL PRIMARY KEY,
    form_name VARCHAR(256)
);

-- Специальность
CREATE TABLE Specialties
(
    spec_id    SERIAL PRIMARY KEY,
    spec_name  VARCHAR(512)
);

-- Участник
CREATE TABLE Participants
(
    part_id           SERIAL PRIMARY KEY,
    part_name         VARCHAR(512) NOT NULL,
    part_gender       VARCHAR(16),
    part_institution  INT REFERENCES Institutions(inst_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_spec         INT REFERENCES Specialties(spec_id)  ON DELETE RESTRICT ON UPDATE CASCADE,
    part_edu_level    INT REFERENCES EducationLevels(edu_level_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_form         INT REFERENCES StudyForms(form_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    part_course_num   INT
);

-- Образовательные курсы
CREATE TABLE Courses
(
    course_id    SERIAL PRIMARY KEY,
    course_name  VARCHAR(512) NOT NULL,
);

-- Результаты участников
CREATE TABLE Results
(
    res_id             SERIAL PRIMARY KEY,
    res_participant    INT NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE ON UPDATE CASCADE,
    res_center         INT NOT NULL REFERENCES CompetenceCenters(center_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_institution    INT REFERENCES Institutions(inst_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_edu_level      INT REFERENCES EducationLevels(edu_level_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_form           INT REFERENCES StudyForms(form_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_spec           INT REFERENCES Specialties(spec_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    res_course_num     INT,
    res_year           INT NOT NULL,
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
    res_mot_autonomy             INT,
    res_mot_altruism             INT,
    res_mot_challenge            INT,
    res_mot_salary               INT,
    res_mot_career               INT,
    res_mot_creativity           INT,
    res_mot_relationships        INT,
    res_mot_recognition          INT,
    res_mot_affiliation          INT,
    res_mot_self_development     INT,
    res_mot_purpose              INT,
    res_mot_cooperation          INT,
    res_mot_stability            INT,
    res_mot_tradition            INT,
    res_mot_management           INT,
    res_mot_work_conditions      INT,

    -- === Ценности ===
    res_val_honesty_justice      INT,
    res_val_humanism             INT,
    res_val_patriotism           INT,
    res_val_family               INT,
    res_val_health               INT,
    res_val_environment          INT
);

-- Связь многие-ко-многим между участниками и курсами с фиксацией результатов
CREATE TABLE ParticipantCourses
(
    pc_id           SERIAL PRIMARY KEY,
    pc_participant  INT NOT NULL REFERENCES Participants(part_id) ON DELETE CASCADE,
    pc_course       INT REFERENCES Courses(course_id) ON DELETE CASCADE,
    pc_result       INT REFERENCES Results(res_id) ON DELETE SET NULL,
    UNIQUE (pc_participant, pc_course)
);