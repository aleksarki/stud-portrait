import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableCategories, getCategoryData, RESULT_CATEGORIES } from "../../utilities";

import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";

import "./StudentReportView.scss";

function StudentReportView() {
    const {studentId, reportType} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [reportData, setReportData] = useState([]);
    const [chartSeries, setChartSeries] = useState([]);
    const [loading, setLoading] = useState(true);

    const reportTitle = RESULT_CATEGORIES[reportType]?.title;

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
        const defineAvaliableResults = () => {
            if (!studResults?.results?.length) return;

            const available = getAvailableCategories(studResults.results);
            setLinkList(available.map(category => {
                return {
                    to: `http://localhost:3000/student/${studResults.student.stud_id}/report/${category.key}`,  // dubious
                    title: category.title
                };
            }));
        };

        if (studResults) {
            defineAvaliableResults();
            const data = getCategoryData(studResults.results, reportType);
            setReportData(data);
            prepareChartData(data);
        }
    }, [studResults]);

    // group by year
    const prepareChartData = (categoryData) => {
        if (!categoryData.length) return;

        // Получаем все уникальные годы из данных
        const allYears = [...new Set(
            categoryData.flatMap(field => 
                field.values.map(value => value.year)
            )
        )].sort();

        // Создаем серии данных по годам
        const series = allYears.map(year => {
            const yearData = {
                name: year.toString(),
                data: []
            };

            // Для каждой компетенции находим значение за этот год
            categoryData.forEach(field => {
                const yearValue = field.values.find(value => value.year === year);
                yearData.data.push(yearValue ? yearValue.value : null);
            });

            return yearData;
        });

        setChartSeries(series);
    };

    return (
        <div className="StudentReportView">
            <Header title="Результаты" name={`${studResults?.student?.stud_name}`} />
            <Title title={reportTitle} />
            <SidebarLayout sidebar={<Sidepanel links={linkList} />}>
                {reportData.length > 0 && (
                    <LineChart
                        title={reportTitle}
                        seriesLabels={reportData?.map(result => result.label)}
                        chartSeries={chartSeries}
                    />
                )}
            </SidebarLayout>
        </div>
    );
}

export default StudentReportView;
