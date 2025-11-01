import ReactApexChart from "react-apexcharts";
import "./LineCompetencyTooltip.scss";

function LineCompetencyTooltip({ competency, description, years, values, isVisible, position }) {
    if (!isVisible) return null;

    // определение цвета точки по значению
    const getPointColor = (value) => {
        if (value < 400) return '#e0cf30ff'; // желтый
        if (value < 600) return '#c3da45ff'; // салатовый
        return '#219b25ff'; // зеленый
    };

    const chartOptions = {
        chart: {
            type: 'line',
            height: 200,
            zoom: { enabled: false },
            toolbar: { show: false }
        },
        /*title: {
            text: 'Развитие компетенции',
            align: 'center',
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#333'
            }
        },*/
        stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#1976d2']
        },
        markers: {
            size: 6,
            strokeColors: '#fff',
            strokeWidth: 2,
            hover: {
                size: 8
            }
        },
        grid: {
            borderColor: '#e0e0e0',
            strokeDashArray: 3,
            padding: {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            }
        },
        xaxis: {
            categories: years,
            labels: {
                style: {
                    colors: '#666',
                    fontSize: '11px'
                }
            },
            axisBorder: {
                color: '#78909C'
            },
            axisTicks: {
                color: '#78909C'
            }
        },
        yaxis: {
            min: 200,
            max: 800,
            tickAmount: 4,
            labels: {
                formatter: function(val) { return val; },
                style: {
                    colors: '#666',
                    fontSize: '11px'
                }
            },
            axisBorder: {
                show: true,
                color: '#78909C'
            }
        },
        tooltip: {
            enabled: true,
            custom: function({ series, seriesIndex, dataPointIndex, w }) {
                const value = series[seriesIndex][dataPointIndex];
                const category = value < 400 ? 'низкий' : value < 600 ? 'средний' : 'высокий';
                const color = getPointColor(value);
                
                return `
                    <div class="mini-tooltip">
                        <div>Год: <strong>${years[dataPointIndex]}</strong></div>
                        <div>Значение: <strong style="color:${color}">${value}</strong></div>
                        <div>Категория: <span style="color:${color}">${category}</span></div>
                    </div>
                `;
            }
        },
        annotations: {
            yaxis: [
                {
                    y: 399,
                    y2: 200,
                    borderColor: 'transparent',
                    fillColor: '#FFF9C4',
                    opacity: 0.6,
                },
                {
                    y: 599,
                    y2: 400,
                    borderColor: 'transparent',
                    fillColor: '#C8E6C9',
                    opacity: 0.6,
                },
                {
                    y: 800,
                    y2: 600,
                    borderColor: 'transparent',
                    fillColor: '#A5D6A7',
                    opacity: 0.6,
                }
            ]
        }
    };

    // серии с индивидуальными цветами для маркеров
    const chartSeries = [{
        name: competency,
        data: values.map((value, index) => ({
            x: years[index],
            y: value,
            fillColor: getPointColor(value) // Индивидуальный цвет для каждой точки
        }))
    }];

    return (
        <div 
            className="LineCompetencyTooltip" 
            style={{
                left: position.x,
                top: position.y
            }}
        >
            <div className="tooltip-content">
                <div className="tooltip-header">
                    <h3 className="competency-title">{competency}</h3>
                </div>

                {years.length > 1 && (
                    <div className="development-chart">
                        <ReactApexChart
                            options={chartOptions}
                            series={chartSeries}
                            type="line"
                            height={200}
                        />
                    </div>
                )}

                {years.length === 1 && (
                    <div className="single-value">
                        <div className="value-display">
                            Текущее значение: <strong>{values[0]}</strong>
                        </div>
                        <div className="value-category">
                            Категория: <span style={{color: getPointColor(values[0])}}>
                                {values[0] < 400 ? 'низкий' : values[0] < 600 ? 'средний' : 'высокий'}
                            </span>
                        </div>
                    </div>
                )}

                {description && (
                    <div className="competency-description">
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LineCompetencyTooltip;
