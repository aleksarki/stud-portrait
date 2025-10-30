
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
