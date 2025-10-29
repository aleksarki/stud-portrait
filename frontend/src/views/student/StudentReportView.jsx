import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableProfiles, getAvailableCategories, prepareCategoryTableData, RESULT_PROFILES } from "../../utilities";

import Header from "../../components/Header";
import ResultTable from "../../components/ResultTable";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Subtitle from "../../components/Subtitle";
import Title from "../../components/Title";

import "./StudentReportView.scss";

function StudentReportView() {
    const {studentId, reportType} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [tablesData, setTablesData] = useState([]);
    const [loading, setLoading] = useState(true);

    const reportTitle = RESULT_PROFILES[reportType]?.title;

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
        const defineAvailableProfiles = () => {
            if (!studResults?.results?.length) return;

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
        };

        const prepareTablesData = () => {
            if (!studResults?.results?.length) return;

            const availableCategories = getAvailableCategories(studResults.results, reportType);
            const tables = [];

            availableCategories.forEach(category => {
                const { tableData, years } = prepareCategoryTableData(
                    studResults.results, 
                    reportType, 
                    category.key
                );

                if (tableData.length > 0) {
                    tables.push({
                        category: category,
                        title: category.title,
                        tableData: tableData,
                        years: years
                    });
                }
            });

            setTablesData(tables);
        };

        if (studResults) {
            defineAvailableProfiles();
            prepareTablesData();
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
                    ) : tablesData.length > 0 ? (
                        tablesData.map((table, index) => (
                            <div key={index} className="category-table-section">
                                <Subtitle text={table.title} />
                                <ResultTable
                                    data={table.tableData}
                                    years={table.years}
                                />
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

export default StudentReportView;
