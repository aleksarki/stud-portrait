import Chart from "react-apexcharts";

function RadarChart({title, seriesLabel, seriesData, categories}) {
    const chartOptions = {
        chart: {
            type: 'radar',
            toolbar: {show: false}
        },
        title: {text: title, align: 'center'},
        xaxis: {categories: categories}
    };

    const chartSeries = [{
        name: seriesLabel,
        data: seriesData
    }];

    return (
        <Chart
            options={chartOptions}
            series={chartSeries}
            type="radar"
        />
    );
    // height={350}
}

export default RadarChart;
