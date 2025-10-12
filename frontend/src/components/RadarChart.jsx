import Chart from 'react-apexcharts';

function RadarChart({title, seriesLabel, seriesData, categories}) {
    // const seriesLabel = 'Студент 1';
    // const seriesData = [80, 90, 70, 85, 60, 95];
    // const categories = ['Коммуникативность', 'Мышление', 'Команда', 'Методичность', 'Стрессоустойчивость', 'Амбициозность'];

    const chartOptions = {
        chart: {
            type: 'radar',
            toolbar: {show: false}
        },
        xaxis: {categories: categories},
        title: {text: title, align: 'center'}
    };

    const chartSeries = [{
        name: seriesLabel,
        data: seriesData
    }];

    return <Chart
        options={chartOptions}
        series={chartSeries}
        type="radar"
    />;
    // height={350}
}

export default RadarChart;
