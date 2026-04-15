// components/charts/VamDotPlot.jsx
import React, { useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Line, ComposedChart
} from 'recharts';

const VamDotPlot = ({ data, referenceValue, yAxisLabel = "Средний балл" }) => {
  // Все хуки – строго в начале
  const validData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(item => item && typeof item.value_added === 'number' && !isNaN(item.value_added));
  }, [data]);

  const enrichedData = useMemo(() => {
    const ref = (referenceValue !== undefined && referenceValue !== null) ? referenceValue : 500;
    return validData.map(item => ({
      ...item,
      vam: item.vam !== undefined ? item.vam : (item.value_added - ref)
    }));
  }, [validData, referenceValue]);

  const sortedData = useMemo(() => [...enrichedData].sort((a, b) => a.vam - b.vam), [enrichedData]);

  // Теперь можно проверить данные
  if (validData.length === 0) {
    return <div className="no-data">Нет данных для отображения</div>;
  }

  const getPointColor = (vam) => {
    if (vam > 0) return '#4caf50';
    if (vam < 0) return '#f44336';
    return '#ff9800';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      if (!item) return null;
      return (
        <div style={{ background: 'white', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}>
          <p><strong>{item.group}</strong></p>
          <p>{yAxisLabel}: {item.value_added.toFixed(2)}</p>
          <p>VAM: {item.vam.toFixed(2)}</p>
          <p>ДИ: [{item.ci_lower?.toFixed(2) || '?'}; {item.ci_upper?.toFixed(2) || '?'}]</p>
          <p>n = {item.n || '?'}</p>
        </div>
      );
    }
    return null;
  };

  const ciSegments = [];
  sortedData.forEach((item, idx) => {
    if (item.ci_lower != null && item.ci_upper != null) {
      ciSegments.push({
        key: idx,
        data: [
          { x: item.group, y: item.ci_lower },
          { x: item.group, y: item.ci_upper }
        ]
      });
    }
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="category" dataKey="group" interval={0} tick={{ fontSize: 12 }} />
        <YAxis
          type="number"
          dataKey="value_added"
          domain={['auto', 'auto']}
          tickFormatter={(val) => val.toFixed(0)}
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

        {ciSegments.map(seg => (
          <Line
            key={seg.key}
            data={seg.data}
            type="linear"
            dataKey="y"
            stroke="#999"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        ))}

        <Scatter
          data={sortedData}
          shape={(props) => {
            const { cx, cy, payload } = props;
            const color = getPointColor(payload.vam);
            return <circle cx={cx} cy={cy} r={7} fill={color} stroke="#fff" strokeWidth={1} />;
          }}
        />

        <ReferenceLine y={referenceValue ?? 500} stroke="red" strokeDasharray="3 3" label="Ожидаемый уровень" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default VamDotPlot;