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
import PlanetaryChart from "../../components/charts/PlanetaryChart";

import "./StudentMainView.scss";

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

    // Графики VAM и LGM для студента
    const [vamCompetency, setVamCompetency] = useState('res_comp_leadership');
    const [lgmCompetency, setLgmCompetency] = useState('res_comp_leadership');
    const [lgmData, setLgmData] = useState([]); // данные для графика LGM

    const [comparisonStats, setComparisonStats] = useState(null);
    const [loadingComparison, setLoadingComparison] = useState(false);

    useEffect(() => {
        if (showAnalytics && selectedYear) {
            loadAnalytics(selectedYear);
        }
        // eslint-disable-next-line
    }, [selectedYear, showAnalytics]);

    useEffect(() => {
        const fetchData = async () => {
            getPortraitStudentResults(studentId)
                .onSuccess(async response => {
                    const data = await response.json();
                    if (data.status === 'success') {
                        setStudResults({ student: data.student, results: data.results });
                        // После загрузки результатов, подготавливаем данные для LGM
                        prepareLgmData(data.results);
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

    const loadComparisonStats = async () => {
        if (!studentId || !selectedYear) return;
        setLoadingComparison(true);
        getStudentComparisonStats(studentId, selectedYear)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setComparisonStats(data.data);
                }
            })
            .onError(error => console.error("Ошибка загрузки сравнения:", error))
            .finally(() => setLoadingComparison(false));
    };

    // Добавьте useEffect для загрузки при изменении года
    useEffect(() => {
        if (selectedYear) {
            loadComparisonStats();
        }
    }, [selectedYear]);

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

    // АНАЛИТИКА КОМПЕТЕНЦИЙ
    const loadAnalytics = async year => {
        // Если данные уже загружены для этого года, просто показываем
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
        if (showAnalytics) {
            setShowAnalytics(false);
        } else {
            loadAnalytics(selectedYear);
        }
    };

    // ПОДГОТОВКА ДАННЫХ ДЛЯ LGM ГРАФИКА
    const prepareLgmData = (results) => {
        if (!results || results.length === 0) {
            setLgmData([]);
            return;
        }
        const byCourse = {};
        results.forEach(res => {
            const course = res.res_course_num;
            if (!course) return;
            if (!byCourse[course]) byCourse[course] = {};
            // Извлекаем баллы компетенций из полей res_comp_*
            Object.keys(COMPETENCIES_NAMES).forEach(comp => {
                const score = res[comp];
                if (score !== undefined && score !== null) {
                    byCourse[course][comp] = score;
                }
            });
        });
        const courses = Object.keys(byCourse).sort((a,b) => Number(a) - Number(b));
        if (courses.length < 2) {
            console.warn('Недостаточно данных для LGM (нужно минимум 2 курса)');
            setLgmData([]);
            return;
        }
        const chartData = courses.map(course => {
            const point = { course: `${course} курс` };
            Object.keys(COMPETENCIES_NAMES).forEach(comp => {
                point[comp] = byCourse[course][comp] || null;
            });
            return point;
        });
        setLgmData(chartData);
    };

    // ГЕНЕРАЦИЯ DOCX РЕЗЮМЕ
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
    const [resumeGenerating, setResumeGenerating] = useState(false);

    const prepareCompetencyData = () => {
        if (!studResults?.results?.length || !selectedYear) return [];

        const yearResults = studResults.results.find(r => r.res_year === selectedYear);
        if (!yearResults) return [];

        const competencyItems = [];

        // Сбор компетенций
        Object.keys(COMPETENCIES_NAMES).forEach(compKey => {
            const value = yearResults[compKey];
            if (value !== undefined && value !== null) {
                competencyItems.push({
                    name: COMPETENCIES_NAMES[compKey],
                    value: value
                });
            }
        });

        return competencyItems;
    };

    // Подготовка данных для мотиваторов
    const prepareMotivatorData = () => {
        if (!studResults?.results?.length || !selectedYear) return [];

        const yearResults = studResults.results.find(r => r.res_year === selectedYear);
        if (!yearResults) return [];

        const motivatorItems = [];

        Object.keys(MOTIVATORS_NAMES).forEach(motKey => {
            const value = yearResults[motKey];
            if (value !== undefined && value !== null) {
                motivatorItems.push({
                    name: MOTIVATORS_NAMES[motKey],
                    value: value
                });
            }
        });

        return motivatorItems;
    };

    const competencyData = prepareCompetencyData();
    const motivatorData = prepareMotivatorData();

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
                                <Select
                                    initValue={selectedYear}
                                    onChange={setSelectedYear}
                                >
                                    {availableYears.map(year => <Option value={year} label={year} />)}
                                </Select>
                            </div>
                        )}

                        <div className="action-buttons">
                            <Button
                                text={analyticsLoading ? "Загрузка..." : showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
                                onClick={toggleAnalytics}
                                disabled={analyticsLoading}
                                palette={STUDENT_PALETTE.BLUE}
                            />
                            <Button
                                text={resumeGenerating ? "Загрузка..." : "Скачать резюме DOCX"}
                                onClick={generateDocxResume}
                                disabled={resumeGenerating}
                                palette={STUDENT_PALETTE.GREEN}
                            />
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
                                                    style={{
                                                        width: `${comp.percentage}%`,
                                                        backgroundColor: comp.ai.color
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="level-indicator" style={{ color: comp.ai.color }}>
                                                <strong>{comp.ai.level.toUpperCase()}</strong> уровень
                                                <span className="percentile">({comp.ai.percentile}-й процентиль)</span>
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

                    {/* ГРАФИКИ РАДИАРНЫХ ДИАГРАММ */}
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
                        {/* Диаграмма компетенций */}
                        {competencyData.length > 0 && (
                            <div className="planetary-chart-card">
                                <PlanetaryChart
                                    title="Карта компетенций"
                                    items={competencyData}
                                    type="competency"
                                    height={500}
                                />
                            </div>
                        )}

                        {/* Диаграмма мотиваторов */}
                        {motivatorData.length > 0 && (
                            <div className="planetary-chart-card">
                                <PlanetaryChart
                                    title="Карта мотиваторов"
                                    items={motivatorData}
                                    type="motivator"
                                    height={500}
                                />
                            </div>
                        )}
                    </div>

                    {/* СРАВНИТЕЛЬНАЯ СТАТИСТИКА */}
                    <StudentComparisonStats
                        studentId={studentId} 
                        year={selectedYear} 
                    />

                    {/* VAM ГРАФИК ДЛЯ СТУДЕНТА */}
                    <div className="student-vam-section">
                        <h3>📈 Value-Added (индивидуальный анализ)</h3>
                        <div className="vam-controls">
                            <label>Компетенция:</label>
                            <Select
                                initValue={vamCompetency}
                                onChange={setVamCompetency}
                            >
                                {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                    <Option value={key} label={name} />
                                ))}
                            </Select>
                        </div>
                        <StudentVamChart studentId={studentId} competency={vamCompetency} />
                    </div>

                    {/* LGM ГРАФИК ДЛЯ СТУДЕНТА */}
                    <div className="student-lgm-section">
                        <h3>📈 Динамика развития компетенций (LGM)</h3>
                        <div className="lgm-controls">
                            <label>Компетенция:</label>
                            <Select
                                initValue={lgmCompetency}
                                onChange={setLgmCompetency}
                            >
                                {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                    <Option value={key} label={name} />
                                ))}
                            </Select>
                        </div>
                        {lgmData.length === 0 ? (
                            <div className="no-data">Нет данных для отображения</div>
                        ) : (
                            <StudentLgmChart
                                data={lgmData}
                                competency={lgmCompetency}
                                competencyLabel={COMPETENCIES_NAMES[lgmCompetency]}
                            />
                        )}
                    </div>

                    {/* ИНДИВИДУАЛЬНЫЙ АНАЛИЗ ВЛИЯНИЯ ДИСЦИПЛИН */}
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