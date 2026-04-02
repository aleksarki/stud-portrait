import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

const SankeyDiagram = ({ 
    data, 
    title, 
    height = 500, 
    valueMultiplier = 1,
    minLinkWidth = 2,
    autoScale = true,
    valueLabel = "Effect Size"
}) => {
    if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0 || !Array.isArray(data.links)) {
        return <div className="no-data">Нет данных для диаграммы Санки</div>;
    }

    // Автоматическое масштабирование
    let finalMultiplier = valueMultiplier;
    if (autoScale && data.links.length > 0) {
        const maxValue = Math.max(...data.links.map(link => link.value));
        if (maxValue < 1) finalMultiplier = 100;
        else if (maxValue < 10) finalMultiplier = 10;
        else if (maxValue < 50) finalMultiplier = 5;
        else if (maxValue > 500) finalMultiplier = 0.5;
        else if (maxValue > 200) finalMultiplier = 0.8;
    }

    const scaledLinks = data.links.map(link => ({
        ...link,
        value: link.value * finalMultiplier
    }));

    const nodes = data.nodes.map(node => ({
        name: node.name || '???',
        type: node.type
    }));

    // Валидация ссылок: преобразуем source/target в числа и отсеиваем невалидные
    const validLinks = scaledLinks.filter(link => {
        const source = Number(link.source);
        const target = Number(link.target);
        return !isNaN(source) && !isNaN(target) && source >= 0 && source < nodes.length && target >= 0 && target < nodes.length;
    }).map(link => ({
        ...link,
        source: Number(link.source),
        target: Number(link.target)
    }));

    if (validLinks.length === 0) {
        return <div className="no-data">Нет валидных связей для отображения</div>;
    }

    const chartData = { nodes, links: validLinks };

    // Цвета узлов
    const getNodeColor = (node) => {
        if (node.name.includes('Низкий')) return '#ff6b6b';
        if (node.name.includes('Средний')) return '#ffd93d';
        if (node.name.includes('Высокий')) return '#6bcf7f';
        if (node.type === 'discipline') return '#4a90e2';
        if (node.type === 'competency') return '#e67e22';
        return '#95a5a6';
    };

    // Рендер узла
    const renderNode = (props) => {
        const { x, y, width, height, payload } = props;
        if (!payload || !payload.name) {
            return <rect x={x} y={y} width={width} height={height} fill="#ccc" stroke="#fff" strokeWidth={2} rx={6} />;
        }
        const textAnchor = x + width + 10 > window.innerWidth / 2 ? 'end' : 'start';
        const textX = textAnchor === 'end' ? x - 5 : x + width + 5;
        return (
            <g>
                <rect x={x} y={y} width={width} height={height} fill={getNodeColor(payload)} stroke="#fff" strokeWidth={2} rx={6} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.15))' }} />
                <text x={textX} y={y + height / 2} textAnchor={textAnchor} dominantBaseline="middle" fontSize={13} fontWeight={500} fill="#2c3e50">
                    {payload.name}
                </text>
            </g>
        );
    };

    // Рендер линии (опционально)
    const renderLink = (props) => {
        const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, index } = props;
        const width = Math.max(linkWidth, minLinkWidth);
        const gradientId = `sankey-gradient-${index}`;
        return (
            <g>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#e67e22" stopOpacity={0.6} />
                    </linearGradient>
                </defs>
                <path d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`} fill="none" stroke={`url(#${gradientId})`} strokeWidth={width} strokeOpacity={0.5} style={{ transition: 'stroke-opacity 0.3s', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.target.setAttribute('stroke-opacity', 0.8); e.target.setAttribute('stroke-width', width * 1.2); }}
                    onMouseLeave={(e) => { e.target.setAttribute('stroke-opacity', 0.5); e.target.setAttribute('stroke-width', width); }}
                />
            </g>
        );
    };

    return (
        <div className="sankey-container">
            {title && <h4 style={{ marginBottom: 16, color: '#2c3e50', fontSize: 18 }}>{title}</h4>}
            <ResponsiveContainer width="100%" height={height}>
                <Sankey data={chartData} nodePadding={40} nodeWidth={20} margin={{ top: 30, right: 150, bottom: 30, left: 150 }} link={{ stroke: '#777' }} node={renderNode}>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const link = payload[0].payload;
                                
                                // Пытаемся получить индексы из разных возможных полей
                                let sourceIdx = link.source !== undefined ? link.source : link.sourceIndex;
                                let targetIdx = link.target !== undefined ? link.target : link.targetIndex;
                                if (sourceIdx === undefined) sourceIdx = payload[0].source;
                                if (targetIdx === undefined) targetIdx = payload[0].target;
                                
                                sourceIdx = Number(sourceIdx);
                                targetIdx = Number(targetIdx);
                                
                                if (isNaN(sourceIdx) || isNaN(targetIdx)) {
                                    // Если не удалось определить индексы, показываем только значение
                                    return (
                                        <div className="sankey-tooltip" style={{ background: '#fff', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8 }}>
                                            <div>{valueLabel}: <strong>{((link.value || 0) / finalMultiplier).toFixed(2)}</strong></div>
                                        </div>
                                    );
                                }
                                
                                const sourceNode = chartData.nodes[sourceIdx];
                                const targetNode = chartData.nodes[targetIdx];
                                const sourceName = sourceNode?.name !== undefined ? sourceNode.name : `Узел ${sourceIdx}`;
                                const targetName = targetNode?.name !== undefined ? targetNode.name : `Узел ${targetIdx}`;
                                const originalValue = (link.value / finalMultiplier).toFixed(2);
                                
                                return (
                                    <div className="sankey-tooltip" style={{ background: '#fff', padding: '12px 16px', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: 13 }}>
                                        <div style={{ fontWeight: 600, marginBottom: 6, color: '#2c3e50' }}>{sourceName} → {targetName}</div>
                                        <div style={{ color: '#7f8c8d' }}>{valueLabel}: <strong>{originalValue}</strong></div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                </Sankey>
            </ResponsiveContainer>
            <div className="sankey-legend" style={{ marginTop: 16, padding: '10px 14px', background: '#f8f9fa', borderRadius: 6, fontSize: 12, color: '#555', border: '1px solid #e9ecef' }}>
                <div style={{ marginBottom: 4 }}><strong>📊 Толщина потока:</strong> пропорциональна {valueLabel === "Effect Size" ? "силе влияния дисциплины на компетенцию (Effect Size)" : "количеству студентов"}</div>
                {autoScale && finalMultiplier !== 1 && <div style={{ color: '#7f8c8d' }}><em>Значения автоматически масштабированы (×{finalMultiplier}) для лучшей визуализации</em></div>}
            </div>
        </div>
    );
};

export default SankeyDiagram;