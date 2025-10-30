import { useState, useRef } from "react";
import { CATEGORIES_DESCRIPTIONS } from "../utilities";
import CompetencyTooltip from "./CompetencyTooltip";
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

        // значения за все годы для этой компетенции
        const values = row.values.map(valueData => valueData.value);
        
        // описание компетенции по ключу
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

    // скрытие подсказки
    const handleCompetencyLeave = () => {
        setTooltipData(prev => ({ ...prev, isVisible: false }));
    };

    const renderValueWithChange = (valueData, yearIndex) => {
        if (valueData.value === null) {
            return <span className="no-data">—</span>;
        }

        return (
            <div className="value-with-change">
                <div className="value">{valueData.value}</div>
                {yearIndex > 0 && valueData.change !== null && (
                    <div className={`change ${valueData.change > 0 ? 'positive' : valueData.change < 0 ? 'negative' : 'neutral'}`}>
                        {valueData.change > 0 ? '↑' : valueData.change < 0 ? '↓' : '→'}
                        {Math.abs(valueData.change)} ({valueData.changePercent}%)
                    </div>
                )}
            </div>
        );
    };

    if (!data || data.length === 0) {
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
            
            <CompetencyTooltip
                competency={tooltipData.competency}
                description={tooltipData.description}
                years={tooltipData.years}
                values={tooltipData.values}
                isVisible={tooltipData.isVisible}
                position={tooltipData.position}
            />
            
            <div className="table-wrapper">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th className="competency-header">Компетенция</th>
                            {years.map(year => (
                                <th key={year} className="year-header">
                                    {year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                <td 
                                    className="competency-cell"
                                    onMouseEnter={(e) => handleCompetencyHover(e, row)}
                                    onMouseLeave={handleCompetencyLeave}
                                >
                                    <span className="competency-name">
                                        {row.competency}
                                    </span>
                                </td>
                                {row.values.map((valueData, yearIndex) => (
                                    <td 
                                        key={yearIndex}
                                        className="value-cell"
                                        style={{
                                            backgroundColor: getCellColorSmooth(
                                                valueData.change, 
                                                valueData.changePercent
                                            )
                                        }}
                                    >
                                        {renderValueWithChange(valueData, yearIndex)}
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
