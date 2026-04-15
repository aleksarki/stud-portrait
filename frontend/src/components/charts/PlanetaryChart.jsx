// PlanetaryChart.jsx
import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import "./PlanetaryChart.scss";

const PlanetaryChart = ({ 
    title, 
    items = [], 
    type = "competency", // 'competency' или 'motivator'
    height = 500 
}) => {
    const chartRef = useRef(null);
    let chartInstance = null;

    // Конфигурация уровней для компетенций и мотиваторов
    const getLevelConfig = (type, score) => {
        if (type === "competency") {
            // Компетенции: 200-399 низкий, 400-599 средний, 600-800 высокий
            if (score >= 600) return { name: "Высокий (600-800)", key: "high", colorRange: ["#c8e6c9", "#a5d6a7", "#4caf50"], textColor: "#1b5e20" };
            if (score >= 400) return { name: "Средний (400-599)", key: "medium", colorRange: ["#fff9c4", "#fff176", "#ffeb3b"], textColor: "#f57f17" };
            return { name: "Низкий (200-399)", key: "low", colorRange: ["#ffcdd2", "#ef9a9a", "#e57373"], textColor: "#c62828" };
        } else {
            // Мотиваторы: 200-399 демотиватор, 400-599 не проявлено, 600-800 мотиватор
            if (score >= 600) return { name: "Мотиватор (600-800)", key: "high", colorRange: ["#c8e6c9", "#a5d6a7", "#4caf50"], textColor: "#1b5e20" };
            if (score >= 400) return { name: "Не проявлено (400-599)", key: "medium", colorRange: ["#fff9c4", "#fff176", "#ffeb3b"], textColor: "#f57f17" };
            return { name: "Демотиватор (200-399)", key: "low", colorRange: ["#ffcdd2", "#ef9a9a", "#e57373"], textColor: "#c62828" };
        }
    };

    const getColorByLevelAndIndex = (levelConfig, index, total) => {
        const colors = levelConfig.colorRange;
        if (total === 1) return colors[1];
        const ratio = index / (total - 1);
        if (ratio < 0.33) return colors[0];
        if (ratio < 0.66) return colors[1];
        return colors[2];
    };

    const buildSunburstData = () => {
        if (!items || items.length === 0) return [];

        // Группируем по уровню
        const groupedByLevel = { low: [], medium: [], high: [] };
        
        items.forEach(item => {
            const levelConfig = getLevelConfig(type, item.value);
            groupedByLevel[levelConfig.key].push({
                ...item,
                levelConfig
            });
        });

        const levelChildren = [];

        // Порядок уровней: Высокий -> Средний -> Низкий
        const levelOrder = ["high", "medium", "low"];
        
        levelOrder.forEach(levelKey => {
            const levelItems = groupedByLevel[levelKey];
            if (levelItems.length === 0) return;

            // Сортируем для стабильности цветов
            levelItems.sort((a, b) => a.value - b.value);

            // Дочерние элементы (конкретные названия)
            const childItems = levelItems.map((item, idx) => ({
                name: item.name,
                value: item.value,
                itemStyle: {
                    color: getColorByLevelAndIndex(item.levelConfig, idx, levelItems.length)
                },
                tooltipData: {
                    value: item.value,
                    level: item.levelConfig.name
                }
            }));

            // Суммарный вес уровня
            const totalLevelValue = levelItems.reduce((sum, i) => sum + i.value, 0);

            levelChildren.push({
                name: levelItems[0].levelConfig.name,
                value: totalLevelValue,
                children: childItems,
                itemStyle: {
                    color: levelItems[0].levelConfig.colorRange[1],
                    opacity: 0.9,
                    borderColor: "#fff",
                    borderWidth: 2
                }
            });
        });

        // Центральный элемент (тип данных)
        const totalValue = items.reduce((sum, i) => sum + i.value, 0);
        
        // Цвет центра в зависимости от типа
        const centerColor = type === "competency" ? "#1976d2" : "#ff9800";
        const centerLabel = type === "competency" ? "Компетенции" : "Мотиваторы";

        return [{
            name: centerLabel,
            value: totalValue,
            children: levelChildren,
            itemStyle: {
                color: centerColor,
                borderRadius: 8,
                borderColor: "#fff",
                borderWidth: 3
            },
            label: {
                show: true,
                fontWeight: "bold",
                fontSize: 16,
                color: "#fff",
                textShadowBlur: 4
            }
        }];
    };

    useEffect(() => {
        if (!chartRef.current || !items || items.length === 0) return;

        chartInstance = echarts.init(chartRef.current);
        const data = buildSunburstData();

        // Настройка легенды в зависимости от типа
        const legendData = type === "competency" 
            ? ["Высокий (600-800)", "Средний (400-599)", "Низкий (200-399)"]
            : ["Мотиватор (600-800)", "Не проявлено (400-599)", "Демотиватор (200-399)"];

        const option = {
            title: {
                text: title,
                left: "center",
                top: 0,
                textStyle: { fontSize: 16, fontWeight: "normal", color: "#333" }
            },
            tooltip: {
                trigger: "item",
                backgroundColor: "rgba(255,255,255,0.96)",
                borderColor: "#ccc",
                borderWidth: 1,
                textStyle: { color: "#333" },
                formatter: (params) => {
                    if (params.treePathInfo.length === 3) {
                        // Конкретный элемент
                        const originalValue = params.value;
                        return `
                            <strong>${params.name}</strong><br/>
                            🎯 Значение: <b>${originalValue}</b> баллов<br/>
                            📊 Уровень: ${params.treePathInfo[1].name}
                        `;
                    } else if (params.treePathInfo.length === 2) {
                        return `<strong>${params.name}</strong><br/>💪 Суммарный вес: ${params.value}`;
                    }
                    return `<strong>${params.name}</strong>`;
                }
            },
            series: [
                {
                    name: "planetary_map",
                    type: "sunburst",
                    data: data,
                    radius: [0, "90%"],
                    center: ["50%", "55%"],
                    startAngle: 90,
                    sort: undefined,
                    nodeClick: "rootToNode",
                    
                    label: {
                        show: true,
                        rotate: "radial",
                        fontSize: 11,
                        fontWeight: "normal",
                        color: "#333",
                        position: "inside"
                    },
                    
                    itemStyle: {
                        borderRadius: 4,
                        borderColor: "#ffffff",
                        borderWidth: 2,
                        shadowBlur: 6,
                        shadowColor: "rgba(0,0,0,0.15)"
                    },
                    
                    emphasis: {
                        scale: true,
                        itemStyle: {
                            shadowBlur: 12,
                            borderWidth: 3,
                            borderColor: "#ffd700"
                        },
                        label: {
                            fontWeight: "bold",
                            fontSize: 13,
                            show: true
                        }
                    },
                    
                    levels: [
                        { }, // Центр
                        {
                            // Тип (Компетенции / Мотиваторы)
                            r0: "0%",
                            r: "28%",
                            itemStyle: { borderWidth: 3 },
                            label: { fontSize: 14, fontWeight: "bold", color: "#fff" }
                        },
                        {
                            // Уровни
                            r0: "28%",
                            r: "55%",
                            label: { fontSize: 12, fontWeight: "bold" }
                        },
                        {
                            // Конкретные названия
                            r0: "55%",
                            r: "90%",
                            label: { 
                                fontSize: 10, 
                                position: "outside",
                                color: "#555",
                                fontWeight: "normal"
                            }
                        }
                    ]
                }
            ],
            legend: {
                show: true,
                data: legendData,
                orient: "horizontal",
                left: "center",
                bottom: 5,
                icon: "circle",
                textStyle: { fontSize: 11 }
            }
        };

        chartInstance.setOption(option);

        const handleResize = () => chartInstance?.resize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chartInstance?.dispose();
        };
    }, [items, title, type]);

    if (!items || items.length === 0) {
        return <div className="planetary-chart-empty">Нет данных для отображения</div>;
    }

    return (
        <div className="planetary-chart-container" style={{ height: `${height}px` }}>
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
        </div>
    );
};

export default PlanetaryChart;
