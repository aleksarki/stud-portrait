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

/** Perform GET request to `http://localhost:8000/portrait/courses/` */
export function getPortraitCourses() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/courses/`);
    return new AsyncChain(promise);
}

/** Perform GET request to `http://localhost:8000/portrait/student-results/` */
export function getPortraitStudentResults(studentId) {
    const params = new URLSearchParams({stud_id: studentId});
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/student-results/?${params}`);
    return new AsyncChain(promise);
}

/** Perform GET request to `http://localhost:8000/portrait/get-institution-directions/` */
export function getPortraitGetInstitutionDirections(selectedInstitutions) {
    const params = new URLSearchParams();
    selectedInstitutions?.forEach(id => params.append('institution_ids[]', id));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-institution-directions/?${params}`);
    return new AsyncChain(promise);
}

/* *** datasesh *** */

/** Perform POST request to `http://localhost:8000/portrait/create-data-session/` */
export function postPortraitCreateDataSession() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/create-data-session/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    });
    return new AsyncChain(promise);
}

/** Perform POST request to `http://localhost:8000/portrait/get-session-data/` */
export function postPortraitGetSessionData(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-session-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({session_id: sessionId})
    });
    return new AsyncChain(promise);
}

/** Perform POST request to `http://localhost:8000/portrait/load-more-data/` */
export function postPortraitLoadMoreData(sessionId) {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/load-more-data/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({session_id: sessionId})
    });
    return new AsyncChain(promise);
}

/** Perform POST request to `http://localhost:8000/portrait/update-session-filters/` */
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

/** Perform POST request to `http://localhost:8000/portrait/update-session-columns/` */
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

/** Perform POST request to `http://localhost:8000/portrait/export-selected-results/` */
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

/** Perform POST request to `http://localhost:8000/portrait/stats/` */
export function postPortraitStats(sessionId) {
    const body = sessionId ? { session_id: sessionId } : {};
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/stats/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });
    return new AsyncChain(promise);
}

/** Perform POST request to `http://localhost:8000/portrait/group-data/` */
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

/* *** datanal *** */

/** Perform GET request to `http://localhost:8000/portrait/vam-summary-statistics/` */
export function getPortraitVamSummaryStatistics() {
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/vam-summary-statistics/`);
    return new AsyncChain(promise);
}

/** Perform GET request to `http://localhost:8000/portrait/get-vam-unified/` */
export function getPortraitGetVamUnified(
    sessionId, selectedInstitutions, selectedDirections, selectedCourses,
    selectedTestAttempts, selectedCompetencies, selectedStudents
) {
    const params = new URLSearchParams({session_id: sessionId});
    selectedInstitutions.forEach(id => params.append('institution_ids[]', id));
    selectedDirections.forEach(dir => params.append('directions[]', dir));
    selectedCourses.forEach(course => params.append('courses[]', course));
    selectedTestAttempts.forEach(attempts => params.append('test_attempts[]', attempts));
    selectedCompetencies.forEach(comp => params.append('competencies[]', comp));
    selectedStudents.forEach(id => params.append('student_ids[]', id));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-vam-unified/?${params}`);
    return new AsyncChain(promise);
}

/** Perform GET request to `http://localhost:8000/portrait/get-latent-growth/` */
export function getPortraitGetLatentGrowth(
    sessionId, selectedInstitutions, selectedDirections, selectedCourses,
    selectedTestAttempts, selectedCompetencies, selectedStudents
) {
    const params = new URLSearchParams({session_id: sessionId});
    selectedInstitutions?.forEach(id => params.append('institution_ids[]', id));
    selectedDirections?.forEach(dir => params.append('directions[]', dir));
    selectedCourses?.forEach(course => params.append('courses[]', course));
    selectedTestAttempts?.forEach(attempts => params.append('test_attempts[]', attempts));
    selectedCompetencies?.forEach(comp => params.append('competencies[]', comp));
    selectedStudents?.forEach(id => params.append('student_ids[]', id));
    const promise = fetch(`${PROTOCOL}://${HOST}/portrait/get-latent-growth/?${params}`);
    return new AsyncChain(promise);
}

/** Perform GET request to `http://localhost:8000/portrait/get-filter-options-with-counts/` */
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
