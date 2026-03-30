import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import FlexRow from '../../components/FlexRow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import ColorBox, { BOX_COLOR } from '../../components/ui/ColorBox.jsx';
import Button, { BUTTON_PALETTE } from '../../components/ui/Button.jsx';
import Label from '../../components/ui/Label.jsx';
import { FIELD_NAMES, LINK_TREE } from "../../utilities.js";
import {
    postPortraitCreateDataSession, postPortraitExportSelectedResults, postPortraitGetSessionData,
    postPortraitLoadMoreData, postPortraitUpdateSessionColumns, postPortraitUpdateSessionFilters
} from '../../api.js';

import "./AdminResultsView.scss";

function AdminResultsView() {
    const [sessionId, setSessionId] = useState(null);
    const [results, setResults] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [loading, setLoading] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState(new Set());
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [filters, setFilters] = useState([]);
    const [availableValues, setAvailableValues] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [pendingFilters, setPendingFilters] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [showGroupingModal, setShowGroupingModal] = useState(false);
    const [groupingColumn, setGroupingColumn] = useState('');
    const navigate = useNavigate();

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
        ...Object.keys(FIELD_NAMES).filter(key => 
            key.startsWith('res_comp_') || 
            key.startsWith('res_mot_')  || 
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

    // Определение категории результата
    const getResultCategory = (value) => {
        if (value === null || value === undefined || value === '') return 'no-data';
        if (value >= 600) return 'high';
        if (value >= 400) return 'medium';
        if (value >= 200) return 'low';
        return 'no-data';
    };

    // Получение класса цвета в зависимости от значения
    const getValueColorClass = (value, fieldKey) => {
        const isNumericField = (
            fieldKey.startsWith('res_comp_') ||
            fieldKey.startsWith('res_mot_')  ||
            fieldKey.startsWith('res_val_')
        );
        
        if (!isNumericField) return '';
        
        const category = getResultCategory(value);
        return `value-${category}`;
    };

    // Инициализация сессии
    useEffect(() => {
        initializeSession();
    }, []);

    // Инициализация сессии
    const initializeSession = async () => {
        setLoading(true);
        postPortraitCreateDataSession()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setSessionId(data.session_id);
                    await loadSessionData(data.session_id);  // Загружаем начальные данные
                } else {
                    console.error("Failed to create session:", data.message);
                }
            })
            .onError(error => {console.error("Failed to create session:", error);})
            .finally(() => setLoading(false));
    };

    // Загрузка данных сессии
    const loadSessionData = async (sessionIdToLoad = sessionId) => {
        if (!sessionIdToLoad) return;
        
        setLoading(true);

        postPortraitGetSessionData(sessionIdToLoad)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setResults(data.results || []);
                    setTotalCount(data.total_count || 0);
                    setHasMore(data.results?.length > 0 && data.total_count > data.results.length);  // Проверяем, есть ли ещё данные для загрузки (лимит 1000 записей)
                    if (data.results && data.results.length > 0) {                                   // Извлекаем доступные значения для фильтрации
                        extractAvailableValues(data.results);
                    }
                }
            })
            .onError(error => console.error("Error loading session data:", error))
            .finally(() => setLoading(false));
    };

    // Загрузка дополнительных данных
    const loadMoreData = async () => {
        if (!sessionId || !hasMore) return;
        
        setLoading(true);

        postPortraitLoadMoreData(sessionId)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setResults(prev => [...prev, ...(data.results || [])]);
                    setHasMore(data.results?.length > 0 && data.total_count > results.length + data.results.length);
                }
            })
            .onError(error => console.error("Error loading more data:", error))
            .finally(() => setLoading(false));
    };

    // Обновление фильтров сессии
    const updateSessionFilters = async (newFilters) => {
        if (!sessionId) return;

        postPortraitUpdateSessionFilters(sessionId, newFilters)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    await loadSessionData();     // Перезагружаем данные с новыми фильтрами
                    setSelectedRows(new Set());  // Сбрасываем выделение при изменении фильтров
                }
            })
            .onError(error => console.error("Error updating session filters:", error));
    };

    // Обновление видимых колонок сессии
    const updateSessionColumns = async (newHiddenColumns) => {
        if (!sessionId) return;
        
        const visibleColumns = columnOrder.filter(col => !newHiddenColumns.has(col));

        postPortraitUpdateSessionColumns(sessionId, visibleColumns)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setHiddenColumns(newHiddenColumns);  // Обновляем локальное состояние
                }
            })
            .onError(error => console.error("Error updating session columns:", error));
    };

    // Извлечение доступных значений для фильтрации
    const extractAvailableValues = (resultsData) => {
        const values = {};
        
        basicFields.forEach(field => {
            const uniqueValues = new Set();
            resultsData.forEach(result => {
                const value = getFieldValue(result, field);
                if (value !== '' && value !== null && value !== undefined) {
                    uniqueValues.add(value);
                }
            });
            values[field] = Array.from(uniqueValues).sort();
        });

        setAvailableValues(values);
    };

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
        
        // Временная сортировка на клиенте
        const sortedResults = [...results].sort((a, b) => {
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
        
        setResults(sortedResults);
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
        if (selectedRows.size === results.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(results.map(r => r.res_id)));
        }
    };

    const handleExportSelected = async () => {
        if (!sessionId) {
            alert('Сессия не инициализирована');
            return;
        }

        if (selectedRows.size === 0) {
            alert('Выберите записи для выгрузки (флажки в первом столбце)');
            return;
        }

        setExportLoading(true);

        postPortraitExportSelectedResults(sessionId, Array.from(selectedRows))
            .onSuccess(async response => {
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `selected_results_${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                } else {
                    const errorData = await response.json();
                    alert(`Ошибка при выгрузке данных: ${errorData.message}`);
                }
            })
            .onError(error => {
                console.error("Export error:", error);
                alert('Ошибка при выгрузке данных');
            })
            .finally(() => setExportLoading(false));
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

    const applyFilters = async () => {
        await updateSessionFilters(pendingFilters);
        setFilters([...pendingFilters]);
    };

    const clearAllFilters = async () => {
        setPendingFilters([]);
        await updateSessionFilters([]);
        setFilters([]);
    };

    const toggleColumn = (columnKey) => {
        const newHidden = new Set(hiddenColumns);
        if (newHidden.has(columnKey)) {
            newHidden.delete(columnKey);
        } else {
            newHidden.add(columnKey);
        }
        updateSessionColumns(newHidden);
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
        
        updateSessionColumns(newHidden);
    };

    const showAllColumns = () => {
        updateSessionColumns(new Set());
    };

    const hideAllColumns = () => {
        updateSessionColumns(new Set(columnOrder));
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

    // Функция для перехода к группировке
    const handleGrouping = () => {
        if (selectedRows.size === 0) {
            alert('Выберите записи для группировки (флажки в первом столбце)');
            return;
        }
        setShowGroupingModal(true);
    };

    const handleConfirmGrouping = () => {
        if (!groupingColumn) {
            alert('Выберите столбец для группировки');
            return;
        }

        // Сохраняем данные для группировки в sessionStorage или передаем через state
        const groupingData = {
            selectedIds: Array.from(selectedRows),
            groupingColumn: groupingColumn,
            filters: filters,
            visibleColumns: visibleColumns,
            sessionId: sessionId
        };

        // Переходим на страницу группировки
        navigate('/admin/grouping', { state: groupingData });
    };

    return (
        <div className="AdminResultsView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Результаты тестирования" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="results-container">
                        <div className="results-header">
                            <h2>Результаты тестирования</h2>
                            <FlexRow>
                                <Label>
                                    {sessionId ? <>
                                        Показано: {results.length} из {totalCount} записей
                                        {filters.length > 0 && ` • Активных фильтров: ${filters.length}`}
                                        {hiddenColumns.size > 0 && ` • Скрыто колонок: ${hiddenColumns.size}`}
                                        {selectedRows.size > 0 && ` • Выбрано: ${selectedRows.size}`}
                                    </> : "Инициализация..."}
                                </Label>
                                <Button
                                    text={showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                                    onClick={() => setShowFilters(!showFilters)}
                                    palette={BUTTON_PALETTE.YELLOW}
                                />
                                <Button
                                    text="Колонки"
                                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                                    disabled={!sessionId}
                                    palette={BUTTON_PALETTE.PURPLE}
                                />
                                <Button
                                    text="Группировка"
                                    onClick={handleGrouping}
                                    disabled={!sessionId || selectedRows.size === 0}
                                    palette={BUTTON_PALETTE.PURPLE}
                                />
                                <Button
                                    text={exportLoading ? "Загрузка..." : `Выгрузить выделенные (${selectedRows.size})`}
                                    onClick={handleExportSelected}
                                    disabled={!sessionId || exportLoading || selectedRows.size === 0}
                                    palette={BUTTON_PALETTE.GREEN}
                                />
                                <Button
                                    text={loading ? "Загрузка..." : "Обновить"}
                                    onClick={() => loadSessionData()}
                                    disabled={!sessionId || loading}
                                    palette={BUTTON_PALETTE.CYAN}
                                />

                            </FlexRow>
                        </div>

                        {/* Система фильтров */}
                        {showFilters && (
                            <div className="filters-system">
                                <div className="filters-header">
                                    <h3>Фильтры</h3>
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
                                                disabled={!sessionId}
                                            >
                                                <option value="">+ Добавить фильтр</option>
                                                <optgroup label="Базовые сведения">
                                                    {basicFields.map(field => (
                                                        <option key={field} value={`basic:${field}`}>
                                                            {FIELD_NAMES[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Компетенции, мотиваторы, ценности">
                                                    {numericFields.map(field => (
                                                        <option key={field} value={`numeric:${field}`}>
                                                            {FIELD_NAMES[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="filters-action-buttons">
                                            {(pendingFilters.length > 0 || filters.length > 0) && (
                                                <>
                                                    <Button
                                                        text={loading ? "Загрузка..." : "Применить"}
                                                        onClick={applyFilters}
                                                        disabled={pendingFilters.length === 0 || !sessionId || loading}
                                                        palette={BUTTON_PALETTE.GREEN}
                                                    />
                                                    <Button
                                                        text="Очистить"
                                                        onClick={clearAllFilters}
                                                        disabled={!sessionId || loading}
                                                        palette={BUTTON_PALETTE.RED}
                                                    />
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
                                                    {FIELD_NAMES[filter.field]}
                                                </span>
                                                {/* <Button
                                                    text="✕"
                                                    onClick={() => removePendingFilter(filter.id)}
                                                    palette={BUTTON_PALETTE.RED}
                                                /> */}
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
                                                            {FIELD_NAMES[filter.field]}
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
                                        <Button
                                            text="Показать все"
                                            onClick={showAllColumns}
                                            disabled={!sessionId || loading}
                                            palette={BUTTON_PALETTE.BLUE}
                                        />
                                        <Button
                                            text="Скрыть все"
                                            onClick={hideAllColumns}
                                            disabled={!sessionId || loading}
                                            palette={BUTTON_PALETTE.BLUE}
                                        />
                                        <Button
                                            text="✕"
                                            onClick={() => setShowColumnSelector(false)}
                                            palette={BUTTON_PALETTE.RED}
                                        />
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
                                                            disabled={!sessionId || loading}
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
                                                                disabled={!sessionId || loading}
                                                            />
                                                            <span className="column-name">
                                                                {FIELD_NAMES[columnKey]}
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
                        {loading && results.length === 0 ? (
                            <div className="loading">
                                <div className="spinner"></div>
                                <div className="loading-text">
                                    <span>{sessionId ? 'Загрузка данных...' : 'Инициализация сессии...'}</span>
                                    <Label>{totalCount} записей</Label>
                                </div>
                            </div>
                        ) : (
                            <div className="table-scroll-container">
                                <table className="results-table">
                                    <thead>
                                        <tr>
                                            <th className="sticky-col">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.size === results.length && results.length > 0}
                                                    onChange={handleSelectAll}
                                                    disabled={!sessionId}
                                                />
                                            </th>
                                            {visibleColumns.map(fieldKey => (
                                                <th 
                                                    key={fieldKey} 
                                                    onClick={() => handleSort(fieldKey)}
                                                    className={`${getColumnClass(fieldKey)} ${hiddenColumns.has(fieldKey) ? 'hidden' : ''}`}
                                                >
                                                    {FIELD_NAMES[fieldKey]} {getSortIcon(fieldKey)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result) => (
                                            <tr key={result.res_id} className={selectedRows.has(result.res_id) ? 'selected' : ''}>
                                                <td className="sticky-col">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(result.res_id)}
                                                        onChange={() => handleRowSelect(result.res_id)}
                                                        disabled={!sessionId}
                                                    />
                                                </td>
                                                {visibleColumns.map(fieldKey => (
                                                    <td 
                                                        key={fieldKey}
                                                        className={`${getColumnClass(fieldKey)} ${getValueColorClass(getFieldValue(result, fieldKey), fieldKey)}`}
                                                        title={renderTableCell(result, fieldKey)}
                                                    >
                                                        {renderTableCell(result, fieldKey)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                
                                {results.length === 0 && !loading && sessionId && (
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

                        {/* Подсказка снизу */}
                        <FlexRow>
                            <Label>
                                <FlexRow gap="20">
                                    <span>↸ Категории результатов:</span>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.GREEN} />
                                        <span>Высокий (600-800)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.LIME} />
                                        <span>Средний (400-599)</span>
                                    </FlexRow>
                                    <FlexRow>
                                        <ColorBox color={BOX_COLOR.YELLOW} />
                                        <span>Низкий (200-399)</span>
                                    </FlexRow>
                                </FlexRow>
                            </Label>

                            <Label>
                                Колонок: {visibleColumns.length}/{columnOrder.length} • 
                                Записей: {results.length}{hasMore && '+'} •
                                Выбрано: {selectedRows.size}
                            </Label>

                            {/* Кнопка загрузки дополнительных данных */}
                            {hasMore && (
                                <Button
                                    text={loading ? 'Загрузка...' : "Загрузить ещё"}
                                    onClick={loadMoreData}
                                    disabled={loading}
                                    palette={BUTTON_PALETTE.BLUE}
                                />
                            )}
                        </FlexRow>

                        {/* Модальное окно выбора столбца для группировки */}
                        {showGroupingModal && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h3>Выбор группировки</h3>
                                        <button 
                                            className="close-btn"
                                            onClick={() => setShowGroupingModal(false)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="form-group">
                                            <label>Столбец для группировки:</label>
                                            <select 
                                                value={groupingColumn}
                                                onChange={(e) => setGroupingColumn(e.target.value)}
                                                className="grouping-select"
                                            >
                                                <option value="">Выберите столбец...</option>
                                                <optgroup label="Базовые сведения">
                                                    {basicFields.map(field => (
                                                        <option key={field} value={field}>
                                                            {FIELD_NAMES[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="selected-info">
                                            <p>Выбрано записей: <strong>{selectedRows.size}</strong></p>
                                            <p>Будет выполнена группировка по выбранному столбцу с визуализацией данных.</p>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <Button
                                            text="Отмена"
                                            onClick={() => setShowGroupingModal(false)}
                                            palette={BUTTON_PALETTE.GRAY}
                                        />
                                        <Button
                                            text="Перейти к группировке"
                                            onClick={handleConfirmGrouping}
                                            disabled={!groupingColumn}
                                            palette={BUTTON_PALETTE.BLUE}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminResultsView;
