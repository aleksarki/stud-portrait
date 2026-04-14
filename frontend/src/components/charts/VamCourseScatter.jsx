// components/charts/VamCourseScatter.jsx
import React, { useMemo, useCallback } from 'react';
import {
    ComposedChart, Scatter, Line,
    XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#1976d2', '#4caf50', '#f44336', '#ff9800', '#9c27b0', '#00bcd4', '#e91e63'];

const CHART_HEIGHT = 500;
const MARGIN = { top: 20, right: 30, bottom: 20, left: 30 };

// Линейная регрессия по двум массивам x, y → возвращает slope и intercept
function linearRegression(xs, ys) {
    const n = xs.length;
    if (n < 2) return null;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}

const VamCourseScatter = ({ data }) => {
    // Группировка входных данных
    const groups = useMemo(() => {
        if (!data || data.length === 0) return [];
        const map = new Map();
        data.forEach(item => {
            if (!item.group || item.course == null) return;
            if (!map.has(item.group)) map.set(item.group, []);
            map.get(item.group).push(item);
        });
        return Array.from(map.entries()).map(([name, points]) => ({ name, points }));
    }, [data]);

    // Домен Y — учитываем CI
    const yDomain = useMemo(() => {
        if (!data || data.length === 0) return [0, 100];
        const vals = data
            .flatMap(d => [d.ci_lower, d.ci_upper, d.value_added])
            .filter(v => v != null);
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const pad = (max - min) * 0.1 || 5;
        return [min - pad, max + pad];
    }, [data]);

    // Для каждой группы: scatter-точки + данные линии регрессии
    const seriesList = useMemo(() => {
        return groups.map((group, idx) => {
            const color = COLORS[idx % COLORS.length];
            const points = group.points.map(p => ({
                course: p.course,
                value_added: p.value_added,
                ci_lower: p.ci_lower,
                ci_upper: p.ci_upper,
                n: p.n,
                group: group.name
            }));

            // Считаем линию регрессии по имеющимся курсам
            const xs = points.map(p => p.course);
            const ys = points.map(p => p.value_added);
            const reg = linearRegression(xs, ys);

            // Линия от min до max курса
            const minCourse = Math.min(...xs);
            const maxCourse = Math.max(...xs);
            const lineData = reg
                ? [
                    { course: minCourse, regression: reg.slope * minCourse + reg.intercept },
                    { course: maxCourse, regression: reg.slope * maxCourse + reg.intercept }
                ]
                : [];

            return { name: group.name, color, points, lineData };
        });
    }, [groups]);

    // Кастомная точка с CI-whiskers
    const renderCustomPoint = useCallback((props, color) => {
        const { cx, cy } = props;
        return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} />;
    }, []);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const point = payload[0].payload;
            if (!point || !point.group) return null;
            return (
                <div style={{ background: 'white', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
                    <p><strong>{point.group}</strong> – {point.course} курс</p>
                    <p>Средний балл: {point.value_added?.toFixed(2)}</p>
                    <p>ДИ: [{point.ci_lower?.toFixed(2) ?? '?'}; {point.ci_upper?.toFixed(2) ?? '?'}]</p>
                    <p>n = {point.n ?? '?'}</p>
                </div>
            );
        }
        return null;
    };

    if (groups.length === 0) {
        return <div className="no-data">Нет данных по курсам</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ComposedChart margin={MARGIN}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                    type="number"
                    dataKey="course"
                    name="Курс"
                    domain={[0.5, 4.5]}
                    ticks={[1, 2, 3, 4]}
                    label={{ value: 'Курс', position: 'insideBottom', offset: -5 }}
                />

                <YAxis
                    type="number"
                    dataKey="value_added"
                    name="Средний балл"
                    domain={yDomain}
                    tickFormatter={(val) => val.toFixed(0)}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {seriesList.map((series) => (
                    <React.Fragment key={series.name}>
                        {/* Scatter-точки с CI */}
                        <Scatter
                            name={series.name}
                            data={series.points}
                            fill={series.color}
                            shape={(props) => renderCustomPoint(props, series.color)}
                        />

                        {/* Линия регрессии — пунктиром, того же цвета */}
                        <Line
                            data={series.lineData}
                            dataKey="regression"
                            dot={false}
                            activeDot={false}
                            stroke={series.color}
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            legendType="none"
                            name={`${series.name} (тренд)`}
                        />
                    </React.Fragment>
                ))}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default VamCourseScatter;