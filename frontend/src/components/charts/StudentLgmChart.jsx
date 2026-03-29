// components/charts/StudentLgmChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StudentLgmChart = ({ data, competency, competencyLabel }) => {
    if (!data || data.length === 0) return <div className="no-data">Нет данных</div>;
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="course" />
                <YAxis domain={[200, 800]} />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey={competency}
                    stroke="#1976d2"
                    strokeWidth={2}
                    name={competencyLabel}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
export default StudentLgmChart;