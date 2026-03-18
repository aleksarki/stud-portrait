import { useState } from "react";
import {
    BarChart, Bar, LineChart, Line, // Добавлено BarChart, Bar
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Button from './ui/Button';
import {
    getAnalyzeByDimension,
    getAnalyzeCohortLgm
} from '../api';

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2', '#00796b', '#fbc02d'];

export function AdvancedVisualizationSection({
    filterOptions,
    selectedInstitutions,
    selectedDirections,
    selectedCompetencies
}) {
    const [dimensionData, setDimensionData] = useState(null);
    const [lgmCohortData, setLgmCohortData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeVisualization, setActiveVisualization] = useState('dimension');
    const [selectedDimension, setSelectedDimension] = useState('institution');

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

    const loadDimensionData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';

        getAnalyzeByDimension(selectedDimension, competency)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDimensionData(data);
                } else {
                    alert('Ошибка при загрузке данных: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных: ' + error.message);
            })
            .finally(() => setLoading(false));
    };

    const loadLGMCohortData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';
        const institutionId = selectedInstitutions[0] || null;
        const specId = selectedDirections[0] || null;

        getAnalyzeCohortLgm(competency, institutionId, specId)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setLgmCohortData(data);
                } else {
                    alert('Ошибка при загрузке данных: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных: ' + error.message);
            })
            .finally(() => setLoading(false));
    };

    const renderDimensionAnalysis = () => {
        if (!dimensionData) {
            return <div className="no-data">Нет данных для отображения</div>;
        }

        const { groups, dimension, competency } = dimensionData;

        if (!groups || groups.length === 0) {
            return <div className="no-data">Нет данных по выбранному измерению</div>;
        }

        const chartData = groups.map(g => ({
            name: g.dimension_value,
            mean: g.mean,
            n: g.n,
            std: g.std
        })).sort((a, b) => b.mean - a.mean).slice(0, 15); // Топ-15 групп

        return (
            <div className="dimension-container">
                <h4>Анализ по измерению: {dimension}</h4>
                <p className="info-text">Компетенция: {competencyLabels[competency] || competency}</p>
                
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 150 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={140} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="custom-tooltip">
                                            <p><strong>{data.name}</strong></p>
                                            <p>Среднее: {data.mean.toFixed(1)}</p>
                                            <p>Стд.откл.: {data.std.toFixed(1)}</p>
                                            <p>n: {data.n}</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="mean" fill="#1976d2" name="Средний балл" />
                    </BarChart>
                </ResponsiveContainer>

                {dimensionData.anova && (
                    <div className="anova-results">
                        <h5>ANOVA тест</h5>
                        <p>
                            F-статистика: {dimensionData.anova.f_statistic.toFixed(3)} | 
                            p-value: {dimensionData.anova.p_value.toFixed(4)}
                        </p>
                        <p className={dimensionData.anova.significant_difference ? 'significant' : 'not-significant'}>
                            {dimensionData.anova.significant_difference 
                                ? '✓ Статистически значимые различия между группами' 
                                : '✗ Нет статистически значимых различий'}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderLGMCohort = () => {
        if (!lgmCohortData) {
            return <div className="no-data">Нет данных для отображения</div>;
        }

        const { mean_intercept, mean_slope, n_students, interpretation, trajectories } = lgmCohortData;

        // Подготовка данных для графика
        const chartData = [];
        for (let course = 1; course <= 4; course++) {
            chartData.push({
                course: `${course} курс`,
                value: mean_intercept + mean_slope * (course - 1)
            });
        }

        return (
            <div className="lgm-cohort-container">
                <h4>Latent Growth Model - Когортный анализ</h4>
                
                <div className="lgm-stats">
                    <div className="stat-card">
                        <div className="stat-value">{n_students}</div>
                        <div className="stat-label">Студентов</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{mean_intercept?.toFixed(1) || '0'}</div>
                        <div className="stat-label">Средний начальный уровень</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{mean_slope?.toFixed(3) || '0'}</div>
                        <div className="stat-label">Средняя скорость роста</div>
                    </div>
                </div>

                {interpretation && (
                    <div className="interpretation-box">
                        <h5>Интерпретация</h5>
                        <p>Средняя скорость роста: <strong>{interpretation.average_growth_rate?.toFixed(3) || '0'}</strong></p>
                        <p>Вариабельность роста: <strong>{interpretation.growth_variability?.toFixed(3) || '0'}</strong></p>
                        <p>Быстрорастущие: {interpretation.fast_growers_count || 0} ({interpretation.fast_growers_pct?.toFixed(1) || 0}%)</p>
                        <p>Медленнорастущие: {interpretation.slow_growers_count || 0} ({interpretation.slow_growers_pct?.toFixed(1) || 0}%)</p>
                    </div>
                )}

                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#1976d2"
                            strokeWidth={2}
                            name="Средняя траектория"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="advanced-visualization-section">
            <h3>📈 Продвинутые визуализации</h3>

            <div className="viz-controls">
                <div className="button-group">
                    <Button
                        text="📊 Анализ по измерениям"
                        onClick={() => {
                            setActiveVisualization('dimension');
                            loadDimensionData();
                        }}
                        fg={activeVisualization === 'dimension' ? 'white' : '#666'}
                        bg={activeVisualization === 'dimension' ? '#1976d2' : 'white'}
                        border="1px solid #1976d2"
                    />
                    <Button
                        text="📈 LGM Когорта"
                        onClick={() => {
                            setActiveVisualization('lgm');
                            loadLGMCohortData();
                        }}
                        fg={activeVisualization === 'lgm' ? 'white' : '#666'}
                        bg={activeVisualization === 'lgm' ? '#ff9800' : 'white'}
                        border="1px solid #ff9800"
                    />
                </div>

                {activeVisualization === 'dimension' && (
                    <div className="sub-controls">
                        <label>Измерение:</label>
                        <select value={selectedDimension} onChange={(e) => setSelectedDimension(e.target.value)}>
                            <option value="institution">ВУЗы</option>
                            <option value="spec">Направления</option>
                            <option value="form">Формы обучения</option>
                            <option value="course">Курсы</option>
                        </select>
                        <Button
                            text="Загрузить"
                            onClick={loadDimensionData}
                            disabled={loading}
                        />
                    </div>
                )}

                {activeVisualization === 'lgm' && (
                    <div className="sub-controls">
                        <Button
                            text="Загрузить LGM данные"
                            onClick={loadLGMCohortData}
                            disabled={loading}
                        />
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
                {activeVisualization === 'dimension' && renderDimensionAnalysis()}
                {activeVisualization === 'lgm' && renderLGMCohort()}
            </div>
        </div>
    );
}