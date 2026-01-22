// utilities.js
export const RESULT_PROFILES = {
    competences: {
        key: 'competences',
        title: "Компетенции",
        categories: {
            all_competences: {
                key: 'all_competences',
                title: "Все компетенции",
                fields: [
                    { key: 'res_comp_info_analysis', label: 'Анализ информации' },
                    { key: 'res_comp_planning', label: 'Планирование' },
                    { key: 'res_comp_result_orientation', label: 'Ориентация на результат' },
                    { key: 'res_comp_stress_resistance', label: 'Стрессоустойчивость' },
                    { key: 'res_comp_partnership', label: 'Партнерство' },
                    { key: 'res_comp_rules_compliance', label: 'Соблюдение правил' },
                    { key: 'res_comp_self_development', label: 'Саморазвитие' },
                    { key: 'res_comp_leadership', label: 'Лидерство' },
                    { key: 'res_comp_emotional_intel', label: 'Эмоциональный интеллект' },
                    { key: 'res_comp_client_focus', label: 'Клиентоориентированность' },
                    { key: 'res_comp_communication', label: 'Коммуникация' },
                    { key: 'res_comp_passive_vocab', label: 'Пассивный словарь' }
                ]
            }
        }
    },
    motivators: {
        key: 'motivators',
        title: "Мотиваторы",
        categories: {
            all_motivators: {
                key: 'all_motivators',
                title: "Все мотиваторы",
                fields: [
                    { key: 'res_mot_autonomy', label: 'Автономия' },
                    { key: 'res_mot_altruism', label: 'Альтруизм' },
                    { key: 'res_mot_challenge', label: 'Вызов' },
                    { key: 'res_mot_salary', label: 'Зарплата' },
                    { key: 'res_mot_career', label: 'Карьера' },
                    { key: 'res_mot_creativity', label: 'Креативность' },
                    { key: 'res_mot_relationships', label: 'Отношения' },
                    { key: 'res_mot_recognition', label: 'Признание' },
                    { key: 'res_mot_affiliation', label: 'Принадлежность' },
                    { key: 'res_mot_self_development', label: 'Саморазвитие' },
                    { key: 'res_mot_purpose', label: 'Цель' },
                    { key: 'res_mot_cooperation', label: 'Сотрудничество' },
                    { key: 'res_mot_stability', label: 'Стабильность' },
                    { key: 'res_mot_tradition', label: 'Традиции' },
                    { key: 'res_mot_management', label: 'Управление' },
                    { key: 'res_mot_work_conditions', label: 'Условия работы' }
                ]
            }
        }
    },
    values: {
        key: 'values',
        title: "Ценности",
        categories: {
            all_values: {
                key: 'all_values',
                title: "Все ценности",
                fields: [
                    { key: 'res_val_honesty_justice', label: 'Честность и справедливость' },
                    { key: 'res_val_humanism', label: 'Гуманизм' },
                    { key: 'res_val_patriotism', label: 'Патриотизм' },
                    { key: 'res_val_family', label: 'Семья' },
                    { key: 'res_val_health', label: 'Здоровье' },
                    { key: 'res_val_environment', label: 'Окружающая среда' }
                ]
            }
        }
    }
};

export const FIELD_NAMES = {
    // Основные поля
    'res_year': 'Учебный год',
    'participant': 'Имя участника',
    'part_gender': 'Пол',
    'center': 'Название ЦК',
    'institution': 'Учебное заведение',
    'edu_level': 'Уровень образования',
    'res_course_num': 'Номер курса',
    'study_form': 'Форма обучения',
    'specialty': 'Специальность',
    
    // Компетенции
    'res_comp_info_analysis': 'Анализ информации',
    'res_comp_planning': 'Планирование',
    'res_comp_result_orientation': 'Ориентация на результат',
    'res_comp_stress_resistance': 'Стрессоустойчивость',
    'res_comp_partnership': 'Партнерство',
    'res_comp_rules_compliance': 'Соблюдение правил',
    'res_comp_self_development': 'Саморазвитие',
    'res_comp_leadership': 'Лидерство',
    'res_comp_emotional_intel': 'Эмоциональный интеллект',
    'res_comp_client_focus': 'Клиентоориентированность',
    'res_comp_communication': 'Коммуникация',
    'res_comp_passive_vocab': 'Пассивный словарь',
    
    // Мотиваторы
    'res_mot_autonomy': 'Автономия',
    'res_mot_altruism': 'Альтруизм',
    'res_mot_challenge': 'Вызов',
    'res_mot_salary': 'Зарплата',
    'res_mot_career': 'Карьера',
    'res_mot_creativity': 'Креативность',
    'res_mot_relationships': 'Отношения',
    'res_mot_recognition': 'Признание',
    'res_mot_affiliation': 'Принадлежность',
    'res_mot_self_development': 'Саморазвитие (мотиватор)',
    'res_mot_purpose': 'Цель',
    'res_mot_cooperation': 'Сотрудничество',
    'res_mot_stability': 'Стабильность',
    'res_mot_tradition': 'Традиции',
    'res_mot_management': 'Управление',
    'res_mot_work_conditions': 'Условия работы',
    
    // Ценности
    'res_val_honesty_justice': 'Честность и справедливость',
    'res_val_humanism': 'Гуманизм',
    'res_val_patriotism': 'Патриотизм',
    'res_val_family': 'Семья',
    'res_val_health': 'Здоровье',
    'res_val_environment': 'Окружающая среда'
};

export const CATEGORIES_DESCRIPTIONS = {
    // Компетенции
    res_comp_info_analysis: "Способность анализировать и обрабатывать информацию",
    res_comp_planning: "Умение планировать и организовывать работу",
    res_comp_result_orientation: "Ориентация на достижение результатов",
    res_comp_stress_resistance: "Способность работать в стрессовых ситуациях",
    res_comp_partnership: "Умение выстраивать партнерские отношения",
    res_comp_rules_compliance: "Следование установленным правилам и процедурам",
    res_comp_self_development: "Стремление к саморазвитию и обучению",
    res_comp_leadership: "Лидерские качества и способность вести за собой",
    res_comp_emotional_intel: "Эмоциональный интеллект и понимание эмоций",
    res_comp_client_focus: "Ориентация на потребности клиента",
    res_comp_communication: "Коммуникативные навыки",
    res_comp_passive_vocab: "Пассивный словарный запас",
    
    // Мотиваторы
    res_mot_autonomy: "Стремление к самостоятельности и независимости в работе",
    res_mot_altruism: "Желание помогать другим и приносить пользу обществу",
    res_mot_challenge: "Стремление к сложным задачам и вызовам",
    res_mot_salary: "Материальное вознаграждение как основной мотиватор",
    res_mot_career: "Карьерный рост и профессиональное развитие",
    res_mot_creativity: "Возможность проявлять креативность и творчество",
    res_mot_relationships: "Важность хороших отношений в коллективе",
    res_mot_recognition: "Признание достижений и заслуг",
    res_mot_affiliation: "Чувство принадлежности к группе или организации",
    res_mot_self_development: "Возможность для саморазвития и обучения",
    res_mot_purpose: "Осмысленность работы и ее социальная значимость",
    res_mot_cooperation: "Сотрудничество и командная работа",
    res_mot_stability: "Стабильность и предсказуемость работы",
    res_mot_tradition: "Следование традициям и устоявшимся нормам",
    res_mot_management: "Стремление к управленческой деятельности",
    res_mot_work_conditions: "Комфортные условия труда",
    
    // Ценности
    res_val_honesty_justice: "Честность и справедливость как основные жизненные принципы",
    res_val_humanism: "Гуманизм и уважение к человеческому достоинству",
    res_val_patriotism: "Патриотизм и любовь к Родине",
    res_val_family: "Семейные ценности и традиции",
    res_val_health: "Здоровый образ жизни и забота о здоровье",
    res_val_environment: "Забота об окружающей среде и экологии"
};

// Получение описания по ключу компетенции
export function getCompetencyDescription(competencyKey) {
  return CATEGORIES_DESCRIPTIONS[competencyKey] || null;
}

/** Получить доступные профили на основе данных */
export function getAvailableProfiles(data) {
    if (!data) return [];

    const availableProfiles = [];

    Object.values(RESULT_PROFILES).forEach(profile => {
        const hasData = Object.values(profile.categories).some(category => {
            return category.fields.some(field =>
                data.some(yearData => yearData[field.key] !== null && yearData[field.key] !== undefined)
            );
        });
        
        if (hasData) {
            availableProfiles.push(profile);
        }
    });

    return availableProfiles;
}

/** Получить доступные категории внутри профиля */
export function getAvailableCategories(data, profileKey) {
    if (!data) return [];

    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return [];

    const availableCategories = [];

    Object.values(profile.categories).forEach(category => {
        const hasData = data.some(yearData => {
            return category.fields.some(field =>
                yearData[field.key] !== null && yearData[field.key] !== undefined
            );
        });
        
        if (hasData) {
            availableCategories.push(category);
        }
    });

    return availableCategories;
}

/** Получить данные категории */
export function getCategoryData(data, profileKey, categoryKey) {
    if (!data) return [];
    
    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return [];

    const category = profile.categories[categoryKey];
    if (!category) return [];

    return category.fields.map(field => {
        const fieldData = {
            label: field.label,
            key: field.key,
            values: []
        };

        data.forEach(yearData => {
            if (yearData[field.key] !== null && yearData[field.key] !== undefined) {
                fieldData.values.push({
                    year: yearData.res_year,
                    value: yearData[field.key]
                });
            }
        });

        return fieldData;
    });
};

/** Получить данные категории для графика */
export function getCategoryDataForChart(data, profileKey, categoryKey) {
    if (!data) return { labels: [], series: [] };
    
    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return { labels: [], series: [] };

    const category = profile.categories[categoryKey];
    if (!category) return { labels: [], series: [] };

    const labels = category.fields.map(field => field.label);
    const allYears = [...new Set(data.map(item => item.res_year))].sort();

    const series = allYears.map(year => {
        const yearData = data.find(item => item.res_year === year);
        return {
            name: year.toString(),
            data: category.fields.map(field => 
                yearData && yearData[field.key] !== null ? yearData[field.key] : null
            )
        };
    });

    return { labels, series };
}

/** Подготовить данные для таблицы категории */
export function prepareCategoryTableData(resultsData, profileKey, categoryKey) {
    if (!resultsData?.length) return { tableData: [], years: [] };

    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return { tableData: [], years: [] };

    const category = profile.categories[categoryKey];
    if (!category) return { tableData: [], years: [] };

    const years = [...new Set(resultsData.map(item => item.res_year))].sort();
    
    const tableData = category.fields.map(field => {
        const row = { 
            competency: field.label, 
            competencyKey: field.key 
        };
        
        years.forEach(year => {
            const yearData = resultsData.find(item => item.res_year === year);
            const value = yearData?.[field.key] ?? null;
            row[year] = value !== null ? value : '-';
        });

        return row;
    });

    return { tableData, years };
}

/** Получить данные за последний доступный год для категории */
export function getLastYearCategoryData(resultsData, profileKey, categoryKey) {
    if (!resultsData?.length) return { labels: [], data: [], year: null };

    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return { labels: [], data: [], year: null };

    const category = profile.categories[categoryKey];
    if (!category) return { labels: [], data: [], year: null };

    const yearsWithData = resultsData
        .filter(yearData => 
            category.fields.some(field => 
                yearData[field.key] !== null && yearData[field.key] !== undefined
            )
        )
        .map(yearData => yearData.res_year)
        .sort((a, b) => b - a);

    const lastYear = yearsWithData[0];
    
    if (!lastYear) return { labels: [], data: [], year: null };

    const lastYearData = resultsData.find(item => item.res_year === lastYear);
    
    if (!lastYearData) return { labels: [], data: [], year: null };

    const labels = [];
    const data = [];

    category.fields.forEach(field => {
        const value = lastYearData[field.key];
        if (value !== null && value !== undefined) {
            labels.push(field.label);
            data.push(value);
        }
    });

    return { labels, data, year: lastYear };
}

/** Получить все доступные годы из данных */
export function getAvailableYears(data) {
  if (!data?.length) return [];
  return [...new Set(data.map(item => item.res_year))].sort((a, b) => b - a); // по убыванию
}

/** Получить данные за конкретный год для категории */
export function getCategoryDataForYear(resultsData, profileKey, categoryKey, year) {
    if (!resultsData?.length) return { labels: [], data: [], year: null };

    const profile = RESULT_PROFILES[profileKey];
    if (!profile) return { labels: [], data: [], year: null };

    const category = profile.categories[categoryKey];
    if (!category) return { labels: [], data: [], year: null };

    const yearData = resultsData.find(item => item.res_year === year);
    
    if (!yearData) return { labels: [], data: [], year: null };

    const labels = [];
    const data = [];

    category.fields.forEach(field => {
        const value = yearData[field.key];
        if (value !== null && value !== undefined) {
            labels.push(field.label);
            data.push(value);
        }
    });

    return { labels, data, year };
}
