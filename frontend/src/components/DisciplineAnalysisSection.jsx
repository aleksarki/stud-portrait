import { useState } from "react";
import {
    BarChart, Bar, // Добавлено
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import Button from './ui/Button';
import MultiSelect from './ui/MultiSelect';
import { 
    postAnalyzeDisciplineImpactAdvanced, 
    postGetDisciplineHeatmapData,
    getAnalyzeAllDisciplinesImpact 
} from '../api';

const COLORS = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2'];

export function DisciplineAnalysisSection({
    filterOptions,
    selectedInstitutions,
    selectedDirections,
    selectedCompetencies
}) {
    const [disciplineData, setDisciplineData] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [allDisciplinesData, setAllDisciplinesData] = useState(null);
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

    // Загрузка комплексного анализа всех дисциплин
    const loadAllDisciplinesImpact = async () => {
        setLoading(true);
        setActiveTab('all');

        getAnalyzeAllDisciplinesImpact()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setAllDisciplinesData(data);
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

    const loadDisciplineImpact = async () => {
        setLoading(true);
        setActiveTab('impact');

        const competencies = selectedCompetencies.length > 0 
            ? selectedCompetencies 
            : Object.keys(competencyLabels).slice(0, 3); // По умолчанию первые 3 компетенции

        postAnalyzeDisciplineImpactAdvanced(
            competencies,
            selectedDisciplines,
            selectedInstitutions,
            selectedDirections,
            
        )
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDisciplineData(data.results);
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

    const loadHeatmapData = async () => {
        setLoading(true);
        setActiveTab('heatmap');

        postGetDisciplineHeatmapData(selectedInstitutions, selectedDirections)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setHeatmapData(data.data);
                } else {
                    alert('Ошибка при загрузке данных тепловой карты: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных: ' + error.message);
            })
            .finally(() => setLoading(false));
    };

    const renderAllDisciplinesImpact = () => {
        if (!allDisciplinesData) {
            return <div className="no-data">Нет данных для отображения</div>;
        }

        const { impact_matrix, competencies_analyzed } = allDisciplinesData;

        if (!impact_matrix || impact_matrix.length === 0) {
            return <div className="no-data">Нет данных о влиянии дисциплин</div>;
        }

        // Группируем по компетенциям
        const byCompetency = {};
        impact_matrix.forEach(item => {
            if (!byCompetency[item.competency]) {
                byCompetency[item.competency] = [];
            }
            byCompetency[item.competency].push(item);
        });

        return (
            <div className="all-disciplines-results">
                <h4>Комплексный анализ всех дисциплин</h4>
                <p className="info-text">Проанализировано компетенций: {competencies_analyzed}</p>
                
                {Object.entries(byCompetency).map(([comp, items]) => (
                    <div key={comp} className="competency-group">
                        <h5>{competencyLabels[comp] || comp}</h5>
                        <table className="impact-table">
                            <thead>
                                <tr>
                                    <th>Дисциплина</th>
                                    <th>Effect Size</th>
                                    <th>Эффективность</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.discipline}</td>
                                        <td>
                                            <span className={`effect-badge ${
                                                Math.abs(item.impact_data?.average_effect_size || 0) > 0.5 ? 'large' : 'small'
                                            }`}>
                                                {(item.impact_data?.average_effect_size || 0).toFixed(3)}
                                            </span>
                                        </td>
                                        <td>
                                            {item.impact_data?.effective ? '✅' : '⚠️'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        );
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
                                            title={`Effect size: ${effectSize?.toFixed(2) || '0'}, p=${cell?.p_value?.toFixed(3) || 'N/A'}, n=${cell?.n_students || 0}`}
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
                                                    <td>{impact.mean_before?.toFixed(1) || '0.0'}</td>
                                                    <td>{impact.mean_after?.toFixed(1) || '0.0'}</td>
                                                    <td className={`gain-cell ${impact.mean_gain > 0 ? 'positive' : 'negative'}`}>
                                                        {impact.mean_gain > 0 ? '+' : ''}{impact.mean_gain?.toFixed(1) || '0.0'}
                                                    </td>
                                                    <td>
                                                        <span className={`effect-badge ${
                                                            Math.abs(impact.cohens_d) > 0.5 ? 'large' : 'small'
                                                        }`}>
                                                            {impact.cohens_d?.toFixed(3) || '0.000'}
                                                        </span>
                                                    </td>
                                                    <td>{impact.p_value?.toFixed(4) || '0.0000'}</td>
                                                    <td>{impact.significant ? '✓' : '✗'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {disc.summary && (
                                        <div className="disc-summary-stats">
                                            <span>Средний эффект: <strong>{disc.summary.average_effect_size?.toFixed(3) || '0.000'}</strong></span>
                                            <span>Средний прирост: <strong>{disc.summary.average_gain?.toFixed(1) || '0.0'}</strong></span>
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
                    <Button
                        text={`${loading ? '⏳' : '📈'} Все дисциплины`}
                        onClick={loadAllDisciplinesImpact}
                        disabled={loading}
                        fg="white"
                        bg="#4CAF50"
                        hoverBg="#45a049"
                    />
                </div>
            </div>

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <div className="loading-text">Загрузка анализа дисциплин...</div>
                </div>
            )}

            {!loading && (disciplineData || heatmapData || allDisciplinesData) && (
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
                        {allDisciplinesData && (
                            <button
                                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                📈 Комплексный анализ
                            </button>
                        )}
                    </div>

                    <div className="tab-content">
                        {activeTab === 'impact' && renderDisciplineImpact()}
                        {activeTab === 'heatmap' && renderHeatmap()}
                        {activeTab === 'all' && renderAllDisciplinesImpact()}
                    </div>
                </div>
            )}
        </div>
    );
}