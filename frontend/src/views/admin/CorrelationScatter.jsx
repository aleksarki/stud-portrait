import React, { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { getGradesCompetencyCorrelation } from '../../api.js';
import { COMPETENCIES_NAMES } from '../../utilities.js';

export default function CorrelationScatter({ correlationData, loading, filters }) {
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedCompetency, setSelectedCompetency] = useState('');
  const [scatterPoints, setScatterPoints] = useState([]);
  const [loadingScatter, setLoadingScatter] = useState(false);

  // При получении общего correlationData — выставляем первую пару (с авто-scatter)
  useEffect(() => {
    if (correlationData && correlationData.scatter && correlationData.scatter.length > 0) {
      const first = correlationData.scatter[0];
      setSelectedDiscipline(first.discipline);
      setSelectedCompetency(first.competency);
      setScatterPoints(correlationData.scatter);
    }
  }, [correlationData]);

  // Перезагружаем точки при изменении пары
  useEffect(() => {
    if (!selectedDiscipline || !selectedCompetency) return;
    setLoadingScatter(true);
    getGradesCompetencyCorrelation(
      filters.institute,
      filters.specialty,
      filters.year,
      selectedDiscipline,
      selectedCompetency,
    )
      .onSuccess(async response => {
        const data = await response.json();
        setScatterPoints(data.scatter || []);
      })
      .onError(err => console.error("Ошибка при загрузке точек:", err))
      .finally(() => setLoadingScatter(false));
  }, [selectedDiscipline, selectedCompetency, filters]);

  if (loading) return <div style={{ padding: 20 }}>Загрузка диаграммы рассеяния...</div>;
  if (!correlationData || !correlationData.disciplines || correlationData.disciplines.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
        Нет данных для построения диаграммы рассеяния
      </div>
    );
  }

  const currentCorr = (correlationData.correlations || []).find(
    c => c.discipline === selectedDiscipline && c.competency === selectedCompetency
  );

  // Статистика по оценкам
  const gradeStats = {};
  scatterPoints.forEach(p => {
    const g = p.grade;
    if (!gradeStats[g]) gradeStats[g] = { count: 0, sum: 0 };
    gradeStats[g].count += 1;
    gradeStats[g].sum += p.comp_value;
  });

  // Цвета по оценкам
  const GRADE_COLORS = {
    2: '#c0392b',  // красный
    3: '#e67e22',  // оранжевый
    4: '#3498db',  // голубой
    5: '#1f66b6',  // тёмно-синий
  };
  const GRADE_LABELS = { 2: 'Неуд.', 3: 'Удовл.', 4: 'Хор.', 5: 'Отл.' };

  // Группировка точек по оценкам (для разноцветных series)
  const seriesByGrade = {};
  scatterPoints.forEach(p => {
    const g = p.grade;
    if (!seriesByGrade[g]) seriesByGrade[g] = [];
    seriesByGrade[g].push({
      x: p.grade + (Math.random() - 0.5) * 0.35,  // jitter
      y: p.comp_value,
    });
  });

  const series = Object.keys(seriesByGrade)
    .sort((a, b) => Number(a) - Number(b))
    .map(g => ({
      name: `Оценка ${g} (${GRADE_LABELS[g] || ''})`,
      type: 'scatter',
      data: seriesByGrade[g],
      color: GRADE_COLORS[g] || '#888',
    }));

  // Линия средних по группам — ломаная через средние значения каждой оценки.
  // Ломаная через средние точно совпадает с карточками статистики сверху.
  let trendSeries = null;
  const groupMeans = Object.keys(gradeStats)
    .map(g => ({
      x: Number(g),
      y: gradeStats[g].sum / gradeStats[g].count,
    }))
    .sort((a, b) => a.x - b.x);

  if (groupMeans.length >= 2) {
    trendSeries = {
      name: 'Среднее по оценке',
      type: 'line',
      data: groupMeans,
      color: '#2c3e50',
    };
  }
  const finalSeries = trendSeries ? [...series, trendSeries] : series;

  // Автомасштаб Y
  const allYs = scatterPoints.map(p => p.comp_value);
  const yMin = allYs.length ? Math.max(0, Math.floor(Math.min(...allYs) - 50)) : 0;
  const yMax = allYs.length ? Math.ceil(Math.max(...allYs) + 50) : 1000;

  // Опции ApexCharts
  const options = {
    chart: {
      type: 'line',
      zoom: { enabled: true, type: 'xy' },
      toolbar: { show: true },
      fontFamily: 'inherit',
    },
    xaxis: {
      type: 'numeric',
      tickAmount: 4,
      min: 1.5,
      max: 5.5,
      title: { text: 'Оценка' },
      labels: { formatter: v => Math.round(v).toString() },
    },
    yaxis: {
      title: { text: 'Балл по компетенции' },
      min: yMin,
      max: yMax,
      labels: { formatter: v => Math.round(v) },
    },
    markers: {
      // Точки облака — 2px и сильно полупрозрачные (т.к. их ~10к и они накладываются),
      // точка на ломаной средних — 6px заметная.
      size: [2, 2, 2, 2, 6],
      strokeWidth: [0, 0, 0, 0, 2],
      strokeColors: ['#fff', '#fff', '#fff', '#fff', '#2c3e50'],
      fillOpacity: [0.25, 0.25, 0.25, 0.25, 1],
      shape: ['circle', 'circle', 'circle', 'circle', 'circle'],
      hover: {
        sizeOffset: 2,
      },
    },
    stroke: {
      width: [0, 0, 0, 0, 3],
      curve: 'straight',
      dashArray: [0, 0, 0, 0, 0],
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      fontSize: '13px',
    },
    tooltip: {
      shared: false,
      intersect: true,
      x: { formatter: v => `оценка ${Math.round(v)}` },
      y: { formatter: v => `${Math.round(v)} баллов` },
    },
    grid: { strokeDashArray: 4 },
  };

  return (
    <div className="correlation-scatter" style={{
      background: '#fff',
      borderRadius: 8,
      padding: 20,
      marginTop: 20,
      boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ marginBottom: 16, color: '#333' }}>
        Диаграмма рассеяния: оценка ↔ компетенция
      </h2>

      {/* Селекты выбора пары */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 250 }}>
          <span style={{ fontSize: 13, color: '#666' }}>Дисциплина</span>
          <select
            value={selectedDiscipline}
            onChange={e => setSelectedDiscipline(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">— выберите —</option>
            {correlationData.disciplines.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 250 }}>
          <span style={{ fontSize: 13, color: '#666' }}>Компетенция</span>
          <select
            value={selectedCompetency}
            onChange={e => setSelectedCompetency(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
          >
            <option value="">— выберите —</option>
            {(correlationData.competencies || []).map(c => (
              <option key={c} value={c}>
                {COMPETENCIES_NAMES[c] || c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Корреляция */}
      {currentCorr && (
        <div style={{ fontSize: 14, color: '#444', marginBottom: 12 }}>
          Корреляция Пирсона: <strong>{currentCorr.value.toFixed(3)}</strong>
          {' '}(на основе {currentCorr.n} наблюдений)
        </div>
      )}

      {/* Статистика по оценкам */}
      {Object.keys(gradeStats).length > 0 && (
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
          padding: 12,
          background: '#f8f9fa',
          borderRadius: 6,
        }}>
          {Object.keys(gradeStats)
            .sort((a, b) => Number(a) - Number(b))
            .map(g => {
              const s = gradeStats[g];
              const avg = (s.sum / s.count).toFixed(1);
              return (
                <div
                  key={g}
                  style={{
                    padding: '6px 12px',
                    background: '#fff',
                    border: `2px solid ${GRADE_COLORS[g] || '#888'}`,
                    borderRadius: 4,
                    fontSize: 13,
                    minWidth: 130,
                  }}
                >
                  <div style={{ fontWeight: 600, color: GRADE_COLORS[g] || '#333' }}>
                    Оценка {g} ({GRADE_LABELS[g] || ''})
                  </div>
                  <div style={{ color: '#666', marginTop: 2 }}>
                    {s.count} студ. · среднее <strong>{avg}</strong>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Сама диаграмма */}
      {loadingScatter ? (
        <div style={{ padding: 40, textAlign: 'center' }}>Загрузка точек...</div>
      ) : scatterPoints.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
          Выберите дисциплину и компетенцию
        </div>
      ) : (
        <ReactApexChart
          options={options}
          series={finalSeries}
          type="line"
          height={480}
        />
      )}
    </div>
  );
}