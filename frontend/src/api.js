/* This module provides convinient way to perform various backend requests. */

/** Chain of functions for performing an API function call. */
class AsyncChain {
    constructor(promise) {
        this.promise = promise;
    }

    onSuccess(fn) {
        this.promise = this.promise.then(fn);
        return this;
    }

    onError(fn) {
        this.promise = this.promise.catch(fn);
        return this;
    }

    finally(fn) {
        this.promise = this.promise.finally(fn);
        return this;
    }
}

class WindowChain {
    constructor(url) {
        this.url = url;
        this.timeoutCallback = null
        this.errorCallback = null;
    }

    onTimeout(fn) {
        this.timeoutCallback = fn;
        return this;
    }

    onError(fn) {
        this.errorCallback = fn;
        return this;
    }

    open() {
        try {
            window.open(this.url, '_blank');
            setTimeout(this.timeoutCallback, 1000);
        } catch (error) {
            this.errorCallback?.();
        }
    }
}

const PROTOCOL = "http";
const HOST = "localhost:8000";

/* *** AUDIT *** */

export function getAuditSchema(tableName = null) {
    const params = new URLSearchParams();
    if (tableName) params.append('table_name', tableName);
    const url = `${PROTOCOL}://${HOST}/portrait/audit/schema/${params.toString() ? `?${params.toString()}` : ''}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

export function getAuditTableData(tableName, limit = 10) {
    const params = new URLSearchParams();
    params.append('table_name', tableName);
    params.append('limit', limit);
    const url = `${PROTOCOL}://${HOST}/portrait/audit/table-data/?${params.toString()}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

export function getAuditStats() {
    const url = `${PROTOCOL}://${HOST}/portrait/audit/stats/`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

export function postAuditExecuteSQL(query) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/audit/execute-sql/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
    });
    return new AsyncChain(promise);
}

/* *** DATALOAD *** */

export function postDataloadImportExcel(file, configJson) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('config_json', JSON.stringify(configJson));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dataload/import-excel/`, {
        method: 'POST',
        body: formData
    });
    return new AsyncChain(promise);
}

// Шаблоны загрузки
export function getDataloadExpectedFields() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dataload/expected-fields/`);
    return new AsyncChain(promise);
}

export function getDataloadTemplates() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dataload/templates/`);
    return new AsyncChain(promise);
}

export function postDataloadTemplateSave(name, config, description = "") {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dataload/template-save/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, config, description })
    });
    return new AsyncChain(promise);
}

export function deleteDataloadTemplateDelete(templateId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dataload/template-delete/${templateId}/`, {
        method: 'DELETE'
    });
    return new AsyncChain(promise);
}

// *** DATASESH *** */
export function postPortraitDataseshNew() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/new/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshExtractData(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/extract-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshUpdateFilters(sessionId, filters) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/update-filters/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            filters: filters
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshUpdateColumns(sessionId, columns) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/update-columns/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            columns: columns
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshUpdateWindow(sessionId, start, end) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/update-window/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            start: start,
            end: end
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshExportSelected(sessionId, selectedIds) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/export-selected/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            selected_ids: selectedIds
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshGroupSelected(sessionId, selectedIds, grouppingColumn) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/group-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session_id: sessionId,
            selected_ids: selectedIds,
            groupping_column: grouppingColumn
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitDataseshCountStats(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/datasesh/count-stats/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
    });
    return new AsyncChain(promise);
}

/* *** statsresult *** */

export function getPortraitCourses() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/courses/`);
    return new AsyncChain(promise);
}

export function getPortraitStudentResults(studentId) {
    const params = new URLSearchParams({ stud_id: studentId });
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/student-results/?${params}`);
    return new AsyncChain(promise);
}

export function getPortraitGetInstitutionDirections(selectedInstitutions) {
    const params = new URLSearchParams();
    selectedInstitutions?.forEach(id => params.append('institution_ids[]', id));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-institution-directions/?${params}`);
    return new AsyncChain(promise);
}

export function getPortraitGetFilterOptionsWithCounts(
    sessionId, selectedInstitutions, selectedDirections, selectedCourses,
    selectedTestAttempts, selectedCompetencies
) {
    const params = new URLSearchParams({ session_id: sessionId });
    selectedInstitutions?.forEach(id => params.append('institution_ids[]', id));
    selectedDirections?.forEach(dir => params.append('directions[]', dir));
    selectedCourses?.forEach(course => params.append('courses[]', course));
    selectedTestAttempts?.forEach(attempts => params.append('test_attempts[]', attempts));
    selectedCompetencies?.forEach(comp => params.append('competencies[]', comp));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-filter-options-with-counts/?${params}`);
    return new AsyncChain(promise);
}

export function getPortraitCentersByRegion(year) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/centers-by-region/?year=${encodeURIComponent(year)}`);
    return new AsyncChain(promise);
}

export function getMotivatorStatistics(filters) {
    const params = new URLSearchParams();
    if (filters.institute) params.append('institute', filters.institute);
    if (filters.specialty) params.append('specialty', filters.specialty);
    if (filters.year) params.append('year', filters.year);
    if (filters.group_by) params.append('group_by', filters.group_by);

    const queryString = params.toString();
    const url = `${PROTOCOL}://${HOST}/portrait/motivator-statistics/${queryString ? `?${queryString}` : ''}`;

    const promise = fetch(url);
    return new AsyncChain(promise);
}

/* ============================================================ */
/*                    АНАЛИТИЧЕСКИЕ ENDPOINTS                   */
/* ============================================================ */

/** GET /portrait/analyze-student-vam/ - VAM для конкретного студента */
export function getAnalyzeStudentVam(studentId, competency = 'res_comp_leadership') {
    const params = new URLSearchParams({ student_id: studentId, competency });
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-student-vam/?${params}`);
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-student-lgm/ - LGM для конкретного студента */
export function getAnalyzeStudentLgm(studentId, competency = 'res_comp_leadership') {
    const params = new URLSearchParams({ student_id: studentId, competency });
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-student-lgm/?${params}`);
    return new AsyncChain(promise);
}

/** POST /portrait/analyze-cohort-lgm/ - LGM для когорты */
export function postAnalyzeCohortLgm(competency, institutionIds = [], directionIds = [], groupBy = 'institution') {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-cohort-lgm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competency,
            institution_ids: institutionIds,
            direction_ids: directionIds,
            group_by: groupBy
        })
    });
    return new AsyncChain(promise);
}

/** POST /portrait/get-lgm-growers/ - Списки быстро- и медленнорастущих студентов для группы */
export function postGetLgmGrowers(competency, groupBy, groupId, institutionIds = [], directionIds = []) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-lgm-growers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competency,
            group_by: groupBy,
            group_id: groupId,
            institution_ids: institutionIds,
            direction_ids: directionIds,
        })
    });
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-all-disciplines-impact/ - Комплексный анализ всех дисциплин */
export function getAnalyzeAllDisciplinesImpact() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-all-disciplines-impact/`);
    return new AsyncChain(promise);
}

/** POST /portrait/analyze-discipline-impact-advanced/ - Продвинутый анализ с фильтрами */
export function postAnalyzeDisciplineImpactAdvanced(
    competencies = ['res_comp_leadership'],
    disciplines = [],
    institutionIds = [],
    directionIds = [],
    minStudents = 5
) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-discipline-impact-advanced/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competencies,
            disciplines,
            institution_ids: institutionIds,
            direction_ids: directionIds,
            min_students: minStudents
        })
    });
    return new AsyncChain(promise);
}

/** POST /portrait/get-discipline-heatmap-data/ - Тепловая карта */
export function postGetDisciplineHeatmapData(institutionIds = [], directionIds = []) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-discipline-heatmap-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            institution_ids: institutionIds,
            direction_ids: directionIds
        })
    });
    return new AsyncChain(promise);
}

/** GET /portrait/get-disciplines/ - список всех дисциплин */
export function getPortraitGetDisciplines() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-disciplines/`);
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-student-discipline-impact/ - влияние дисциплин на студента */
export function getStudentDisciplineImpact(studentId) {
    const params = new URLSearchParams({ student_id: studentId });
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-student-discipline-impact/?${params}`);
    return new AsyncChain(promise);
}

export function postGetCompetencyLevelFlow(competency, institutionIds, directionIds) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-competency-level-flow/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competency,
            institution_ids: institutionIds,
            direction_ids: directionIds
        })
    });
    return new AsyncChain(promise);
}

export function postGetCompetencyLevelFlowYearly(competency, institutionIds, directionIds) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-competency-level-flow-yearly/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competency,
            institution_ids: institutionIds,
            direction_ids: directionIds
        })
    });
    return new AsyncChain(promise);
}

export function postGetVamTrendData(body) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-vam-trend-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return new AsyncChain(promise);
}

export function postAiAnalyticsSummary(contextType, filters) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/ai-analytics-summary/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            context_type: contextType,
            filters: filters
        })
    });
    return new AsyncChain(promise);
}

export function getEducationProfilesComparison(filters) {
    const params = new URLSearchParams();
    if (filters.specialties && filters.specialties.length) {
        params.append('specialties', filters.specialties.join(','));
    }
    if (filters.year) params.append('year', filters.year);
    if (filters.include_motivators !== undefined) {
        params.append('include_motivators', filters.include_motivators);
    }
    if (filters.include_values !== undefined) {
        params.append('include_values', filters.include_values);
    }

    const url = `${PROTOCOL}://${HOST}/portrait/education-profiles-comparison/${params.toString() ? `?${params.toString()}` : ''}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-transfers/ - сводный анализ переводов */
export function getAnalyzeTransfers(queryString = '') {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-transfers/${queryString ? '?' + queryString : ''}`);
    return new AsyncChain(promise);
}

/** POST /portrait/analyze-transfer-students/ - детальный список студентов с переводами */
export function postAnalyzeTransferStudents(body) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-transfer-students/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return new AsyncChain(promise);
}

/** GET /portrait/get-institutions/ - список вузов */
export function getInstitutions() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-institutions/`);
    return new AsyncChain(promise);
}

export function getStudentComparisonStats(studentId, year) {
    const params = new URLSearchParams();
    params.append('student_id', studentId);
    if (year) params.append('year', year);

    const url = `${PROTOCOL}://${HOST}/portrait/student-comparison-stats/?${params.toString()}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

export function getFilterDash(institute) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/filter-dash/?${params}`);
    return new AsyncChain(promise);
}

export function getScoresResult(institute, specialty, year) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/scores-result/?${params}`);
    return new AsyncChain(promise);
}

export function getDataBoxplot(institute, specialty, year) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/comp-boxplot/?${params}`);
    return new AsyncChain(promise);
}

export function getDashboardStats(institute, specialty, year) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/dashboard-stats/?${params}`);
    return new AsyncChain(promise);
}

export function getMotivationCounts(institute, specialty, year) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/motivation-counts/?${params}`);
    return new AsyncChain(promise);
}

export function postGetBoxplotData(competency, institutionIds = [], directionIds = [], groupBy = 'auto') {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-boxplot-data/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            competency,
            institution_ids: institutionIds,
            direction_ids: directionIds,
            group_by: groupBy,
        })
    });
    return new AsyncChain(promise);
}

// Цифровой портрет студента
export function getGradesCompetencyCorrelation(institute, specialty, year, discipline, competency) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);
    if (discipline) params.append('discipline', discipline);
    if (competency) params.append('competency', competency);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/grades-competency-correlation/?${params}`);
    return new AsyncChain(promise);
}

export function getCompetencyTrendByYear(institute, specialty) {
    const params = new URLSearchParams();
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/competency-trend-by-year/?${params}`);
    return new AsyncChain(promise);
}


export function getTopCorrelations({
    topN = 20,
    sortBy = 'abs',
    minN = 30,
    institute = null,
    specialty = null,
    year = null
} = {}) {
    const params = new URLSearchParams();
    params.append('top_n', topN);
    params.append('sort_by', sortBy);
    params.append('min_n', minN);
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);

    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/top-correlations/?${params}`);
    return new AsyncChain(promise);
}

export function getCompetencySegmentation({
    competency,
    institute = null,
    specialty = null,
    year = null,
    motivatorThreshold = 600
} = {}) {
    const params = new URLSearchParams();
    params.append('competency', competency);
    params.append('motivator_threshold', motivatorThreshold);
    if (institute) params.append('institute', institute);
    if (specialty) params.append('specialty', specialty);
    if (year) params.append('year', year);

    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/competency-segmentation/?${params}`);
    return new AsyncChain(promise);
}

export function getStudentsList(search = '', limit = 50) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit);
    const url = `${PROTOCOL}://${HOST}/portrait/students/list/?${params.toString()}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

export function getStudentPortrait(studentId) {
    const url = `${PROTOCOL}://${HOST}/portrait/students/portrait/?student_id=${studentId}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

/* *** GENDOX *** */

export function getStudentResumeData(studentId, year) {
    const params = new URLSearchParams();
    params.append('student_id', studentId);
    params.append('year', year);
    params.append('with_ai', 'true');
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/gendox/student-resume-data/?${params}`);
    return new AsyncChain(promise);
}

export function windowGenerateDocxResume(studentId) {
    const params = new URLSearchParams();
    params.append('student_id', studentId);
    return new WindowChain(`${PROTOCOL}://${HOST}/portrait/gendox/generate-resume-docx/?${params}`);
}

// Генерация отчёта по географии
export function getGeographyReport(year) {
    const url = `${PROTOCOL}://${HOST}/portrait/gendox/geography-report/?year=${encodeURIComponent(year)}`;
    const promise = fetch(url);
    return new AsyncChain(promise);
}

/* *** DUPLICATE ACCOUNTS *** */

export function getDuplicateAccounts() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/duplicate-accounts/`);
    return new AsyncChain(promise);
}

export function getPossibleDuplicateAccounts() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/possible-duplicate-accounts/`);
    return new AsyncChain(promise);
}

// Запускает парсинг учебного плана ТюмГУ в фоновом режиме.
// POST /portrait/parse-curriculum/
export function postParseCurriculum(specialtyName) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/parse-curriculum/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(specialtyName ? { specialty_name: specialtyName } : {}),
    });
    return new AsyncChain(promise);
}

// Возвращает журнал запусков парсера (последние 10).
// GET /portrait/parse-curriculum/log/
export function getParseCurriculumLog() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/parse-curriculum/log/`);
    return new AsyncChain(promise);
}

// Возвращает все сохранённые маппинги дисциплин → компетенции.
// GET /portrait/parse-curriculum/mappings/
export function getParseCurriculumMappings() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/parse-curriculum/mappings/`);
    return new AsyncChain(promise);
}