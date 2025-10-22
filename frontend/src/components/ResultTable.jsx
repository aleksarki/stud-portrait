import "./ResultTable.scss";

function ResultTable({ data, years, title }) {
    const getCellColorSmooth = (change, changePercent) => {
        if (change === null || change === 0) return '#ffffff';
        
        const intensity = Math.min(Math.abs(changePercent) / 50, 1.0);
        
        if (change > 0) {  // smooth green
            const greenBase = 235;
            const adjustment = Math.floor(60 * intensity);
            return `rgb(${greenBase - adjustment}, 255, ${greenBase - adjustment})`;
        } else {  // smooth red
            const redBase = 235;
            const adjustment = Math.floor(60 * intensity);
            return `rgb(255, ${redBase - adjustment}, ${redBase - adjustment})`;
        }
    };

    // Функция для отображения значения с изменением
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
        <div className="ResultTable">
            {title && <h3 className="table-title">{title}</h3>}
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
                                <td className="competency-cell">{row.competency}</td>
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