// components/charts/VamDotPlot.jsx
import React, { useMemo, useState } from 'react';

// Агрегируем данные по группам — усредняем VA по всем курсам в группе
function aggregateGroups(data) {
    if (!data || data.length === 0) return [];

    const map = new Map();
    data.forEach(item => {
        if (!item.group) return;
        if (!map.has(item.group)) map.set(item.group, []);
        map.get(item.group).push(item);
    });

    return Array.from(map.entries())
        .map(([name, points]) => {
            // Взвешенное среднее по n студентов
            const totalN = points.reduce((s, p) => s + (p.n || 1), 0);
            const weightedVA = points.reduce((s, p) => s + (p.value_added ?? 0) * (p.n || 1), 0) / totalN;

            // Объединённый SE через дисперсию
            const pooledVar = points.reduce((s, p) => {
                const se = p.ci_upper != null && p.ci_lower != null
                    ? (p.ci_upper - p.ci_lower) / (2 * 1.96)
                    : 0;
                return s + se * se;
            }, 0);
            const combinedSE = Math.sqrt(pooledVar / (points.length * points.length));

            return {
                name,
                value_added: weightedVA,
                ci_lower: weightedVA - 1.96 * combinedSE,
                ci_upper: weightedVA + 1.96 * combinedSE,
                n: totalN,
                courses: points.length,
            };
        })
        .sort((a, b) => b.value_added - a.value_added);
}

const POSITIVE_COLOR  = '#1976d2';
const NEGATIVE_COLOR  = '#e53935';
const NEUTRAL_COLOR   = '#888780';
const ZERO_LINE_COLOR = '#e0e0e0';

const ROW_HEIGHT  = 44;
const LABEL_WIDTH = 200;
const CHART_LEFT  = LABEL_WIDTH + 16;
const CHART_RIGHT_PAD = 100;
const TOP_PAD     = 36;
const BOTTOM_PAD  = 32;

const VamDotPlot = ({ data, aggregate = true, shortLabels = false }) => {
    const [hovered, setHovered] = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, item: null });

    const groups = useMemo(() => {
        if (!aggregate) {
            return data.map((item, idx) => ({
                name: shortLabels ? `${item.course} курс` : `${item.group} (курс ${item.course})`,
                value_added: item.value_added ?? 0,
                ci_lower: item.ci_lower ?? item.value_added,
                ci_upper: item.ci_upper ?? item.value_added,
                n: item.n ?? 1,
                course: item.course,
            }));
        }
        return aggregateGroups(data);
    }, [data, aggregate]);

    const { minVal, maxVal, zeroX, svgWidth, svgHeight, scaleX } = useMemo(() => {
        if (groups.length === 0) return { minVal: -10, maxVal: 10, zeroX: 0, svgWidth: 600, svgHeight: 200, scaleX: () => 0 };

        const allVals = groups.flatMap(g => [g.ci_lower, g.ci_upper]);
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const pad = Math.max((maxVal - minVal) * 0.15, 2);
        const lo = minVal - pad;
        const hi = maxVal + pad;

        const svgWidth = 680;
        const chartW = svgWidth - CHART_LEFT - CHART_RIGHT_PAD;
        const svgHeight = TOP_PAD + groups.length * ROW_HEIGHT + BOTTOM_PAD;

        const scaleX = v => CHART_LEFT + ((v - lo) / (hi - lo)) * chartW;
        const zeroX = scaleX(0);

        return { minVal: lo, maxVal: hi, zeroX, svgWidth, svgHeight, scaleX };
    }, [groups]);

    if (groups.length === 0) {
        return <div style={{ padding: 24, color: '#888', textAlign: 'center' }}>Нет данных для отображения</div>;
    }

    const getColor = (item) => {
        const ciCrossesZero = item.ci_lower <= 0 && item.ci_upper >= 0;
        if (ciCrossesZero) return NEUTRAL_COLOR;
        return item.value_added >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
    };

    const handleMouseMove = (e, item, idx) => {
        const svgEl = e.currentTarget.closest('svg');
        const rect = svgEl.getBoundingClientRect();
        setTooltip({
            visible: true,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            item,
        });
        setHovered(idx);
    };

    const handleMouseLeave = () => {
        setTooltip(prev => ({ ...prev, visible: false }));
        setHovered(null);
    };

    // Отметки на оси X
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) =>
        minVal + (i / (tickCount - 1)) * (maxVal - minVal)
    );

    return (
        <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
            <svg
                width="100%"
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ display: 'block', overflow: 'visible' }}
            >
                {/* Нулевая линия */}
                <line
                    x1={zeroX} y1={TOP_PAD - 8}
                    x2={zeroX} y2={TOP_PAD + groups.length * ROW_HEIGHT}
                    stroke={ZERO_LINE_COLOR}
                    strokeWidth={1.5}
                />
                <text
                    x={zeroX} y={TOP_PAD - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#aaa"
                >0</text>

                {/* Подписи осей */}
                {ticks.map((tick, i) => (
                    tick === 0 ? null :
                    <text
                        key={i}
                        x={scaleX(tick)}
                        y={TOP_PAD + groups.length * ROW_HEIGHT + 18}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#bbb"
                    >
                        {tick > 0 ? `+${tick.toFixed(1)}` : tick.toFixed(1)}
                    </text>
                ))}

                {/* Сетка */}
                {ticks.map((tick, i) => (
                    tick === 0 ? null :
                    <line
                        key={i}
                        x1={scaleX(tick)} y1={TOP_PAD - 8}
                        x2={scaleX(tick)} y2={TOP_PAD + groups.length * ROW_HEIGHT}
                        stroke="#f0f0f0"
                        strokeWidth={1}
                    />
                ))}

                {/* Строки */}
                {groups.map((item, idx) => {
                    const cy = TOP_PAD + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
                    const cx = scaleX(item.value_added);
                    const cxLo = scaleX(item.ci_lower);
                    const cxHi = scaleX(item.ci_upper);
                    const color = getColor(item);
                    const isHovered = hovered === idx;
                    const ciCrossesZero = item.ci_lower <= 0 && item.ci_upper >= 0;

                    return (
                        <g
                            key={item.name}
                            onMouseMove={e => handleMouseMove(e, item, idx)}
                            onMouseLeave={handleMouseLeave}
                            style={{ cursor: 'default' }}
                        >
                            {/* Фоновая полоса при наведении */}
                            {isHovered && (
                                <rect
                                    x={0}
                                    y={TOP_PAD + idx * ROW_HEIGHT}
                                    width={svgWidth}
                                    height={ROW_HEIGHT}
                                    fill="#f5f8ff"
                                    rx={4}
                                />
                            )}

                            {/* Метка группы */}
                            <text
                                x={LABEL_WIDTH}
                                y={cy}
                                textAnchor="end"
                                dominantBaseline="central"
                                fontSize={12}
                                fill={isHovered ? '#1a1a1a' : '#444'}
                                fontWeight={isHovered ? 500 : 400}
                            >
                                {item.name.length > 28 ? item.name.slice(0, 26) + '…' : item.name}
                            </text>

                            {/* CI линия */}
                            <line
                                x1={cxLo} y1={cy}
                                x2={cxHi} y2={cy}
                                stroke={color}
                                strokeWidth={isHovered ? 2.5 : 1.5}
                                opacity={ciCrossesZero ? 0.45 : 0.8}
                            />

                            {/* Whisker левый */}
                            <line
                                x1={cxLo} y1={cy - 5}
                                x2={cxLo} y2={cy + 5}
                                stroke={color}
                                strokeWidth={isHovered ? 2 : 1.5}
                                opacity={ciCrossesZero ? 0.45 : 0.8}
                            />

                            {/* Whisker правый */}
                            <line
                                x1={cxHi} y1={cy - 5}
                                x2={cxHi} y2={cy + 5}
                                stroke={color}
                                strokeWidth={isHovered ? 2 : 1.5}
                                opacity={ciCrossesZero ? 0.45 : 0.8}
                            />

                            {/* Основная точка */}
                            <circle
                                cx={cx}
                                cy={cy}
                                r={isHovered ? 7 : 5.5}
                                fill={color}
                                opacity={ciCrossesZero ? 0.55 : 1}
                                stroke="white"
                                strokeWidth={1.5}
                            />

                            {/* Значение справа */}
                            <text
                                x={cxHi + 8}
                                y={cy}
                                dominantBaseline="central"
                                fontSize={11}
                                fill={color}
                                opacity={ciCrossesZero ? 0.6 : 0.9}
                            >
                                {item.value_added > 0 ? '+' : ''}{item.value_added.toFixed(2)}
                            </text>
                        </g>
                    );
                })}

                {/* Подпись оси */}
                <text
                    x={CHART_LEFT + (svgWidth - CHART_LEFT - CHART_RIGHT_PAD) / 2}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#bbb"
                >
                    Value-Added (относительно ожидаемого прироста)
                </text>
            </svg>

            {/* Легенда */}
            <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: '#666', paddingLeft: LABEL_WIDTH + 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="20" height="12">
                        <line x1="0" y1="6" x2="20" y2="6" stroke={POSITIVE_COLOR} strokeWidth="1.5" />
                        <circle cx="10" cy="6" r="4" fill={POSITIVE_COLOR} stroke="white" strokeWidth="1.5" />
                    </svg>
                    Значимо выше ожидаемого
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="20" height="12">
                        <line x1="0" y1="6" x2="20" y2="6" stroke={NEUTRAL_COLOR} strokeWidth="1.5" opacity="0.5" />
                        <circle cx="10" cy="6" r="4" fill={NEUTRAL_COLOR} stroke="white" strokeWidth="1.5" opacity="0.6" />
                    </svg>
                    ДИ пересекает ноль (незначимо)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="20" height="12">
                        <line x1="0" y1="6" x2="20" y2="6" stroke={NEGATIVE_COLOR} strokeWidth="1.5" />
                        <circle cx="10" cy="6" r="4" fill={NEGATIVE_COLOR} stroke="white" strokeWidth="1.5" />
                    </svg>
                    Значимо ниже ожидаемого
                </span>
            </div>

            {/* Тултип */}
            {tooltip.visible && tooltip.item && (
                <div style={{
                    position: 'absolute',
                    left: tooltip.x + 14,
                    top: tooltip.y - 10,
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    minWidth: 180,
                    lineHeight: 1.7,
                }}>
                    <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 13 }}>{tooltip.item.name}</div>
                    <div>VA: <strong style={{ color: getColor(tooltip.item) }}>
                        {tooltip.item.value_added > 0 ? '+' : ''}{tooltip.item.value_added.toFixed(3)}
                    </strong></div>
                    <div style={{ color: '#888' }}>
                        95% ДИ: [{tooltip.item.ci_lower.toFixed(3)}; {tooltip.item.ci_upper.toFixed(3)}]
                    </div>
                    <div style={{ color: '#888' }}>Студентов: {tooltip.item.n}</div>
                    <div style={{ color: '#888' }}>Курсов в группе: {tooltip.item.courses}</div>
                </div>
            )}
        </div>
    );
};

export default VamDotPlot;