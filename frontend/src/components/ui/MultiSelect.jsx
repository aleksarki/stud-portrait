import { useState, useEffect, useRef } from 'react';
import './MultiSelect.scss';

function MultiSelect({ 
    options = [],           // Массив опций [{id, name, count}] или просто [strings]
    value = [],             // Выбранные значения
    onChange,               // Callback при изменении
    placeholder = "Выберите...",
    searchPlaceholder = "Поиск...",
    withSearch = true,      // Показывать ли поиск
    label = "",             // Метка
    maxHeight = "300px",    // Максимальная высота списка
    showCounts = false      // Показывать ли счётчики (НОВОЕ!)
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef(null);

    // Закрываем при клике вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Нормализуем опции к единому формату
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'string') {
            return { id: opt, name: opt, count: null };
        }
        return { ...opt, count: opt.count || null };
    });

    // Фильтрация по поиску
    const filteredOptions = searchQuery
        ? normalizedOptions.filter(opt =>
            opt.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : normalizedOptions;

    // Обработка выбора
    const handleToggle = (optionId) => {
        const newValue = value.includes(optionId)
            ? value.filter(v => v !== optionId)
            : [...value, optionId];
        
        onChange(newValue);
    };

    // Выбрать все / Снять все
    const handleSelectAll = () => {
        if (value.length === filteredOptions.length) {
            // Снять все из текущего фильтра
            const filteredIds = filteredOptions.map(opt => opt.id);
            onChange(value.filter(v => !filteredIds.includes(v)));
        } else {
            // Выбрать все из текущего фильтра
            const allIds = [...new Set([...value, ...filteredOptions.map(opt => opt.id)])];
            onChange(allIds);
        }
    };

    // Текст выбранных элементов
    const getSelectedText = () => {
        if (value.length === 0) return placeholder;
        if (value.length === 1) {
            const selected = normalizedOptions.find(opt => opt.id === value[0]);
            return selected ? selected.name : value[0];
        }
        return `Выбрано: ${value.length}`;
    };

    // Подсчёт общего количества для выбранных (НОВОЕ!)
    const getTotalCount = () => {
        if (!showCounts || value.length === 0) return null;
        
        const total = normalizedOptions
            .filter(opt => value.includes(opt.id))
            .reduce((sum, opt) => sum + (opt.count || 0), 0);
        
        return total > 0 ? total : null;
    };

    const totalCount = getTotalCount();

    return (
        <div className="multi-select" ref={dropdownRef}>
            {label && <label className="multi-select-label">{label}</label>}
            
            {/* Триггер */}
            <div 
                className={`multi-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="multi-select-text">
                    {getSelectedText()}
                    {totalCount && (
                        <span className="multi-select-total-count"> ({totalCount})</span>
                    )}
                </span>
                <span className="multi-select-arrow">{isOpen ? '▲' : '▼'}</span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="multi-select-dropdown" style={{ maxHeight }}>
                    {/* Поиск */}
                    {withSearch && (
                        <div className="multi-select-search">
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    {/* Кнопка "Выбрать все" */}
                    <div className="multi-select-actions">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAll();
                            }}
                            className="multi-select-select-all"
                        >
                            {value.length === filteredOptions.length && filteredOptions.length > 0
                                ? '✓ Снять все'
                                : '☐ Выбрать все'}
                        </button>
                    </div>

                    {/* Список опций */}
                    <div className="multi-select-options">
                        {filteredOptions.length === 0 ? (
                            <div className="multi-select-no-results">
                                {searchQuery ? 'Ничего не найдено' : 'Нет доступных опций'}
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <label
                                    key={option.id}
                                    className="multi-select-option"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        checked={value.includes(option.id)}
                                        onChange={() => handleToggle(option.id)}
                                    />
                                    <span className="multi-select-option-text">
                                        {option.name}
                                        {showCounts && option.count !== null && (
                                            <span className="multi-select-option-count"> ({option.count})</span>
                                        )}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MultiSelect;