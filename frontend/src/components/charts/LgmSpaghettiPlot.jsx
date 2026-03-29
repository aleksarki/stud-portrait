// src/components/charts/LgmSpaghettiPlot.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#00796b', '#fbc02d'];

const LgmSpaghettiPlot = ({ data, maxIndividualTrajectories = 100 }) => {
    if (!data || !data.trend_lines) {
        return <div className="no-data">Нет данных для LGM</div>;
    }

    const { individual_trajectories = [], trend_lines } = data;

    // Собираем все курсы из трендов и индивидуальных траекторий
    const allCourses = new Set();
    trend_lines.forEach(t => t.points.forEach(p => allCourses.add(p.course)));
    individual_trajectories.forEach(t => t.points.forEach(p => allCourses.add(p.course)));

    const chartData = Array.from(allCourses)
        .sort((a, b) => a - b)
        .map(course => {
            const point = { course: `${course} курс` };
            trend_lines.forEach(t => {
                const p = t.points.find(p => p.course === course);
                point[t.group] = p ? p.score : null;
            });
            individual_trajectories.forEach((_, idx) => {
                const p = _.points.find(p => p.course === course);
                point[`student_${idx}`] = p ? p.score : null;
            });
            return point;
        });

    // Ограничиваем количество отображаемых индивидуальных траекторий
    const trajectoriesToShow = individual_trajectories.slice(0, maxIndividualTrajectories);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis />
                <Tooltip />
                <Legend />
                {/* Индивидуальные траектории (серые, полупрозрачные) */}
                {trajectoriesToShow.map((_, idx) => (
                    <Line
                        key={`student_${idx}`}
                        type="monotone"
                        dataKey={`student_${idx}`}
                        stroke="#ccc"
                        strokeWidth={1}
                        opacity={0.3}
                        dot={false}
                        isAnimationActive={false}
                    />
                ))}
                {/* Тренд-линии */}
                {trend_lines.map((trend, idx) => (
                    <Line
                        key={trend.group}
                        type="monotone"
                        dataKey={trend.group}
                        stroke={COLORS[idx % COLORS.length]}
                        strokeWidth={2}
                        name={trend.group}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

export default LgmSpaghettiPlot;