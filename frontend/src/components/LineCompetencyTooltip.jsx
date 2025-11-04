import ReactApexChart from "react-apexcharts";
import CompetencyTooltip from "./CompetencyTooltip";

import "./LineCompetencyTooltip.scss";

function LineCompetencyTooltip({ name, description, position, years, values }) {
    const chartOptions = {
        chart: {
            type: 'line',
            height: 200,
            zoom: { enabled: false },
            toolbar: { show: false }
        },
        stroke: {
            curve: 'smooth',
            width: 3,
            colors: ['#1976d2']
        },
        markers: {
            size: 6,
            strokeColors: '#fff',
            strokeWidth: 2,
            hover: { size: 8 }
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
            axisBorder: { color: '#78909C' },
            axisTicks: { color: '#78909C' }
        },
        yaxis: {
            min: 200,
            max: 800,
            tickAmount: 3,
            labels: {
                formatter: val => val,
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
        annotations: {
            yaxis: [
                {
                    y: 399,
                    y2: 200,
                    borderColor: 'transparent',
                    fillColor: '#FFF9C4',
                    opacity: .6,
                },
                {
                    y: 599,
                    y2: 400,
                    borderColor: 'transparent',
                    fillColor: '#C8E6C9',
                    opacity: .6,
                },
                {
                    y: 800,
                    y2: 600,
                    borderColor: 'transparent',
                    fillColor: '#A5D6A7',
                    opacity: .6,
                }
            ]
        }
    };

    const getPointColor = value => {
        if (value < 400) return '#e0cf30ff';
        if (value < 600) return '#c3da45ff';
        return '#219b25ff';
    };

    // data to pass into the chart
    const chartSeries = [{
        name: name,
        data: values.map((value, index) => ({
            x: years[index],
            y: value,
            fillColor: getPointColor(value)
        }))
    }];

    return (
        <CompetencyTooltip
            name={name}
            description={description}
            position={position}
        >
            <div className="LineCompetencyTooltip">
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
            </div>
        </CompetencyTooltip>
    );
}

export default LineCompetencyTooltip;
