// components/charts/StudentDisciplineImpact.jsx
import React, { useState, useEffect } from 'react';
import { getStudentDisciplineImpact } from '../../api';

const competencyLabels = {
    "res_comp_info_analysis": "Анализ информации",
    "res_comp_planning": "Планирование",
    "res_comp_result_orientation": "Ориентация на результат",
    "res_comp_stress_resistance": "Стрессоустойчивость",
    "res_comp_partnership": "Партнёрство",
    "res_comp_rules_compliance": "Соблюдение правил",
    "res_comp_self_development": "Саморазвитие",
    "res_comp_leadership": "Лидерство",
    "res_comp_emotional_intel": "Эмоциональный интеллект",
    "res_comp_client_focus": "Клиентоориентированность",
    "res_comp_communication": "Коммуникация",
    "res_comp_passive_vocab": "Пассивный словарь"
};

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
            <h3>📚 Влияние дисциплин на ваши компетенции</h3>
            <p className="info-text">
                Для каждой дисциплины показаны баллы компетенций до и после её изучения, а также изменение.
            </p>
            <div className="disciplines-list">
                {data.map((item, idx) => (
                    <div key={idx} className="discipline-card">
                        <div className="discipline-header">
                            <strong>{item.discipline}</strong>
                            <span>Оценка: {item.grade}</span>
                            <span>Год: {item.year}</span>
                        </div>
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
                                {Object.entries(item.competencies_before).map(([comp, before]) => {
                                    const after = item.competencies_after[comp];
                                    if (after === undefined) return null;
                                    const diff = after - before;
                                    const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';
                                    return (
                                        <tr key={comp}>
                                            <td>{competencyLabels[comp] || comp}</td>
                                            <td>{before}</td>
                                            <td>{after}</td>
                                            <td className={`diff ${diffClass}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentDisciplineImpact;