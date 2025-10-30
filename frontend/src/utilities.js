// utilities.js
export const RESULT_PROFILES = {
    competencies: {
        key: 'competencies',
        title: "Компетентностный профиль",
        categories: {
            universal: {
                key: 'universal',
                title: "Универсальный личностный опросник",
                fields: [
                    { key: 'res_uni_communication', label: 'Коммуникативность' },
                    { key: 'res_uni_complex_thinking', label: 'Комплексное мышление' },
                    { key: 'res_uni_command_work', label: 'Работа в команде' },
                    { key: 'res_uni_methodicalness', label: 'Методичность' },
                    { key: 'res_uni_stress_susceptib', label: 'Подверженность стрессу' },
                    { key: 'res_uni_ambitousness', label: 'Амбициозность' },
                    { key: 'res_uni_rules_compliance', label: 'Следование правилам' }
                ]
            },
            competence: {
                key: 'competence',
                title: "Компетенции",
                fields: [
                    { key: 'res_comp_digital_analysis', label: 'Анализ числовой информации' },
                    { key: 'res_comp_verbal_analysis', label: 'Анализ вербальной информации' }
                ]
            },
            vitality: {
                key: 'vitality',
                title: "Жизнестойкость",
                fields: [
                    { key: 'res_vita_positive_self_attit', label: 'Положительное отношение к себе' },
                    { key: 'res_vita_attit_twrd_future', label: 'Отношение к будущему' },
                    { key: 'res_vita_organization', label: 'Организованность' },
                    { key: 'res_vita_persistence', label: 'Настойчивость' }
                ]
            },
            profile: {
                key: 'profile',
                title: "Индивидуальный профиль",
                fields: [
                    { key: 'res_prof_information_analysis', label: 'Анализ информации' },
                    { key: 'res_prof_result_orientation', label: 'Ориентация на результат' },
                    { key: 'res_prof_planning', label: 'Планирование' },
                    { key: 'res_prof_stress_resistance', label: 'Стрессоустойчивость' },
                    { key: 'res_prof_partnership', label: 'Партнёрство' },
                    { key: 'res_prof_rules_compliance', label: 'Следование правилам' },
                    { key: 'res_prof_self_development', label: 'Саморазвитие' },
                    { key: 'res_prof_communication', label: 'Коммуникация' }
                ]
            }
        }
    },
    motivation: {
        key: 'motivation',
        title: "Мотивационный профиль",
        categories: {
            motivation: {
                key: 'motivation',
                title: "Мотивационно-ценностный профиль",
                fields: [
                    { key: 'res_mot_purpose', label: 'Смысл' },
                    { key: 'res_mot_cooperation', label: 'Сотрудничество' },
                    { key: 'res_mot_creativity', label: 'Креативность' },
                    { key: 'res_mot_challenge', label: 'Вызов' },
                    { key: 'res_mot_autonomy', label: 'Автономия' },
                    { key: 'res_mot_self_development', label: 'Саморазвитие' },
                    { key: 'res_mot_recognition', label: 'Признание' },
                    { key: 'res_mot_career', label: 'Карьера' },
                    { key: 'res_mot_management', label: 'Управление' },
                    { key: 'res_mot_altruism', label: 'Альтруизм' },
                    { key: 'res_mot_relationships', label: 'Отношения' },
                    { key: 'res_mot_affiliation', label: 'Принадлежность' },
                    { key: 'res_mot_tradition', label: 'Традиция' },
                    { key: 'res_mot_health', label: 'Здоровье' },
                    { key: 'res_mot_stability', label: 'Стабильность' },
                    { key: 'res_mot_salary', label: 'Заработок' }
                ]
            }
        }
    },
    values: {
        key: 'values',
        title: "Ценностный профиль",
        categories: {
            leadership: {
                key: 'leadership',
                title: "Ценностные установки лидера",
                fields: [
                    { key: 'res_lead_awareness', label: 'Осознанность' },
                    { key: 'res_lead_proactivity', label: 'Проактивность' },
                    { key: 'res_lead_command_work', label: 'Работа с командой' },
                    { key: 'res_lead_control', label: 'Контроль' },
                    { key: 'res_lead_social_responsib', label: 'Социальная ответственность' }
                ]
            },
            values: {
                key: 'values',
                title: "Ценностные ориентации",
                fields: [
                    { key: 'res_val_honesty_justice', label: 'Честность и справедливость' },
                    { key: 'res_val_humanism', label: 'Гуманизм' },
                    { key: 'res_val_patriotism', label: 'Патриотизм' },
                    { key: 'res_val_family', label: 'Семейные ценности' },
                    { key: 'res_val_health', label: 'Здоровый образ жизни' },
                    { key: 'res_val_environment', label: 'Сохранение природы' }
                ]
            }
        }
    }
};

export const CATEGORIES_DESCRIPTIONS = {
  // Универсальный личностный опросник
  res_uni_communication: "Стремление к общению и возможность вступать в контакт с разными категориями людей.",
  res_uni_complex_thinking: "Склонность к генерации новых идей и обсуждению сложных концептуальных вопросов.",
  res_uni_command_work: "Предрасположенность помогать другим людям и включаться в решение их проблем.",
  res_uni_methodicalness: "Склонность погружаться в детали работы и следовать заданным срокам.",
  res_uni_stress_susceptib: "Склонность к тревожным переживаниям и способность отключаться от имеющихся трудностей в работе. Низкие и высокие значения по данной шкале могут как положительно, так и отрицательно сказываться на деятельности.",
  res_uni_ambitousness: "Стремление к амбициозным целям, достижению превосходства и первых позиций.",
  res_uni_rules_compliance: "Склонность к действию в соответствии с существующими нормами, регламентами, процедурами и политикой.",
  
  // Мотивационно-ценностный профиль
  res_mot_purpose: "Чувство того, что выполняемая работа важна и ценна для мира и общества.",
  res_mot_cooperation: "Работа в команде, выгодное и комфортное сотрудничество, дополнительная ответственность.",
  res_mot_creativity: "Возможность проявлять креативность.",
  res_mot_challenge: "Задачи, связанные с высоким уровнем сложности, риска и неопределённости, стремление к поиску вызовов.",
  res_mot_autonomy: "Возможность автономии в профессиональной деятельности.",
  res_mot_self_development: "Возможность развиваться.",
  res_mot_recognition: "Высокий статус, профессиональное достижение.",
  res_mot_career: "Перспектива карьерного роста.",
  res_mot_management: "Взятие на себя управленческих функций.",
  res_mot_altruism: "Стремление заботиться о других людях и помогать им расти.",
  res_mot_relationships: "Отношения в коллективе, тёплые отношения с коллегами.",
  res_mot_affiliation: "Возможность разделять групповые ценности и миссию организации.",
  res_mot_tradition: "Принятые в компании нормы и правила.",
  res_mot_health: "Здоровье.",
  res_mot_stability: "Восприятие профессиональных обязанностей как скучной, одинаковой рутины.",
  res_mot_salary: "Материальное благополучие.",
  
  // Компетенции
  res_comp_digital_analysis: "Способность корректно интерпретировать числовую информацию, осуществлять преобразования и расчёты.",
  res_comp_verbal_analysis: "Способность корректно интерпретировать текстовую информацию и анализировать правильность различных утверждений.",
  
  // Жизнестойкость
  res_vita_positive_self_attit: "Положительное восприятие себя помогает справляться с трудностями и контролировать свою жизнь. Жизнестойкие люди воспринимают себя самих позитивно, уверены в себе и своих возможностях.",
  res_vita_attit_twrd_future: "Жизнестойкие люди высказывают более позитивные взгляды на жизнь и демонстрируют ориентацию на достижения, позитивные ожидания относительно своих роста и развития в будущем.",
  res_vita_organization: "Умение планировать им организовывать свои действия связано с психологической адаптивностью и гибкостью. Жизнестойкие люди склонны к системному мышлению, владеют навыками организации, планирования, поддержания установленных (в том числе ими самими) правил.",
  res_vita_persistence: "Нацеленность на достижение результата, доведение дел до конца, выполнение действий, способствующих приближению цели, несмотря на препятствия, трудности и разочарования, — основные условия жизнестойкого развития. Жизнестойкие люди склонны к настойчивости или даже упрямству в достижении поставленных целей.",
  
  // Ценностные установки лидера
  res_lead_awareness: "Осознание собственных ценностей, убеждений и эмоций, которые побуждают к действию. Приверженность своим убеждениям и последовательное действие в соответствии с ними.",
  res_lead_proactivity: "Инвестирование в собственные проекты. Осознание важности своих идей и готовность вкладывать в них силы.",
  res_lead_command_work: "Разделение ответственности и полномочий в команде. Принятие предпочтений сотрудников при распределении задач. Готовность взять на себя ответственность за деятельность группы. Баланс использования различных точек зрения и работа с критикой.",
  res_lead_control: "Готовность направлять действия других, брать на себя ответственность за деятельность группы и контролировать ход событий.",
  res_lead_social_responsib: "Осознание того, что человек ответственно связан с обществом. Участие в общественной деятельности. Вера в важность изменений для создания лучшего мира, а также в то, что у коллектива или у одного человека есть силы для изменения общественного сознания. Поиск путей оптимизации и инициирование изменений.",
  
  // Индивидуальный профиль
  res_prof_information_analysis: null,
  res_prof_result_orientation: null,
  res_prof_planning: null,
  res_prof_stress_resistance: null,
  res_prof_partnership: null,
  res_prof_rules_compliance: null,
  res_prof_self_development: null,
  res_prof_communication: null,
  
  // Ценностные ориентации
  res_val_honesty_justice: "Высокие нравственные идеалы, приоритет духовного над материальным, справедливость.",
  res_val_humanism: "Взаимопомощь и взаимоуважение между людьми, высокая ценность человеческой жизни и милосердие, поддержание достоинства, прав и свобод всех людей.",
  res_val_patriotism: "Служение Отечеству, гражданское участие в жизни своей страны и поддержание единства народов России.",
  res_val_family: "Поддержание крепкой и устойчивой семьи как коллектива, преемственность поколений внутри семьи.",
  res_val_health: "Забота о своём здоровье, в разрезе психического и физического (физиологического) благополучия и развитие человеческого потенциала.",
  res_val_environment: "Бережное отношение к окружающей среде и принятие ответственности за сохранение природы."
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
        const values = years.map((year, index) => {
            const yearData = resultsData.find(item => item.res_year === year);
            const value = yearData?.[field.key] ?? null;
            
            let change = null;
            let changePercent = null;
            
            if (value !== null && index > 0) {
                const prevYearData = resultsData.find(item => item.res_year === years[index - 1]);
                const prevValue = prevYearData?.[field.key];
                if (prevValue !== null && prevValue !== undefined) {
                    change = value - prevValue;
                    changePercent = ((change / prevValue) * 100).toFixed(1);
                }
            }

            return { year, value, change, changePercent };
        });

        return {
            competency: field.label,
            competencyKey: field.key,
            values
        };
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
