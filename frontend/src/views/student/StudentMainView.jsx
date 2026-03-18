import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getPortraitStudentResults } from "../../api";
import { 
  getAvailableProfiles, getAvailableCategories, getAvailableYears, getCategoryDataForYear 
} from "../../utilities";
import ChartSwitcher from "../../components/charts/ChartSwitcher";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import Title from "../../components/Title";
import Dropdown from "../../components/ui/Dropdown";

import "./StudentMainView.scss";

function StudentMainView() {
    const {studentId} = useParams();
    const [studResults, setStudResults] = useState();
    const [linkList, setLinkList] = useState([]);
    const [chartsData, setChartsData] = useState([]);
    const [availableYears, setAvailableYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Аналитика компетенций
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [resumeGenerating, setResumeGenerating] = useState(false);

    useEffect(() => {
        if (showAnalytics && selectedYear) {
            loadAnalytics(selectedYear);
        }
    }, [selectedYear, showAnalytics]);

    useEffect(() => {
        const fetchData = async () => {
            getPortraitStudentResults(studentId)
                .onSuccess(async response => {
                    const data = await response.json();
                    if (data.status === 'success') {
                        setStudResults({student: data.student, results: data.results});
                    }
                })
                .onError(error => console.error(error))
                .finally(() => setLoading(false));
        };
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    useEffect(() => {
        const defineAvailableData = () => {
            if (!studResults?.results?.length) return;

            const availableProfiles = getAvailableProfiles(studResults.results);
            const profileLinks = availableProfiles.map(profile => {
                return {
                    to: `/student/${studResults.student.stud_id}/report/${profile.key}`,
                    title: profile.title
                };
            });
            
            setLinkList([{
                to: `/student/${studResults.student.stud_id}`,
                title: "Главная страница"
            }, ...profileLinks]);

            const years = getAvailableYears(studResults.results);
            setAvailableYears(years);
            
            if (years.length > 0 && !selectedYear) {
                setSelectedYear(years[0]);
            }

            updateChartsData(years.length > 0 ? selectedYear || years[0] : null);
        };

        if (studResults) {
            defineAvailableData();
        }
    }, [studResults]);

    useEffect(() => {
        if (studResults?.results?.length && selectedYear) {
            updateChartsData(selectedYear);
        }
    }, [selectedYear, studResults]);

    const updateChartsData = (year) => {
        if (!studResults?.results?.length || !year) return;

        const availableProfiles = getAvailableProfiles(studResults.results);
        const charts = [];
        
        availableProfiles.forEach(profile => {
            const availableCategories = getAvailableCategories(studResults.results, profile.key);
            
            availableCategories.forEach(category => {
                const yearData = getCategoryDataForYear(studResults.results, profile.key, category.key, year);
                
                if (yearData.labels.length > 0) {
                    const competencyKeys = category.fields
                        .filter(field => {
                            return yearData.labels.includes(field.label);
                        })
                        .map(field => field.key);
                    
                    charts.push({
                        profile: profile,
                        category: category,
                        title: `${profile.title}: ${category.title}`,
                        year: yearData.year,
                        labels: yearData.labels,
                        data: yearData.data,
                        competencyKeys: competencyKeys
                    });
                }
            });
        });

        setChartsData(charts);
    };

    const handleYearChange = (year) => {
        setSelectedYear(year);
    };

    // ============================================================
    // АНАЛИТИКА КОМПЕТЕНЦИЙ
    // ============================================================

    const loadAnalytics = async () => {
        if (analyticsData) {
            // Уже загружены, просто показываем/скрываем
            setShowAnalytics(!showAnalytics);
            return;
        }

        setAnalyticsLoading(true);
        
        try {
            console.log('🔄 Загрузка аналитики для студента:', studentId);
            
            const response = await fetch(
                `http://localhost:8000/portrait/student-resume-data/?student_id=${studentId}&year=${selectedYear}&with_ai=true`
            );
            
            console.log('📡 Ответ получен:', response.status);
            
            const data = await response.json();
            console.log('📦 Данные:', data);
            
            if (data.status === 'success') {
                setAnalyticsData(data.data);
                setShowAnalytics(true);
                console.log('✅ Аналитика загружена:', data.data.competencies?.length, 'компетенций');
            } else {
                console.error('❌ Ошибка от сервера:', data.message);
                alert('Не удалось загрузить аналитику: ' + data.message);
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки аналитики:', error);
            alert('Ошибка подключения к серверу: ' + error.message);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // ============================================================
    // ГЕНЕРАЦИЯ DOCX РЕЗЮМЕ
    // ============================================================

    const generateDocxResume = async () => {
        setResumeGenerating(true);
        
        try {
            console.log('📄 Генерация резюме для студента:', studentId);
            
            const url = `http://localhost:8000/portrait/generate-docx-resume/?student_id=${studentId}`;
            console.log('🔗 URL:', url);
            
            window.open(url, '_blank');
            
            setTimeout(() => {
                setResumeGenerating(false);
            }, 1000);
            
        } catch (error) {
            console.error('❌ Ошибка генерации резюме:', error);
            alert('Ошибка генерации резюме: ' + error.message);
            setResumeGenerating(false);
        }
    };

    return (
        <div className="StudentMainView">
            <SidebarLayout style={LAYOUT_STYLE.NORMAL}>
                <Header title="Профиль" name={`${studResults?.student?.stud_name}`} />
                <Sidebar links={linkList} />
                <Content>
                    <Title title="Главная страница" />
                    <div className="main-controls">
                        {availableYears.length > 0 && (
                            <div className="year-selector">
                                <span className="year-label">Год данных:</span>
                                <Dropdown 
                                    handle={
                                        <div className="year-dropdown-handle">
                                            {selectedYear || "Выберите год"}
                                            <span className="dropdown-arrow">▼</span>
                                        </div>
                                    }
                                >
                                    {availableYears.map(year => (
                                        <div 
                                            key={year} 
                                            className={`year-option ${year === selectedYear ? 'selected' : ''}`}
                                            onClick={() => handleYearChange(year)}
                                        >
                                            {year}
                                        </div>
                                    ))}
                                </Dropdown>
                            </div>
                        )}
                        
                        <div className="action-buttons">
                            <button 
                                className="analytics-button"
                                onClick={loadAnalytics}
                                disabled={analyticsLoading}
                            >
                                {analyticsLoading ? "⏳ Загрузка..." : showAnalytics ? "🔽 Скрыть аналитику" : "📊 Показать аналитику"}
                            </button>
                            
                            <button 
                                className="resume-button"
                                onClick={generateDocxResume}
                                disabled={resumeGenerating}
                            >
                                {resumeGenerating ? "⏳ Генерация..." : "📄 Скачать резюме DOCX"}
                            </button>
                        </div>
                    </div>

                    {/* АНАЛИТИКА КОМПЕТЕНЦИЙ */}
                    {showAnalytics && analyticsData && (
                        <div className="analytics-section">
                            <div className="analytics-header">
                                <h2>📊 Аналитика профессиональных компетенций</h2>
                                <p className="analytics-description">
                                    Детальный анализ результатов тестирования с рекомендациями по развитию
                                </p>
                            </div>

                            <div className="analytics-cards-grid">
                                {analyticsData.competencies?.map((comp) => {
                                    if (!comp.ai) return null;
                                    
                                    return (
                                        <div key={comp.field} className="analytics-card">
                                            <div className="analytics-card-header">
                                                <div className="competency-title">
                                                    <span className="emoji">{comp.ai.emoji}</span>
                                                    <h3>{comp.name}</h3>
                                                </div>
                                                <div className="score-badge">
                                                    {comp.score}/800
                                                </div>
                                            </div>

                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${comp.percentage}%`,
                                                        backgroundColor: comp.ai.color
                                                    }}
                                                ></div>
                                            </div>

                                            <div className="level-indicator" style={{ color: comp.ai.color }}>
                                                <strong>{comp.ai.level.toUpperCase()}</strong> уровень
                                                <span className="percentile">
                                                    ({comp.ai.percentile}-й процентиль)
                                                </span>
                                            </div>

                                            <div className="interpretation">
                                                <p>{comp.ai.interpretation}</p>
                                            </div>

                                            {comp.ai.recommendations && comp.ai.recommendations.length > 0 && (
                                                <div className="recommendations">
                                                    <strong>📌 Рекомендации:</strong>
                                                    <ul>
                                                        {comp.ai.recommendations.map((rec, idx) => (
                                                            <li key={idx}>{rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* ГРАФИКИ */}
                    <div className="charts-grid">
                        {loading ? (
                            <div className="loading">Загрузка данных...</div>
                        ) : chartsData.length > 0 ? (
                            chartsData.map((chart, index) => (
                                <div key={index} className="chart-card">
                                    <div className="chart-header">
                                        <h3>{chart.title}</h3>
                                        {chart.year && (
                                            <span className="chart-year">{chart.year}</span>
                                        )}
                                    </div>
                                    <div className="chart-container">
                                        <ChartSwitcher
                                            seriesLabel={`${chart.year} год`}
                                            seriesData={chart.data}
                                            categories={chart.labels}
                                            competencyKeys={chart.competencyKeys}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-data">
                                {availableYears.length > 0 ? "Нет данных для отображения" : "Нет доступных данных"}
                            </div>
                        )}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default StudentMainView;