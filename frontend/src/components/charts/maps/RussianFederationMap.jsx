// RussianFederationMap.jsx
import { useEffect, useState, useMemo } from "react";
import EChartsReact from "echarts-for-react";
import * as echarts from "echarts";

import LoadingSpinner from "../../ui/LoadingSpinner";

import "./RussianFederationMap.scss";

function RussianFederationMap({ 
    title, 
    regionData = [], 
    onRegionClick, 
    showVisualMap = true, 
    min = 0, 
    max = 100,
    highlightedRegion = "Тюменская область",
    highlightColor = '#ff4444'
}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const loadMapData = async () => {
            try {
                const response = await fetch('/data/russia.geojson');
                const geoJson = await response.json();
                echarts.registerMap("Russia", geoJson);
                setReady(true);
            } catch (error) {
                console.error("Failed to load map data:", error);
                setReady(true);
            }
        };
        
        loadMapData();
    }, []);

    // Вычисляем данные для визуализации
    const { visualMapData, seriesData, actualMin, actualMax } = useMemo(() => {
        if (!regionData.length) {
            return { visualMapData: [], seriesData: [], actualMin: min, actualMax: max };
        }

        // Находим min/max для всех регионов
        const values = regionData
            .map(item => item.value)
            .filter(v => v !== undefined && !isNaN(v));
        
        const calculatedMin = values.length > 0 ? Math.min(...values) : min;
        const calculatedMax = values.length > 0 ? Math.max(...values) : max;

        // Создаём данные для серии
        const seriesItems = regionData.map(item => {
            const isHighlighted = highlightedRegion && item.name === highlightedRegion;
            
            // Если это выделенный регион (Тюменская область) - добавляем специальный стиль
            if (isHighlighted) {
                return {
                    name: item.name,
                    value: item.value || 0,
                    itemStyle: {
                        areaColor: highlightColor,
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        emphasis: {
                            areaColor: highlightColor,
                            shadowBlur: 10,
                            shadowColor: 'rgba(255,68,68,0.5)'
                        }
                    },
                    // Подпись всегда видна для выделенного региона
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: '#ffffff',
                        textShadowBlur: 3,
                        textShadowColor: 'rgba(0,0,0,0.8)'
                    }
                };
            }
            // Остальные регионы - без подписи по умолчанию
            return {
                name: item.name,
                value: item.value || 0,
                label: {
                    show: false  // скрываем подписи для всех остальных
                }
            };
        });

        return {
            visualMapData: regionData,
            seriesData: seriesItems,
            actualMin: calculatedMin,
            actualMax: calculatedMax
        };
    }, [regionData, highlightedRegion, highlightColor, min, max]);

    const chartOption = {
        title: {
            text: highlightedRegion 
                ? `${title} (${highlightedRegion} выделена)`
                : title,
            left: "center",
            textStyle: {
                fontSize: 16,
                fontWeight: "normal",
                color: "#333"
            }
        },
        tooltip: {
            trigger: "item",
            formatter: (params) => {
                const isHighlighted = highlightedRegion && params.name === highlightedRegion;
                let valueText = '';
                
                if (params.name && params.value !== undefined) {
                    valueText = `Прохождений тестирования: ${params.value === 'NaN' || isNaN(params.value) ? 0 : params.value}`;
                }
                
                if (isHighlighted) {
                    return `<strong style="color: #ff4444;">${params.name}</strong><br/>${valueText}`;
                }
                return `<strong>${params.name}</strong><br/>${valueText}`;
            },
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "#ccc",
            borderWidth: 1,
            textStyle: {
                color: "#333"
            }
        },
        visualMap: showVisualMap && visualMapData.length > 0 ? {
            type: "continuous",
            min: actualMin,
            max: actualMax,
            left: "left",
            bottom: 10,
            calculable: true,
            inRange: {
                color: [
                    '#e8f4f8',  // очень светло-голубой
                    '#b3d9e8',  // светло-голубой
                    '#7ebcd8',  // средний голубой
                    '#4a9fc8',  // яркий голубой
                    '#1a7fb5',  // насыщенный голубой
                    '#0c5f8a'   // насыщенно-синий
                ]
            },
            outOfRange: {
                color: ['#e0e0e0']
            },
            text: ["Макс. " + actualMax, "Мин. " + actualMin],
            textStyle: {
                color: "#333",
                fontSize: 11
            },
            show: true,
            itemWidth: 20,
            itemHeight: 140
        } : null,
        series: [
            {
                name: "Субъекты РФ",
                type: "map",
                map: "Russia",
                roam: true,
                zoom: 1.5,
                center: [95, 60],
                scaleLimit: {
                    min: 0.8,
                    max: 15
                },
                itemStyle: {
                    borderColor: "#2c3e50",
                    borderWidth: 1.5,
                    areaColor: "#f0f0f0",
                    shadowBlur: 0
                },
                // Настройки при наведении
                emphasis: {
                    itemStyle: {
                        areaColor: "#ffd966",
                        borderWidth: 2.5,
                        borderColor: "#1a3c5a",
                        shadowBlur: 8,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        shadowColor: "rgba(0,0,0,0.3)"
                    },
                    // Подпись появляется при наведении на любой регион
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#1a3c5a",
                        textShadowBlur: 3,
                        textShadowColor: 'rgba(255,255,255,0.9)'
                    }
                },
                // По умолчанию подписи скрыты (кроме выделенного региона)
                label: {
                    show: false,  // все подписи скрыты по умолчанию
                    fontSize: 10,
                    color: "#333",
                    fontWeight: "normal"
                },
                data: seriesData,
                silent: false,
                select: {
                    disabled: false
                },
                visualMap: true
            }
        ],
        backgroundColor: "transparent",
        grid: {
            containLabel: true
        }
    };

    const onChartClick = params => {
        if (params.componentType === "series" && params.data) {
            const regionName = params.name;
            const regionValue = params.data.value;
            onRegionClick?.({
                name: regionName,
                value: regionValue,
                isHighlighted: highlightedRegion === regionName
            });
        }
    };
    
    const onChartReady = chart => {
        chart.on("click", onChartClick);
        
        window.addEventListener('resize', () => {
            chart.resize();
        });
    };

    if (!ready) {
        return <LoadingSpinner text="Загрузка карты" />;
    }

    return (
        <div className="RussianFederationMap">
            <EChartsReact
                option={chartOption}
                style={{ height: "550px", width: "100%" }}
                onChartReady={onChartReady}
                opts={{ renderer: "canvas" }}
            />
        </div>
    );
}

export default RussianFederationMap;
