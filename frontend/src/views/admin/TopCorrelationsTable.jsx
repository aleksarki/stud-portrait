import React, { useEffect, useState } from 'react';
import { getTopCorrelations } from '../../api';

/**
 * Покраска ячейки со значением корреляции:
 *   красный  — отрицательная,
 *   серый    — почти ноль (|r| < 0.05),
 *   синий    — положительная.
 *   Чем сильнее связь — тем насыщеннее.
 */
function corrCellStyle(value) {
  const abs = Math.abs(value);
  if (abs < 0.05) return { background: '#f1f5f9', color: '#475569' };
  if (value > 0) {
    if (abs >= 0.3) return { background: '#1d4ed8', color: '#fff', fontWeight: 600 };
    if (abs >= 0.2) return { background: '#3b82f6', color: '#fff' };
    if (abs >= 0.1) return { background: '#93c5fd', color: '#0f172a' };
    return { background: '#dbeafe', color: '#0f172a' };
  } else {
    if (abs >= 0.3) return { background: '#b91c1c', color: '#fff', fontWeight: 600 };
    if (abs >= 0.2) return { background: '#ef4444', color: '#fff' };
    if (abs >= 0.1) return { background: '#fca5a5', color: '#0f172a' };
    return { background: '#fee2e2', color: '#0f172a' };
  }
}

function directionLabel(value) {
  if (value > 0.05) return '↑ положительная';
  if (value < -0.05) return '↓ отрицательная';
  return '≈ слабая';
}

export default function TopCorrelationsTable({ filters }) {
  const [topN, setTopN] = useState(20);
  const [sortBy, setSortBy] = useState('abs');     // abs | positive | negative
  const [minN, setMinN] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTopCorrelations({
      topN,
      sortBy,
      minN,
      institute: filters?.institute || null,
      specialty: filters?.specialty || null,
      year: filters?.year || null,
    })
      .onSuccess(async response => {
        const resp = await response.json();
        if (resp.status === 'success') {
          setData(resp);
        } else {
          setError(resp.message || 'Не удалось загрузить рейтинг');
        }
      })
      .onError(err => {
        console.error('Ошибка загрузки рейтинга:', err);
        setError('Сервер недоступен');
      })
      .finally(() => setLoading(false));
  }, [topN, sortBy, minN, filters?.institute, filters?.specialty, filters?.year]);

  const rows = data?.top || [];

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      margin: '20px 0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Заголовок и контролы */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
            Рейтинг сильнейших связей «дисциплина ↔ компетенция»
          </h3>
          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
            Коэффициент корреляции Пирсона между академической оценкой и баллом компетенции.
            {data && (
              <> Всего пар проанализировано: <b>{data.total_pairs}</b>
                {data.total_disciplines ? <>, дисциплин: <b>{data.total_disciplines}</b></> : null}.</>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: '#334155' }}>
            Топ:&nbsp;
            <select
              value={topN}
              onChange={e => setTopN(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <label style={{ fontSize: 13, color: '#334155' }}>
            Сортировка:&nbsp;
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="abs">По силе связи</option>
              <option value="positive">Только положительные</option>
              <option value="negative">Только отрицательные</option>
            </select>
          </label>

          <label style={{ fontSize: 13, color: '#334155' }}>
            Минимум студентов:&nbsp;
            <input
              type="number"
              min={3}
              max={50000}
              step={10}
              value={minN}
              onChange={e => setMinN(Number(e.target.value) || 0)}
              style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            />
          </label>
        </div>
      </div>

      {/* Состояния */}
      {loading && (
        <div style={{ padding: 20, color: '#64748b' }}>Загрузка рейтинга...</div>
      )}
      {error && !loading && (
        <div style={{ padding: 20, color: '#b91c1c' }}>Ошибка: {error}</div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{ padding: 20, color: '#64748b' }}>
          Нет данных для выбранных фильтров. Попробуйте уменьшить «Минимум студентов».
        </div>
      )}

      {/* Таблица */}
      {!loading && !error && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', width: 50 }}>№</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Дисциплина</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Компетенция</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: 120 }}>Корреляция</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', width: 130 }}>Направление</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', width: 110 }}>Студентов</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.discipline}__${row.competency_key}`}
                  style={{ borderBottom: '1px solid #f1f5f9' }}
                >
                  <td style={{ padding: '8px', color: '#94a3b8', fontWeight: 600 }}>{row.rank}</td>
                  <td style={{ padding: '8px', color: '#0f172a' }}>{row.discipline}</td>
                  <td style={{ padding: '8px', color: '#334155' }}>{row.competency_name}</td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    ...corrCellStyle(row.value),
                    borderRadius: 4,
                  }}>
                    {row.value.toFixed(3)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: row.value > 0 ? '#1d4ed8' : (row.value < 0 ? '#b91c1c' : '#64748b'), fontSize: 12 }}>
                    {directionLabel(row.value)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', color: '#475569' }}>
                    {row.n.toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Подсказка-легенда */}
      {!loading && !error && rows.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          Шкала: 0 — нет связи; ±0.1 — слабая; ±0.2 — умеренная; ±0.3 и более — заметная.
          Положительная корреляция: чем выше оценка по дисциплине, тем выше балл компетенции.
          Учитываются только пары, в которых не менее <b>{minN}</b> студентов.
        </div>
      )}
    </div>
  );
}
