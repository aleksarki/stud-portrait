import Chart from "react-apexcharts";
import { CATEGORIES_DESCRIPTIONS } from "../utilities";
import "./RadarChart.scss";

function RadarChart({title, seriesLabel, seriesData, categories, competencyKeys, height = 450}) {
    // Функция для форматирования подписей с переносами
    const formatCategoryLabels = (categories) => {
        return categories.map(category => {
            const words = category.split(' ');
            if (words.length <= 2) return category;
            
            // Разбиваем на две строки
            const mid = Math.ceil(words.length / 2);
            const line1 = words.slice(0, mid).join(' ');
            const line2 = words.slice(mid).join(' ');
            
            return [line1, line2];
        });
    };

    const formattedCategories = formatCategoryLabels(categories);

    const chartOptions = {
        chart: {
            type: 'radar',
            toolbar: { show: false },
            dropShadow: { enabled: true, blur: 1, left: 1, top: 1 },
            width: '100%'
        },
        title: {
            text: title,
            align: 'center',
            style: { fontSize: '14px', fontWeight: 'bold' }
        },
        xaxis: {
            categories: formattedCategories,
            labels: {
                style: { 
                    fontSize: '12px',
                    fontWeight: 500,
                    colors: '#333'
                }
            }
        },
        yaxis: {
            min: 200,
            max: 800,
            tickAmount: 3,
            labels: {
                formatter: function(val) { return val; },
                style: {
                    fontSize: '11px'
                }
            }
        },
        plotOptions: {
            radar: {
                size: categories.length > 8 ? 100 : 140,
                polygons: {
                    connectorColors: '#BDBDBD',
                    fill: { colors: ['#A5D6A7', '#C8E6C9', '#FFF9C4'] }
                }
            }
        },
        tooltip: {
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const formatDescription = (description) => {
                    if (!description) return '';
                    
                    // Разбиваем описание на строки по 50 символов
                    const words = description.split(' ');
                    const lines = [];
                    let currentLine = '';
                    
                    words.forEach(word => {
                        if ((currentLine + ' ' + word).length > 44) {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = currentLine ? currentLine + ' ' + word : word;
                        }
                    });
                    if (currentLine) lines.push(currentLine);
                    
                    return lines.join('<br>');
                };

                const value = series[seriesIndex][dataPointIndex];
                const category = value < 400 ? 'низкий' : value < 600 ? 'средний' : 'высокий';
                const color = value < 400 ? '#e0cf30ff' : value < 600 ? '#c3da45ff' : '#219b25ff';
                const originalLabel = categories[dataPointIndex];
                
                // описание компетенции
                const competencyKey = competencyKeys && competencyKeys[dataPointIndex];
                const description = competencyKey ? CATEGORIES_DESCRIPTIONS[competencyKey] : null;
                console.log(competencyKey)
                
                let tooltipHTML = `
                    <div class="custom-tooltip">
                        <strong>${originalLabel}</strong><br>
                        Значение: <span style="color:${color}">${value}</span> из 800<br>
                        Категория: <span style="color:${color}">${category}</span> результат
                `;
                
                if (description) {
                    const formattedDescription = formatDescription(description);
                    tooltipHTML += (
                        `<br>
                        <div style="margin-top: 8px; font-size: 13px; color: #666; max-width: 300px; line-height: 1.3;">
                            ${formattedDescription}
                        </div>`
                    );
                }
                
                tooltipHTML += `</div>`;
                return tooltipHTML;
            }
        }
    };

    const chartSeries = [{
        name: seriesLabel,
        data: seriesData
    }];

    return (
        <div className="RadarChart" style={{ width: '100%' }}>
            <Chart
                options={chartOptions}
                series={chartSeries}
                type="radar"
                height={height}
                width="100%"
            />
        </div>
    );
}

export default RadarChart;
