import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { 
  getAvailableProfiles, 
  getAvailableCategories, 
  getAvailableYears,
  getCategoryDataForYear 
} from "../../utilities";

import ChartSwitcher from "../../components/ChartSwitcher";
import Header from "../../components/Header"
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";
import Dropdown from "../../components/Dropdown";

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [chartsData, setChartsData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                await portraitGetResults(studentId, setStudResults);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    useEffect(() => {
        const defineAvailableData = () => {
            if (!studResults?.results?.length) return;

            // Ссылки для боковой панели
            const availableProfiles = getAvailableProfiles(studResults.results);
            const profileLinks = availableProfiles.map(profile => {
                return {
                    to: `/student/${studResults.student.stud_id}/report/${profile.key}`,
                    title: profile.title
                };
            });
            
            setLinkList([{
                to: `/student/${studResults.student.stud_id}`,
                title: "Главная страница"
            }, ...profileLinks]);

            // Доступные годы
            const years = getAvailableYears(studResults.results);
            setAvailableYears(years);
            
            // Установить выбранный год (последний доступный)
            if (years.length > 0 && !selectedYear) {
                setSelectedYear(years[0]);
            }

            updateChartsData(years.length > 0 ? selectedYear || years[0] : null);
        };

        if (studResults) {
            defineAvailableData();
        }
    }, [studResults]);

    useEffect(() => {
        if (studResults?.results?.length && selectedYear) {
            updateChartsData(selectedYear);
        }
    }, [selectedYear, studResults]);

    const updateChartsData = (year) => {
        if (!studResults?.results?.length || !year) return;

        const availableProfiles = getAvailableProfiles(studResults.results);
        const charts = [];
        
        availableProfiles.forEach(profile => {
            const availableCategories = getAvailableCategories(studResults.results, profile.key);
            
            availableCategories.forEach(category => {
                const yearData = getCategoryDataForYear(studResults.results, profile.key, category.key, year);
                
                if (yearData.labels.length > 0) {
                    charts.push({
                        profile: profile,
                        category: category,
                        title: `${profile.title}: ${category.title}`,
                        year: yearData.year,
                        labels: yearData.labels,
                        data: yearData.data
                    });
                }
            });
        });

        setChartsData(charts);
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    return (
        <div className="StudentMainView">
            <Header title="Профиль" name={`${studResults?.student?.stud_name}`} />
            <Title title="Главная страница" />
            <SidebarLayout sidebar={<Sidepanel links={linkList} />}>
                <div className="main-controls">
                    {availableYears.length > 0 && (
                        <div className="year-selector">
                            <span className="year-label">Год данных:</span>
                            <Dropdown 
                                handle={
                                    <div className="year-dropdown-handle">
                                        {selectedYear || "Выберите год"}
                                        <span className="dropdown-arrow">▼</span>
                                    </div>
                                }
                            >
                                {availableYears.map(year => (
                                    <div 
                                        key={year} 
                                        className={`year-option ${year === selectedYear ? 'selected' : ''}`}
                                        onClick={() => handleYearChange(year)}
                                    >
                                        {year}
                                    </div>
                                ))}
                            </Dropdown>
                        </div>
                    )}
                </div>
                
                <div className="charts-grid">
                    {loading ? (
                        <div className="loading">Загрузка данных...</div>
                    ) : chartsData.length > 0 ? (
                        chartsData.map((chart, index) => (
                            <div key={index} className="chart-card">
                                <div className="chart-header">
                                    <h3>{chart.title}</h3>
                                    {chart.year && (
                                        <span className="chart-year">{chart.year}</span>
                                    )}
                                </div>
                                <div className="chart-container">
                                    <ChartSwitcher
                                        seriesLabel={`${chart.year} год`}
                                        seriesData={chart.data}
                                        categories={chart.labels}
                                        title={chart.title} // Добавьте title если нужно
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data">
                            {availableYears.length > 0 ? "Нет данных для отображения" : "Нет доступных данных"}
                        </div>
                    )}
                </div>
            </SidebarLayout>
        </div>
    );
}

export default StudentMainView;
