import { useState } from "react";
import {
    ScatterChart, Scatter, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
    BarChart, Bar
} from "recharts";
import Button from './ui/Button';
import {
    postPortraitGetVamDotplotData,
    postPortraitGetLgmSpaghettiData,
    postPortraitGetWaterfallDecomposition
} from '../api';

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#00796b', '#fbc02d'];

export function AdvancedVisualizationSection({
    filterOptions,
    selectedInstitutions,
    selectedDirections,
    selectedCompetencies
}) {
    const [dotplotData, setDotplotData] = useState(null);
    const [spaghettiData, setSpaghettiData] = useState(null);
    const [waterfallData, setWaterfallData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeVisualization, setActiveVisualization] = useState('dotplot');
    const [groupByDotplot, setGroupByDotplot] = useState('institution');
    const [groupBySpagetti, setGroupBySpagetti] = useState(null);

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

    const loadDotplotData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';

        postPortraitGetVamDotplotData(groupByDotplot, competency, selectedInstitutions)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDotplotData(data.data);
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных точечного графика');
            })
            .finally(() => setLoading(false));
    };

    const loadSpaghettiData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';

        postPortraitGetLgmSpaghettiData(competency, groupBySpagetti, true, selectedInstitutions)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setSpaghettiData(data.data);
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных паутинного графика');
            })
            .finally(() => setLoading(false));
    };

    const loadWaterfallData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';
        const instId = selectedInstitutions[0];

        if (!instId) {
            alert('Выберите ВУЗ для анализа ватерфалла');
            setLoading(false);
            return;
        }

        postPortraitGetWaterfallDecomposition(instId, null, competency)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setWaterfallData(data.data);
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных ватерфалла');
            })
            .finally(() => setLoading(false));
    };

    const renderDotplot = () => {
        if (!dotplotData || dotplotData.length === 0) {
            return <div className="no-data">Нет данных для отображения точечного графика</div>;
        }

        const sortedData = [...dotplotData].sort((a, b) => b.value_added - a.value_added);

        return (
            <div className="dotplot-container">
                <div className="dotplot-chart">
                    <ResponsiveContainer width="100%" height={Math.max(400, dotplotData.length * 40)}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 150 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="value_added"
                                name="Value-Added"
                                type="number"
                                label={{ value: 'Value-Added (баллы)', position: 'insideBottomRight', offset: -10 }}
                            />
                            <YAxis
                                dataKey="group"
                                name="Группа"
                                type="category"
                                width={140}
                            />
                            <Tooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="custom-tooltip">
                                                <p><strong>{data.group}</strong></p>
                                                <p>Value-Added: {data.value_added.toFixed(1)}</p>
                                                <p>CI: [{data.ci_lower.toFixed(1)}, {data.ci_upper.toFixed(1)}]</p>
                                                <p>n: {data.n}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Scatter name="Группы" data={sortedData} fill="#1976d2" />
                            <ReferenceLine x={0} stroke="#999" strokeDasharray="5 5" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                <div className="dotplot-with-ci">
                    <h4>Доверительные интервалы (95%)</h4>
                    {sortedData.map((item, idx) => {
                        const range = item.ci_upper - item.ci_lower;
                        const offset = item.ci_lower;
                        const percentLeft = Math.max(0, (-200 - offset) / range * 100);

                        return (
                            <div key={idx} className="ci-row">
                                <span className="group-name">{item.group}</span>
                                <div className="ci-bar-wrapper">
                                    <div className="ci-bar">
                                        <div
                                            className="ci-line"
                                            style={{
                                                marginLeft: `${Math.max(0, percentLeft)}%`,
                                                width: `${Math.min(100 - Math.max(0, percentLeft), 100)}%`,
                                                borderColor: item.significant ? '#4CAF50' : '#999'
                                            }}
                                        >
                                            <div
                                                className="ci-point"
                                                style={{
                                                    left: `${((item.value_added - item.ci_lower) / range) * 100}%`,
                                                    backgroundColor: item.significant ? '#4CAF50' : '#1976d2'
                                                }}
                                                title={`${item.value_added.toFixed(1)}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <span className="value">
                                    {item.value_added.toFixed(1)}
                                    <small> (n={item.n})</small>
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div className="dotplot-legend">
                    <p>✓ Зелёные точки: статистически значимо выше нулевого эффекта (p &lt; 0.05)</p>
                    <p>○ Синие точки: эффект не значим</p>
                    <p>Усы показывают 95% доверительный интервал</p>
                </div>
            </div>
        );
    };

    const renderSpaghetti = () => {
        if (!spaghettiData) {
            return <div className="no-data">Нет данных для паутинного графика</div>;
        }

        const { individual_trajectories, trend_lines } = spaghettiData;

        if (individual_trajectories.length === 0) {
            return <div className="no-data">Недостаточно траекторий для визуализации</div>;
        }

        // Подготовка данных для графика
        const allCourses = new Set();
        individual_trajectories.forEach(traj => {
            traj.points.forEach(p => allCourses.add(p.course));
        });

        const chartData = Array.from(allCourses)
            .sort((a, b) => a - b)
            .map(course => ({
                course: `${course} курс`,
                courseNum: course
            }));

        // Добавляем индивидуальные данные
        individual_trajectories.forEach((traj, idx) => {
            traj.points.forEach(point => {
                const chartPoint = chartData.find(cp => cp.courseNum === point.course);
                if (chartPoint) {
                    chartPoint[`student_${idx}`] = point.score;
                }
            });
        });

        // Добавляем тренд-линии
        trend_lines.forEach((trend, tIdx) => {
            trend.points.forEach(point => {
                const chartPoint = chartData.find(cp => cp.courseNum === point.course);
                if (chartPoint) {
                    chartPoint[`trend_${tIdx}`] = point.score;
                }
            });
        });

        return (
            <div className="spaghetti-container">
                <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course" />
                        <YAxis
                            domain={[200, 800]}
                            label={{ value: 'Баллы', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                padding: '8px'
                            }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                        {/* Индивидуальные траектории */}
                        {individual_trajectories.slice(0, 100).map((_, idx) => (
                            <Line
                                key={`student_${idx}`}
                                type="monotone"
                                dataKey={`student_${idx}`}
                                stroke="#bbb"
                                opacity={0.2}
                                isAnimationActive={false}
                                dot={false}
                                strokeWidth={1}
                            />
                        ))}

                        {/* Тренд-линии */}
                        {trend_lines.map((trend, idx) => (
                            <Line
                                key={`trend_${idx}`}
                                type="monotone"
                                dataKey={`trend_${idx}`}
                                stroke={COLORS[idx % COLORS.length]}
                                strokeWidth={3}
                                name={trend.group}
                                isAnimationActive={false}
                                dot={{ r: 4 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>

                <div className="spaghetti-legend">
                    <p>🌫️ Светлые линии: траектории отдельных студентов/групп</p>
                    <p>🔴 Яркие линии: тренд-линии (средние траектории развития)</p>
                </div>
            </div>
        );
    };

    const renderWaterfall = () => {
        if (!waterfallData) {
            return <div className="no-data">Нет данных для ватерфалльной диаграммы</div>;
        }

        const { initial, stages, final, total_gain } = waterfallData;

        // Подготовка данных для графика
        const chartData = [
            { name: 'Начальный', value: initial, fill: '#1976d2' }
        ];

        stages.forEach((stage, idx) => {
            chartData.push({
                name: `Курс ${stage.course}`,
                value: Math.abs(stage.increment),
                fill: stage.increment > 0 ? '#4CAF50' : '#F44336'
            });
        });

        return (
            <div className="waterfall-container">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                            domain={[0, Math.max(...chartData.map(d => d.value), 200)]}
                            label={{ value: 'Баллы', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            formatter={(value) => value.toFixed(1)}
                            labelFormatter={(label) => `${label}`}
                        />
                        <Bar dataKey="value" shape={<WaterfallBar />} />
                    </BarChart>
                </ResponsiveContainer>

                <div className="waterfall-summary">
                    <div className="summary-row">
                        <div className="summary-item">
                            <span className="label">Начальный уровень:</span>
                            <strong className="value">{initial.toFixed(1)}</strong>
                        </div>
                        {stages.map((stage, idx) => (
                            <div key={idx} className="summary-item">
                                <span className="label">После курса {stage.course}:</span>
                                <strong className={`value ${stage.increment > 0 ? 'positive' : 'negative'}`}>
                                    {stage.increment > 0 ? '+' : ''}{stage.increment.toFixed(1)}
                                </strong>
                            </div>
                        ))}
                        <div className="summary-item total">
                            <span className="label">Итоговый уровень:</span>
                            <strong className="value total-value">{final.toFixed(1)}</strong>
                        </div>
                        <div className="summary-item total">
                            <span className="label">Общий прирост:</span>
                            <strong className={`value total-value ${total_gain > 0 ? 'positive' : 'negative'}`}>
                                {total_gain > 0 ? '+' : ''}{total_gain.toFixed(1)}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="advanced-visualization-section">
            <h3>📈 Продвинутые визуализации анализа</h3>

            <div className="viz-controls">
                <div className="button-group">
                    <Button
                        text="📊 Точечный график VAM"
                        onClick={() => {
                            setActiveVisualization('dotplot');
                            loadDotplotData();
                        }}
                        fg={activeVisualization === 'dotplot' ? 'white' : '#666'}
                        bg={activeVisualization === 'dotplot' ? '#1976d2' : 'white'}
                        border="1px solid #1976d2"
                    />
                    <Button
                        text="🕷️ Паутинный график LGM"
                        onClick={() => {
                            setActiveVisualization('spaghetti');
                            loadSpaghettiData();
                        }}
                        fg={activeVisualization === 'spaghetti' ? 'white' : '#666'}
                        bg={activeVisualization === 'spaghetti' ? '#ff9800' : 'white'}
                        border="1px solid #ff9800"
                    />
                    <Button
                        text="💧 Ватерфалльная диаграмма"
                        onClick={() => {
                            setActiveVisualization('waterfall');
                            loadWaterfallData();
                        }}
                        fg={activeVisualization === 'waterfall' ? 'white' : '#666'}
                        bg={activeVisualization === 'waterfall' ? '#4CAF50' : 'white'}
                        border="1px solid #4CAF50"
                    />
                </div>

                {activeVisualization === 'dotplot' && (
                    <div className="sub-controls">
                        <label>Группировать по:</label>
                        <select value={groupByDotplot} onChange={(e) => setGroupByDotplot(e.target.value)}>
                            <option value="institution">ВУЗы</option>
                            <option value="direction">Направления</option>
                            <option value="course">Курсы</option>
                        </select>
                    </div>
                )}

                {activeVisualization === 'spaghetti' && (
                    <div className="sub-controls">
                        <label>Группировать по:</label>
                        <select
                            value={groupBySpagetti || ''}
                            onChange={(e) => setGroupBySpagetti(e.target.value || null)}
                        >
                            <option value="">Без группировки</option>
                            <option value="institution">ВУЗы</option>
                            <option value="direction">Направления</option>
                        </select>
                    </div>
                )}
            </div>

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <div className="loading-text">Загрузка визуализации...</div>
                </div>
            )}

            <div className="visualization-container">
                {activeVisualization === 'dotplot' && renderDotplot()}
                {activeVisualization === 'spaghetti' && renderSpaghetti()}
                {activeVisualization === 'waterfall' && renderWaterfall()}
            </div>
        </div>
    );
}

// Вспомогательный компонент для ватерфалла
function WaterfallBar(props) {
    const { fill, x, y, width, height } = props;
    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            stroke="#666"
            strokeWidth={1}
        />
    );
}