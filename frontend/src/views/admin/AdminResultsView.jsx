import React, { useState, useEffect, useCallback } from 'react';
import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import "./AdminResultsView.scss";

function AdminResultsView() {
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [filters, setFilters] = useState({
        institution: '',
        year: '',
        center: '',
        participant: '',
        specialty: ''
    });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [hiddenColumns, setHiddenColumns] = useState(new Set());
    const [showColumnSelector, setShowColumnSelector] = useState(false);

    // Добавляем определение linkList
    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

    // Маппинг названий полей на читаемые названия
    const fieldNames = {
        // Основные поля
        'res_year': 'Учебный год',
        'participant': 'Имя участника',
        'part_gender': 'Пол',
        'center': 'Название ЦК',
        'institution': 'Учебное заведение',
        'edu_level': 'Уровень образования',
        'res_course_num': 'Номер курса',
        'study_form': 'Форма обучения',
        'specialty': 'Специальность',
        
        // Компетенции
        'res_comp_info_analysis': 'Анализ информации',
        'res_comp_planning': 'Планирование',
        'res_comp_result_orientation': 'Ориентация на результат',
        'res_comp_stress_resistance': 'Стрессоустойчивость',
        'res_comp_partnership': 'Партнерство',
        'res_comp_rules_compliance': 'Соблюдение правил',
        'res_comp_self_development': 'Саморазвитие',
        'res_comp_leadership': 'Лидерство',
        'res_comp_emotional_intel': 'Эмоциональный интеллект',
        'res_comp_client_focus': 'Клиентоориентированность',
        'res_comp_communication': 'Коммуникация',
        'res_comp_passive_vocab': 'Пассивный словарь',
        
        // Мотиваторы
        'res_mot_autonomy': 'Автономия',
        'res_mot_altruism': 'Альтруизм',
        'res_mot_challenge': 'Вызов',
        'res_mot_salary': 'Зарплата',
        'res_mot_career': 'Карьера',
        'res_mot_creativity': 'Креативность',
        'res_mot_relationships': 'Отношения',
        'res_mot_recognition': 'Признание',
        'res_mot_affiliation': 'Принадлежность',
        'res_mot_self_development': 'Саморазвитие (мотиватор)',
        'res_mot_purpose': 'Цель',
        'res_mot_cooperation': 'Сотрудничество',
        'res_mot_stability': 'Стабильность',
        'res_mot_tradition': 'Традиции',
        'res_mot_management': 'Управление',
        'res_mot_work_conditions': 'Условия работы',
        
        // Ценности
        'res_val_honesty_justice': 'Честность и справедливость',
        'res_val_humanism': 'Гуманизм',
        'res_val_patriotism': 'Патриотизм',
        'res_val_family': 'Семья',
        'res_val_health': 'Здоровье',
        'res_val_environment': 'Окружающая среда'
    };

    // Порядок колонок в таблице
    const columnOrder = [
        // Основная информация
        'res_year',
        'participant', 
        'part_gender',
        'center',
        'institution',
        'edu_level',
        'res_course_num',
        'study_form',
        'specialty',
        
        // Компетенции
        'res_comp_info_analysis',
        'res_comp_planning',
        'res_comp_result_orientation',
        'res_comp_stress_resistance',
        'res_comp_partnership',
        'res_comp_rules_compliance',
        'res_comp_self_development',
        'res_comp_leadership',
        'res_comp_emotional_intel',
        'res_comp_client_focus',
        'res_comp_communication',
        'res_comp_passive_vocab',
        
        // Мотиваторы
        'res_mot_autonomy',
        'res_mot_altruism',
        'res_mot_challenge',
        'res_mot_salary',
        'res_mot_career',
        'res_mot_creativity',
        'res_mot_relationships',
        'res_mot_recognition',
        'res_mot_affiliation',
        'res_mot_self_development',
        'res_mot_purpose',
        'res_mot_cooperation',
        'res_mot_stability',
        'res_mot_tradition',
        'res_mot_management',
        'res_mot_work_conditions',
        
        // Ценности
        'res_val_honesty_justice',
        'res_val_humanism',
        'res_val_patriotism',
        'res_val_family',
        'res_val_health',
        'res_val_environment'
    ];

    // Группы колонок для удобства управления
    const columnGroups = {
        'Основная информация': columnOrder.slice(0, 9),
        'Компетенции': columnOrder.slice(9, 21),
        'Мотиваторы': columnOrder.slice(21, 37),
        'Ценности': columnOrder.slice(37)
    };

    // Видимые колонки
    const visibleColumns = columnOrder.filter(col => !hiddenColumns.has(col));

    useEffect(() => {
        fetchResults();
    }, []);

    useEffect(() => {
        applyFiltersAndSort();
    }, [results, filters, sortConfig]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/results/');
            const data = await response.json();
            if (data.status === 'success') {
                setResults(data.results);
                setTotalCount(data.total_count || data.results.length);
            }
        } catch (error) {
            console.error('Error fetching results:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFiltersAndSort = useCallback(() => {
        let filtered = [...results];

        // Применяем фильтры
        if (filters.institution) {
            filtered = filtered.filter(result => 
                result.institution?.toLowerCase().includes(filters.institution.toLowerCase())
            );
        }
        if (filters.year) {
            filtered = filtered.filter(result => 
                result.res_year.toString().includes(filters.year)
            );
        }
        if (filters.center) {
            filtered = filtered.filter(result => 
                result.center?.toLowerCase().includes(filters.center.toLowerCase())
            );
        }
        if (filters.participant) {
            filtered = filtered.filter(result => 
                result.participant?.part_name?.toLowerCase().includes(filters.participant.toLowerCase())
            );
        }
        if (filters.specialty) {
            filtered = filtered.filter(result => 
                result.specialty?.toLowerCase().includes(filters.specialty.toLowerCase())
            );
        }

        // Применяем сортировку
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = getFieldValue(a, sortConfig.key);
                let bValue = getFieldValue(b, sortConfig.key);

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        setFilteredResults(filtered);
    }, [results, filters, sortConfig]);

    const getFieldValue = (result, fieldKey) => {
        if (fieldKey === 'participant') {
            return result.participant?.part_name || '';
        }
        if (fieldKey === 'part_gender') {
            return result.participant?.part_gender || '';
        }
        if (result[fieldKey] !== undefined) {
            return result[fieldKey];
        }
        if (result.competences && result.competences[fieldKey] !== undefined) {
            return result.competences[fieldKey];
        }
        if (result.motivators && result.motivators[fieldKey] !== undefined) {
            return result.motivators[fieldKey];
        }
        if (result.values && result.values[fieldKey] !== undefined) {
            return result.values[fieldKey];
        }
        return '';
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    const handleRowSelect = (resultId) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(resultId)) {
            newSelected.delete(resultId);
        } else {
            newSelected.add(resultId);
        }
        setSelectedRows(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedRows.size === filteredResults.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredResults.map(r => r.res_id)));
        }
    };

    const handleExport = async () => {
        if (selectedRows.size === 0) {
            alert('Выберите записи для выгрузки');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/portrait/export-results/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    result_ids: Array.from(selectedRows)
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'results_export.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Ошибка при выгрузке данных');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Ошибка при выгрузке данных');
        }
    };

    const toggleColumn = (columnKey) => {
        const newHidden = new Set(hiddenColumns);
        if (newHidden.has(columnKey)) {
            newHidden.delete(columnKey);
        } else {
            newHidden.add(columnKey);
        }
        setHiddenColumns(newHidden);
    };

    const toggleColumnGroup = (groupColumns) => {
        const allGroupHidden = groupColumns.every(col => hiddenColumns.has(col));
        const newHidden = new Set(hiddenColumns);
        
        groupColumns.forEach(col => {
            if (allGroupHidden) {
                newHidden.delete(col);
            } else {
                newHidden.add(col);
            }
        });
        
        setHiddenColumns(newHidden);
    };

    const showAllColumns = () => {
        setHiddenColumns(new Set());
    };

    const hideAllColumns = () => {
        setHiddenColumns(new Set(columnOrder));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const getColumnClass = (fieldKey) => {
        if (fieldKey.startsWith('res_comp_')) return 'competence-col';
        if (fieldKey.startsWith('res_mot_')) return 'motivator-col';
        if (fieldKey.startsWith('res_val_')) return 'values-col';
        return 'basic-col';
    };

    const renderTableCell = (result, fieldKey) => {
        const value = getFieldValue(result, fieldKey);
        
        if (value === null || value === undefined || value === '') {
            return '-';
        }
        
        // Для числовых значений показываем как есть
        if (typeof value === 'number') {
            return value;
        }
        
        return value;
    };

    return (
        <div className="AdminResultsView">
            <Header title="Админ: Результаты тестирования" name="Администратор1" style="admin" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="admin" />} style="admin">
                    <div className="results-container">
                        <div className="results-header">
                            <h2>Результаты тестирования</h2>
                            <div className="controls">
                                <div className="results-info">
                                    Показано: {filteredResults.length} из {totalCount} записей
                                    {hiddenColumns.size > 0 && ` • Скрыто колонок: ${hiddenColumns.size}`}
                                </div>
                                <div className="control-buttons">
                                    <button 
                                        className="column-toggle-btn"
                                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                                    >
                                        📊 Колонки
                                    </button>
                                    <button 
                                        className="export-btn"
                                        onClick={handleExport}
                                        disabled={selectedRows.size === 0}
                                    >
                                        📥 Выгрузить ({selectedRows.size})
                                    </button>
                                    <button 
                                        className="refresh-btn"
                                        onClick={fetchResults}
                                        disabled={loading}
                                    >
                                        {loading ? '⏳ Загрузка...' : '🔄 Обновить'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Селектор колонок */}
                        {showColumnSelector && (
                            <div className="column-selector">
                                <div className="column-selector-header">
                                    <h3>Управление колонками</h3>
                                    <div className="column-selector-controls">
                                        <button className="selector-btn" onClick={showAllColumns}>
                                            Показать все
                                        </button>
                                        <button className="selector-btn" onClick={hideAllColumns}>
                                            Скрыть все
                                        </button>
                                        <button 
                                            className="selector-btn close-btn"
                                            onClick={() => setShowColumnSelector(false)}
                                        >
                                            ✕ Закрыть
                                        </button>
                                    </div>
                                </div>
                                <div className="column-groups">
                                    {Object.entries(columnGroups).map(([groupName, groupColumns]) => {
                                        const visibleCount = groupColumns.filter(col => !hiddenColumns.has(col)).length;
                                        const totalCount = groupColumns.length;
                                        return (
                                            <div key={groupName} className="column-group">
                                                <div className="group-header">
                                                    <label className="group-checkbox">
                                                        <input
                                                            type="checkbox"
                                                            checked={visibleCount > 0}
                                                            onChange={() => toggleColumnGroup(groupColumns)}
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.indeterminate = visibleCount > 0 && visibleCount < totalCount;
                                                                }
                                                            }}
                                                        />
                                                        <span className="group-name">
                                                            {groupName} ({visibleCount}/{totalCount})
                                                        </span>
                                                    </label>
                                                </div>
                                                <div className="group-columns">
                                                    {groupColumns.map(columnKey => (
                                                        <label key={columnKey} className="column-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={!hiddenColumns.has(columnKey)}
                                                                onChange={() => toggleColumn(columnKey)}
                                                            />
                                                            <span className="column-name">
                                                                {fieldNames[columnKey]}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Фильтры */}
                        <div className="filters">
                            <div className="filter-group">
                                <label>Участник:</label>
                                <input
                                    type="text"
                                    value={filters.participant}
                                    onChange={(e) => handleFilterChange('participant', e.target.value)}
                                    placeholder="Фильтр по ФИО"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Учебное заведение:</label>
                                <input
                                    type="text"
                                    value={filters.institution}
                                    onChange={(e) => handleFilterChange('institution', e.target.value)}
                                    placeholder="Фильтр по учебному заведению"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Год:</label>
                                <input
                                    type="text"
                                    value={filters.year}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                    placeholder="Фильтр по году"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Центр компетенций:</label>
                                <input
                                    type="text"
                                    value={filters.center}
                                    onChange={(e) => handleFilterChange('center', e.target.value)}
                                    placeholder="Фильтр по центру"
                                />
                            </div>
                            <div className="filter-group">
                                <label>Специальность:</label>
                                <input
                                    type="text"
                                    value={filters.specialty}
                                    onChange={(e) => handleFilterChange('specialty', e.target.value)}
                                    placeholder="Фильтр по специальности"
                                />
                            </div>
                        </div>

                        {/* Таблица с горизонтальной прокруткой */}
                        {loading ? (
                            <div className="loading">
                                <div className="spinner"></div>
                                <div className="loading-text">
                                    Загрузка данных... <span className="record-count">{totalCount}</span> записей
                                </div>
                            </div>
                        ) : (
                            <div className="table-scroll-container">
                                <div className="table-wrapper">
                                    <table className="results-table">
                                        <thead>
                                            <tr>
                                                <th className="sticky-col">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.size === filteredResults.length && filteredResults.length > 0}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                {visibleColumns.map(fieldKey => (
                                                    <th 
                                                        key={fieldKey} 
                                                        onClick={() => handleSort(fieldKey)}
                                                        className={`${getColumnClass(fieldKey)} ${hiddenColumns.has(fieldKey) ? 'hidden' : ''}`}
                                                    >
                                                        {fieldNames[fieldKey]} {getSortIcon(fieldKey)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredResults.map((result) => (
                                                <tr key={result.res_id} className={selectedRows.has(result.res_id) ? 'selected' : ''}>
                                                    <td className="sticky-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRows.has(result.res_id)}
                                                            onChange={() => handleRowSelect(result.res_id)}
                                                        />
                                                    </td>
                                                    {visibleColumns.map(fieldKey => (
                                                        <td 
                                                            key={fieldKey}
                                                            className={getColumnClass(fieldKey)}
                                                        >
                                                            {renderTableCell(result, fieldKey)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {filteredResults.length === 0 && !loading && (
                                    <div className="no-data">
                                        <div className="no-data-icon">📊</div>
                                        <div className="no-data-text">
                                            <strong>Нет данных для отображения</strong><br />
                                            Попробуйте изменить параметры фильтрации
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Подсказка по прокрутке */}
                        <div className="scroll-hint">
                            <span>↸ Прокрутите таблицу горизонтально для просмотра всех данных</span>
                            <span className="record-count">
                                Колонок: {visibleColumns.length}/{columnOrder.length} • Записей: {filteredResults.length}
                            </span>
                        </div>
                    </div>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminResultsView;
