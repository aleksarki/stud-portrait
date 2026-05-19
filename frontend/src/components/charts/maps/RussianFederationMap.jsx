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
    highlightedRegion = null,
    highlightColor = '#ff4444'
}) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const loadMapData = async () => {
            const response = await fetch('/data/russia.geojson');
            const geoJson = await response.json();
            echarts.registerMap("Russia", geoJson);
            setReady(true);
        };
        
        loadMapData();
    }, []);

    // Вычисляем данные для визуализации с исключением выделенного региона из шкалы
    const { visualMapData, seriesData, actualMin, actualMax } = useMemo(() => {
        if (!regionData.length) {
            return { visualMapData: [], seriesData: [], actualMin: min, actualMax: max };
        }

        // Отделяем выделенный регион от остальных
        const highlightedItem = highlightedRegion 
            ? regionData.find(item => item.name === highlightedRegion)
            : null;
        
        const otherRegions = highlightedRegion
            ? regionData.filter(item => item.name !== highlightedRegion)
            : regionData;

        // Находим min/max только среди остальных регионов
        const values = otherRegions.map(item => item.value).filter(v => v !== undefined && !isNaN(v));
        const calculatedMin = values.length > 0 ? Math.min(...values) : min;
        const calculatedMax = values.length > 0 ? Math.max(...values) : max;

        // Создаём данные для серии (карты)
        const seriesItems = regionData.map(item => {
            // Если это выделенный регион - добавляем специальный стиль
            if (highlightedRegion && item.name === highlightedRegion) {
                return {
                    name: item.name,
                    value: item.value,
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
                    label: {
                        show: true,
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: '#fff',
                        textShadowBlur: 2,
                        textShadowColor: 'rgba(0,0,0,0.5)'
                    }
                };
            }
            // Остальные регионы - обычная обработка
            return {
                name: item.name,
                value: item.value
            };
        });

        return {
            visualMapData: otherRegions,
            seriesData: seriesItems,
            actualMin: calculatedMin,
            actualMax: calculatedMax
        };
    }, [regionData, highlightedRegion, highlightColor, min, max]);

    const chartOption = {
        title: {
            text: highlightedRegion 
                ? `${title} (${highlightedRegion})`
                : title,
            left: "center",
            textStyle: {
                fontSize: 16,
                fontWeight: "normal"
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
            top: "bottom",
            calculable: true,
            inRange: {
                color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
            },
            outOfRange: {
                color: ['#ccc']
            },
            text: ["Высокий", "Низкий"],
            textStyle: {
                color: "#333"
            },
            show: true
        } : null,
        series: [
            {
                name: "Субъекты РФ",
                type: "map",
                map: "Russia",
                roam: true,
                zoom: 1.2,
                scaleLimit: {
                    min: 0.8,
                    max: 15
                },
                itemStyle: {
                    normal: {
                        borderColor: "#ffffff",
                        borderWidth: 1,
                        areaColor: "#f0f0f0",
                        shadowBlur: 0
                    },
                    emphasis: {
                        areaColor: "#ffd966",
                        borderWidth: 1,
                        borderColor: "#fff",
                        shadowBlur: 5,
                        shadowOffsetX: 0,
                        shadowOffsetY: 0,
                        shadowColor: "rgba(0,0,0,0.2)"
                    }
                },
                label: {
                    normal: {
                        show: false,
                        fontSize: 10
                    },
                    emphasis: {
                        show: true,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#333"
                    }
                },
                data: seriesData,
                silent: false,
                select: {
                    disabled: false
                }
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
    };

    if (!ready) {
        return <LoadingSpinner text="Загрузка карты" />;
    }

    return (
        <div className="RussianFederationMap">
            <EChartsReact
                option={chartOption}
                style={{ height: "500px", width: "100%" }}
                onChartReady={onChartReady}
                opts={{ renderer: "canvas" }}
            />
        </div>
    );
}

export default RussianFederationMap;

/* [
'Бурятия',
'Карачаево-Черкесская республика',
'Сахалинская область',
'Воронежская область',
'Томская область',
'Новосибирская область',
'Ненецкий автономный округ',
'Магаданская область',
'Камчатский край',
'Приморский край',
'Ставропольский край',
'Алтайский край',
'Москва',
'Тыва',
'Тамбовская область',
'Свердловская область',
'Ханты-Мансийский автономный округ - Югра',
'Чукотский автономный округ',
'Тюменская область',
'Владимирская область',
'Московская область',
'Волгоградская область',
'Оренбургская область',
'Самарская область',
'Астраханская область',
'Адыгея',
'Республика Калмыкия',
'Краснодарский край',
'Ростовская область',
'Мурманская область',
'Псковская область',
'Санкт-Петербург',
'Ленинградская область',
'Республика Мордовия',
'Татарстан',
'Кировская область',
'Костромская область',
'Тверская область',
'Тульская область',
'Калужская область',
'Ульяновская область',
'Марий Эл',
'Смоленская область',
'Пермский край',
'Ивановская область',
'Чувашия',
'Северная Осетия - Алания',
'Брянская область',
'Пензенская область',
'Белгородская область',
'Липецкая область',
'Новгородская область',
'Архангельская область',
'Нижегородская область',
'Курганская область',
'Курская область',
'Забайкальский край',
'Алтай',
'Рязанская область',
'Ямало-Ненецкий автономный округ',
'Красноярский край',
'Республика Саха (Якутия)',
'Дагестан',
'Омская область',
'Республика Коми',
'Чеченская республика',
'Кабардино-Балкарская республика',
'Саратовская область',
'Калининградская область',
'Орловская область',
'Республика Карелия',
'Иркутская область',
'Амурская область',
'Еврейская автономная область',
'Хабаровский край',
'Кемеровская область',
'Республика Хакасия',
'Ярославская область',
'Удмуртская республика',
'Вологодская область',
'Ингушетия',
'Челябинская область',
'Башкортостан'
] */
