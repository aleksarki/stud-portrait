import { useState, useEffect } from 'react';

import FlexRow, { WRAP } from '../../components/FlexRow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import ColorBox, { BOX_COLOR } from '../../components/ui/ColorBox.jsx';
import Button, { BUTTON_PALETTE } from '../../components/ui/Button.jsx';
import Label from '../../components/ui/Label.jsx';
import ValueCard from '../../components/cards/ValueCard.jsx';
import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { getPortraitCourses } from '../../api.js';

import "./AdminCoursesView.scss";

function AdminCoursesView() {
    const [coursesData, setCoursesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Порядок колонок
    const columnOrder = [
        'participant',
        ...Object.keys(COURSES_NAMES)
    ];

    useEffect(() => {
        fetchCoursesData();
    }, []);

    const fetchCoursesData = async () => {
        setLoading(true);
        getPortraitCourses()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setCoursesData(data.courses);
                }
            })
            .onError(error => console.error("Error fetching courses data:", error))
            .finally(() => setLoading(false));
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
            Object.keys(COURSES_NAMES).some(courseKey => c[courseKey] > 0)
        ).length;
        const totalCourses = Object.keys(COURSES_NAMES).length;
        
        return {
            completed: completedCourses,
            total: totalCourses,
            percentage: totalCourses > 0 ? (completedCourses / totalCourses * 100).toFixed(1) : 0
        };
    };

    const calculateActualCompletedCoursesNumber_ = course => {
        let total = 0;
        Object.keys(COURSES_NAMES).map(courseKey => {
            if (course[courseKey] != 0) {
                ++total;
            }
        });
        return total;
    };

    if (loading) {
        return (
            <div className="AdminCoursesView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: Образовательные курсы" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <div className="loading">
                            <div className="spinner"></div>
                            <div>Загрузка данных по курсам...</div>
                        </div>
                    </Content>
                </SidebarLayout>
            </div>
        );
    }

    return (
        <div className="AdminCoursesView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Образовательные курсы" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="courses-container">
                        <div className="courses-header">
                            <h2>Результаты образовательных курсов</h2>
                            <FlexRow>
                                <Label>
                                    Участников: {new Set(coursesData.map(c => c.participant?.part_id)).size} • 
                                    Всего записей: {coursesData.length} • 
                                    Выбрано: {selectedRows.size}
                                </Label>
                                <Button
                                    text="Обновить"
                                    onClick={fetchCoursesData}
                                    disabled={loading}
                                    palette={BUTTON_PALETTE.CYAN}
                                />
                            </FlexRow>
                        </div>

                        {/* Общая статистика */}
                        <div className="stats-overview">
                            <ValueCard
                                value={new Set(coursesData.map(c => c.participant?.part_id)).size}
                                text="Участников"
                            />
                            <ValueCard value={Object.keys(COURSES_NAMES).length} text="Всего курсов" />
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
                                            {Object.keys(COURSES_NAMES).map(courseKey => (
                                                <th 
                                                    key={courseKey}
                                                    onClick={() => handleSort(courseKey)}
                                                    title={COURSES_NAMES[courseKey]}
                                                >
                                                    <div className="course-header">
                                                        <div className="course-short-name">
                                                            {COURSES_NAMES[courseKey].split(' ')[0]}
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
                                                {Object.keys(COURSES_NAMES).map(courseKey => (
                                                    <td 
                                                        key={courseKey}
                                                        className={`course-cell ${getProgressClass(course[courseKey] || 0)}`}
                                                        title={`${COURSES_NAMES[courseKey]}: ${course[courseKey] ? (course[courseKey] * 100).toFixed(1) + '%' : 'Не пройден'}`}
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
                        <FlexRow margin="15 0 0 0">
                            <Label>
                                <FlexRow gap="20" wrap={WRAP.DO}>
                                    <span>↸ Легенда:</span>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.GRAY} />
                                        <span>Не начат (0%)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.RED} />
                                        <span>Низкий (1-29%)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.YELLOW} />
                                        <span>Средний (30-69%)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.BLUE} />
                                        <span>Высокий (70-89%)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.GREEN} />
                                        <span>Завершен (90-100%)</span>
                                    </FlexRow>
                                </FlexRow>
                            </Label>
                        </FlexRow>
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminCoursesView;
