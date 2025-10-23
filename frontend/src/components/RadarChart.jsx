import Chart from "react-apexcharts";
import "./RadarChart.scss";

function RadarChart({title, seriesLabel, seriesData, categories, height = 350}) {
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
            categories: categories,
            labels: {
                style: { fontSize: '10px', fontWeight: 500 }
            }
        },
        yaxis: { show: false, min: 0, max: 1000 },
        plotOptions: {
            radar: {
                size: categories.length > 8 ? 80 : 120,
                polygons: {
                    strokeColors: '#e9e9e9',
                    fill: { colors: ['#f8f8f8', '#fff'] }
                }
            }
        },
        /*colors: ['#FF4560'],
        markers: {
            size: 4,
            colors: ['#fff'],
            strokeColor: '#FF4560',
            strokeWidth: 2
        },*/
        tooltip: {
            y: { formatter: val => val.toString() }
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