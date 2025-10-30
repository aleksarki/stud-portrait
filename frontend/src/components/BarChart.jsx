import Chart from "react-apexcharts";
import { CATEGORIES_DESCRIPTIONS } from "../utilities";
import "./BarChart.scss";

function BarChart({title, seriesLabel, seriesData, categories, competencyKeys, height = 450}) {
    const getBarColor = (value) => {
        if (value < 400) return '#e0cf30ff';
        if (value < 600) return '#c3da45ff';
        return '#219b25ff';
    };

    // массив цветов для каждого столбца
    const barColors = seriesData.map(value => getBarColor(value));

    const chartOptions = {
        chart: {
            type: 'bar',
            toolbar: { show: false },
            width: '100%'
        },
        title: {
            text: title,
            align: 'center',
            style: { fontSize: '14px', fontWeight: 'bold' }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                borderRadius: 4,
                columnWidth: '60%',
                distributed: true,
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val) {
                return val;
            },
            style: {
                fontSize: '12px',
                colors: ['#333']
            }
        },
        xaxis: {
            categories: categories,
            labels: {
                style: {
                    fontSize: '12px',
                    fontWeight: 500,
                    colors: '#333'
                },
                formatter: function(value) {
                    // переносы для длинных названий
                    const words = value.split(' ');
                    if (words.length <= 2) return value;
                    
                    const mid = Math.ceil(words.length / 2);
                    return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
                }
            }
        },
        yaxis: {
            min: 200,
            max: 800,
            tickAmount: 3,
            title: {
                text: 'Баллы',
                style: {
                    fontSize: '12px',
                    fontWeight: 500
                }
            },
            labels: {
                formatter: function(val) { return val; },
                style: {
                    fontSize: '11px'
                }
            }
        },
        grid: {
            borderColor: '#e7e7e7',
            strokeDashArray: 3,
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
                        if ((currentLine + ' ' + word).length > 50) {
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
                const color = getBarColor(value);
                const originalLabel = categories[dataPointIndex];
                
                // описание компетенции
                const competencyKey = competencyKeys && competencyKeys[dataPointIndex];
                const description = competencyKey ? CATEGORIES_DESCRIPTIONS[competencyKey] : null;
                
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
                        <div style="margin-top: 8px; font-size: 11px; color: #666; max-width: 300px; line-height: 1.3;">
                            ${formattedDescription}
                        </div>`
                    );
                }
                
                tooltipHTML += `</div>`;
                return tooltipHTML;
            }
        },
        colors: barColors,  // массив цветов для каждого столбца
    };

    const chartSeries = [{
        name: seriesLabel,
        data: seriesData
    }];

    return (
        <div className="BarChart" style={{ width: '100%' }}>
            <Chart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={height}
                width="100%"
            />
        </div>
    );
}

export default BarChart;
