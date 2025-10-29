import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableProfiles, getAvailableCategories, getLastYearCategoryData } from "../../utilities";

import Header from "../../components/Header"
import RadarChart from "../../components/RadarChart";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [chartsData, setChartsData] = useState([]);
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

            // Данные для диаграмм по категориям внутри профилей
            const charts = [];
            
            availableProfiles.forEach(profile => {
                const availableCategories = getAvailableCategories(studResults.results, profile.key);
                
                availableCategories.forEach(category => {
                    const lastYearData = getLastYearCategoryData(studResults.results, profile.key, category.key);
                    
                    if (lastYearData.labels.length > 0) {
                        charts.push({
                            profile: profile,
                            category: category,
                            title: `${profile.title}: ${category.title}`,
                            year: lastYearData.year,
                            labels: lastYearData.labels,
                            data: lastYearData.data
                        });
                    }
                });
            });

            setChartsData(charts);
        };

        if (studResults) {
            defineAvailableData();
        }
    }, [studResults]);

    return (
        <div className="StudentMainView">
            <Header title="Профиль" name={`${studResults?.student?.stud_name}`} />
            <Title title="Главная страница" />
            <SidebarLayout sidebar={<Sidepanel links={linkList} />}>
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
                                    <RadarChart
                                        seriesLabel={`${chart.year} год`}
                                        seriesData={chart.data}
                                        categories={chart.labels}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data">Нет данных для отображения</div>
                    )}
                </div>
            </SidebarLayout>
        </div>
    );
}

export default StudentMainView;
