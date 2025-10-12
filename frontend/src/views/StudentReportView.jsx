import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { portraitGetResults } from '../api';
import Header from '../components/Header';
import "./StudentReportView.scss";

function StudentReportView() {
    const {studId} = useParams();
    const [studResults, setStudResults] = useState();
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // setError(null);
                await portraitGetResults(studId, setStudResults);
            } catch (err) {
                // setError(err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (studId) {
            fetchData();
        }
    }, [studId]);

    let content = null;
    if (studResults) {
        content = <>
            <div>
                <span>Результаты студента {studResults.student.stud_name}</span>
            </div>
            <div>
                <span>...</span>
            </div>
        </>;
    }

    return (
        <div className="StudentReportView">
            <Header />
            {content}
        </div>
    );
}

export default StudentReportView;
