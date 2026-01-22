import { useState, useRef } from "react";
import { CATEGORIES_DESCRIPTIONS } from "../utilities";

import LineCompetencyTooltip from "./LineCompetencyTooltip";

import "./ResultTable.scss";

function ResultTable({ data, years, title }) {
    const [tooltipData, setTooltipData] = useState({
        isVisible: false,
        competency: "",
        description: "",
        years: [],
        values: [],
        position: { x: 0, y: 0 }
    });

    const tableRef = useRef(null);

    const getCellColorSmooth = (change, changePercent) => {
        if (change === null || change === 0) return '#ffffff';
        
        const intensity = Math.min(Math.abs(changePercent) / 50, 1.0);
        
        if (change > 0) {
            const greenBase = 235;
            const adjustment = Math.floor(60 * intensity);
            return `rgb(${greenBase - adjustment}, 255, ${greenBase - adjustment})`;
        } else {
            const redBase = 235;
            const adjustment = Math.floor(60 * intensity);
            return `rgb(255, ${redBase - adjustment}, ${redBase - adjustment})`;
        }
    };

    // Функция для обработки наведения на компетенцию
    const handleCompetencyHover = (event, row) => {
        if (!tableRef.current) return;

        // Получаем значения за все годы для этой компетенции
        const values = years.map(year => row[year] !== '-' ? row[year] : null);
        
        // Описание компетенции по ключу
        const description = row.competencyKey ? CATEGORIES_DESCRIPTIONS[row.competencyKey] : null;

        const rect = event.target.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();

        setTooltipData({
            isVisible: true,
            competency: row.competency,
            description: description,
            years: years,
            values: values,
            position: {
                x: rect.right + 10,
                y: rect.top - 10
            }
        });
    };

    // Скрытие подсказки
    const handleCompetencyLeave = () => {
        setTooltipData(prev => ({ ...prev, isVisible: false }));
    };

    const renderValue = (value, yearIndex, row, year) => {
        // Проверяем на null, undefined, '-', NaN и пустые строки
        if (value === null || 
            value === undefined || 
            value === '-' || 
            value === '' ||
            (typeof value === 'number' && isNaN(value)) ||
            (typeof value === 'string' && value.trim() === '')) {
            return <span className="no-data">—</span>;
        }

        // Для числовых значений округляем до 1 знака после запятой
        const displayValue = typeof value === 'number' ? 
            Number.isInteger(value) ? value : value.toFixed(1) : 
            value;

        return (
            <div className="value-with-change">
                <div className="value">{displayValue}</div>
            </div>
        );
    };

    // Проверяем данные и преобразуем их если нужно
    const normalizedData = Array.isArray(data) ? data : [];
    
    if (!normalizedData || normalizedData.length === 0) {
        return (
            <div className="result-table-container">
                {title && <h3 className="table-title">{title}</h3>}
                <div className="no-data-message">Нет данных для отображения</div>
            </div>
        );
    }

    return (
        <div className="ResultTable" ref={tableRef}>
            {title && <h3 className="table-title">{title}</h3>}
            
            {tooltipData.isVisible && (
                <LineCompetencyTooltip
                    name={tooltipData.competency}
                    description={tooltipData.description}
                    position={tooltipData.position}
                    years={tooltipData.years}
                    values={tooltipData.values}
                />
            )}
            
            <div className="table-wrapper">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th className="competency-header">Компетенция</th>
                            {years && years.map(year => (
                                <th key={year} className="year-header">
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {normalizedData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td 
                                    className="competency-cell"
                                    onMouseEnter={(e) => handleCompetencyHover(e, row)}
                                    onMouseLeave={handleCompetencyLeave}
                                >
                                    <span className="competency-name">
                                        {row.competency || row.competencyName || 'Неизвестная компетенция'}
                                    </span>
                                </td>
                                {years && years.map((year, yearIndex) => (
                                    <td 
                                        key={yearIndex}
                                        className="value-cell"
                                    >
                                        {renderValue(row[year], yearIndex, row, year)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ResultTable;
