import React, { useState, useEffect, useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, LineChart, Line, ReferenceLine
} from "recharts";
import Select from "react-select";
import { getEducationProfilesComparison } from "../api";
import "./EduProfilesComparison.scss";

const EduProfilesComparison = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);
    const [availableSpecialties, setAvailableSpecialties] = useState([]);
    const [compareMode, setCompareMode] = useState('radar'); // 'radar', 'bar', 'delta'
    const [selectedPair, setSelectedPair] = useState(null);
    const [includeMotivators, setIncludeMotivators] = useState(true);
    const [includeValues, setIncludeValues] = useState(true);

    useEffect(() => {
        loadData();
    }, [selectedYear, selectedSpecialties, includeMotivators, includeValues]);

    const loadData = async () => {
        setLoading(true);
        const filters = {
            specialties: selectedSpecialties.map(s => s.value),
            year: selectedYear?.value,
            include_motivators: includeMotivators,
            include_values: includeValues
        };
        
        getEducationProfilesComparison(filters)
            .onSuccess(async response => {
                const result = await response.json();
                if (result.status === 'success') {
                    setData(result.data);
                    // Обновляем доступные направления
                    const specialties = result.data.specialties.map(s => ({
                        value: s.id,
                        label: s.name,
                        students: s.total_students
                    }));
                    setAvailableSpecialties(specialties);
                    
                    // Обновляем доступные годы (из данных)
                    // Это нужно будет добавить в бэкенд или загрузить отдельно
                }
            })
            .onError(error => console.error("Ошибка загрузки:", error))
            .finally(() => setLoading(false));
    };

    // Подготовка данных для радиолокационной диаграммы
    const prepareRadarData = () => {
        if (!data || selectedSpecialties.length === 0) return [];
        
        const fields = [];
        
        if (includeMotivators && data.fields.motivators) {
            Object.entries(data.fields.motivators).forEach(([key, name]) => {
                const item = { field: name };
                selectedSpecialties.forEach(spec => {
                    const specialty = data.specialties.find(s => s.id === spec.value);
                    if (specialty && specialty.profile[key]) {
                        item[spec.label] = specialty.profile[key].avg;
                    }
                });
                fields.push(item);
            });
        }
        
        if (includeValues && data.fields.values) {
            Object.entries(data.fields.values).forEach(([key, name]) => {
                const item = { field: name };
                selectedSpecialties.forEach(spec => {
                    const specialty = data.specialties.find(s => s.id === spec.value);
                    if (specialty && specialty.profile[key]) {
                        item[spec.label] = specialty.profile[key].avg;
                    }
                });
                fields.push(item);
            });
        }
        
        return fields;
    };

    // Подготовка данных для bar chart
    const prepareBarData = () => {
        if (!data || selectedSpecialties.length === 0) return [];
        
        const allData = [];
        const fields = [];
        
        if (includeMotivators && data.fields.motivators) {
            Object.entries(data.fields.motivators).forEach(([key, name]) => {
                fields.push({ key, name, type: 'motivator' });
            });
        }
        
        if (includeValues && data.fields.values) {
            Object.entries(data.fields.values).forEach(([key, name]) => {
                fields.push({ key, name, type: 'value' });
            });
        }
        
        fields.forEach(field => {
            const row = { name: field.name };
            selectedSpecialties.forEach(spec => {
                const specialty = data.specialties.find(s => s.id === spec.value);
                if (specialty && specialty.profile[field.key]) {
                    row[spec.label] = specialty.profile[field.key].avg;
                }
            });
            allData.push(row);
        });
        
        return allData;
    };

    // Подготовка данных для дельты
    const prepareDeltaData = () => {
        if (!data || !selectedPair || !data.deltas[selectedPair]) return null;
        
        const delta = data.deltas[selectedPair];
        const motivatorsDelta = Object.values(delta.motivators_delta || {});
        const valuesDelta = Object.values(delta.values_delta || {});
        
        return {
            specialty1: delta.specialty1,
            specialty2: delta.specialty2,
            motivators: motivatorsDelta.sort((a, b) => b.abs_delta - a.abs_delta),
            values: valuesDelta.sort((a, b) => b.abs_delta - a.abs_delta)
        };
    };

    const radarData = prepareRadarData();
    const barData = prepareBarData();
    const deltaData = prepareDeltaData();

    // Цветовая палитра
    const colors = ['#1976d2', '#f44336', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4'];

    return (
        <div className="edu-profiles-comparison">
            <div className="filters">
                <div className="filter-group">
                    <label>Направления подготовки:</label>
                    <Select
                        isMulti
                        options={availableSpecialties}
                        value={selectedSpecialties}
                        onChange={setSelectedSpecialties}
                        placeholder="Выберите направления для сравнения..."
                        className="select"
                    />
                </div>
                
                <div className="filter-group">
                    <label>Год:</label>
                    <Select
                        options={[]} // Добавить опции годов
                        value={selectedYear}
                        onChange={setSelectedYear}
                        placeholder="Все годы"
                        isClearable
                        className="select"
                    />
                </div>
                
                <div className="filter-group checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={includeMotivators}
                            onChange={(e) => setIncludeMotivators(e.target.checked)}
                        />
                        Включить мотиваторы
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={includeValues}
                            onChange={(e) => setIncludeValues(e.target.checked)}
                        />
                        Включить ценности
                    </label>
                </div>
            </div>

            {loading && <div className="loading">Загрузка данных...</div>}

            {!loading && data && selectedSpecialties.length > 0 && (
                <>
                    <div className="view-switcher">
                        <button
                            className={`view-btn ${compareMode === 'radar' ? 'active' : ''}`}
                            onClick={() => setCompareMode('radar')}
                        >
                            Радарная диаграмма
                        </button>
                        <button
                            className={`view-btn ${compareMode === 'bar' ? 'active' : ''}`}
                            onClick={() => setCompareMode('bar')}
                        >
                            Столбчатая диаграмма
                        </button>
                        {selectedSpecialties.length === 2 && (
                            <button
                                className={`view-btn ${compareMode === 'delta' ? 'active' : ''}`}
                                onClick={() => {
                                    const pairKey = `${selectedSpecialties[0].value}_${selectedSpecialties[1].value}`;
                                    const reverseKey = `${selectedSpecialties[1].value}_${selectedSpecialties[0].value}`;
                                    setSelectedPair(data.deltas[pairKey] ? pairKey : reverseKey);
                                    setCompareMode('delta');
                                }}
                            >
                                Анализ различий (дельта)
                            </button>
                        )}
                    </div>

                    {compareMode === 'radar' && (
                        <div className="radar-chart">
                            <h3>Сравнение профилей</h3>
                            <ResponsiveContainer width="100%" height={500}>
                                <RadarChart data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="field" tick={{ fontSize: 11 }} />
                                    <PolarRadiusAxis domain={[0, 800]} />
                                    {selectedSpecialties.map((spec, idx) => (
                                        <Radar
                                            key={spec.value}
                                            name={spec.label}
                                            dataKey={spec.label}
                                            stroke={colors[idx % colors.length]}
                                            fill={colors[idx % colors.length]}
                                            fillOpacity={0.3}
                                        />
                                    ))}
                                    <Tooltip />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {compareMode === 'bar' && (
                        <div className="bar-chart">
                            <h3>Сравнение по показателям</h3>
                            <ResponsiveContainer width="100%" height={600}>
                                <BarChart
                                    data={barData}
                                    layout="vertical"
                                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" domain={[0, 800]} />
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <Tooltip />
                                    <Legend />
                                    {selectedSpecialties.map((spec, idx) => (
                                        <Bar
                                            key={spec.value}
                                            dataKey={spec.label}
                                            fill={colors[idx % colors.length]}
                                            name={spec.label}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {compareMode === 'delta' && deltaData && (
                        <div className="delta-analysis">
                            <h3>
                                Анализ различий: {deltaData.specialty1} → {deltaData.specialty2}
                            </h3>
                            
                            {deltaData.motivators.length > 0 && (
                                <div className="delta-section">
                                    <h4>📊 Различия в мотиваторах</h4>
                                    <div className="delta-chart">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart
                                                data={deltaData.motivators}
                                                layout="vertical"
                                                margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="name" 
                                                    width={140}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    formatter={(value, name, props) => {
                                                        const item = props.payload;
                                                        return [
                                                            `${value > 0 ? '+' : ''}${value} баллов`,
                                                            `Разница (${deltaData.specialty2} - ${deltaData.specialty1})`
                                                        ];
                                                    }}
                                                />
                                                <ReferenceLine x={0} stroke="#666" />
                                                <Bar
                                                    dataKey="delta"
                                                    fill={(entry) => entry.delta > 0 ? '#4caf50' : '#f44336'}
                                                    name="Разница"
                                                >
                                                    {deltaData.motivators.map((entry, idx) => (
                                                        <Bar 
                                                            key={idx}
                                                            dataKey="delta" 
                                                            fill={entry.delta > 0 ? '#4caf50' : '#f44336'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                            
                            {deltaData.values.length > 0 && (
                                <div className="delta-section">
                                    <h4>💎 Различия в ценностях</h4>
                                    <div className="delta-chart">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart
                                                data={deltaData.values}
                                                layout="vertical"
                                                margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="name" 
                                                    width={140}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [
                                                        `${value > 0 ? '+' : ''}${value} баллов`,
                                                        `Разница (${deltaData.specialty2} - ${deltaData.specialty1})`
                                                    ]}
                                                />
                                                <ReferenceLine x={0} stroke="#666" />
                                                <Bar dataKey="delta" name="Разница">
                                                    {deltaData.values.map((entry, idx) => (
                                                        <Bar 
                                                            key={idx}
                                                            dataKey="delta" 
                                                            fill={entry.delta > 0 ? '#4caf50' : '#f44336'}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                            
                            <div className="delta-summary">
                                <h4>📈 Ключевые различия</h4>
                                <div className="summary-grid">
                                    {[...deltaData.motivators, ...deltaData.values]
                                        .sort((a, b) => b.abs_delta - a.abs_delta)
                                        .slice(0, 5)
                                        .map((item, idx) => (
                                            <div key={idx} className="summary-item">
                                                <span className="item-name">{item.name}</span>
                                                <span className={`item-delta ${item.delta > 0 ? 'positive' : 'negative'}`}>
                                                    {item.delta > 0 ? '+' : ''}{item.delta} баллов
                                                </span>
                                                <div className="item-values">
                                                    <span>{deltaData.specialty1}: {item.spec1_avg}</span>
                                                    <span>→</span>
                                                    <span>{deltaData.specialty2}: {item.spec2_avg}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && data && selectedSpecialties.length === 0 && (
                <div className="no-data">
                    Выберите направления подготовки для сравнения
                </div>
            )}
        </div>
    );
};

export default EduProfilesComparison;
