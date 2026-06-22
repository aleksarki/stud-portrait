// disciplineCompetencyMap.js
//
// ОБНОВЛЁННАЯ ВЕРСИЯ:
// Вместо хардкоженного маппинга загружает данные из API (из БД, куда парсер
// записал результат). Хранит кеш в памяти — загружается один раз за сессию.
//
// Публичный API модуля остался прежним:
//   disciplineAffectsCompetency(disciplineName, competencyKey) → bool
//   filterCompetenciesForDiscipline(disciplineName, competencies) → array
//   loadDisciplineMap() → Promise  (вызовите один раз при старте приложения)

import { getParseCurriculumMappings } from "./api";

// ─── Внутренний кеш ──────────────────────────────────────────────────────────
// { 'Название дисциплины': Set(['res_comp_leadership', …]), … }
let _map = null;
let _loadPromise = null;

// ─── Резервный статический маппинг ───────────────────────────────────────────
// Используется, если БД пуста (парсер ещё не запускался).
const FALLBACK_MAP = {
    'Проектно-исследовательская работа': new Set([
        'res_comp_info_analysis',
        'res_comp_communication',
        'res_comp_leadership',
        'res_comp_partnership',
        'res_comp_planning',
    ]),
    'Управление проектами': new Set([
        'res_comp_communication',
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_partnership',
        'res_comp_planning',
        'res_comp_rules_compliance',
        'res_comp_stress_resistance',
    ]),
    'Эксплуатационная практика': new Set([
        'res_comp_info_analysis',
        'res_comp_communication',
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_partnership',
        'res_comp_planning',
        'res_comp_rules_compliance',
    ]),
    'Преддипломная практика': new Set([
        'res_comp_info_analysis',
        'res_comp_communication',
        'res_comp_leadership',
        'res_comp_result_orientation',
        'res_comp_partnership',
        'res_comp_planning',
        'res_comp_rules_compliance',
    ]),
};

// ─── Загрузка из API ─────────────────────────────────────────────────────────

/**
 * Загружает маппинги из БД и кеширует их.
 * Вызывайте при старте приложения (в App.jsx или аналогичном месте).
 * Повторные вызовы возвращают тот же Promise (идемпотентны).
 */
export function loadDisciplineMap() {
    if (_map !== null) return Promise.resolve(_map);
    if (_loadPromise)  return _loadPromise;

    _loadPromise = new Promise((resolve) => {
        getParseCurriculumMappings()
            .onSuccess(async (r) => {
                const data = await r.json();
                if (data.status === "success" && data.mappings?.length > 0) {
                    _map = {};
                    for (const m of data.mappings) {
                        _map[m.discipline] = new Set(m.rsv_competencies);
                    }
                } else {
                    // БД пустая — используем резервный маппинг
                    _map = FALLBACK_MAP;
                }
                resolve(_map);
            })
            .onError(() => {
                // Сеть недоступна — используем резервный маппинг
                _map = FALLBACK_MAP;
                resolve(_map);
            });
    });

    return _loadPromise;
}

/**
 * Принудительно сбрасывает кеш.
 * Полезно вызывать после успешного запуска парсера.
 */
export function invalidateDisciplineMap() {
    _map = null;
    _loadPromise = null;
}

// ─── Публичные утилиты (синхронные, используют кеш) ─────────────────────────

function _getMap() {
    // Синхронное получение кеша. Если loadDisciplineMap() ещё не завершился,
    // возвращаем null — вызывающий код должен учитывать это.
    return _map;
}

/**
 * Возвращает true, если дисциплина может влиять на указанную компетенцию.
 *
 * @param {string} disciplineName - точное название дисциплины
 * @param {string} competencyKey  - ключ компетенции (res_comp_*)
 */
export function disciplineAffectsCompetency(disciplineName, competencyKey) {
    const map = _getMap();
    if (!map) return true;  // кеш не готов — показываем всё
    const set = map[disciplineName];
    if (!set) return true;  // неизвестная дисциплина — не скрываем
    return set.has(competencyKey);
}

/**
 * Фильтрует список компетенций, оставляя только связанные с дисциплиной.
 *
 * @param {string} disciplineName
 * @param {Array<{key: string}|string>} competencies
 */
export function filterCompetenciesForDiscipline(disciplineName, competencies) {
    const map = _getMap();
    if (!map) return competencies;
    const set = map[disciplineName];
    if (!set) return competencies;
    return competencies.filter(c => set.has(c.key ?? c));
}