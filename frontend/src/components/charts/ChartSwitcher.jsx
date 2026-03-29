import RadarChart from "./RadarChart";
import BarChart from "./BarChart";

function ChartSwitcher({title, seriesLabel, seriesData, categories, competencyKeys, height = 450}) {
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
                competencyKeys={competencyKeys}
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
            competencyKeys={competencyKeys}
        />
    );
}

export default ChartSwitcher;
