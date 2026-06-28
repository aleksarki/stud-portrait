import ReactApexChart from "react-apexcharts";
import CompetencyTooltip from "./CompetencyTooltip";

import "./LineCompetencyTooltip.scss";

function LineCompetencyTooltip({ name, description, position, years, values }) {
    const getBarColor = value => {
        if (value === null || value === undefined) return '#cccccc';
        if (value < 400) return '#e0cf30';
        if (value < 600) return '#c3da45';
        return '#219b25';
    };

    const barColors = values.map(v => getBarColor(v));

    const chartOptions = {
        chart: {
            type: 'bar',
            height: 200,
            zoom: { enabled: false },
            toolbar: { show: false }
        },
        colors: barColors,
        plotOptions: {
            bar: {
                distributed: true,
                borderRadius: 3,
                columnWidth: '60%',
                dataLabels: { position: 'center' }
            }
        },
        dataLabels: {
            enabled: true,
            formatter: val => val ?? '',
            style: {
                fontSize: '11px',
                colors: ['#333']
            }
        },
        legend: { show: false },
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
        }
    };

    const chartSeries = [{
        name: name,
        data: values.map((value, index) => ({
            x: years[index],
            y: value
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
                            type="bar"
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
                            Категория: <span style={{color: getBarColor(values[0])}}>
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
