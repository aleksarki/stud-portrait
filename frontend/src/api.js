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

const PROTOCOL = "http";
const HOST = "localhost:8000";

/* *** statsresult *** */

export function getPortraitCourses() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/courses/`);
    return new AsyncChain(promise);
}

export function getPortraitStudentResults(studentId) {
    const params = new URLSearchParams({stud_id: studentId});
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
    const params = new URLSearchParams({session_id: sessionId});
    selectedInstitutions?.forEach(id => params.append('institution_ids[]', id));
    selectedDirections?.forEach(dir => params.append('directions[]', dir));
    selectedCourses?.forEach(course => params.append('courses[]', course));
    selectedTestAttempts?.forEach(attempts => params.append('test_attempts[]', attempts));
    selectedCompetencies?.forEach(comp => params.append('competencies[]', comp));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-filter-options-with-counts/?${params}`);
    return new AsyncChain(promise);
}

/* *** datasesh *** */

export function postPortraitCreateDataSession() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/create-data-session/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    return new AsyncChain(promise);
}

export function postPortraitGetSessionData(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-session-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({session_id: sessionId})
    });
    return new AsyncChain(promise);
}

export function postPortraitLoadMoreData(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/load-more-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({session_id: sessionId})
    });
    return new AsyncChain(promise);
}

export function postPortraitUpdateSessionFilters(sessionId, newFilters) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/update-session-filters/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_id: sessionId,
            filters: newFilters
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitUpdateSessionColumns(sessionId, visibleColumns) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/update-session-columns/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_id: sessionId,
            visible_columns: visibleColumns
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitExportSelectedResults(sessionId, selectedRowsArray) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/export-selected-results/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_id: sessionId,
            selected_ids: selectedRowsArray
        })
    });
    return new AsyncChain(promise);
}

export function postPortraitStats(sessionId) {
    const body = sessionId ? { session_id: sessionId } : {};
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/stats/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });
    return new AsyncChain(promise);
}

export function postPortraitGroupData(sessionId, selectedIds, groupingColumn) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/group-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            session_id: sessionId,
            selected_ids: selectedIds,
            grouping_column: groupingColumn
        })
    });
    return new AsyncChain(promise);
}

/* ============================================================ */
/*                    АНАЛИТИЧЕСКИЕ ENDPOINTS                   */
/* ============================================================ */

/** GET /portrait/analyze-student-vam/ - VAM для конкретного студента */
export function getAnalyzeStudentVam(studentId, competency = 'res_comp_leadership') {
    const params = new URLSearchParams({student_id: studentId, competency});
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-student-vam/?${params}`);
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-cohort-lgm/ - LGM для когорты */
export function getAnalyzeCohortLgm(competency = 'res_comp_leadership', institutionId = null, specId = null) {
    const params = new URLSearchParams({competency});
    if (institutionId) params.append('institution_id', institutionId);
    if (specId) params.append('spec_id', specId);
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-cohort-lgm/?${params}`);
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-discipline-impact/ - Анализ влияния дисциплин */
export function getAnalyzeDisciplineImpact(discipline, competency = 'res_comp_leadership') {
    const params = new URLSearchParams({discipline, competency});
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-discipline-impact/?${params}`);
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
        headers: {'Content-Type': 'application/json'},
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
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            institution_ids: institutionIds,
            direction_ids: directionIds
        })
    });
    return new AsyncChain(promise);
}

/** GET /portrait/analyze-by-dimension/ - Анализ в разрезе */
export function getAnalyzeByDimension(dimension = 'institution', competency = 'res_comp_leadership') {
    const params = new URLSearchParams({dimension, competency});
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-by-dimension/?${params}`);
    return new AsyncChain(promise);
}

/** POST /portrait/get-vam-dotplot-data/ - Точечный график VAM */
export function postGetVamDotplotData(
    groupBy = 'institution', 
    competency = 'res_comp_leadership', 
    filterInstitutions = [],
    filterDirections = [],
    filterCourses = [],
    filterTestAttempts = []
) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-vam-dotplot-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            group_by: groupBy,
            competency: competency,
            filter_institutions: filterInstitutions,
            filter_directions: filterDirections,
            filter_courses: filterCourses,
            filter_test_attempts: filterTestAttempts
        })
    });
    return new AsyncChain(promise);
}

/** POST /portrait/get-lgm-spaghetti-data/ - Паутинный график LGM */
export function postGetLgmSpaghettiData(
        groupBy = 'institution', 
        competency = 'res_comp_leadership', 
        filterInstitutions = [],
        filterDirections = [],
        filterCourses = [],
        filterTestAttempts = []
) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-lgm-spaghetti-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            group_by: groupBy,
            competency: competency,
            filter_institutions: filterInstitutions,
            filter_directions: filterDirections,
            filter_courses: filterCourses,
            filter_test_attempts: filterTestAttempts
        })
    });
    return new AsyncChain(promise);
}

/** POST /portrait/get-waterfall-decomposition/ - Ватерфалльная диаграмма */
export function postGetWaterfallDecomposition(institutionId, directionId = null, competency = 'res_comp_leadership') {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-waterfall-decomposition/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            institution_id: institutionId,
            direction_id: directionId,
            competency: competency
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
    const params = new URLSearchParams({student_id: studentId});
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/analyze-student-discipline-impact/?${params}`);
    return new AsyncChain(promise);
}