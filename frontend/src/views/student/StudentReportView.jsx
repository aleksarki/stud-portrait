import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPortraitStudentResults } from "../../api";
import { getAvailableProfiles, getAvailableCategories, prepareCategoryTableData, RESULT_PROFILES } from "../../utilities";

import ResultTable from "../../components/ResultTable";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
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
            getPortraitStudentResults(studentId)
                .onSuccess(async response => {
                    const data = await response.json();
                    if (data.status === 'success') {
                        setStudResults({student: data.student, results: data.results});
                    }
                })
                .onError(error => console.error(error))
                .finally(() => setLoading(false));
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

                console.log('Table data for', category.key, tableData); // Для отладки
                console.log('Years for', category.key, years); // Для отладки

                if (tableData && tableData.length > 0) {
                    tables.push({
                        category: category,
                        title: category.title,
                        tableData: tableData,
                        years: years
                    });
                }
            });

            console.log('All tables data:', tables); // Для отладки
            setTablesData(tables);
        };

        if (studResults) {
            defineAvailableProfiles();
            prepareTablesData();
        }
    }, [studResults, reportType]);

    return (
        <div className="StudentReportView">
            <SidebarLayout style={LAYOUT_STYLE.NORMAL}>
                <Header title="Результаты" name={`${studResults?.student?.stud_name}`} />
                <Sidebar links={linkList} />
                <Content>
                    <Title title={reportTitle} />
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
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default StudentReportView;
