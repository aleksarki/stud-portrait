import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableCategories, prepareTableData, RESULT_CATEGORIES } from "../../utilities";

import Header from "../../components/Header";
import ResultTable from "../../components/ResultTable";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";

import "./StudentReportView.scss";

function StudentReportView() {
    const {studentId, reportType} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [years, setYears] = useState([]);
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
                    to: `/student/${studResults.student.stud_id}/report/${category.key}`,  // dubious
                    title: category.title
                };
            }));
            setLinkList(ll => [{
                to: `/student/${studResults.student.stud_id}`,
                title: "Обзор"
            }, ...ll]);
        };

        if (studResults) {
            defineAvaliableResults();
            
            const {
                tableData: preparedTableData, years: preparedYears 
            } = prepareTableData(studResults.results, reportType);
            
            setTableData(preparedTableData);
            setYears(preparedYears);
        }
    }, [studResults, reportType]);

    return (
        <div className="StudentReportView">
            <Header title="Результаты" name={`${studResults?.student?.stud_name}`} />
            <Title title={reportTitle} />
            <SidebarLayout sidebar={<Sidepanel links={linkList} />}>
                <div className="report-container">
                    {loading ? (
                        <div className="loading">Загрузка данных...</div>
                    ) : (
                        <ResultTable
                            data={tableData}
                            years={years}
                        />
                    )}
                </div>
            </SidebarLayout>
        </div>
    );
}

export default StudentReportView;