
export const RESULT_CATEGORIES = {
    universal: {
        key: 'universal',
        title: "Универсальный личностный опросник",
        fields: [
            'res_uni_communication',
            'res_uni_complex_thinking', 
            'res_uni_command_work',
            'res_uni_methodicalness',
            'res_uni_stress_susceptib',
            'res_uni_ambitousness',
            'res_uni_rules_compliance'
        ]
    },
    motivation: {
        key: 'motivation',
        title: "Мотивационно-ценностный профиль",
        fields: [
            'res_mot_purpose',
            'res_mot_cooperation',
            'res_mot_creativity',
            'res_mot_challenge',
            'res_mot_autonomy',
            'res_mot_self_development',
            'res_mot_recognition',
            'res_mot_career',
            'res_mot_management',
            'res_mot_altruism',
            'res_mot_relationships',
            'res_mot_affiliation',
            'res_mot_tradition',
            'res_mot_health',
            'res_mot_stability',
            'res_mot_salary'
        ]
    },
    competence: {
        key: 'competence',
        title: "Компетенции",
        fields: [
            'res_comp_digital_analysis',
            'res_comp_verbal_analysis'
        ]
    },
    vitality: {
        key: 'vitality',
        title: "Жизнестойкость",
        fields: [
            'res_vita_positive_self_attit',
            'res_vita_attit_twrd_future',
            'res_vita_organization',
            'res_vita_persistence'
        ]
    },
    leadership: {
        key: 'leadership',
        title: "Ценностные установки лидера",
        fields: [
            'res_lead_awareness',
            'res_lead_proactivity',
            'res_lead_command_work',
            'res_lead_control',
            'res_lead_social_responsib'
        ]
    },
    profile: {
        key: 'profile',
        title: "Индивидуальный профиль",
        fields: [
            'res_prof_information_analysis',
            'res_prof_result_orientation',
            'res_prof_planning',
            'res_prof_stress_resistance',
            'res_prof_partnership',
            'res_prof_rules_compliance',
            'res_prof_self_development',
            'res_prof_communication'
        ]
    }
};

export function getAvailableCategories(data) {
    const availableCats = [];

    Object.values(RESULT_CATEGORIES).forEach(category => {
        const hasData = data.some(yearData => {
            return category.fields.some(field =>
                yearData[field] !== null && yearData[field] !== undefined
            );
        });
        
        if (hasData) {
            availableCats.push(category);
        }
    });

    return availableCats;
}

