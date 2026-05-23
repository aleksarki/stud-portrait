import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { getCompetencySegmentation } from '../../api';
import { COMPETENCIES_NAMES } from '../../utilities.js';


const COMPETENCY_KEYS = [
  'res_comp_info_analysis',
  'res_comp_planning',
  'res_comp_result_orientation',
  'res_comp_stress_resistance',
  'res_comp_partnership',
  'res_comp_rules_compliance',
  'res_comp_self_development',
  'res_comp_leadership',
  'res_comp_emotional_intel',
  'res_comp_client_focus',
  'res_comp_communication',
  'res_comp_passive_vocab',
];

// Стили карточек групп
const GROUP_STYLES = {
  low: {
    border: '#fecaca',
    bg: '#fef2f2',
    accent: '#b91c1c',
    title: 'Низкий уровень',
  },
  middle: {
    border: '#fed7aa',
    bg: '#fffbeb',
    accent: '#c2410c',
    title: 'Средний уровень',
  },
  high: {
    border: '#bbf7d0',
    bg: '#f0fdf4',
    accent: '#15803d',
    title: 'Высокий уровень',
  },
};

function GroupCard({ group }) {
  const style = GROUP_STYLES[group.name] || GROUP_STYLES.middle;

  // Диапазон балла для подзаголовка
  let rangeText = '';
  if (group.range[0] === null) rangeText = `балл < ${group.range[1]}`;
  else if (group.range[1] === null) rangeText = `балл > ${group.range[0]}`;
  else rangeText = `балл ${group.range[0]}–${group.range[1]}`;

  return (
    <div style={{
      flex: 1,
      minWidth: 320,
      border: `1px solid ${style.border}`,
      background: style.bg,
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Заголовок карточки */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: style.accent }}>
          {style.title}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
          {rangeText}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 11 }}>Студентов</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>
              {group.n.toLocaleString('ru-RU')}
            </div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: 11 }}>Средний балл</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>
              {group.avg_competency}
            </div>
          </div>
        </div>
      </div>

      {/* Дисциплины — bar chart */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
          Средние оценки по дисциплинам
        </div>
        {group.avg_grades && group.avg_grades.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(180, group.avg_grades.length * 28)}>
            <BarChart
              data={group.avg_grades}
              layout="vertical"
              margin={{ top: 4, right: 30, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                domain={[2, 5]}
                ticks={[2, 3, 4, 5]}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="discipline"
                tick={{ fontSize: 10, fill: '#334155' }}
                width={150}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name, props) => [
                  `${value} (n=${props.payload.n})`,
                  'Средняя оценка'
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]} barSize={14}>
                {group.avg_grades.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.kind === 'bottom' ? '#ef4444' : '#22c55e'}
                  />
                ))}
                <LabelList
                  dataKey="avg"
                  position="right"
                  style={{ fontSize: 10, fill: '#334155' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Нет данных по дисциплинам</div>
        )}
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
          <span style={{ color: '#22c55e' }}>■</span> лучшие оценки &nbsp;
          <span style={{ color: '#ef4444' }}>■</span> худшие оценки
        </div>
      </div>

      {/* Топ-мотиваторы */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
          Топ-3 мотиватора
        </div>
        {group.top_motivators && group.top_motivators.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.top_motivators.map((m, i) => (
              <div key={m.key} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
              }}>
                <span style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: style.accent,
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 11,
                }}>{i + 1}</span>
                <span style={{ flex: 1, color: '#0f172a' }}>{m.name}</span>
                <div style={{
                  flex: 1,
                  maxWidth: 80,
                  height: 6,
                  background: '#e2e8f0',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.min(100, m.percent * 3)}%`,
                    height: '100%',
                    background: style.accent,
                  }} />
                </div>
                <span style={{
                  minWidth: 42,
                  textAlign: 'right',
                  color: style.accent,
                  fontWeight: 600,
                }}>{m.percent}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Нет мотиваторов выше порога</div>
        )}
      </div>
    </div>
  );
}

export default function CompetencySegmentation({ filters }) {
  const [competency, setCompetency] = useState('res_comp_planning');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCompetencySegmentation({
      competency,
      institute: filters?.institute || null,
      specialty: filters?.specialty || null,
      year: filters?.year || null,
    })
      .onSuccess(async response => {
        const resp = await response.json();
        if (resp.status === 'success') {
          setData(resp);
        } else {
          setError(resp.message || 'Не удалось загрузить сегментацию');
        }
      })
      .onError(err => {
        console.error('Ошибка загрузки сегментации:', err);
        setError('Сервер недоступен');
      })
      .finally(() => setLoading(false));
  }, [competency, filters?.institute, filters?.specialty, filters?.year]);

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 20,
      margin: '20px 0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Заголовок и селектор */}
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
            Сегментация студентов по уровню компетенции
          </h3>
          <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>
            Студенты разбиты на 3 группы по квартилям балла выбранной компетенции.
            {data && (
              <> Всего студентов: <b>{data.total_n.toLocaleString('ru-RU')}</b>,
                Q1=<b>{data.q1}</b>, Q3=<b>{data.q3}</b>.</>
            )}
          </div>
        </div>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Компетенция:&nbsp;
          <select
            value={competency}
            onChange={e => setCompetency(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              minWidth: 220,
            }}
          >
            {COMPETENCY_KEYS.map(key => (
              <option key={key} value={key}>
                {COMPETENCIES_NAMES[key] || key}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Состояния */}
      {loading && (
        <div style={{ padding: 20, color: '#64748b' }}>Загрузка сегментации...</div>
      )}
      {error && !loading && (
        <div style={{ padding: 20, color: '#b91c1c' }}>Ошибка: {error}</div>
      )}
      {!loading && !error && data && data.groups.length === 0 && (
        <div style={{ padding: 20, color: '#64748b' }}>
          Нет данных для выбранных фильтров.
        </div>
      )}

      {/* Три карточки рядом */}
      {!loading && !error && data && data.groups.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          {data.groups.map(group => (
            <GroupCard key={group.name} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
