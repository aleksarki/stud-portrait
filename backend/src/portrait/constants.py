# Constant values for reusing.

class RsvCompetencies:
    """ Tested RSV competencies mapped to their names.
    """
    INFO_ANALYSIS = 'res_comp_info_analysis'
    PLANNING =      'res_comp_planning'
    RESULT_ORIENT = 'res_comp_result_orientation'
    STRESS_RESIST = 'res_comp_stress_resistance'
    PARTNERSHIP =   'res_comp_partnership'
    RULE_COMPLY =   'res_comp_rules_compliance'
    SELF_DEVELOP =  'res_comp_self_development'
    LEADERSHIP =    'res_comp_leadership'
    EMOTE_INTEL =   'res_comp_emotional_intel'
    CLIENT_FOCUS =  'res_comp_client_focus'
    COMMUNICATION = 'res_comp_communication'
    PASSIVE_VOCAB = 'res_comp_passive_vocab'

    names = {
        INFO_ANALYSIS: "Анализ информации",
        PLANNING:      "Планирование",
        RESULT_ORIENT: "Ориентация на результат",
        STRESS_RESIST: "Стрессоустойчивость",
        PARTNERSHIP:   "Партнёрство",
        RULE_COMPLY:   "Соблюдение правил",
        SELF_DEVELOP:  "Саморазвитие",
        LEADERSHIP:    "Лидерство",
        EMOTE_INTEL:   "Эмоциональный интеллект",
        CLIENT_FOCUS:  "Клиентоориентированность",
        COMMUNICATION: "Коммуникация",
        PASSIVE_VOCAB: "Пассивный словарный запас"
    }


class RsvMotivators:
    """ Tested RSV motivators mapped to their names.
    """
    AUTONOMY =     'res_mot_autonomy'
    ALTRUISM =     'res_mot_altruism'
    CHALLENGE =    'res_mot_challenge'
    SALARY =       'res_mot_salary'
    CAREER =       'res_mot_career'
    CREATIVITY =   'res_mot_creativity'
    RELATION =     'res_mot_relationships'
    RECOGNITION =  'res_mot_recognition'
    AFFILIATION =  'res_mot_affiliation'
    SELF_DEVELOP = 'res_mot_self_development'
    PURPOSE =      'res_mot_purpose'
    COOPERATION =  'res_mot_cooperation'
    STABILITY =    'res_mot_stability'
    TRADITION =    'res_mot_tradition'
    MARAGEMENT =   'res_mot_management'
    WORK_CONDIT =  'res_mot_work_conditions'

    names = {
        AUTONOMY :     "Автономия",
        ALTRUISM :     "Альтруизм",
        CHALLENGE :    "Вызов",
        SALARY :       "Зарплата",
        CAREER :       "Карьера",
        CREATIVITY :   "Креативность",
        RELATION :     "Отношения",
        RECOGNITION :  "Признание",
        AFFILIATION :  "Принадлежность",
        SELF_DEVELOP : "Саморазвитие",
        PURPOSE :      "Цель",
        COOPERATION :  "Сотрудничество",
        STABILITY :    "Стабильность",
        TRADITION :    "Традиции",
        MARAGEMENT :   "Управление",
        WORK_CONDIT :  "Условия работы"
    }


class RsvValues:
    """ Tested RSV values mapped to their names.
    """
    HONEST_JUST = 'res_val_honesty_justice'
    HUMANISM =    'res_val_humanism'
    PATRIOTISM =  'res_val_patriotism'
    FAMILY =      'res_val_family'
    HEALTH =      'res_val_health'
    ENVIRONMENT = 'res_val_environment'

    names = {
        HONEST_JUST : "Честность и справедливость",
        HUMANISM :    "Гуманизм",
        PATRIOTISM :  "Патриотизм",
        FAMILY :      "Семья",
        HEALTH :      "Здоровье",
        ENVIRONMENT : "Окружающая среда"
    }


class RsvCourses:
    """ RSV courses mapped to their names.
    """
    DATA_ANALYSIS =   'course_an_dec'
    CLIENT_FOCUS =    'course_client_focus'
    COMMUNICATION =   'course_communication'
    LEADERSHIP =      'course_leadership'
    RESULT_ORIENT =   'course_result_orientation'
    PLANNING_ORG =    'course_planning_org'
    RULES_CULTURE =   'course_rules_culture'
    SELF_DEVELOP =    'course_self_dev'
    COLLABORATION =   'course_collaboration'
    STRESS_RESIST =   'course_stress_resistance'
    EMOTE_COMMUNIC =  'course_emotions_communication'
    NEGOTIATIONS =    'course_negotiations'
    DIGIT_COMMUNIC =  'course_digital_comm'
    EFFECT_LEARN =    'course_effective_learning'
    ENTREPRENEUR =    'course_entrepreneurship'
    CREATIVE_TECH =   'course_creativity_tech'
    TREND_WATCHING =  'course_trendwatching'
    CONFLICT_MANAGE = 'course_conflict_management'
    CAREER_MANAGE =   'course_career_management'
    EMOTE_BURNOUT =   'course_burnout'
    CULTUR_COMMUNIC = 'course_cross_cultural_comm'
    MENTORING =       'course_mentoring'

    names = {
        DATA_ANALYSIS:   "Анализ информации для принятия решений",
        CLIENT_FOCUS:    "Клиентоориентированность",
        COMMUNICATION:   "Коммуникативная грамотность",
        LEADERSHIP:      "Лидерство:основы",
        RESULT_ORIENT:   "Ориентация на результат",
        PLANNING_ORG:    "Планирование и организаия",
        RULES_CULTURE:   "Роль культуры правил в стабилизации процессов в организации",
        SELF_DEVELOP:    "Саморазвитие на основе жизненных целей",
        COLLABORATION:   "Сотрудничество в профессиональной среде",
        STRESS_RESIST:   "Стрессоустойчивость в современном мире",
        EMOTE_COMMUNIC:  "Эмоции и коммуникация",
        NEGOTIATIONS:    "Искусство деловых переговоров",
        DIGIT_COMMUNIC:  "Коммуникация в цифровой среде",
        EFFECT_LEARN:    "Навыки эффективного обучения",
        ENTREPRENEUR:    "Предпринимательское мышление",
        CREATIVE_TECH:   "Технологии развития креативности и инновационного мышления",
        TREND_WATCHING:  "Трендвотчинг: работа с трендами",
        CONFLICT_MANAGE: "Управление конфликтами",
        CAREER_MANAGE:   "Управляй своей карьерой",
        EMOTE_BURNOUT:   "Эмоциональное выгорание",
        CULTUR_COMMUNIC: "Эффективные межкультурные коммуникации",
        MENTORING:       "Я — наставник"
    }


class TableResults:
    """ Columns of Results database table.
    """
    ID =          'res_id'
    PARTICIPANT = 'res_participant'
    CENTER =      'res_center'
    INSTITUTION = 'res_institution'
    EDU_LEVEL =   'res_edu_level'
    EDU_FORM =    'res_form'
    EDU_SPEC =    'res_spec'
    COURSE_NUM =  'res_course_num'
    YEAR =        'res_year'
    POTENTIAL =   'res_high_potential'
    REPORT =      'res_summary_report'


class TableParticipants:
    """ Columns of Participants database table.
    """
    ID =          'part_id'
    RSV_ID =      'part_rsv_id'
    GENDER =      'part_gender'
    INSTITUTION = 'part_institution'
    EDU_SPEC =    'part_spec'
    EDU_LEVEL =   'part_edu_level'
    EDU_FORM =    'part_form'
    COURSE_NUM =  'part_course_num'


CENTERS_REGIONS = {
    "Без привязки к ЦК":                                                                                  None,
    "ЦК Алтайского государственного педагогического университета":                                        "Алтайский край",
    "ЦК Алтайского государственного университета (АлтГУ)":                                                "Алтайский край",
    "ЦК Астраханского государственного технического университета (АГТУ)":                                 "Астраханская область",
    "ЦК Балтийского государственного технического университета «ВОЕНМЕХ» им. Д.Ф. Устинова":              "Санкт-Петербург",
    "ЦК Балтийского федерального университета им. И. Канта (БФУ)":                                        "Калининградская область",
    "ЦК Вятского государственного университета (ВятГУ)":                                                  "Кировская область",
    "ЦК Государственного университета управления (ГУУ)":                                                  "Москва",
    "ЦК Дальневосточного федерального университета (ДВФУ)":                                               "Приморский край",
    "ЦК Забайкальского государственного университета (ЗабГУ)":                                            "Забайкальский край",
    "ЦК Казанского государственного института культуры (КазГИК)":                                         "Татарстан",
    "ЦК Кубанского государственного технологического университета (КубГТУ)":                              "Краснодарский край",
    "ЦК Мелитопольского государственного университета (МГУ)":                                             "Запорожская область",
    "ЦК Московского городского педагогического университета (МГПУ)":                                      "Москва",
    "ЦК Московского государственного института культуры (МГИК)":                                          "Московская область",
    "ЦК Московского государственного психолого-педагогического университета":                             "Москва",
    "ЦК НАРК":                                                                                            "Москва",
    "ЦК Национального исследовательского университета «Московский институт электронной техники» (МИЭТ)":  "Москва",
    "ЦК Национального исследовательского ядерного университета \"МИФИ\" (НИЯУ МИФИ)":                     "Москва",
    "ЦК Нижегородского государственного университета им. Н.И. Лобачевского (ННГУ)":                       "Нижегородская область",
    "ЦК Новосибирского государственного университета экономики и управления  «НИНХ» (НГУЭУ)":             "Новосибирская область",
    "ЦК Омского государственного педагогического университета":                                           "Омская область",
    "ЦК Омского государственного технического университета (ОмГТУ)":                                      "Омская область",
    "ЦК Оренбургской области":                                                                            "Оренбургская область",
    "ЦК Первого Московского государственного медицинского университета имени И.М. Сеченова":              "Москва",
    "ЦК Псковского государственного университета (ПсковГУ)":                                              "Псковская область",
    "ЦК РАНХиГС":                                                                                         "Москва",
    "ЦК Ресурс России (РАНХиГС)":                                                                         "Москва",
    "ЦК Российского государственного аграрного университета им. К.А.Тимирязева (МСХА)":                   "Москва",
    "ЦК Российского государственного геологоразведочного университета имени Серго Орджоникидзе (МГРИ)":   "Москва",
    "ЦК Российского государственного социального университета (РГСУ)":                                    "Москва",
    "ЦК Российского государственного университета нефти и газа им. И.М. Губкина (РГУНГ)":                 "Москва",
    "ЦК Российского университета дружбы народов (РУДН)":                                                  "Москва",
    "ЦК Самарского государственного университета путей сообщения (СамГУПС)":                              "Самарская область",
    "ЦК Самарского государственного экономического университета (СГЭУ)":                                  "Самарская область",
    "ЦК Санкт-Петербургского политехнического университета Петра Великого (СПбПУ)":                       "Санкт-Петербург",
    "ЦК Саратовского государственного медицинского университета имени В.И. Разумовского":                 "Саратовская область",
    "ЦК Северо-Восточного государственного университета (СВГУ)":                                          "Магаданская область",
    "ЦК сельскохозяйственной отрасли (КубГАУ)":                                                           "Краснодарский край",
    "ЦК Сибирского государственного медицинского университета (СибГМУ)":                                  "Томская область",
    "ЦК Сибирского федерального университета (СФУ)":                                                      "Красноярский край",
    "ЦК Сибирской пожарно-спасательной академии ГПС МЧС России (СибПСА)":                                 "Красноярский край",
    "ЦК строительной отрасли на базе Московского государственного строительного университета (НИУ МГСУ)": "Москва",
    "ЦК Сургутского государственного педагогического университета (СурГПУ)":                              "Тюменская область",
    "ЦК Тамбовского государственного технического университета (ТГТУ)":                                   "Тамбовская область",
    "ЦК Технологического университета МИСИС":                                                             "Москва",
    "ЦК Томского государственного университета (ТГУ)":                                                    "Томская область",
    "ЦК Томского государственного университета систем управления и радиоэлектроники (ТУСУР)":             "Томская область",
    "ЦК Тюменской области":                                                                               "Тюменская область",
    "ЦК Уральского государственного медицинского университета МЗ РФ (УГМУ)":                              "Свердловская область",
    "ЦК Уральского государственного педагогического университета (УрГПУ)":                                "Свердловская область",
    "ЦК Уральского государственного экономического университета (УрГЭУ)":                                 "Свердловская область",
    "ЦК Уральского федерального университета имени первого Президента России Б.Н. Ельцина (УрФУ)":        "Свердловская область",
    "ЦК Уфимского государственного нефтяного технического университета":                                  "Башкортостан",
    "ЦК Финансового университета при Правительстве Российской Федерации":                                 "Москва",
    "ЦК Югорского государственного университета (ЮГУ)":                                                   "Ханты-Мансийский автономный округ - Югра",
    "ЦК Южного федерального университета (ЮФУ)":                                                          "Ростовская область",
    "ЦК Южно-Уральского государственного университета (ЮУрГУ)":                                           "Челябинская область",
}
