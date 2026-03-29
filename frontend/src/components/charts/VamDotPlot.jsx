// components/charts/VamDotPlot.jsx
import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const COLORS = ['#1976d2'];

const VamDotPlot = ({ data }) => {
    if (!data || data.length === 0) return <div className="no-data">Нет данных</div>;

    // Сортируем для наглядности
    const sortedData = [...data].sort((a, b) => b.value_added - a.value_added);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 250 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                    type="number" 
                    dataKey="value_added" 
                    name="Value-Added" 
                    label={{ value: 'Value-Added', position: 'insideBottomRight', offset: -10 }}
                />
                <YAxis 
                    type="category" 
                    dataKey="group" 
                    name="Группа" 
                    width={150} 
                />
                <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div style={{ background: 'white', padding: '8px', border: '1px solid #ccc' }}>
                                    <p><strong>{data.group}</strong></p>
                                    <p>VAM: {data.value_added.toFixed(2)}</p>
                                    <p>CI: [{data.ci_lower.toFixed(2)}, {data.ci_upper.toFixed(2)}]</p>
                                    <p>n: {data.n}</p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Scatter data={sortedData} fill="#1976d2" />
                <ReferenceLine x={0} stroke="#999" strokeDasharray="5 5" />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default VamDotPlot;