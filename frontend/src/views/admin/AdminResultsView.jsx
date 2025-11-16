import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import { FIELD_NAMES } from "../../utilities.js";

import "./AdminResultsView.scss";
import Button from '../../components/ui/Button.jsx';

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

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

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
        try {
            const response = await fetch('http://localhost:8000/portrait/create-data-session/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setSessionId(data.session_id);
                // Загружаем начальные данные
                await loadSessionData(data.session_id);
            } else {
                console.error('Failed to create session:', data.message);
            }
        } catch (error) {
            console.error('Error initializing session:', error);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка данных сессии
    const loadSessionData = async (sessionIdToLoad = sessionId) => {
        if (!sessionIdToLoad) return;
        
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/get-session-data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionIdToLoad
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setResults(data.results || []);
                setTotalCount(data.total_count || 0);
                // Проверяем, есть ли еще данные для загрузки (лимит 1000 записей)
                setHasMore(data.results?.length > 0 && data.total_count > data.results.length);
                
                // Извлекаем доступные значения для фильтрации
                if (data.results && data.results.length > 0) {
                    extractAvailableValues(data.results);
                }
            }
        } catch (error) {
            console.error('Error loading session data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка дополнительных данных
    const loadMoreData = async () => {
        if (!sessionId || !hasMore) return;
        
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/load-more-data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setResults(prev => [...prev, ...(data.results || [])]);
                setHasMore(data.results?.length > 0 && data.total_count > results.length + data.results.length);
            }
        } catch (error) {
            console.error('Error loading more data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Обновление фильтров сессии
    const updateSessionFilters = async (newFilters) => {
        if (!sessionId) return;
        
        try {
            const response = await fetch('http://localhost:8000/portrait/update-session-filters/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    filters: newFilters
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Перезагружаем данные с новыми фильтрами
                await loadSessionData();
                // Сбрасываем выделение при изменении фильтров
                setSelectedRows(new Set());
            }
        } catch (error) {
            console.error('Error updating session filters:', error);
        }
    };

    // Обновление видимых колонок сессии
    const updateSessionColumns = async (newHiddenColumns) => {
        if (!sessionId) return;
        
        const visibleColumns = columnOrder.filter(col => !newHiddenColumns.has(col));
        
        try {
            const response = await fetch('http://localhost:8000/portrait/update-session-columns/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    visible_columns: visibleColumns
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Обновляем локальное состояние
                setHiddenColumns(newHiddenColumns);
            }
        } catch (error) {
            console.error('Error updating session columns:', error);
        }
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
        try {
            const response = await fetch('http://localhost:8000/portrait/export-selected-results/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    selected_ids: Array.from(selectedRows)
                })
            });

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
        } catch (error) {
            console.error('Export error:', error);
            alert('Ошибка при выгрузке данных');
        } finally {
            setExportLoading(false);
        }
    };

    const handleExportAll = async () => {
        if (!sessionId) {
            alert('Сессия не инициализирована');
            return;
        }

        setExportLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/export-session-data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `all_results_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const errorData = await response.json();
                alert(`Ошибка при выгрузке данных: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Ошибка при выгрузке данных');
        } finally {
            setExportLoading(false);
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
            <Header title="Админ: Результаты тестирования" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                    <div className="results-container">
                        <div className="results-header">
                            <h2>Результаты тестирования</h2>
                            <div className="controls">
                                <div className="results-info">
                                    {sessionId ? (
                                        <span>
                                            Показано: {results.length} из {totalCount} записей
                                            {filters.length > 0 && ` • Активных фильтров: ${filters.length}`}
                                            {hiddenColumns.size > 0 && ` • Скрыто колонок: ${hiddenColumns.size}`}
                                            {selectedRows.size > 0 && ` • Выбрано: ${selectedRows.size}`}
                                        </span>
                                    ) : (
                                        'Инициализация сессии...'
                                    )}
                                </div>
                                <div className="control-buttons">
                                    <Button
                                        text={showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                                        onClick={() => setShowFilters(!showFilters)}
                                        fg="#212529"
                                        bg="#ffc107"
                                        hoverBg="#e0a800"
                                    />
                                    <Button
                                        text="Колонки"
                                        onClick={() => setShowColumnSelector(!showColumnSelector)}
                                        disabled={!sessionId}
                                        fg="white"
                                        bg="#6f42c1"
                                        hoverBg="#5a32a3"
                                    />
                                    <Button
                                        text="Группировка"
                                        onClick={handleGrouping}
                                        disabled={!sessionId || selectedRows.size === 0}
                                        fg="white"
                                        bg="#6f42c1"
                                        hoverBg="#5a32a3"
                                        disabledBg="#6c757d"
                                    />
                                    <Button
                                        text={`${exportLoading ? '⏳' : '📥'} Выгрузить выделенные (${selectedRows.size})`}
                                        onClick={handleExportSelected}
                                        disabled={!sessionId || exportLoading || selectedRows.size === 0}
                                        fg="white"
                                        bg="#28a745"
                                        hoverBg="#218838"
                                        disabledBg="#6c757d"
                                    />
                                    {/*<Button
                                        text={`${exportLoading ? '⏳' : '📋'} Выгрузить все`}
                                        onClick={handleExportAll}
                                        disabled={!sessionId || exportLoading}
                                        fg="white"
                                        bg="#17a2b8"
                                        hoverBg="#138496"
                                        disabledBg="#6c757d"
                                    />*/}
                                    <Button
                                        text={`${loading ? '⏳' : '🔄'} Обновить`}
                                        onClick={() => loadSessionData()}
                                        disabled={!sessionId || loading}
                                        fg="white"
                                        bg="#17a2b8"
                                        hoverBg="#138496"
                                        disabledBg="#6c757d"
                                    />
                                </div>
                            </div>
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
                                                        text={`${loading ? '⏳' : '✅'} Применить фильтры`}
                                                        onClick={applyFilters}
                                                        disabled={pendingFilters.length === 0 || !sessionId || loading}
                                                        fg="white"
                                                        bg="#28a745"
                                                        hoverBg="#218838"
                                                        disabledBg="#6c757d"
                                                    />
                                                    <Button
                                                        text="Очистить все"
                                                        onClick={clearAllFilters}
                                                        disabled={!sessionId || loading}
                                                        fg="white"
                                                        bg="#dc3545"
                                                        hoverBg="#c82333"
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
                                                { /*<Button
                                                    text="✕"
                                                    onClick={() => removePendingFilter(filter.id)}
                                                    fg="#dc3545"
                                                    bg="none"
                                                    hoverFg="white"
                                                    hoverBg="#dc3545"
                                                />*/ }
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
                                            bg="white"
                                            border="1px solid #ced4da"
                                            hoverFg="white"
                                            hoverBg="#007bff"
                                            hoverBorder="1px solid #007bff"
                                            hoverTransform="none"
                                        />
                                        <Button
                                            text="Скрыть все"
                                            onClick={hideAllColumns}
                                            disabled={!sessionId || loading}
                                            bg="white"
                                            border="1px solid #ced4da"
                                            hoverFg="white"
                                            hoverBg="#007bff"
                                            hoverBorder="1px solid #007bff"
                                            hoverTransform="none"
                                        />
                                        <Button
                                            text="✕ Закрыть"
                                            onClick={() => setShowColumnSelector(false)}
                                            fg="white"
                                            bg="#dc3545"
                                            border="1px solid #dc3545"
                                            hoverBg="#c82333"
                                            hoverBorder="1px solid #bd2130"
                                            hoverTransform="none"
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
                                    {sessionId ? 'Загрузка данных...' : 'Инициализация сессии...'} 
                                    <span className="record-count">{totalCount}</span> записей
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
                                </div>
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
                        <div className="scroll-hint">
                            <span className="color-legend">
                                <span className="legend-title">↸ Категории результатов:</span>
                                <span className="legend-items">
                                    <span className="legend-item">
                                        <span className="color-box high"></span>
                                        <span>Высокий (600-800)</span>
                                    </span>
                                    <span className="legend-item">
                                        <span className="color-box medium"></span>
                                        <span>Средний (400-599)</span>
                                    </span>
                                    <span className="legend-item">
                                        <span className="color-box low"></span>
                                        <span>Низкий (200-399)</span>
                                    </span>
                                </span>
                            </span>

                            {/* Кнопка загрузки дополнительных данных */}
                            {hasMore && (
                                <Button
                                    text={loading ? 'Загрузка...' : "Загрузить ещё"}
                                    onClick={loadMoreData}
                                    disabled={loading}
                                    fg="white"
                                    bg="#007bff"
                                    hoverBg="#0056b3"
                                    disabledBg="#6c757d"
                                />
                            )}

                            <span className="record-count">
                                Колонок: {visibleColumns.length}/{columnOrder.length} • 
                                Записей: {results.length}{hasMore && '+'} •
                                Выбрано: {selectedRows.size}
                            </span>
                        </div>

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
                                            fg="#6c757d"
                                            bg="white"
                                            border="1px solid #6c757d"
                                            hoverBg="#6c757d"
                                            hoverFg="white"
                                        />
                                        <Button
                                            text="Перейти к группировке"
                                            onClick={handleConfirmGrouping}
                                            disabled={!groupingColumn}
                                            fg="white"
                                            bg="#007bff"
                                            hoverBg="#0056b3"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminResultsView;
