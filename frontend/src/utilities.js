
export const RESULT_CATEGORIES = {
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
};

export function getAvailableCategories(data) {
    if (!data) return [];

    const availableCats = [];

    Object.values(RESULT_CATEGORIES).forEach(category => {
        const hasData = data.some(yearData => {
            return category.fields.some(field =>
                yearData[field.key] !== null && yearData[field.key] !== undefined
            );
        });
        
        if (hasData) {
            availableCats.push(category);
        }
    });

    return availableCats;
}

export function getCategoryData(data, categoryKey) {
    if (!data) return [];
    
    const category = RESULT_CATEGORIES[categoryKey];
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
