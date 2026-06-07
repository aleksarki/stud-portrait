// components/charts/StudentLgmChart.jsx
import React, { useEffect, useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, Dot
} from 'recharts';
import { getAnalyzeStudentLgm } from '../../api';
import { COMPETENCIES_NAMES } from '../../utilities';

const ACTUAL_COLOR    = '#1976d2';
const PREDICTED_COLOR = '#e67e22';

function SlopeTag({ slope }) {
    const abs     = Math.abs(slope);
    const neutral = abs < 1;
    const color   = neutral ? '#888' : slope > 0 ? '#2ecc71' : '#e74c3c';
    const arrow   = neutral ? '→' : slope > 0 ? '↑' : '↓';
    const label   = neutral ? 'стабильно' : slope > 0 ? 'растёт' : 'снижается';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: `${color}18`, color,
            border: `1px solid ${color}44`,
            borderRadius: 12, padding: '2px 10px',
            fontSize: 12, fontWeight: 500,
        }}>
            {arrow} {label} ({slope > 0 ? '+' : ''}{slope.toFixed(2)}/курс)
        </span>
    );
}

function StudentLgmChart({ studentId, competency }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        if (!studentId || !competency) return;
        setLoading(true);
        setData(null);
        setError(null);

        getAnalyzeStudentLgm(studentId, competency)
            .onSuccess(async res => {
                const json = await res.json();
                if (json.status === 'success') {
                    setData(json);
                } else {
                    setError(json.message || 'Недостаточно данных');
                }
            })
            .onError(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [studentId, competency]);

    if (loading) return <div style={{ padding: 24, color: '#888' }}>Загрузка LGM...</div>;
    if (error)   return <div style={{ padding: 16, color: '#aaa', fontSize: 13 }}>⚠️ {error}</div>;
    if (!data)   return null;

    // Объединяем predicted и actual в один массив для recharts
    const COURSE_LABELS = { 1: '1 курс', 2: '2 курс', 3: '3 курс', 4: '4 курс' };
    const actualByKey   = Object.fromEntries(
        data.actual_points.map(p => [p.course, p.score])
    );
    const chartData = data.predicted_trajectory.map(p => ({
        name:      COURSE_LABELS[p.course] ?? `${p.course} курс`,
        predicted: p.predicted,
        actual:    actualByKey[p.course] ?? null,
    }));

    const allValues = [
        ...data.actual_points.map(p => p.score),
        ...data.predicted_trajectory.map(p => p.predicted),
    ];
    const yMin = Math.floor(Math.min(...allValues) / 50) * 50 - 50;
    const yMax = Math.ceil(Math.max(...allValues) / 50) * 50 + 50;

    const r2Pct   = Math.round(data.r_squared * 100);
    const r2Color = data.r_squared > 0.8 ? '#2ecc71'
                  : data.r_squared > 0.5 ? '#e67e22'
                  : '#e74c3c';

    return (
        <div style={{ width: '100%' }}>
            {/* Метрики */}
            <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap',
                marginBottom: 16, alignItems: 'center',
            }}>
                <div style={{ fontSize: 13, color: '#666' }}>
                    Начальный уровень:{' '}
                    <strong style={{ color: '#2c3e50' }}>{data.intercept}</strong>
                </div>
                <SlopeTag slope={data.slope} />
                <div style={{ fontSize: 13, color: '#666' }}>
                    R²:{' '}
                    <strong style={{ color: r2Color }}>{r2Pct}%</strong>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>
                        (качество подгонки)
                    </span>
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                    Замеров: <strong>{data.n_measurements}</strong>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
                <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                        domain={[yMin, yMax]}
                        tick={{ fontSize: 12 }}
                        width={45}
                    />
                    <Tooltip
                        formatter={(val, name) =>
                            val === null ? ['-', name] : [Number(val).toFixed(1), name]
                        }
                        contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />

                    {/* LGM-траектория (predicted) */}
                    <Line
                        type="linear"
                        dataKey="predicted"
                        name="LGM-траектория"
                        stroke={PREDICTED_COLOR}
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        dot={{ r: 3, fill: PREDICTED_COLOR }}
                        activeDot={{ r: 5 }}
                    />

                    {/* Фактические баллы */}
                    <Line
                        type="monotone"
                        dataKey="actual"
                        name="Фактический балл"
                        stroke={ACTUAL_COLOR}
                        strokeWidth={2.5}
                        dot={<Dot r={5} fill={ACTUAL_COLOR} stroke="white" strokeWidth={1.5} />}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                    />
                </LineChart>
            </ResponsiveContainer>

            <div style={{
                marginTop: 12, fontSize: 12, color: '#999', lineHeight: 1.6,
                background: '#f8f9fa', borderRadius: 6, padding: '8px 12px',
            }}>
                <strong>Как читать:</strong> синяя линия — фактические баллы на каждом курсе.
                Оранжевая пунктирная — LGM-траектория (линейная регрессия по всем замерам).
                Slope = средний прирост за курс. Если синяя выше оранжевой — реальный рост
                опережает прогноз.
            </div>
        </div>
    );
}

export default StudentLgmChart;