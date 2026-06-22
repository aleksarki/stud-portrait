import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    postPortraitDataseshNew,
    postPortraitDataseshExportSelected,
    postPortraitDataseshExtractData,
    postPortraitDataseshUpdateWindow,
    postPortraitDataseshUpdateColumns,
    postPortraitDataseshUpdateFilters
} from '../../api.js';
import {
    COMPETENCIES_NAMES, FIELD_NAMES, LINK_TREE,
    MOTIVATORS_NAMES, VALUES_NAMES
} from "../../utilities.js";

import FlexColumn from '../../components/FlexColumn.jsx';
import FlexRow, { WRAP } from '../../components/FlexRow.jsx';
import LabelledBox from '../../components/LabelledBox.jsx';
import { ModalBody, ModalFooter, useModalWindow } from '../../components/ModalWindow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import Table, { TableHeader, TableItem, TableRow } from '../../components/tables/Table.jsx';

import Button from '../../components/ui/Button.jsx';
import ColorBox, { BOX_COLOR } from '../../components/ui/ColorBox.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Label from '../../components/ui/Label.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import MultiSelect from "../../components/ui/MultiSelect.jsx";
import NumberField from '../../components/ui/NumberField.jsx';
import { ADMIN_PALETTE } from '../../components/ui/palette.js';
import Select, { Option, OptionGroup } from "../../components/ui/Select.jsx";

import "./AdminResultsView.scss";

function AdminResultsView() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    const [pendingFilters, setPendingFilters] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [groupingColumn, setGroupingColumn] = useState('');
    const navigate = useNavigate();

    const [FiltersModalWindow, _1, setFiltersModalWindowVisible] = useModalWindow("Фильтры");
    const [GrouppingModalWindow, _2, setGrouppingModalVisible] = useModalWindow("Выбор группировки");

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
        ...Object.keys(COMPETENCIES_NAMES),
        ...Object.keys(MOTIVATORS_NAMES),
        ...Object.keys(VALUES_NAMES)
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

        ...Object.keys(COMPETENCIES_NAMES),
        ...Object.keys(MOTIVATORS_NAMES),
        ...Object.keys(VALUES_NAMES)
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

    // Получение класса цвета в зависимости от значения
    const getValueColorClass = (value, fieldKey) => {
        const isNumericField = (
            fieldKey.startsWith('res_comp_') ||
            fieldKey.startsWith('res_mot_')  ||
            fieldKey.startsWith('res_val_')
        );
        
        if (!isNumericField) return '';

        if (value === null || value === undefined || value === '') return 'no-value';
        if (value >= 600) return 'high';
        if (value >= 400) return 'medium';
        if (value >= 200) return 'low';

        return 'no-value';
    };

    // Получение класса цвета в зависимости от профиля
    const getProfileColorClass = fieldKey => {
        if (fieldKey.startsWith('res_comp_')) return 'competency';
        if (fieldKey.startsWith('res_mot_')) return 'motivator';
        if (fieldKey.startsWith('res_val_')) return 'value';

        return '';
    };

    // Инициализация сессии
    useEffect(() => {
        initializeSession();
    }, []);

    // Инициализация сессии
    const initializeSession = async () => {
        setLoading(true);
        postPortraitDataseshNew()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setSessionId(data.session.id);
                    await loadSessionData(data.session.id);  // Загружаем начальные данные
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

        postPortraitDataseshExtractData(sessionIdToLoad)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setResults(data.results || []);
                    setTotalCount(data.filtered_count || 0);
                    setHasMore(data.shown_count > 0 && data.filtered_count > data.shown_count);  // Проверяем, есть ли ещё данные для загрузки (лимит 1000 записей)
                    if (data.results && data.shown_count > 0) {                                  // Извлекаем доступные значения для фильтрации
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

        postPortraitDataseshUpdateWindow(sessionId, 0, 1000)  // FIXME
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    await loadSessionData();
                    setSelectedRows(new Set());
                } 
            })
            .onError(error => console.error("Error loading more data:", error))
            .finally(() => setLoading(false));
    };

    // Обновление фильтров сессии
    const updateSessionFilters = async (newFilters) => {
        if (!sessionId) return;

        postPortraitDataseshUpdateFilters(sessionId, newFilters)
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

        postPortraitDataseshUpdateColumns(sessionId, visibleColumns)
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

    // Извлечение полей из результата
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

        postPortraitDataseshExportSelected(sessionId, Array.from(selectedRows))
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
        setGrouppingModalVisible(true);
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
                <Header title="Админ: Результаты тестирования" name={user.username} />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="results-container">
                        <div className="results-header">
                            <h2>Результаты тестирования</h2>
                            <FlexRow wrap={WRAP.DO}>
                                <Button
                                    text="Фильтры..."
                                    onClick={() => setFiltersModalWindowVisible(filters)}
                                    palette={ADMIN_PALETTE.YELLOW}
                                />
                                <Button
                                    text="Колонки"
                                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                                    disabled={!sessionId}
                                    palette={ADMIN_PALETTE.PURPLE}
                                />
                                <Button
                                    text="Группировка"
                                    onClick={handleGrouping}
                                    disabled={!sessionId || selectedRows.size === 0}
                                    palette={ADMIN_PALETTE.PURPLE}
                                />
                                <Button
                                    text={exportLoading ? "Загрузка..." : `Выгрузить выделенные (${selectedRows.size})`}
                                    onClick={handleExportSelected}
                                    disabled={!sessionId || exportLoading || selectedRows.size === 0}
                                    palette={ADMIN_PALETTE.GREEN}
                                />
                                <Button
                                    text={loading ? "Загрузка..." : "Обновить"}
                                    onClick={() => loadSessionData()}
                                    disabled={!sessionId || loading}
                                    palette={ADMIN_PALETTE.CYAN}
                                />
                                <Label>
                                    {sessionId ? <>
                                        Показано: {results.length} из {totalCount} записей
                                        {filters.length > 0 && ` • Активных фильтров: ${filters.length}`}
                                        {hiddenColumns.size > 0 && ` • Скрыто колонок: ${hiddenColumns.size}`}
                                        {selectedRows.size > 0 && ` • Выбрано: ${selectedRows.size}`}
                                    </> : "Инициализация..."}
                                </Label>
                            </FlexRow>
                        </div>

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
                                            palette={ADMIN_PALETTE.BLUE}
                                        />
                                        <Button
                                            text="Скрыть все"
                                            onClick={hideAllColumns}
                                            disabled={!sessionId || loading}
                                            palette={ADMIN_PALETTE.BLUE}
                                        />
                                        <Button
                                            text="✕"
                                            onClick={() => setShowColumnSelector(false)}
                                            palette={ADMIN_PALETTE.RED}
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

                        {/* Таблица с прокруткой */}
                        {loading || !results.length ? (
                            <div className="loading">
                                <LoadingSpinner text={sessionId ? 'Загрузка данных...' : 'Инициализация сессии...'} />
                            </div>
                        ) : (
                            <div className="table-scroll-container">
                                <Table>
                                    <TableHeader>
                                        <TableItem>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size === results.length && results.length > 0}
                                                onChange={handleSelectAll}
                                                disabled={!sessionId}
                                            />
                                        </TableItem>
                                        {visibleColumns.map(fieldKey => (
                                            <TableItem
                                                onClick={() => handleSort(fieldKey)}
                                                className={getProfileColorClass(fieldKey)}
                                                title={FIELD_NAMES[fieldKey]}
                                            >
                                                {FIELD_NAMES[fieldKey]} {getSortIcon(fieldKey)}
                                            </TableItem>
                                        ))}
                                    </TableHeader>
                                    {results.map(result => (
                                        <TableRow
                                            key={result.res_id}
                                            className={selectedRows.has(result.res_id) ? 'selected' : ''}
                                        >
                                            <TableItem>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(result.res_id)}
                                                    onChange={() => handleRowSelect(result.res_id)}
                                                    disabled={!sessionId}
                                                />
                                            </TableItem>
                                            {visibleColumns.map(fieldKey => (
                                                <TableItem
                                                    key={fieldKey}
                                                    className={getValueColorClass(getFieldValue(result, fieldKey), fieldKey)}
                                                    title={renderTableCell(result, fieldKey)}
                                                >
                                                    {renderTableCell(result, fieldKey)}
                                                </TableItem>
                                            ))}
                                        </TableRow>
                                    ))}
                                </Table>
                                
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
                                    palette={ADMIN_PALETTE.BLUE}
                                />
                            )}
                        </FlexRow>
                    </div>
                </Content>
            </SidebarLayout>

            {/* Модальное окно системы фильтров */}
            <FiltersModalWindow>
                <ModalBody>
                    <div className="filters-modal-body">
                        <FlexRow wrap={WRAP.DO}>
                            <Dropdown label="+ Добавить фильтр" disabled={!sessionId}>
                                <OptionGroup label="Базовые поля">
                                    {basicFields.map(field => (
                                        <Option
                                            value={field}
                                            label={FIELD_NAMES[field]}
                                            onClick={addBasicFilter}
                                        />
                                    ))}
                                </OptionGroup>
                                <OptionGroup label="Компетенции">
                                    {Object.keys(COMPETENCIES_NAMES).map(field => (
                                        <Option
                                            value={field}
                                            label={FIELD_NAMES[field]}
                                            onClick={addNumericFilter}
                                        />
                                    ))}
                                </OptionGroup>
                                <OptionGroup label="Мотиваторы">
                                    {Object.keys(MOTIVATORS_NAMES).map(field => (
                                        <Option
                                            value={field}
                                            label={FIELD_NAMES[field]}
                                            onClick={addNumericFilter}
                                        />
                                    ))}
                                </OptionGroup>
                                <OptionGroup label="Ценности">
                                    {Object.keys(VALUES_NAMES).map(field => (
                                        <Option
                                            value={field}
                                            label={FIELD_NAMES[field]}
                                            onClick={addNumericFilter}
                                        />
                                    ))}
                                </OptionGroup>
                            </Dropdown>
                            {(pendingFilters.length > 0 || filters.length > 0) && (
                                <>
                                    <Button
                                        text={loading ? "Загрузка..." : "Применить"}
                                        onClick={applyFilters}
                                        disabled={pendingFilters.length === 0 || !sessionId || loading}
                                        palette={ADMIN_PALETTE.GREEN}
                                    />
                                    <Button
                                        text="Очистить"
                                        onClick={clearAllFilters}
                                        disabled={!sessionId || loading}
                                        palette={ADMIN_PALETTE.RED}
                                    />
                                </>
                            )}
                        </FlexRow>

                        {/* Ожидающие применения фильтры */}
                        {pendingFilters.length > 0 && <>
                            <h6>Выбранные фильтры:</h6>
                            <FlexColumn className="pending-filters-column" wrap={WRAP.DO}>
                                {pendingFilters.map(filter => (
                                    <LabelledBox label={FIELD_NAMES[filter.field]} bordered>
                                        <FlexRow>
                                            {filter.type === 'basic' ? (
                                                <MultiSelect
                                                    options={availableValues[filter.field]}
                                                    value={filter.selectedValues}
                                                    onChange={selected => updatePendingBasicFilter(filter.id, selected)}
                                                />
                                            ) : <>
                                                <LabelledBox label="От:" nopad inrow>
                                                    <NumberField
                                                        value={filter.min} min="200" max="800"
                                                        onChange={value => updatePendingNumericFilter(filter.id, value, filter.max)}
                                                    />
                                                </LabelledBox>
                                                <LabelledBox label="До:" nopad inrow>
                                                    <NumberField
                                                        value={filter.max} min="200" max="800"
                                                        onChange={value => updatePendingNumericFilter(filter.id, filter.min, value)}
                                                    />
                                                </LabelledBox>
                                            </>}
                                            <Button
                                                text="✕"
                                                onClick={() => removePendingFilter(filter.id)}
                                                palette={ADMIN_PALETTE.RED}
                                            />
                                        </FlexRow>
                                    </LabelledBox>
                                ))}
                            </FlexColumn>
                        </>}

                        {/* Активные фильтры */}
                        {filters.length > 0 && <>
                            <h6>Активные фильтры:</h6>
                            <FlexRow className="active-filters-row" wrap={WRAP.DO}>
                                {filters.map(filter => {
                                    let text = `${FIELD_NAMES[filter.field]}: `;
                                    switch (filter.type) {
                                        case 'basic':
                                            text += `Выбрано значений: ${filter.selectedValues.length}`;
                                            break;
                                        case 'numeric':
                                            text += `Диапазон: ${filter.min} - ${filter.max}`;
                                            break;
                                    }
                                    return <Label text={text} />;
                                })}
                            </FlexRow>
                        </>}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        text="Отмена"
                        onClick={() => setFiltersModalWindowVisible(false)}
                        palette={ADMIN_PALETTE.GRAY}
                    />
                </ModalFooter>
            </FiltersModalWindow>

            {/* Модальное окно выбора столбца для группировки */}
            <GrouppingModalWindow>
                <ModalBody>
                    <div className="groupping-modal-body">
                        <label>Столбец для группировки:</label>
                        <Select
                            initValue={groupingColumn}
                            onChange={setGroupingColumn}
                        >
                            <OptionGroup label="Базовые поля">
                                {basicFields.map(field => (
                                    <Option
                                        value={field}
                                        label={FIELD_NAMES[field]}
                                    />
                                ))}
                            </OptionGroup>
                        </Select>
                        <p>Выбрано записей: <strong>{selectedRows.size}</strong></p>
                        <p>Будет выполнена группировка по выбранному столбцу с визуализацией данных.</p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        text="Отмена"
                        onClick={() => setGrouppingModalVisible(false)}
                        palette={ADMIN_PALETTE.GRAY}
                    />
                    <Button
                        text="Перейти к группировке"
                        onClick={handleConfirmGrouping}
                        disabled={!groupingColumn}
                        palette={ADMIN_PALETTE.BLUE}
                    />
                </ModalFooter>
            </GrouppingModalWindow>
        </div>
    );
}

export default AdminResultsView;
