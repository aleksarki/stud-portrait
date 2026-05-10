import React, { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Cell
} from "recharts";
import Select from "react-select";

import { getMotivatorStatistics } from "../api";
import { MOTIVATORS_NAMES } from "../utilities";

import "./MotivatorStatistics.scss";

const GROUP_BY_OPTIONS = [
    { value: 'specialty', label: 'По направлениям подготовки' },
    { value: 'course', label: 'По курсам' },
    { value: 'specialty_course', label: 'По направлениям и курсам' }
];

const MotivatorStatistics = ({ filters }) => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState('specialty');
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);

    useEffect(() => {
        loadStatistics();
    }, [filters, groupBy]);

    const loadStatistics = async () => {
        setLoading(true);
        const params = {
            ...filters,
            group_by: groupBy
        };
        
        getMotivatorStatistics(params)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStatistics(data);
                    setSelectedSpecialty(null);
                    setSelectedCourse(null);
                }
            })
            .onError(error => console.error("Ошибка загрузки статистики:", error))
            .finally(() => setLoading(false));
    };

    const prepareChartData = () => {
        if (!statistics || !statistics.data) return [];

        if (groupBy === 'specialty') {
            // Для группировки по направлениям - показываем все мотиваторы для выбранного направления
            if (!selectedSpecialty) return [];
            
            const specialty = statistics.data.find(s => s.id === selectedSpecialty);
            if (!specialty) return [];

            return Object.entries(specialty.motivators).map(([key, value]) => ({
                name: MOTIVATORS_NAMES[key],
                мотиваторы: value.motivator_percent,
                демотиваторы: value.demotivator_percent,
                total: value.total_count
            }));
        } 
        else if (groupBy === 'course') {
            // Для группировки по курсам - показываем все мотиваторы для выбранного курса
            if (!selectedCourse) return [];
            
            const course = statistics.data.find(c => c.id === selectedCourse);
            if (!course) return [];

            return Object.entries(course.motivators).map(([key, value]) => ({
                name: MOTIVATORS_NAMES[key],
                мотиваторы: value.motivator_percent,
                демотиваторы: value.demotivator_percent,
                total: value.total_count
            }));
        }
        else if (groupBy === 'specialty_course') {
            // Для детальной группировки - показываем выбранное направление и курс
            if (!selectedSpecialty || !selectedCourse) return [];
            
            const specialty = statistics.data.find(s => s.id === selectedSpecialty);
            if (!specialty) return [];
            
            const course = specialty.courses.find(c => c.course === selectedCourse);
            if (!course) return [];

            return Object.entries(course.motivators).map(([key, value]) => ({
                name: MOTIVATORS_NAMES[key],
                мотиваторы: value.motivator_percent,
                демотиваторы: value.demotivator_percent,
                total: value.total_count
            }));
        }
        
        return [];
    };

    const getSpecialtyOptions = () => {
        if (!statistics || !statistics.data) return [];
        if (groupBy === 'specialty') {
            return statistics.data.map(s => ({ value: s.id, label: s.name }));
        } else if (groupBy === 'specialty_course') {
            return statistics.data.map(s => ({ value: s.id, label: s.name }));
        }
        return [];
    };

    const getCourseOptions = () => {
        if (groupBy === 'course' && statistics && statistics.data) {
            return statistics.data.map(c => ({ value: c.id, label: c.name }));
        } else if (groupBy === 'specialty_course' && selectedSpecialty && statistics) {
            const specialty = statistics.data.find(s => s.id === selectedSpecialty);
            if (specialty) {
                return specialty.courses.map(c => ({ value: c.course, label: c.name }));
            }
        }
        return [];
    };

    const chartData = prepareChartData();

    return (
        <div className="motivator-statistics">
            <div className="controls">
                <div className="control-group">
                    <label>Группировка:</label>
                    <Select
                        options={GROUP_BY_OPTIONS}
                        value={GROUP_BY_OPTIONS.find(opt => opt.value === groupBy)}
                        onChange={(opt) => setGroupBy(opt.value)}
                        className="select"
                    />
                </div>

                {getSpecialtyOptions().length > 0 && (
                    <div className="control-group">
                        <label>Направление подготовки:</label>
                        <Select
                            options={getSpecialtyOptions()}
                            value={getSpecialtyOptions().find(opt => opt.value === selectedSpecialty)}
                            onChange={(opt) => setSelectedSpecialty(opt.value)}
                            placeholder="Выберите направление..."
                            className="select"
                        />
                    </div>
                )}

                {getCourseOptions().length > 0 && (
                    <div className="control-group">
                        <label>Курс:</label>
                        <Select
                            options={getCourseOptions()}
                            value={getCourseOptions().find(opt => opt.value === selectedCourse)}
                            onChange={(opt) => setSelectedCourse(opt.value)}
                            placeholder="Выберите курс..."
                            className="select"
                        />
                    </div>
                )}
            </div>

            {loading && <div className="loading">Загрузка статистики...</div>}

            {!loading && chartData.length > 0 && (
                <div className="chart-container">
                    <h3>Статистика мотиваторов</h3>
                    <div className="stats-summary">
                        <div className="stat-card">
                            <span className="label">Всего студентов:</span>
                            <span className="value">{chartData[0]?.total || 0}</span>
                        </div>
                    </div>
                    
                    <ResponsiveContainer width="100%" height={500}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            layout="vertical"
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} unit="%" />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={150}
                                tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                                formatter={(value) => `${value}%`}
                                labelFormatter={(label) => `Мотиватор: ${label}`}
                            />
                            <Legend />
                            <Bar 
                                dataKey="мотиваторы" 
                                fill="#4caf50" 
                                name="Мотиваторы (600-800 баллов)"
                                barSize={20}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-mot-${index}`} fill="#4caf50" />
                                ))}
                            </Bar>
                            <Bar 
                                dataKey="демотиваторы" 
                                fill="#f44336" 
                                name="Демотиваторы (200-399 баллов)"
                                barSize={20}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-dem-${index}`} fill="#f44336" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!loading && chartData.length === 0 && selectedSpecialty && (
                <div className="no-data">
                    Нет данных для отображения. Попробуйте изменить параметры фильтрации.
                </div>
            )}
        </div>
    );
};

export default MotivatorStatistics;
