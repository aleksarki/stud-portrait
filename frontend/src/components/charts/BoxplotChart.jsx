// components/charts/BoxplotChart.jsx

import React from "react";

const BoxplotChart = ({ stats, outliers = [], width = 400, height = 300 }) => {
    const { q1, median, q3, whisker_low, whisker_high, min, max, lower_fence, upper_fence } = stats;

    // Масштабирование: от minVal до maxVal (с учётом границ выбросов)
    const minVal = min;
    const maxVal = max;
    const range = maxVal - minVal;

    // Защита от division by zero
    const yScale = (value) => {
        if (range === 0) return height / 2;
        return height - ((value - minVal) / range) * height;
    };

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

            {/* Точки выбросов */}
            {outliers.map((outlier, idx) => {
                const y = yScale(outlier.score);
                // Небольшой случайный разброс по X, чтобы точки не сливались при одинаковых значениях
                const xOffset = (idx % 3 - 1) * 6;
                return (
                    <circle
                        key={idx}
                        cx={centerX + xOffset}
                        cy={y}
                        r={5}
                        fill="#e74c3c"
                        stroke="white"
                        strokeWidth="1.5"
                        style={{ cursor: "pointer" }}
                        title={`${outlier.name}: ${outlier.score} баллов`}
                    />
                );
            })}

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