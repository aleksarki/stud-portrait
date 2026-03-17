// frontend/src/views/admin/components/DisciplineAnalysisSection.jsx

import { useState } from "react";
import Button from './ui/Button';
import MultiSelect from './ui/MultiSelect';
import { postPortraitAnalyzeDisciplineImpactAdvanced, postPortraitGetDisciplineHeatmapData } from '../api';

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2'];

export function DisciplineAnalysisSection({
    filterOptions,
    selectedInstitutions,
    selectedDirections,
    selectedCompetencies
}) {
    const [disciplineData, setDisciplineData] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedDisciplines, setSelectedDisciplines] = useState([]);
    const [activeTab, setActiveTab] = useState('impact');

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

    const loadDisciplineImpact = async () => {
        setLoading(true);
        setActiveTab('impact');

        postPortraitAnalyzeDisciplineImpactAdvanced(
            selectedCompetencies.length > 0 ? selectedCompetencies : ['res_comp_leadership'],
            selectedDisciplines,
            selectedInstitutions,
            selectedDirections,
            5
        )
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDisciplineData(data.results);
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных');
            })
            .finally(() => setLoading(false));
    };

    const loadHeatmapData = async () => {
        setLoading(true);
        setActiveTab('heatmap');

        postPortraitGetDisciplineHeatmapData(selectedInstitutions, selectedDirections)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setHeatmapData(data.data);
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных тепловой карты');
            })
            .finally(() => setLoading(false));
    };

    const renderHeatmap = () => {
        if (!heatmapData || heatmapData.length === 0) {
            return <div className="no-data">Нет данных для тепловой карты</div>;
        }

        const disciplines = [...new Set(heatmapData.map(d => d.discipline))].sort();
        const competencies = [...new Set(heatmapData.map(d => d.competency))].sort();

        return (
            <div className="heatmap-container">
                <table className="heatmap-table">
                    <thead>
                        <tr>
                            <th>Дисциплина</th>
                            {competencies.map(comp => (
                                <th key={comp} title={competencyLabels[comp]}>
                                    {competencyLabels[comp]?.substring(0, 12)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {disciplines.map(disc => (
                            <tr key={disc}>
                                <td className="disc-label">{disc}</td>
                                {competencies.map(comp => {
                                    const cell = heatmapData.find(
                                        d => d.discipline === disc && d.competency === comp
                                    );
                                    const effectSize = cell?.effect_size || 0;
                                    const intensity = Math.min(Math.abs(effectSize) / 1.0, 1);
                                    const color = effectSize >= 0
                                        ? `rgba(76, 175, 80, ${intensity * 0.7})`
                                        : `rgba(244, 67, 54, ${intensity * 0.7})`;
                                    const border = cell?.significant ? '2px solid #333' : '1px solid #ddd';

                                    return (
                                        <td
                                            key={`${disc}-${comp}`}
                                            style={{ backgroundColor: color, border }}
                                            title={`Effect size: ${effectSize.toFixed(2)}, p=${cell?.p_value?.toFixed(3)}, n=${cell?.n_students}`}
                                        >
                                            {cell ? effectSize.toFixed(2) : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="heatmap-legend">
                    <span>🟢 Положительный эффект</span>
                    <span>🔴 Отрицательный эффект</span>
                    <span>📊 Жирная граница = статистически значим (p &lt; 0.05)</span>
                </div>
            </div>
        );
    };

    const renderDisciplineImpact = () => {
        if (!disciplineData || disciplineData.length === 0) {
            return <div className="no-data">Нет данных для анализа влияния</div>;
        }

        return (
            <div className="discipline-impact-results">
                {disciplineData.map((result, idx) => (
                    <div key={idx} className="discipline-result-card">
                        <h5>📊 {competencyLabels[result.competency] || result.competency}</h5>

                        {result.results && result.results.length > 0 ? (
                            result.results.map((disc, didx) => (
                                <div key={didx} className="discipline-item">
                                    <div className="discipline-header">
                                        <strong>📚 {disc.discipline}</strong>
                                        <span className="disc-summary">
                                            {disc.summary?.effective ? '✅ Эффективна' : '⚠️ Неэффективна'}
                                        </span>
                                    </div>

                                    <table className="impact-table">
                                        <thead>
                                            <tr>
                                                <th>Оценка</th>
                                                <th>n студ.</th>
                                                <th>Среднее ДО</th>
                                                <th>Среднее ПОСЛЕ</th>
                                                <th>Прирост</th>
                                                <th>Effect Size</th>
                                                <th>p-value</th>
                                                <th>Значим</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(disc.grade_impacts || {}).map(([grade, impact]) => (
                                                <tr key={grade}>
                                                    <td className="grade-cell">{grade}</td>
                                                    <td>{impact.n_students}</td>
                                                    <td>{impact.mean_before.toFixed(1)}</td>
                                                    <td>{impact.mean_after.toFixed(1)}</td>
                                                    <td className={`gain-cell ${impact.mean_gain > 0 ? 'positive' : 'negative'}`}>
                                                        {impact.mean_gain > 0 ? '+' : ''}{impact.mean_gain.toFixed(1)}
                                                    </td>
                                                    <td>
                                                        <span className={`effect-badge ${
                                                            Math.abs(impact.cohens_d) > 0.5 ? 'large' : 'small'
                                                        }`}>
                                                            {impact.cohens_d.toFixed(3)}
                                                        </span>
                                                    </td>
                                                    <td>{impact.p_value.toFixed(4)}</td>
                                                    <td>{impact.significant ? '✓' : '✗'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {disc.summary && (
                                        <div className="disc-summary-stats">
                                            <span>Средний эффект: <strong>{disc.summary.average_effect_size.toFixed(3)}</strong></span>
                                            <span>Средний прирост: <strong>{disc.summary.average_gain.toFixed(1)}</strong></span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="no-data">Нет результатов для этой компетенции</div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="discipline-analysis-section">
            <h3>📚 Анализ влияния дисциплин на компетенции</h3>

            <div className="analysis-controls">
                <MultiSelect
                    options={filterOptions.disciplines || []}
                    value={selectedDisciplines}
                    onChange={setSelectedDisciplines}
                    placeholder="Все дисциплины"
                    searchPlaceholder="Поиск дисциплин..."
                    label="Выберите дисциплины"
                    withSearch={true}
                    showCounts={true}
                    maxHeight="300px"
                />

                <div className="button-group">
                    <Button
                        text={`${loading ? '⏳' : '📊'} Анализ влияния`}
                        onClick={loadDisciplineImpact}
                        disabled={loading}
                        fg="white"
                        bg="#1976d2"
                        hoverBg="#1565c0"
                    />
                    <Button
                        text={`${loading ? '⏳' : '🔥'} Тепловая карта`}
                        onClick={loadHeatmapData}
                        disabled={loading}
                        fg="white"
                        bg="#ff9800"
                        hoverBg="#e68900"
                    />
                </div>
            </div>

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <div className="loading-text">Загрузка анализа дисциплин...</div>
                </div>
            )}

            {!loading && (disciplineData || heatmapData) && (
                <div className="tab-container">
                    <div className="tab-buttons">
                        {disciplineData && (
                            <button
                                className={`tab-btn ${activeTab === 'impact' ? 'active' : ''}`}
                                onClick={() => setActiveTab('impact')}
                            >
                                📊 Влияние дисциплин
                            </button>
                        )}
                        {heatmapData && (
                            <button
                                className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
                                onClick={() => setActiveTab('heatmap')}
                            >
                                🔥 Тепловая карта
                            </button>
                        )}
                    </div>

                    <div className="tab-content">
                        {activeTab === 'impact' && renderDisciplineImpact()}
                        {activeTab === 'heatmap' && renderHeatmap()}
                    </div>
                </div>
            )}
        </div>
    );
}