// Карта соответствия дисциплин и компетенций, на которые они реально влияют.
// Используется для фильтрации таблицы "Влияние дисциплин на компетенции":
// дисциплина должна показывать строки только для компетенций из её набора,
// а не для всех компетенций подряд.
//
// Ключи компетенций — это поля результатов (res_comp_*), как в RsvCompetencies
// (constants.py) и как приходят в competencies_before/competencies_after
// из getStudentDisciplineImpact. Использование "сырых" ключей вместо
// отображаемых названий избегает несоответствий из-за разной формулировки
// (например "Лидерство" vs "Лидерство (Контроль)").

export const DISCIPLINE_COMPETENCIES_MAP = {
    'Проектно-исследовательская работа': new Set([
        'res_comp_info_analysis',      // Анализ информации
        'res_comp_communication',      // Коммуникация
        'res_comp_leadership',         // Лидерство
        'res_comp_partnership',        // Партнёрство
        'res_comp_planning'            // Планирование
    ]),
    'Управление проектами': new Set([
        'res_comp_communication',      // Коммуникация
        'res_comp_leadership',         // Лидерство
        'res_comp_result_orientation', // Ориентация на результат
        'res_comp_partnership',        // Партнёрство
        'res_comp_planning',           // Планирование
        'res_comp_rules_compliance',   // Соблюдение правил
        'res_comp_stress_resistance'   // Стрессоустойчивость
    ]),
    'Эксплуатационная практика': new Set([
        'res_comp_info_analysis',      // Анализ информации
        'res_comp_communication',      // Коммуникация
        'res_comp_leadership',         // Лидерство
        'res_comp_result_orientation', // Ориентация на результат
        'res_comp_partnership',        // Партнёрство
        'res_comp_planning',           // Планирование
        'res_comp_rules_compliance'    // Соблюдение правил
    ]),
    'Преддипломная практика': new Set([
        'res_comp_info_analysis',      // Анализ информации
        'res_comp_communication',      // Коммуникация
        'res_comp_leadership',         // Лидерство
        'res_comp_result_orientation', // Ориентация на результат
        'res_comp_partnership',        // Партнёрство
        'res_comp_planning',           // Планирование
        'res_comp_rules_compliance'    // Соблюдение правил
    ])
};

/**
 * Возвращает true, если дисциплина может влиять на указанную компетенцию.
 *
 * @param disciplineName - название дисциплины (item.discipline)
 * @param competencyKey  - "сырой" ключ компетенции (res_comp_*),
 *                         т.е. ключ из competencies_before/after, БЕЗ перевода в отображаемое имя
 *
 * Для дисциплин, отсутствующих в карте, по умолчанию возвращает true
 * (чтобы не скрывать данные по неизвестным дисциплинам без явного решения).
 */
export function disciplineAffectsCompetency(disciplineName, competencyKey) {
    const set = DISCIPLINE_COMPETENCIES_MAP[disciplineName];
    if (!set) return true;
    return set.has(competencyKey);
}

/**
 * Фильтрует список компетенций (объекты с полем key или строки-ключи),
 * оставляя только те, на которые данная дисциплина реально влияет.
 */
export function filterCompetenciesForDiscipline(disciplineName, competencies) {
    const set = DISCIPLINE_COMPETENCIES_MAP[disciplineName];
    if (!set) return competencies;
    return competencies.filter(c => set.has(c.key ?? c));
}