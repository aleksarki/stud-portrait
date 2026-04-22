import React, { useState, useEffect } from "react";

import { getStudentComparisonStats } from "../api";

import "./StudentComparisonStats.scss";

const StudentComparisonStats = ({ studentId, year }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('competencies'); // 'competencies' or 'motivators'

    useEffect(() => {
        if (studentId && year) {
            loadStats();
        }
    }, [studentId, year]);

    const loadStats = async () => {
        setLoading(true);
        getStudentComparisonStats(studentId, year)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStats(data.data);
                }
            })
            .onError(error => console.error("Ошибка загрузки статистики:", error))
            .finally(() => setLoading(false));
    };

    const getPercentileColor = (percentile) => {
        if (percentile === null || percentile === undefined) return '#e0e0e0';
        if (percentile >= 75) return '#4caf50';
        if (percentile >= 50) return '#ffc107';
        if (percentile >= 25) return '#ff9800';
        return '#f44336';
    };

    const getPercentileLabel = (percentile) => {
        if (percentile === null || percentile === undefined) return 'Нет данных';
        if (percentile >= 75) return 'Высокий';
        if (percentile >= 50) return 'Выше среднего';
        if (percentile >= 25) return 'Ниже среднего';
        return 'Низкий';
    };

    const renderComparisonCard = (item, type) => {
        return (
            <div key={item.name} className="comparison-card">
                <div className="card-header">
                    <h4>{item.name}</h4>
                    <div className="score">
                        {item.score !== null ? `${item.score} / 800` : 'Нет данных'}
                    </div>
                </div>
                
                <div className="percentiles">
                    <div className="percentile-item">
                        <div className="percentile-label">По курсу</div>
                        <div 
                            className="percentile-bar"
                            style={{
                                width: `${item.percentile_course || 0}%`,
                                backgroundColor: getPercentileColor(item.percentile_course)
                            }}
                        />
                        <div className="percentile-value">
                            {item.percentile_course !== null ? `${item.percentile_course}%` : 'Нет данных'}
                            <span className="percentile-rank">{getPercentileLabel(item.percentile_course)}</span>
                        </div>
                    </div>
                    
                    <div className="percentile-item">
                        <div className="percentile-label">По направлению</div>
                        <div 
                            className="percentile-bar"
                            style={{
                                width: `${item.percentile_specialty || 0}%`,
                                backgroundColor: getPercentileColor(item.percentile_specialty)
                            }}
                        />
                        <div className="percentile-value">
                            {item.percentile_specialty !== null ? `${item.percentile_specialty}%` : 'Нет данных'}
                            <span className="percentile-rank">{getPercentileLabel(item.percentile_specialty)}</span>
                        </div>
                    </div>
                    
                    <div className="percentile-item">
                        <div className="percentile-label">По вузу</div>
                        <div 
                            className="percentile-bar"
                            style={{
                                width: `${item.percentile_institution || 0}%`,
                                backgroundColor: getPercentileColor(item.percentile_institution)
                            }}
                        />
                        <div className="percentile-value">
                            {item.percentile_institution !== null ? `${item.percentile_institution}%` : 'Нет данных'}
                            <span className="percentile-rank">{getPercentileLabel(item.percentile_institution)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="averages">
                    <div className="avg-item">
                        <span className="avg-label">Среднее по курсу:</span>
                        <span className="avg-value">{item.avg_course || 'Нет данных'}</span>
                    </div>
                    <div className="avg-item">
                        <span className="avg-label">Среднее по направлению:</span>
                        <span className="avg-value">{item.avg_specialty || 'Нет данных'}</span>
                    </div>
                    <div className="avg-item">
                        <span className="avg-label">Среднее по вузу:</span>
                        <span className="avg-value">{item.avg_institution || 'Нет данных'}</span>
                    </div>
                    {item.min_institution !== null && item.max_institution !== null && (
                        <div className="avg-item">
                            <span className="avg-label">Диапазон по вузу:</span>
                            <span className="avg-value">{item.min_institution} - {item.max_institution}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="student-comparison-stats">
                <div className="loading">Загрузка сравнительной статистики...</div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const currentData = selectedCategory === 'competencies' ? stats.competencies : stats.motivators;

    return (
        <div className="student-comparison-stats">
            <div className="comparison-header">
                <h3>📊 Сравнительный анализ</h3>
                <div className="context-info">
                    <div className="context-badge">
                        <span className="label">Вуз:</span>
                        <span className="value">{stats.student_info.institution}</span>
                    </div>
                    <div className="context-badge">
                        <span className="label">Направление:</span>
                        <span className="value">{stats.student_info.specialty}</span>
                    </div>
                    <div className="context-badge">
                        <span className="label">Курс:</span>
                        <span className="value">{stats.student_info.course}</span>
                    </div>
                </div>
            </div>

            <div className="comparison-tabs">
                <button
                    className={`tab ${selectedCategory === 'competencies' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('competencies')}
                >
                    Компетенции
                </button>
                <button
                    className={`tab ${selectedCategory === 'motivators' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('motivators')}
                >
                    Мотиваторы
                </button>
            </div>

            <div className="comparison-grid">
                {currentData.map(item => renderComparisonCard(item, selectedCategory))}
            </div>
        </div>
    );
};

export default StudentComparisonStats;
