import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";
import { getAvailableCategories } from "../../utilities";

import Header from "../../components/Header"
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Title from "../../components/Title";

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    // const [availableCategories, setAvailableCategories] = useState([]);
    const [linkList, setLinkList] = useState([]);
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
                <span>текст</span>
            </SidebarLayout>
        </div>
    );
}

export default StudentMainView;
