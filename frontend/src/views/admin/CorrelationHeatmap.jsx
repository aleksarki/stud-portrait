import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { COMPETENCIES_NAMES } from '../../utilities.js';

export default function CorrelationHeatmap({ data, loading }) {
  // Состояние: сколько дисциплин показывать (по умолчанию топ-20 по объёму данных)
  const [topN, setTopN] = useState(20);

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка тепловой карты...</div>;
  }
  if (!data || !data.correlations || data.correlations.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
        Нет данных для построения тепловой карты корреляций
      </div>
    );
  }

  const competencies = data.competencies || [];

  // Группируем correlations по дисциплинам и считаем суммарный объём данных n
  const disciplineStats = {};
  data.correlations.forEach(c => {
    if (!disciplineStats[c.discipline]) {
      disciplineStats[c.discipline] = { total_n: 0, items: {} };
    }
    disciplineStats[c.discipline].total_n += c.n || 0;
    disciplineStats[c.discipline].items[c.competency] = c.value;
  });

  // Сортируем дисциплины по объёму данных (от большего к меньшему)
  const sortedDisciplines = Object.keys(disciplineStats)
    .sort((a, b) => disciplineStats[b].total_n - disciplineStats[a].total_n)
    .slice(0, topN);

  // Готовим series для ApexCharts:
  // каждая series — это одна компетенция (строка),
  // её data — массив {x: дисциплина, y: значение корреляции}
  const series = competencies.map(compKey => ({
    name: COMPETENCIES_NAMES[compKey] || compKey,
    data: sortedDisciplines.map(disc => ({
      x: disc.length > 30 ? disc.slice(0, 30) + '…' : disc,
      y: disciplineStats[disc].items[compKey] != null
        ? Math.round(disciplineStats[disc].items[compKey] * 100) / 100
        : null,
    })),
  }));

  const options = {
    chart: {
      type: 'heatmap',
      toolbar: { show: true },
      fontFamily: 'inherit',
    },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.5,
        radius: 2,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: -1.00, to: -0.50, name: 'Сильная отрицательная', color: '#c0392b' },
            { from: -0.50, to: -0.20, name: 'Умеренная отрицательная', color: '#e67e22' },
            { from: -0.20, to: 0.20, name: 'Слабая / нет связи', color: '#ecf0f1' },
            { from: 0.20, to: 0.50, name: 'Умеренная положительная', color: '#3498db' },
            { from: 0.50, to: 1.00, name: 'Сильная положительная', color: '#1f66b6' },
          ],
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: { fontSize: '10px', colors: ['#000'] },
      formatter: v => v == null ? '' : v.toFixed(2),
    },
    xaxis: {
      type: 'category',
      labels: {
        rotate: -45,
        style: { fontSize: '10px' },
        trim: true,
      },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
    },
    tooltip: {
      y: {
        formatter: v => v == null ? 'нет данных' : `корреляция ${v.toFixed(2)}`,
      },
    },
    title: {
      text: '',
    },
  };

  return (
    <div className="correlation-heatmap" style={{
      background: '#fff',
      borderRadius: 8,
      padding: 20,
      marginTop: 20,
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <h2 style={{ margin: 0, color: '#333' }}>
          Корреляция оценок и компетенций
        </h2>
        <label style={{ fontSize: 14, color: '#555' }}>
          Дисциплин показать:&nbsp;
          <select
            value={topN}
            onChange={e => setTopN(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 4 }}
          >
            <option value={10}>Топ-10</option>
            <option value={20}>Топ-20</option>
            <option value={30}>Топ-30</option>
            <option value={50}>Топ-50</option>
          </select>
        </label>
      </div>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
        Корреляция Пирсона между оценкой за дисциплину и баллом по компетенции.
        Дисциплины отсортированы по количеству наблюдений.
      </div>
      <ReactApexChart
        options={options}
        series={series}
        type="heatmap"
        height={Math.max(400, competencies.length * 35)}
      />
    </div>
  );
}