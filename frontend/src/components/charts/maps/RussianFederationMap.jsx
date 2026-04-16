import { useEffect, useState } from "react";
import EChartsReact from "echarts-for-react";
import * as echarts from "echarts";

import LoadingSpinner from "../../ui/LoadingSpinner";

import "./RussianFederationMap.scss";

function RussianFederationMap({ title, regionData = [], onRegionClick, showVisualMap = true, min = 0, max = 100 }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const loadMapData = async () => {
            const response = await fetch('/data/russia.geojson');
            const geoJson = await response.json();
            const regions = geoJson.features.map(feature => {
                return feature.properties.name || 
                       feature.properties.NAME || 
                       feature.properties.region_name ||
                       feature.properties.NAME_1 ||
                       'Unknown';
            });
            // console.log("Всего регионов:", regions.length);
            // console.log("Список регионов:", regions);
            echarts.registerMap("Russia", geoJson);
            setReady(true);
        };
        
        loadMapData();
    }, []);

    const mapData = regionData.map(item => ({
        name: item.name,
        value: item.value
    }));

    const chartOption = {
        title: {
            text: title,
            left: "center",
            textStyle: {
                fontSize: 16,
                fontWeight: "normal"
            }
        },
        tooltip: {
            trigger: "item",
            formatter: (params) => {
                if (params.name && params.value !== undefined) {
                    return `<strong>${params.name}</strong><br/>Прохождений тестирования: ${ `${params.value}` == 'NaN' ? 0 : params.value}`;
                }
                return params.name;
            },
            backgroundColor: "rgba(255,255,255,0.95)",
            borderColor: "#ccc",
            borderWidth: 1,
            textStyle: {
                color: "#333"
            }
        },
        visualMap: showVisualMap ? {
            type: "continuous",
            min: min,
            max: max,
            left: "left",
            top: "bottom",
            calculable: true,
            inRange: {
                color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695']
            },
            text: ["Высокий", "Низкий"],
            textStyle: {
                color: "#333"
            },
            show: false
        } : null,
        series: [
            {
                name: "Субъекты РФ",
                type: "map",
                map: "Russia",
                roam: true,              // Включить масштабирование и перемещение
                zoom: 1.2,               // Начальный зум
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
                        show: false,     // Обычно не показываем подписи
                        fontSize: 10
                    },
                    emphasis: {
                        show: true,
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#333"
                    }
                },
                data: mapData,
                // Обработка кликов через события
                silent: false,
                select: {
                    disabled: false
                }
            }
        ],
        // Адаптивность
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
                value: regionValue
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
                style={{ height: "400px", width: "100%" }}
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
