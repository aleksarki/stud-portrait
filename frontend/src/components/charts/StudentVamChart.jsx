import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getAnalyzeStudentVam } from '../../api';

const StudentVamChart = ({ studentId, competency = 'res_comp_leadership' }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        getAnalyzeStudentVam(studentId, competency)
            .onSuccess(async response => {
                const result = await response.json();
                if (result.status === 'success') {
                    // Преобразуем данные для графика
                    const chartData = result.growth_by_period.map(item => ({
                        period: `${item.course} курс`,
                        actual: item.actual_growth,
                        value_added: item.value_added
                    }));
                    setData({
                        info: result.student_info,
                        measurements: result.measurements,
                        avgVam: result.average_value_added,
                        chartData
                    });
                } else {
                    console.error(result.message);
                }
            })
            .onError(error => console.error(error))
            .finally(() => setLoading(false));
    }, [studentId, competency]);

    if (loading) return <div className="loading">Загрузка VAM...</div>;
    if (!data) return <div className="no-data">Нет данных для VAM</div>;

    return (
        <div className="student-vam-chart">
            <h4>Value-Added для {data.info.name}</h4>
            <p>Средний VAM: {data.avgVam.toFixed(2)}</p>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#1976d2" name="Фактический прирост" />
                    <Line type="monotone" dataKey="value_added" stroke="#ff9800" name="Value-Added" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StudentVamChart;