// components/charts/StudentDisciplineImpact.jsx
import React, { useState, useEffect } from 'react';

import { getStudentDisciplineImpact } from '../../api';
import { COMPETENCIES_NAMES } from '../../utilities';
import { disciplineAffectsCompetency } from '../../disciplineCompetencyMap';

const StudentDisciplineImpact = ({ studentId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        getStudentDisciplineImpact(studentId)
            .onSuccess(async response => {
                const result = await response.json();
                if (result.status === 'success') {
                    setData(result.data);
                } else {
                    setError(result.message);
                }
            })
            .onError(err => {
                console.error(err);
                setError('Ошибка загрузки данных');
            })
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loading) return <div className="loading">Загрузка влияния дисциплин...</div>;
    if (error) return <div className="no-data">Ошибка: {error}</div>;
    if (!data || data.length === 0) return <div className="no-data">Нет данных о влиянии дисциплин</div>;

    return (
        <div className="student-discipline-impact">
            <h3>Влияние дисциплин на ваши компетенции</h3>
            <p className="info-text">
                Для каждой дисциплины показаны баллы компетенций до и после её изучения, а также изменение.
            </p>
            <div className="disciplines-list">
                {data.map((item, idx) => {
                    const rows = Object.entries(item.competencies_before)
                        .map(([comp, before]) => {
                            const after = item.competencies_after[comp];
                            if (after === undefined) return null;
                            const compName = COMPETENCIES_NAMES[comp] || comp;
                            if (!disciplineAffectsCompetency(item.discipline, comp)) return null;
                            const diff = after - before;
                            const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
                            return { comp, compName, before, after, diff, diffClass };
                        })
                        .filter(Boolean);

                    return (
                        <div key={idx} className="discipline-card">
                            <div className="discipline-header">
                                <strong>{item.discipline}</strong>
                                <span>Оценка: {item.grade}</span>
                                <span>Год: {item.year}</span>
                            </div>
                            {rows.length === 0 ? (
                                <div className="no-data">Нет данных по связанным компетенциям</div>
                            ) : (
                                <table className="impact-table">
                                    <thead>
                                        <tr>
                                            <th>Компетенция</th>
                                            <th>До</th>
                                            <th>После</th>
                                            <th>Изменение</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map(({ comp, compName, before, after, diff, diffClass }) => (
                                            <tr key={comp}>
                                                <td>{compName}</td>
                                                <td>{before}</td>
                                                <td>{after}</td>
                                                <td className={`diff ${diffClass}`}>
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StudentDisciplineImpact;