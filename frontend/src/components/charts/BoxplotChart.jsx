// components/charts/BoxplotChart.jsx

import React from "react";

const BoxplotChart = ({ stats, width = 400, height = 300 }) => {
    const { q1, median, q3, whisker_low, whisker_high, min, max, lower_fence, upper_fence } = stats;

    // Масштабирование: от min до max с небольшими полями
    const minVal = Math.min(min, lower_fence);
    const maxVal = Math.max(max, upper_fence);
    const range = maxVal - minVal;
    const yScale = (value) => height - ((value - minVal) / range) * height;

    const boxY1 = yScale(q3);
    const boxY2 = yScale(q1);
    const medianY = yScale(median);
    const whiskerLowY = yScale(whisker_low);
    const whiskerHighY = yScale(whisker_high);
    const centerX = width / 2;
    const boxWidth = 60;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: "#f9f9f9", borderRadius: 8 }}>
            {/* Усы (вертикальные линии) */}
            <line x1={centerX} y1={boxY1} x2={centerX} y2={whiskerHighY} stroke="#666" strokeWidth="2" />
            <line x1={centerX} y1={boxY2} x2={centerX} y2={whiskerLowY} stroke="#666" strokeWidth="2" />
            {/* Горизонтальные планки усов */}
            <line x1={centerX - 10} y1={whiskerHighY} x2={centerX + 10} y2={whiskerHighY} stroke="#666" strokeWidth="2" />
            <line x1={centerX - 10} y1={whiskerLowY} x2={centerX + 10} y2={whiskerLowY} stroke="#666" strokeWidth="2" />

            {/* Прямоугольник (ящик) */}
            <rect x={centerX - boxWidth / 2} y={boxY1} width={boxWidth} height={boxY2 - boxY1} fill="#3498db" fillOpacity="0.4" stroke="#2980b9" strokeWidth="2" />

            {/* Медиана */}
            <line x1={centerX - boxWidth / 2} y1={medianY} x2={centerX + boxWidth / 2} y2={medianY} stroke="#e67e22" strokeWidth="3" />

            {/* Точки выбросов (рисуем по всем аномальным точкам, но у нас их список отдельно) – для демонстрации можно пропустить */}
            {/* Ось Y (числовые метки) */}
            {[minVal, (minVal + maxVal) / 2, maxVal].map(v => (
                <text key={v} x={centerX + boxWidth / 2 + 10} y={yScale(v)} fontSize="12" fill="#333">
                    {v.toFixed(0)}
                </text>
            ))}
            <text x={centerX} y={height - 5} textAnchor="middle" fontSize="12" fill="#555">Балл</text>
        </svg>
    );
};

export default BoxplotChart;