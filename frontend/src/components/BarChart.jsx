import Chart from "react-apexcharts";
import "./BarChart.scss";

function BarChart({title, seriesLabel, seriesData, categories, height = 450}) {
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
                distributed: true,  // распределенное окрашивание
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
            tickAmount: 4,
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
            padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        },
        tooltip: {
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const value = series[seriesIndex][dataPointIndex];
                const category = value < 400 ? 'низкий' : value < 600 ? 'средний' : 'высокий';
                const color = getBarColor(value);
                const originalLabel = categories[dataPointIndex];
                
                return (
                    `<div class="custom-tooltip">
                        <strong>${originalLabel}</strong><br>
                        Значение: <span style="color:${color}">${value}</span> из 800<br>
                        Категория: <span style="color:${color}">${category}</span> результат
                    </div>`
                );
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
