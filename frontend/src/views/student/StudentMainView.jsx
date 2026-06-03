import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getPortraitStudentResults, getStudentComparisonStats, getStudentResumeData, windowGenerateDocxResume } from "../../api";
import {
    getAvailableProfiles, getAvailableCategories, getAvailableYears,
    getCategoryDataForYear, COMPETENCIES_NAMES,
    MOTIVATORS_NAMES
} from "../../utilities";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import StudentComparisonStats from "../../components/StudentComparisonStats";
import Title from "../../components/Title";

import Button from "../../components/ui/Button";
import { STUDENT_PALETTE } from "../../components/ui/palette";
import Select, { Option } from "../../components/ui/Select";

import ChartSwitcher from "../../components/charts/ChartSwitcher";
import StudentVamChart from "../../components/charts/StudentVamChart";
import StudentLgmChart from '../../components/charts/StudentLgmChart';
import StudentDisciplineImpact from '../../components/charts/StudentDisciplineImpact';

import "./StudentMainView.scss";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Инициалы студента для аватара */
function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

function StudentMainView() {
    const { studentId } = useParams();
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

    // Активная вкладка в блоке VAM / LGM
    const [analysisTab, setAnalysisTab] = useState('vam'); // 'vam' | 'lgm'

    // Компетенции для VAM и LGM
    const [vamCompetency, setVamCompetency] = useState('res_comp_leadership');
    const [lgmCompetency, setLgmCompetency] = useState('res_comp_leadership');

    const [comparisonStats, setComparisonStats] = useState(null);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [resumeGenerating, setResumeGenerating] = useState(false);

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        if (showAnalytics && selectedYear) loadAnalytics(selectedYear);
        // eslint-disable-next-line
    }, [selectedYear, showAnalytics]);

    useEffect(() => {
        const fetchData = async () => {
            getPortraitStudentResults(studentId)
                .onSuccess(async response => {
                    const data = await response.json();
                    if (data.status === 'success') {
                        setStudResults({ student: data.student, results: data.results });
                    }
                })
                .onError(error => console.error(error))
                .finally(() => setLoading(false));
        };
        if (studentId) fetchData();
    }, [studentId]);

    useEffect(() => {
        if (!studResults) return;

        const availableProfiles = getAvailableProfiles(studResults.results);
        const profileLinks = availableProfiles.map(profile => ({
            to: `/student/${studResults.student.stud_id}/report/${profile.key}`,
            title: profile.title
        }));
        setLinkList([{
            to: `/student/${studResults.student.stud_id}`,
            title: "Главная страница"
        }, ...profileLinks]);

        const years = getAvailableYears(studResults.results);
        setAvailableYears(years);
        if (years.length > 0 && !selectedYear) setSelectedYear(years[0]);
        updateChartsData(years.length > 0 ? selectedYear || years[0] : null);
    }, [studResults]);

    useEffect(() => {
        if (studResults?.results?.length && selectedYear) updateChartsData(selectedYear);
    }, [selectedYear, studResults]);

    useEffect(() => {
        if (selectedYear) loadComparisonStats();
    }, [selectedYear]);

    // ── Data loaders ─────────────────────────────────────────────────────────

    const loadComparisonStats = async () => {
        if (!studentId || !selectedYear) return;
        setLoadingComparison(true);
        getStudentComparisonStats(studentId, selectedYear)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') setComparisonStats(data.data);
            })
            .onError(error => console.error("Ошибка загрузки сравнения:", error))
            .finally(() => setLoadingComparison(false));
    };

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
                        .filter(field => yearData.labels.includes(field.label))
                        .map(field => field.key);
                    charts.push({
                        profile, category,
                        title: `${profile.title}: ${category.title}`,
                        year: yearData.year,
                        labels: yearData.labels,
                        data: yearData.data,
                        competencyKeys
                    });
                }
            });
        });
        setChartsData(charts);
    };

    const loadAnalytics = async year => {
        if (analyticsData && analyticsData.year === year) {
            setShowAnalytics(true);
            return;
        }
        setAnalyticsLoading(true);
        getStudentResumeData(studentId, year)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setAnalyticsData({ ...data.data, year });
                    setShowAnalytics(true);
                } else {
                    alert('Не удалось загрузить аналитику: ' + data.message);
                }
            })
            .onError(err => {
                console.error('Ошибка загрузки аналитики:', err);
                alert('Ошибка подключения к серверу: ' + err.message);
            })
            .finally(() => setAnalyticsLoading(false));
    };

    const toggleAnalytics = () => {
        if (showAnalytics) setShowAnalytics(false);
        else loadAnalytics(selectedYear);
    };

    const generateDocxResume = async () => {
        setResumeGenerating(true);
        windowGenerateDocxResume(studentId)
            .onTimeout(() => setResumeGenerating(false))
            .onError(err => {
                console.error(err);
                alert('Ошибка генерации резюме: ' + err.message);
                setResumeGenerating(false);
            })
            .open();
    };

    // ── Derived values ───────────────────────────────────────────────────────

    const studentName = studResults?.student?.stud_name ?? '';
    const initials    = getInitials(studentName);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="StudentMainView">
            <SidebarLayout style={LAYOUT_STYLE.NORMAL}>
                <Header title="Профиль" name={studentName} />
                <Sidebar links={linkList} />

                <Content>

                    {/* ── Hero ─────────────────────────────────────────── */}
                    <div className="dashboard-hero">
                        <div className="hero-left">
                            <div className="hero-avatar">{initials || '?'}</div>
                            <div className="hero-text">
                                <div className="hero-label">Профиль студента</div>
                                <div className="hero-name">{studentName || 'Загрузка...'}</div>
                            </div>
                        </div>

                        <div className="hero-right">
                            {availableYears.length > 0 && (
                                <div className="hero-year-selector">
                                    <span className="hero-year-label">Учебный год:</span>
                                    <Select initValue={selectedYear} onChange={setSelectedYear}>
                                        {availableYears.map(year =>
                                            <Option key={year} value={year} label={year} />
                                        )}
                                    </Select>
                                </div>
                            )}

                            <div className="hero-actions">
                                <Button
                                    text={analyticsLoading ? "Загрузка..." : showAnalytics ? "Скрыть аналитику" : "AI-аналитика"}
                                    onClick={toggleAnalytics}
                                    disabled={analyticsLoading}
                                    palette={STUDENT_PALETTE.BLUE}
                                />
                                <Button
                                    text={resumeGenerating ? "Загрузка..." : "Скачать резюме"}
                                    onClick={generateDocxResume}
                                    disabled={resumeGenerating}
                                    palette={STUDENT_PALETTE.GREEN}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── AI-аналитика ─────────────────────────────────── */}
                    {showAnalytics && analyticsData && (
                        <div className="analytics-section">
                            <div className="analytics-header">
                                <div>
                                    <h2>Аналитика надпрофессиональных компетенций</h2>
                                    <p className="analytics-description">
                                        Анализ результатов тестирования с рекомендациями по развитию
                                    </p>
                                </div>
                            </div>

                            {analyticsData.general_interpretation && (
                                <div className="general-interpretation">
                                    <p>{analyticsData.general_interpretation}</p>
                                </div>
                            )}

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
                                                <div className="score-badge">{comp.score}/800</div>
                                            </div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${comp.percentage}%`, backgroundColor: comp.ai.color }}
                                                />
                                            </div>
                                            <div className="level-indicator" style={{ color: comp.ai.color }}>
                                                <strong>{comp.ai.level.toUpperCase()}</strong> уровень
                                                <span className="percentile">({comp.ai.percentile}-й процентиль)</span>
                                            </div>
                                            <div className="interpretation">
                                                <p>{comp.ai.interpretation}</p>
                                            </div>
                                            {comp.ai.recommendations?.length > 0 && (
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

                    {/* ── Радарные диаграммы ───────────────────────────── */}
                    <div className="charts-grid">
                        {loading ? (
                            <div className="loading">Загрузка данных...</div>
                        ) : chartsData.length > 0 ? (
                            chartsData.map((chart, index) => (
                                <div key={index} className="chart-card">
                                    <div className="chart-header">
                                        <h3>{chart.title}</h3>
                                        {chart.year && <span className="chart-year">{chart.year}</span>}
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

                    {/* ── Сравнительная статистика ─────────────────────── */}
                    <StudentComparisonStats studentId={studentId} year={selectedYear} />

                    {/* ── VAM / LGM — табированный блок ───────────────── */}
                    <div className="analysis-tabs-section">
                        <div className="tabs-header">
                            <button
                                className={`tab-btn ${analysisTab === 'vam' ? 'active' : ''}`}
                                onClick={() => setAnalysisTab('vam')}
                            >
                                <span className="tab-icon">📈</span>
                                <span className="tab-label">Value-Added</span>
                                <span className="tab-sub">VAM</span>
                            </button>
                            <button
                                className={`tab-btn ${analysisTab === 'lgm' ? 'active' : ''}`}
                                onClick={() => setAnalysisTab('lgm')}
                            >
                                <span className="tab-icon">📉</span>
                                <span className="tab-label">Траектория роста</span>
                                <span className="tab-sub">LGM</span>
                            </button>
                        </div>

                        <div className="tab-body">
                            {analysisTab === 'vam' && (
                                <>
                                    <div className="tab-controls">
                                        <label>Компетенция:</label>
                                        <Select initValue={vamCompetency} onChange={setVamCompetency}>
                                            {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                                <Option key={key} value={key} label={name} />
                                            ))}
                                        </Select>
                                    </div>
                                    <StudentVamChart studentId={studentId} competency={vamCompetency} />
                                </>
                            )}

                            {analysisTab === 'lgm' && (
                                <>
                                    <div className="tab-controls">
                                        <label>Компетенция:</label>
                                        <Select initValue={lgmCompetency} onChange={setLgmCompetency}>
                                            {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                                <Option key={key} value={key} label={name} />
                                            ))}
                                        </Select>
                                    </div>
                                    <StudentLgmChart studentId={studentId} competency={lgmCompetency} />
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Влияние дисциплин ────────────────────────────── */}
                    <div className="student-discipline-impact-section">
                        <h3>📚 Влияние дисциплин на ваши компетенции</h3>
                        <StudentDisciplineImpact studentId={studentId} />
                    </div>

                </Content>
            </SidebarLayout>
        </div>
    );
}

export default StudentMainView;