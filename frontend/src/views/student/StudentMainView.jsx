import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableCategories, getCategoryDataForChart } from "../../utilities";

import Header from "../../components/Header"
import LineChart from "../../components/LineChart";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    // const [availableCategories, setAvailableCategories] = useState([]);
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
            // setAvailableCategories(available);
            setLinkList(available.map(category => {
                return {
                    to: `http://localhost:3000/student/${studResults.student.stud_id}/report/${category.key}`,  // dubious
                    title: category.title
                };
            }));

            // Подготавливаем данные для всех графиков
            const charts = available.map(category => {
                const chartData = getCategoryDataForChart(studResults.results, category.key);
                return {
                    category: category,
                    title: category.title,
                    labels: chartData.labels,
                    series: chartData.series
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
                        chartsData.map((chart, index) => (
                            <div key={chart.category.key} className="chart-card">
                                <div className="chart-header">
                                    <h3>{chart.title}</h3>
                                </div>
                                <div className="chart-container">
                                    <LineChart
                                        title={chart.title}
                                        seriesLabels={chart.labels}
                                        chartSeries={chart.series}
                                        height="300"
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