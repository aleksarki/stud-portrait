import RadarChart from "./RadarChart";
import BarChart from "./BarChart";

function ChartSwitcher({title, seriesLabel, seriesData, categories, height = 450}) {
    // Автоматически выбираем тип диаграммы на основе количества категорий
    const shouldUseBarChart = categories.length <= 3;
    
    if (shouldUseBarChart) {
        return (
            <BarChart
                title={title}
                seriesLabel={seriesLabel}
                seriesData={seriesData}
                categories={categories}
                height={height}
            />
        );
    }
    
    return (
        <RadarChart
            title={title}
            seriesLabel={seriesLabel}
            seriesData={seriesData}
            categories={categories}
            height={height}
        />
    );
}

export default ChartSwitcher;
