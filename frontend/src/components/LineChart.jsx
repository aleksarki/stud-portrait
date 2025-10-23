import ReactApexChart from "react-apexcharts";

function LineChart({title, seriesLabels, chartSeries}) {
    const chartOptions = {
        chart: {
            type: 'line',
            zoom: { enabled: false }
        },
        title: { text: title, align: 'center' },
        stroke: { curve: 'smooth' },
        labels: seriesLabels,
        xaxis: {}
    };

    return (
        <ReactApexChart
            type="line"
            options={chartOptions}
            series={chartSeries}
        />
    );
}

export default LineChart;
