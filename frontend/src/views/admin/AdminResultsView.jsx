import React, { useState, useEffect, useCallback } from 'react';
import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import "./AdminResultsView.scss";

function AdminResultsView() {
    const [results, setResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [hiddenColumns, setHiddenColumns] = useState(new Set());
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [filters, setFilters] = useState([]);
    const [availableValues, setAvailableValues] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [pendingFilters, setPendingFilters] = useState([]);

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

    // Базовые поля для фильтрации
    const basicFields = [
        'res_year',
        'part_gender',
        'center',
        'institution',
        'edu_level',
        'res_course_num',
        'study_form',
        'specialty'
    ];

    // Числовые поля для фильтрации по диапазону
    const numericFields = [
        ...Object.keys(fieldNames).filter(key => 
            key.startsWith('res_comp_') || 
            key.startsWith('res_mot_') || 
            key.startsWith('res_val_')
        )
    ];

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

    // Функция для определения категории результата
    const getResultCategory = (value) => {
        if (value === null || value === undefined || value === '') return 'no-data';
        if (value >= 600) return 'high';
        if (value >= 400) return 'medium';
        if (value >= 200) return 'low';
        return 'no-data';
    };

    // Функция для получения класса цвета в зависимости от значения
    const getValueColorClass = (value, fieldKey) => {
        const isNumericField = fieldKey.startsWith('res_comp_') || 
                              fieldKey.startsWith('res_mot_') || 
                              fieldKey.startsWith('res_val_');
        
        if (!isNumericField) return '';
        
        const category = getResultCategory(value);
        return `value-${category}`;
    };

    useEffect(() => {
        fetchResults();
    }, []);

    useEffect(() => {
        if (results.length > 0) {
            extractAvailableValues();
        }
    }, [results]);

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

    // Извлечение доступных значений для фильтрации
    const extractAvailableValues = () => {
        const values = {};
        
        basicFields.forEach(field => {
            const uniqueValues = new Set();
            results.forEach(result => {
                const value = getFieldValue(result, field);
                if (value !== '' && value !== null && value !== undefined) {
                    uniqueValues.add(value);
                }
            });
            values[field] = Array.from(uniqueValues).sort();
        });

        setAvailableValues(values);
    };

    const applyFiltersAndSort = useCallback(() => {
        let filtered = [...results];

        // Применяем все активные фильтры
        filters.forEach(filter => {
            if (filter.type === 'basic' && filter.selectedValues.length > 0) {
                filtered = filtered.filter(result => {
                    const value = getFieldValue(result, filter.field);
                    // Преобразуем значение в строку для сравнения с selectedValues
                    const stringValue = value !== null && value !== undefined ? value.toString() : '';
                    return filter.selectedValues.includes(stringValue);
                });
            } else if (filter.type === 'numeric') {
                filtered = filtered.filter(result => {
                    const value = getFieldValue(result, filter.field);
                    if (typeof value !== 'number') return false;
                    return value >= filter.min && value <= filter.max;
                });
            }
        });

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

    // Исправленная функция getFieldValue
    const getFieldValue = (result, fieldKey) => {
        // Обработка основных полей
        if (fieldKey === 'res_year') return result.res_year;
        if (fieldKey === 'part_gender') return result.participant?.part_gender || '';
        if (fieldKey === 'center') return result.center || '';
        if (fieldKey === 'institution') return result.institution || '';
        if (fieldKey === 'edu_level') return result.edu_level || '';
        if (fieldKey === 'res_course_num') return result.res_course_num;
        if (fieldKey === 'study_form') return result.study_form || '';
        if (fieldKey === 'specialty') return result.specialty || '';
        if (fieldKey === 'participant') return result.participant?.part_name || '';
        
        // Обработка компетенций
        if (result.competences && result.competences[fieldKey] !== undefined) {
            return result.competences[fieldKey];
        }
        
        // Обработка мотиваторов
        if (result.motivators && result.motivators[fieldKey] !== undefined) {
            return result.motivators[fieldKey];
        }
        
        // Обработка ценностей
        if (result.values && result.values[fieldKey] !== undefined) {
            return result.values[fieldKey];
        }
        
        // Прямой доступ к полям результата
        if (result[fieldKey] !== undefined) {
            return result[fieldKey];
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

    // Функции для работы с фильтрами
    const addBasicFilter = (field) => {
        const newFilter = {
            id: Date.now(),
            type: 'basic',
            field: field,
            selectedValues: []
        };
        setPendingFilters(prev => [...prev, newFilter]);
    };

    const addNumericFilter = (field) => {
        const newFilter = {
            id: Date.now(),
            type: 'numeric',
            field: field,
            min: 200,
            max: 800
        };
        setPendingFilters(prev => [...prev, newFilter]);
    };

    const removePendingFilter = (filterId) => {
        setPendingFilters(prev => prev.filter(f => f.id !== filterId));
    };

    const updatePendingBasicFilter = (filterId, selectedValues) => {
        setPendingFilters(prev => prev.map(f => 
            f.id === filterId ? { ...f, selectedValues } : f
        ));
    };

    const updatePendingNumericFilter = (filterId, min, max) => {
        setPendingFilters(prev => prev.map(f => 
            f.id === filterId ? { ...f, min, max } : f
        ));
    };

    const applyFilters = () => {
        setFilters([...pendingFilters]);
    };

    const clearAllFilters = () => {
        setPendingFilters([]);
        setFilters([]);
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
                                    {filters.length > 0 && ` • Активных фильтров: ${filters.length}`}
                                    {hiddenColumns.size > 0 && ` • Скрыто колонок: ${hiddenColumns.size}`}
                                </div>
                                <div className="control-buttons">
                                    <button 
                                        className="filters-toggle-btn"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        {showFilters ? '👁️ Скрыть фильтры' : '👁️ Показать фильтры'}
                                    </button>
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

                        {/* Легенда цветовой маркировки */}
                        <div className="color-legend">
                            <div className="legend-title">Цветовая маркировка результатов:</div>
                            <div className="legend-items">
                                <div className="legend-item">
                                    <div className="color-box high"></div>
                                    <span>Высокий (600-800)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box medium"></div>
                                    <span>Средний (400-599)</span>
                                </div>
                                <div className="legend-item">
                                    <div className="color-box low"></div>
                                    <span>Низкий (200-399)</span>
                                </div>
                            </div>
                        </div>

                        {/* Система фильтров */}
                        {showFilters && (
                            <div className="filters-system">
                                <div className="filters-header">
                                    <h3>Система фильтров</h3>
                                    <div className="filters-controls">
                                        <div className="add-filter-dropdown">
                                            <select 
                                                className="filter-select"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value.startsWith('basic:')) {
                                                        addBasicFilter(value.replace('basic:', ''));
                                                    } else if (value.startsWith('numeric:')) {
                                                        addNumericFilter(value.replace('numeric:', ''));
                                                    }
                                                    e.target.value = '';
                                                }}
                                            >
                                                <option value="">+ Добавить фильтр</option>
                                                <optgroup label="Базовые сведения">
                                                    {basicFields.map(field => (
                                                        <option key={field} value={`basic:${field}`}>
                                                            {fieldNames[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Компетенции, мотиваторы, ценности">
                                                    {numericFields.map(field => (
                                                        <option key={field} value={`numeric:${field}`}>
                                                            {fieldNames[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="filters-action-buttons">
                                            {(pendingFilters.length > 0 || filters.length > 0) && (
                                                <>
                                                    <button 
                                                        className="apply-filters-btn"
                                                        onClick={applyFilters}
                                                        disabled={pendingFilters.length === 0}
                                                    >
                                                        ✅ Применить фильтры
                                                    </button>
                                                    <button 
                                                        className="clear-filters-btn"
                                                        onClick={clearAllFilters}
                                                    >
                                                        🗑️ Очистить все
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ожидающие применения фильтры */}
                                <div className="pending-filters">
                                    {pendingFilters.map(filter => (
                                        <div key={filter.id} className="filter-item pending">
                                            <div className="filter-header">
                                                <span className="filter-name">
                                                    {fieldNames[filter.field]}
                                                </span>
                                                <button 
                                                    className="remove-filter-btn"
                                                    onClick={() => removePendingFilter(filter.id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            
                                            {filter.type === 'basic' && (
                                                <div className="filter-content">
                                                    <select 
                                                        multiple
                                                        className="multi-select"
                                                        value={filter.selectedValues}
                                                        onChange={(e) => {
                                                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                            updatePendingBasicFilter(filter.id, selected);
                                                        }}
                                                    >
                                                        {availableValues[filter.field]?.map(value => (
                                                            <option key={value} value={value}>
                                                                {value}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="filter-hint">
                                                        Выберите значения (удерживайте Ctrl для множественного выбора)
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {filter.type === 'numeric' && (
                                                <div className="filter-content">
                                                    <div className="range-inputs">
                                                        <div className="range-input">
                                                            <label>От:</label>
                                                            <input
                                                                type="number"
                                                                min="200"
                                                                max="800"
                                                                value={filter.min}
                                                                onChange={(e) => updatePendingNumericFilter(filter.id, parseInt(e.target.value), filter.max)}
                                                            />
                                                        </div>
                                                        <div className="range-input">
                                                            <label>До:</label>
                                                            <input
                                                                type="number"
                                                                min="200"
                                                                max="800"
                                                                value={filter.max}
                                                                onChange={(e) => updatePendingNumericFilter(filter.id, filter.min, parseInt(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="range-display">
                                                        Диапазон: {filter.min} - {filter.max}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Активные фильтры */}
                                {filters.length > 0 && (
                                    <div className="active-filters-section">
                                        <div className="active-filters-header">
                                            <h4>Активные фильтры:</h4>
                                        </div>
                                        <div className="active-filters">
                                            {filters.map(filter => (
                                                <div key={filter.id} className="filter-item active">
                                                    <div className="filter-header">
                                                        <span className="filter-name">
                                                            {fieldNames[filter.field]}
                                                        </span>
                                                        <span className="filter-status">✓ Применен</span>
                                                    </div>
                                                    
                                                    {filter.type === 'basic' && (
                                                        <div className="filter-content">
                                                            <div className="selected-values">
                                                                Выбрано значений: {filter.selectedValues.length}
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {filter.type === 'numeric' && (
                                                        <div className="filter-content">
                                                            <div className="range-display">
                                                                Диапазон: {filter.min} - {filter.max}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                                            className={`${getColumnClass(fieldKey)} ${getValueColorClass(getFieldValue(result, fieldKey), fieldKey)}`}
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
                                            {filters.length > 0 ? 'Попробуйте изменить параметры фильтрации' : 'Загрузите данные или создайте фильтры'}
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
