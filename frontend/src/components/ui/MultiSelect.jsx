import { useState, useEffect, useRef } from 'react';

import FlexRow from '../FlexRow';
import { ADMIN_PALETTE, unpackPaletteOptionsActivable } from './palette';

import './MultiSelect.scss';

function MultiSelect({ 
    options = [],           // Массив опций [{id, name, count}] или просто [strings]
    value = [],             // Выбранные значения
    onChange,               // Callback при изменении
    placeholder = "Выберите...",
    searchPlaceholder = "Поиск...",
    label = "",             // Метка
    withSearch = false,     // Показывать ли поиск
    showCounts = false,     // Показывать ли счётчики (НОВОЕ!)
    palette = ADMIN_PALETTE.GRAY
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef(null);

    // close on click elsewhere
    useEffect(() => {
        const handleClickOutside = event => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // normalize to unified format [{id, name, count}]
    const normalizedOptions = options.map(opt => {
        if (typeof opt !== 'object') {
            return { id: opt, name: opt, count: null };
        }
        return { ...opt, count: opt.count || null };
    });

    const searchedOptions = (
        searchQuery ?
        normalizedOptions.filter(
            opt => opt.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
        ) :
        normalizedOptions
    );

    const handleToggle = optionId => {
        const newValue = (
            value.includes(optionId) ?
            value.filter(v => v !== optionId) :
            [...value, optionId]
        );
        onChange?.(newValue);
    };

    const handleToggleAll = () => {
        if (value.length === searchedOptions.length) {
            // Снять все из текущего фильтра
            const filteredIds = searchedOptions.map(opt => opt.id);
            onChange?.(value.filter(v => !filteredIds.includes(v)));
        } else {
            // Выбрать все из текущего фильтра
            const allIds = [...new Set([...value, ...searchedOptions.map(opt => opt.id)])];
            onChange?.(allIds);
        }
    };

    // text of the chosen elements
    const getSelectedText = () => {
        if (value.length === 0) return placeholder;
        if (value.length === 1) {
            const selected = normalizedOptions.find(opt => opt.id === value[0]);
            return selected ? selected.name : value[0];
        }
        return `Выбрано: ${value.length}`;
    };

    // common count of the selected
    const getTotalCount = () => {
        if (!showCounts || value.length === 0) return null;
        const total = normalizedOptions
            .filter(opt => value.includes(opt.id))
            .reduce((sum, opt) => sum + (opt.count || 0), 0);
        return total > 0 ? total : null;
    };

    const totalCount = getTotalCount();

    return (
        <div
            className="MultiSelect"
            ref={dropdownRef}
            style={unpackPaletteOptionsActivable(palette)}
        >
            {label && <span className="label">{label}</span>}

            <div 
                className={`field ${open ? 'open' : ''}`}
                onClick={() => setOpen(!open)}
            >
                <span className="multiselect-text">
                    {getSelectedText()}
                    {totalCount && <span className="count">({totalCount})</span>}
                </span>
                <span className="arrow">{open ? '▲' : '▼'}</span>
            </div>

            <div className={`dropdown ${open ? 'open' : ''}`}>
                <FlexRow>
                    {withSearch && (
                        <div className="search-area">
                            <input
                                className="search"
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <button
                        className="select-all"
                        onClick={e => {
                            e.stopPropagation();
                            handleToggleAll();
                        }}
                    >
                        {value.length === searchedOptions.length && searchedOptions.length > 0
                            ? '✓ Снять все'
                            : '☐ Выбрать все'}
                    </button>
                </FlexRow>

                <div className="options">
                    {searchedOptions.length === 0 ? (
                        <div className="no-results">
                            {searchQuery ? 'Ничего не найдено' : 'Нет доступных опций'}
                        </div>
                    ) : (
                        searchedOptions.map(option => (
                            <label
                                key={option.id}
                                className="option"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <input
                                    type="checkbox"
                                    checked={value.includes(option.id)}
                                    onChange={() => handleToggle(option.id)}
                                />
                                <span className="option-text">
                                    <span>{option.name}</span>
                                    {showCounts && option.count !== null && (
                                        <span className="option-count">({option.count})</span>
                                    )}
                                </span>
                            </label>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}

export default MultiSelect;