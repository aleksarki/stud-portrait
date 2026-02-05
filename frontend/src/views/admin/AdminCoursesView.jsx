import { useState, useEffect } from 'react';
import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Button from '../../components/ui/Button.jsx';
import { FIELD_NAMES } from "../../utilities.js";

import "./AdminCoursesView.scss";

function AdminCoursesView() {
    const [coursesData, setCoursesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

    // Названия курсов
    const courseNames = {
        'course_an_dec': 'Анализ информации для принятия решений',
        'course_client_focus': 'Клиентоориентированность',
        'course_communication': 'Коммуникативная грамотность',
        'course_leadership': 'Лидерство: основы',
        'course_result_orientation': 'Ориентация на результат',
        'course_planning_org': 'Планирование и организация',
        'course_rules_culture': 'Роль культуры правил',
        'course_self_dev': 'Саморазвитие',
        'course_collaboration': 'Сотрудничество',
        'course_stress_resistance': 'Стрессоустойчивость',
        'course_emotions_communication': 'Эмоции и коммуникация',
        'course_negotiations': 'Искусство деловых переговоров',
        'course_digital_comm': 'Коммуникация в цифровой среде',
        'course_effective_learning': 'Навыки эффективного обучения',
        'course_entrepreneurship': 'Предпринимательское мышление',
        'course_creativity_tech': 'Технологии креативности',
        'course_trendwatching': 'Трендвотчинг',
        'course_conflict_management': 'Управление конфликтами',
        'course_career_management': 'Управляй своей карьерой',
        'course_burnout': 'Эмоциональное выгорание',
        'course_cross_cultural_comm': 'Межкультурные коммуникации',
        'course_mentoring': 'Я — наставник'
    };

    // Порядок колонок
    const columnOrder = [
        'participant',
        ...Object.keys(courseNames)
    ];

    useEffect(() => {
        fetchCoursesData();
    }, []);

    const fetchCoursesData = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/courses/');
            const data = await response.json();
            if (data.status === 'success') {
                setCoursesData(data.courses);
            }
        } catch (error) {
            console.error('Error fetching courses data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        
        const sortedData = [...coursesData].sort((a, b) => {
            let aValue = getFieldValue(a, key);
            let bValue = getFieldValue(b, key);

            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        setCoursesData(sortedData);
    };

    const getFieldValue = (course, fieldKey) => {
        if (fieldKey === 'participant') {
            return course.participant?.part_name || '';
        }
        return course[fieldKey] || 0;
    };

    const handleRowSelect = (courseId) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(courseId)) {
            newSelected.delete(courseId);
        } else {
            newSelected.add(courseId);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedRows.size === coursesData.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(coursesData.map(c => c.course_id)));
        }
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const renderTableCell = (course, fieldKey) => {
        const value = getFieldValue(course, fieldKey);
        
        if (fieldKey === 'participant') {
            return value;
        }
        
        // Для курсов отображаем проценты
        if (typeof value === 'number') {
            if (value === 0) {
                return <span className="not-completed">Не пройден</span>;
            }
            return <span className="percentage">{(value * 100).toFixed(1)}%</span>;
        }
        
        return value;
    };

    const getProgressClass = (value) => {
        if (value === 0) return 'progress-not-started';
        if (value < 0.3) return 'progress-low';
        if (value < 0.7) return 'progress-medium';
        if (value < 0.9) return 'progress-high';
        return 'progress-completed';
    };

    const calculateParticipantStats = (participantId) => {
        const participantCourses = coursesData.filter(c => c.participant?.part_id === participantId);
        const completedCourses = participantCourses.filter(c => 
            Object.keys(courseNames).some(courseKey => c[courseKey] > 0)
        ).length;
        const totalCourses = Object.keys(courseNames).length;
        
        return {
            completed: completedCourses,
            total: totalCourses,
            percentage: totalCourses > 0 ? (completedCourses / totalCourses * 100).toFixed(1) : 0
        };
    };

    const calculateActualCompletedCoursesNumber_ = course => {
        let total = 0;
        if (course.course_an_dec != 0 )
            ++total;
        if (course.course_burnout != 0 )
            ++total;
        if (course.course_career_management != 0 )
            ++total;
        if (course.course_client_focus != 0 )
            ++total;
        if (course.course_collaboration != 0 )
            ++total;
        if (course.course_communication != 0 )
            ++total;
        if (course.course_conflict_management != 0 )
            ++total;
        if (course.course_creativity_tech != 0 )
            ++total;
        if (course.course_cross_cultural_comm != 0 )
            ++total;
        if (course.course_digital_comm != 0 )
            ++total;
        if (course.course_effective_learning != 0 )
            ++total;
        if (course.course_emotions_communication != 0 )
            ++total;
        if (course.course_entrepreneurship != 0 )
            ++total;
        if (course.course_leadership != 0 )
            ++total;
        if (course.course_mentoring != 0 )
            ++total;
        if (course.course_negotiations != 0 )
            ++total;
        if (course.course_planning_org != 0 )
            ++total;
        if (course.course_result_orientation != 0 )
            ++total;
        if (course.course_rules_culture != 0 )
            ++total;
        if (course.course_self_dev != 0 )
            ++total;
        if (course.course_stress_resistance != 0 )
            ++total;
        if (course.course_trendwatching != 0 )
            ++total;
        return total;
    };

    if (loading) {
        return (
            <div className="AdminCoursesView">
                <Header title="Админ: Образовательные курсы" name="Администратор1" style="modeus" />
                <div className="main-area">
                    <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                        <div className="loading">
                            <div className="spinner"></div>
                            <div>Загрузка данных по курсам...</div>
                        </div>
                    </SidebarLayout>
                </div>
            </div>
        );
    }

    return (
        <div className="AdminCoursesView">
            <Header title="Админ: Образовательные курсы" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                    <div className="courses-container">
                        <div className="courses-header">
                            <h2>Результаты образовательных курсов</h2>
                            <div className="controls">
                                <div className="courses-info">
                                    <span>
                                        Участников: {new Set(coursesData.map(c => c.participant?.part_id)).size} • 
                                        Всего записей: {coursesData.length} • 
                                        Выбрано: {selectedRows.size}
                                    </span>
                                </div>
                                <div className="control-buttons">
                                    <Button
                                        text="🔄 Обновить"
                                        onClick={fetchCoursesData}
                                        disabled={loading}
                                        fg="white"
                                        bg="#17a2b8"
                                        hoverBg="#138496"
                                        disabledBg="#6c757d"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Общая статистика */}
                        <div className="stats-overview">
                            <div className="stat-card">
                                <div className="stat-value">
                                    {new Set(coursesData.map(c => c.participant?.part_id)).size}
                                </div>
                                <div className="stat-label">Участников</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{Object.keys(courseNames).length}</div>
                                <div className="stat-label">Всего курсов</div>
                            </div>
                            {/*<div className="stat-card">
                                <div className="stat-value">
                                    {coursesData.filter(c => 
                                        Object.keys(courseNames).some(courseKey => c[courseKey] > 0)
                                    ).length}
                                </div>
                                <div className="stat-label">Записей с прогрессом</div>
                            </div>*/}
                        </div>

                        {/* Таблица с курсами */}
                        <div className="table-scroll-container">
                            <div className="table-wrapper">
                                <table className="courses-table">
                                    <thead>
                                        <tr>
                                            <th className="sticky-col participant-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.size === coursesData.length && coursesData.length > 0}
                                                    onChange={handleSelectAll}
                                                />
                                            </th>
                                            <th 
                                                className="sticky-col participant-col"
                                                onClick={() => handleSort('participant')}
                                            >
                                                Участник {getSortIcon('participant')}
                                            </th>
                                            {Object.keys(courseNames).map(courseKey => (
                                                <th 
                                                    key={courseKey}
                                                    onClick={() => handleSort(courseKey)}
                                                    title={courseNames[courseKey]}
                                                >
                                                    <div className="course-header">
                                                        <div className="course-short-name">
                                                            {courseNames[courseKey].split(' ')[0]}
                                                        </div>
                                                        {getSortIcon(courseKey)}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {coursesData.map((course) => (
                                            <tr key={course.course_id} className={selectedRows.has(course.course_id) ? 'selected' : ''}>
                                                <td className="sticky-col participant-col">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(course.course_id)}
                                                        onChange={() => handleRowSelect(course.course_id)}
                                                    />
                                                </td>
                                                <td className="sticky-col participant-col">
                                                    <div className="participant-info">
                                                        <div className="participant-name">
                                                            {course.participant?.part_name}
                                                        </div>
                                                        <div className="participant-stats">
                                                            Пройдено: {calculateActualCompletedCoursesNumber_(course)}/
                                                            {calculateParticipantStats(course.participant?.part_id).total} курсов
                                                        </div>
                                                    </div>
                                                </td>
                                                {Object.keys(courseNames).map(courseKey => (
                                                    <td 
                                                        key={courseKey}
                                                        className={`course-cell ${getProgressClass(course[courseKey] || 0)}`}
                                                        title={`${courseNames[courseKey]}: ${course[courseKey] ? (course[courseKey] * 100).toFixed(1) + '%' : 'Не пройден'}`}
                                                    >
                                                        {renderTableCell(course, courseKey)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {coursesData.length === 0 && !loading && (
                                <div className="no-data">
                                    <div className="no-data-icon">📚</div>
                                    <div className="no-data-text">
                                        <strong>Нет данных по курсам</strong><br />
                                        Загрузите данные через раздел "Загрузка данных"
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Легенда прогресса */}
                        <div className="progress-legend">
                            <div className="legend-title">Легенда прогресса:</div>
                            <div className="legend-items">
                                <div className="legend-item">
                                    <div className="color-box progress-not-started"></div>
                                    <span>Не начат (0%)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box progress-low"></div>
                                    <span>Низкий (1-29%)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box progress-medium"></div>
                                    <span>Средний (30-69%)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box progress-high"></div>
                                    <span>Высокий (70-89%)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box progress-completed"></div>
                                    <span>Завершен (90-100%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminCoursesView;
