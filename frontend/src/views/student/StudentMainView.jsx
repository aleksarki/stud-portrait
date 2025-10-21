import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portraitGetResults } from "../../api";

import Header from "../../components/Header"

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
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

    return (
        <div className="StudentMainView">
            <Header title="Профиль" name={`${studResults?.student?.stud_name}`} />
        </div>
    );
}

export default StudentMainView;
