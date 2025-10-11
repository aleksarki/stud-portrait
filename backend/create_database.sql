
CREATE TABLE Students
(
    stud_id    INTEGER       PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    stud_name  VARCHAR(512)  NOT NULL
);

CREATE TABLE Result
(
    res_id    INTEGER    PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    res_stud  INTEGER    NOT NULL REFERENCES Students(stud_id) ON DELETE CASCADE ON UPDATE CASCADE,
    res_date  TIMESTAMP  NOT NULL,
    -- Универсальный личностный опросник (Индивидуальный профиль)
    res_uni_communication     INT, -- Коммуникативность
    res_uni_complex_thinking  INT, -- Комплексное мышление
    res_uni_command_work      INT, -- Работа в команде
    res_uni_methodicalness    INT, -- Методичность
    res_uni_stress_susceptib  INT, -- Подверженность стрессу
    res_uni_ambitousness      INT, -- Амбициозность
    res_uni_rules_compliance  INT, -- Следование правилам
    -- Мотивационно-ценностный профиль (Мотивационный профиль)
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
    res_comp_digital_analysis  INT, -- Анализ числовой информации
    res_comp_verbal_analysis   INT, -- Анализ вербальной информации
    -- Жизнестойкость
    res_vita_positive_self_attit  INT, -- Положительное отношение к себе
    res_vita_attit_twrd_future    INT, -- Отношение к будущему
    res_vita_organization         INT, -- Организованность
    res_vita_persistence          INT, -- Настойчивость
    -- Ценостные установки лидера
    res_lead_awareness         INT, -- Осознанность
    res_lead_proactivity       INT, -- Проактивность
    res_lead_command_work      INT, -- Работа с командой
    res_lead_control           INT, -- Контроль
    res_lead_social_responsib  INT, -- Социальная ответственность
    -- Индивидуальный профиль
    res_prof_information_analysis  INT, -- Анализ информации
    res_prof_result_orientation    INT, -- Ориентация на результат
    res_prof_planning              INT, -- Планирование
    res_prof_stress_resistance     INT, -- Стрессоустойчивость
    res_prof_partnership           INT, -- Партнёрство
    res_prof_rules_compliance      INT, -- Следование правилам
    res_prof_self_development      INT  -- Саморазвитие
);
