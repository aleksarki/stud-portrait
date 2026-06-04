// components/charts/StudentVamChart.jsx
import React, { useEffect, useState } from 'react';
import { getAnalyzeStudentVam } from '../../api';
import VamDotPlot from './VamDotPlot';

const PERF_COLOR = {
    above_expected: '#2ecc71',
    as_expected:    '#888888',
    below_expected: '#e74c3c',
};

function StudentVamChart({ studentId, competency }) {
    const [plotData, setPlotData] = useState([]);
    const [summary,  setSummary]  = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);

    useEffect(() => {
        if (!studentId || !competency) return;
        setLoading(true);
        setPlotData([]);
        setSummary(null);
        setError(null);

        getAnalyzeStudentVam(studentId, competency)
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    const periods = data.growth_by_period || [];
                    // Адаптируем growth_by_period → формат VamDotPlot
                    // CI для одного студента строим как ±(|va|*0.3 + 0.5) — визуальная подсказка
                    const adapted = periods.map(p => {
                        const va      = p.value_added ?? 0;
                        const halfCI  = Math.abs(va) * 0.3 + 0.5;
                        return {
                            group:       `${p.course} курс`,
                            course:      p.course,
                            value_added: va,
                            ci_lower:    va - halfCI,
                            ci_upper:    va + halfCI,
                            n:           1,
                        };
                    });
                    setPlotData(adapted);
                    setSummary({
                        performance:           data.performance,
                        performance_label:     data.performance_label,
                        average_value_added:   data.average_value_added,
                        total_growth:          data.total_growth,
                        expected_growth:       data.expected_growth_per_period,
                    });
                } else {
                    setError(data.message || 'Нет данных');
                }
            })
            .onError(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [studentId, competency]);

    if (loading) return <div style={{ padding: 24, color: '#888' }}>Загрузка VAM...</div>;
    if (error)   return <div style={{ padding: 16, color: '#aaa', fontSize: 13 }}>⚠️ {error}</div>;
    if (!plotData.length) return null;

    return (
        <div>
            {summary && (
                <div style={{
                    display: 'flex', gap: 20, flexWrap: 'wrap',
                    marginBottom: 14, fontSize: 13, color: '#555', alignItems: 'center'
                }}>
                    <span>
                        Оценка:{' '}
                        <strong style={{ color: PERF_COLOR[summary.performance] ?? '#333' }}>
                            {summary.performance_label}
                        </strong>
                    </span>
                    <span>
                        Средний VA:{' '}
                        <strong>
                            {summary.average_value_added > 0 ? '+' : ''}
                            {summary.average_value_added?.toFixed(2)}
                        </strong>
                    </span>
                    <span>
                        Ожид. прирост/период:{' '}
                        <strong>{summary.expected_growth?.toFixed(1)}</strong>
                    </span>
                    <span>
                        Фактич. прирост:{' '}
                        <strong>{summary.total_growth?.toFixed(1)}</strong>
                    </span>
                </div>
            )}
            <VamDotPlot data={plotData} aggregate={false} shortLabels />
        </div>
    );
}

export default StudentVamChart;