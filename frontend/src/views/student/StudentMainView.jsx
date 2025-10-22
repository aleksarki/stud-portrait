import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableCategories, getLastYearData } from "../../utilities";

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
                // setError(null);
                await portraitGetResults(studentId, setStudResults);
            } catch (err) {
                // setError(err.message);
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
        const defineAvaliableResults = () => {
            if (!studResults?.results?.length) return;

            const available = getAvailableCategories(studResults.results);
            const categoryLinks = available.map(category => {
                return {
                    to: `/student/${studResults.student.stud_id}/report/${category.key}`,  // dubious
                    title: category.title
                };
            });
            setLinkList([{
                to: `/student/${studResults.student.stud_id}`,
                title: "Обзор"
            }, ...categoryLinks]);

            // last year data for radar charts
            const charts = available.map(category => {
                const lastYearData = getLastYearData(studResults.results, category.key);
                return {
                    category: category,
                    title: category.title,
                    year: lastYearData.year,
                    labels: lastYearData.labels,
                    data: lastYearData.data
                };
            });

            setChartsData(charts);
        };

        if (studResults) {
            defineAvaliableResults();
        }
    }, [studResults]);

    return (
        <div className="StudentMainView">
            <Header title="Профиль" name={`${studResults?.student?.stud_name}`} />
            <Title title="Обзор" />
            <SidebarLayout sidebar={<Sidepanel links={linkList} />}>
                <div className="charts-grid">
                    {loading ? (
                        <div className="loading">Загрузка данных...</div>
                    ) : chartsData.length > 0 ? (
                        chartsData.map(chart => (
                            <div key={chart.category.key} className="chart-card">
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
