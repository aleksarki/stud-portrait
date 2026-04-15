// AdminAnalysisAdvancedView.jsx (добавлена вкладка VAM)
import { useEffect, useState } from "react";
import {
    ResponsiveContainer, LineChart, Legend, Line, Tooltip
} from "recharts";

import {
    getAnalyzeCohortLgm,
    getPortraitGetDisciplines,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    postPortraitCreateDataSession,
    postGetCompetencyLevelFlow,
    postGetVamTrendData          // <-- новый импорт
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow, { JUSTIFY, WRAP } from "../../../components/FlexRow";
import LabelledBox from "../../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import TitledCard from "../../../components/cards/TitledCard";
import ValueCard from "../../../components/cards/ValueCard";

import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import NoData from "../../../components/ui/NoData";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Select, { Option } from "../../../components/ui/Select";

import SankeyDiagram from '../../../components/charts/SankeyDiagram';
import VamCourseScatter from '../../../components/charts/VamCourseScatter'; // <-- новый импорт

import "./AdminAnalysisAdvancedView.scss";

function AdminAnalysisAdvancedView() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetencies, setSelectedCompetencies] = useState([]);

    const [activeMainTab, setActiveMainTab] = useState('vam_lgm'); // не используется, оставлено для совместимости
    const [activeVisualization, setActiveVisualization] = useState('lgm'); // 'lgm', 'flow', 'vam'

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
        testAttempts: [],
        competencies: [],
        students: [],
        disciplines: []
    });

    // Состояния для потока уровней
    const [flowData, setFlowData] = useState(null);
    const [flowCompetency, setFlowCompetency] = useState('res_comp_leadership');

    // Состояния для LGM
    const [lgmCohortData, setLgmCohortData] = useState(null);

    // Состояния для VAM
    const [vamData, setVamData] = useState(null);
    const [vamStats, setVamStats] = useState(null);

    // -------------------- ИНИЦИАЛИЗАЦИЯ СЕССИИ --------------------
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            postPortraitCreateDataSession()
                .onSuccess(async response => {
                    const data = await response.json();
                    if (data.status === 'success') {
                        setSessionId(data.session_id);
                        await loadFilterOptions(data.session_id);
                    }
                })
                .onError(error => console.error(error))
                .finally(() => setLoading(false));
        };
        init();
    }, []);

    // -------------------- ЗАГРУЗКА ОПЦИЙ ФИЛЬТРОВ --------------------
    const loadFilterOptions = async (sid, updateCounts = false) => {
        if (!sid) return;
        (
            updateCounts
            ? getPortraitGetFilterOptionsWithCounts(sid, selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, selectedCompetencies)
            : getPortraitGetFilterOptionsWithCounts(sid)
        )
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    let disciplines = [];
                    try {
                        const discRes = getPortraitGetDisciplines();
                        const discData = await new Promise((resolve) => {
                            discRes.onSuccess(async d => {
                                const json = await d.json();
                                resolve(json);
                            }).onError(() => resolve({ disciplines: [] }));
                        });
                        if (discData.status === 'success') {
                            disciplines = discData.disciplines || [];
                        }
                    } catch (e) {
                        console.error('Error loading disciplines:', e);
                    }

                    setFilterOptions({
                        institutions: data.data?.institutions || [],
                        directions: data.data?.directions || [],
                        allDirections: data.data?.directions || [],
                        courses: data.data?.courses || [],
                        testAttempts: data.data?.test_attempts || [],
                        competencies: data.data?.competencies || Object.keys(COMPETENCIES_NAMES).map(c => ({ id: c, name: COMPETENCIES_NAMES[c], count: 0 })),
                        students: data.data?.students || [],
                        disciplines: disciplines
                    });
                }
            })
            .onError(console.error);
    };

    // Обновление направлений при изменении вузов
    useEffect(() => {
        if (!sessionId) return;
        if (selectedInstitutions.length === 0) {
            setFilterOptions(prev => ({ ...prev, directions: prev.allDirections }));
            return;
        }
        getPortraitGetInstitutionDirections(selectedInstitutions)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    const directions = data.directions.map(name => ({ id: name, name, count: 0 }));
                    setFilterOptions(prev => ({ ...prev, directions }));
                    setSelectedDirections(prev => prev.filter(d => data.directions.includes(d)));
                }
            })
            .onError(console.error);
    }, [selectedInstitutions, sessionId]);

    // Перезагрузка фильтров при изменении выбранных значений
    useEffect(() => {
        if (sessionId) loadFilterOptions(sessionId, true);
    }, [selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, selectedCompetencies]);

    // -------------------- LGM --------------------
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

    // -------------------- Поток уровней --------------------
    const loadLevelFlow = () => {
        setLoading(true);
        setActiveVisualization('flow');
        postGetCompetencyLevelFlow(flowCompetency, selectedInstitutions, selectedDirections)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setFlowData({ nodes: data.nodes, links: data.links });
                } else {
                    alert('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .onError(err => {
                console.error(err);
                alert('Ошибка при загрузке данных потока');
            })
            .finally(() => setLoading(false));
    };

    // -------------------- VAM (динамика по курсам) --------------------
    const loadVAMData = async () => {
        const competency = selectedCompetencies[0] || 'res_comp_leadership';
        if (!competency) {
            alert('Выберите компетенцию в фильтрах');
            return;
        }
        setLoading(true);
        setActiveVisualization('vam');
        postGetVamTrendData({
            group_by: 'institution',      // можно сделать выбор, но для простоты группируем по вузам
            competency: competency,
            selected_groups: selectedInstitutions,
            filter_institutions: selectedInstitutions,
            filter_directions: selectedDirections,
            filter_courses: selectedCourses,
            filter_test_attempts: selectedTestAttempts
        })
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    // Преобразуем в плоский массив точек
                    const points = [];
                    data.data.forEach(group => {
                        group.courses.forEach(course => {
                            points.push({
                                group: group.group_name,
                                course: course.course,
                                value_added: course.value_added,
                                ci_lower: course.ci_lower,
                                ci_upper: course.ci_upper,
                                n: course.n
                            });
                        });
                    });
                    setVamData(points);

                    // Вычисляем статистику для карточек
                    const groups = new Set(points.map(p => p.group));
                    const coursesMap = new Map();
                    points.forEach(p => {
                        if (!coursesMap.has(p.course)) coursesMap.set(p.course, []);
                        coursesMap.get(p.course).push(p.value_added);
                    });
                    const avgByCourse = Array.from(coursesMap.entries()).map(([course, values]) => ({
                        course,
                        avg: values.reduce((a,b)=>a+b,0)/values.length,
                        count: values.length
                    }));
                    const firstCourse = avgByCourse.find(c => c.course === 1)?.avg || 0;
                    const lastCourse = avgByCourse.find(c => c.course === 4)?.avg || 0;
                    const totalStudents = points.reduce((sum, p) => sum + (p.n || 0), 0);
                    setVamStats({
                        groupCount: groups.size,
                        avgFirstCourse: firstCourse,
                        avgLastCourse: lastCourse,
                        gain: lastCourse - firstCourse,
                        totalStudents: totalStudents,
                        pointsCount: points.length
                    });
                } else {
                    setVamData(null);
                    setVamStats(null);
                    alert('Нет данных для выбранных фильтров');
                }
            })
            .onError(err => {
                console.error(err);
                alert('Ошибка при загрузке VAM данных');
                setVamData(null);
                setVamStats(null);
            })
            .finally(() => setLoading(false));
    };

    // -------------------- Рендер LGM --------------------
    const renderLGMCohort = () => {
        if (!lgmCohortData) {
            return <NoData text="Нет данных для отображения" />;
        }

        const { mean_intercept, mean_slope, n_students, interpretation } = lgmCohortData;

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

                <FlexRow justify={JUSTIFY.CENTER}>
                    <ValueCard value={n_students} text="Студентов" />
                    <ValueCard value={mean_intercept?.toFixed(1) || '0'} text="Средний начальный уровень" />
                    <ValueCard value={mean_slope?.toFixed(3) || '0'} text="Средняя скорость роста" />
                </FlexRow>

                <div className="two-columns">
                    <div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
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
                    <div>
                        {interpretation && (
                            <TitledCard title="Интерпретация">
                                <p>Средняя скорость роста: <strong>{interpretation.average_growth_rate?.toFixed(3) || '0'}</strong></p>
                                <p>Вариабельность роста: <strong>{interpretation.growth_variability?.toFixed(3) || '0'}</strong></p>
                                <p>Быстрорастущие: {interpretation.fast_growers_count || 0} ({interpretation.fast_growers_pct?.toFixed(1) || 0}%)</p>
                                <p>Медленнорастущие: {interpretation.slow_growers_count || 0} ({interpretation.slow_growers_pct?.toFixed(1) || 0}%)</p>
                            </TitledCard>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // -------------------- Рендер потока уровней --------------------
    const renderFlowAnalysis = () => {
        if (!flowData) {
            return <NoData text="Нет данных. Нажмите 'Поток уровней' для загрузки." />;
        }
        return (
            <div className="flow-container">
                <SankeyDiagram 
                    data={flowData} 
                    title={`Переходы между уровнями компетенции «${COMPETENCIES_NAMES[flowCompetency] || flowCompetency}» по курсам`}
                    valueLabel="Количество студентов"
                />
                <details style={{ marginTop: 16, background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', border: '1px solid #e9ecef' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#2c3e50' }}>📖 Что показывает эта диаграмма?</summary>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                        <p><strong>Диаграмма Санки</strong> показывает, как студенты переходят между уровнями компетенции при переходе с курса на курс.</p>
                        <p>🎓 <strong>Узлы</strong> представляют собой комбинацию курса и уровня компетенции (Начальный/Средний/Высокий).</p>
                        <p>📊 <strong>Толщина потока</strong> пропорциональна количеству студентов, переходящих из одного уровня в другой.</p>
                        <p>💡 <strong>Совет:</strong> Наведите курсор на поток, чтобы увидеть точное количество студентов.</p>
                    </div>
                </details>
            </div>
        );
    };

    // -------------------- Рендер VAM --------------------
    const renderVAM = () => {
        if (!vamData || vamData.length === 0) {
            return <NoData text="Нет данных для отображения. Нажмите 'Загрузить VAM' после выбора фильтров." />;
        }

        const competencyName = COMPETENCIES_NAMES[selectedCompetencies[0]] || selectedCompetencies[0] || 'компетенции';

        return (
            <div className="vam-container">
                <h4>VAM – Динамика развития компетенции по курсам</h4>

                <FlexRow justify={JUSTIFY.CENTER}>
                    <ValueCard value={vamStats?.groupCount || 0} text="Групп (вузов/направлений)" />
                    <ValueCard value={vamStats?.avgFirstCourse?.toFixed(1) || '0'} text="Средний балл на 1 курсе" />
                    <ValueCard value={vamStats?.avgLastCourse?.toFixed(1) || '0'} text="Средний балл на 4 курсе" />
                    <ValueCard value={vamStats?.gain?.toFixed(1) || '0'} text="Прирост (4 курс - 1 курс)" />
                    <ValueCard value={vamStats?.totalStudents || 0} text="Всего студентов" />
                </FlexRow>

                <div className="vam-chart">
                    <VamCourseScatter data={vamData} groupBy="institution" />
                </div>

                <details style={{ marginTop: 16, background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', border: '1px solid #e9ecef' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#2c3e50' }}>📖 Что показывает этот график?</summary>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                        <p><strong>Точечный график с доверительными интервалами</strong> показывает средний балл по выбранной компетенции на каждом курсе для каждой группы (вуза или направления).</p>
                        <p>🎨 <strong>Разные цвета</strong> — разные группы.</p>
                        <p>📏 <strong>Вертикальные линии</strong> — 95% доверительные интервалы (чем уже интервал, тем надёжнее оценка).</p>
                        <p>💡 <strong>Совет:</strong> Наведите курсор на точку, чтобы увидеть точные значения и количество студентов.</p>
                    </div>
                </details>
            </div>
        );
    };

    // -------------------- MAIN RENDER --------------------
    return (
        <div className="AdminAnalysisAdvancedView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Визуализации</h2>
                    <FlexRow wrap={WRAP.DO}>
                        <Button
                            text="Поток уровней"
                            onClick={loadLevelFlow}
                            disabled={loading}
                            palette={activeVisualization === 'flow' ? BUTTON_PALETTE.CYAN : BUTTON_PALETTE.GRAY}
                        />
                        <Button
                            text="LGM Когорта"
                            onClick={() => {
                                setActiveVisualization('lgm');
                                loadLGMCohortData();
                            }}
                            palette={activeVisualization === 'lgm' ? BUTTON_PALETTE.BROWN : BUTTON_PALETTE.GRAY}
                        />
                        {activeVisualization === 'flow' && (
                            <>
                                <LabelledBox label="Компетенция:" inrow nopad>
                                    <Select
                                        initValue={flowCompetency}
                                        onChange={setFlowCompetency}
                                    >
                                        {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                            <Option value={key} label={name} />
                                        ))}
                                    </Select>
                                </LabelledBox>
                                <Button text="Загрузить" onClick={loadLevelFlow} disabled={loading} palette={BUTTON_PALETTE.CYAN} />
                            </>
                        )}
                        {activeVisualization === 'lgm' && (
                            <Button
                                text="Загрузить LGM данные"
                                onClick={loadLGMCohortData}
                                disabled={loading}
                                palette={BUTTON_PALETTE.CYAN}
                            />
                        )}

                        {/* Новая кнопка VAM */}
                        <Button
                            text="VAM динамика"
                            onClick={() => {
                                setActiveVisualization('vam');
                                loadVAMData();
                            }}
                            palette={activeVisualization === 'vam' ? BUTTON_PALETTE.CYAN : BUTTON_PALETTE.GRAY}
                        />
                        {activeVisualization === 'vam' && (
                            <Button
                                text="Загрузить VAM"
                                onClick={loadVAMData}
                                disabled={loading}
                                palette={BUTTON_PALETTE.CYAN}
                            />
                        )}
                    </FlexRow>

                    <LoadingSpinner loading={loading} text="Загрузка визуализации..." />

                    {!loading && (
                        <div className="visualization-container">
                            {activeVisualization === 'lgm' && renderLGMCohort()}
                            {activeVisualization === 'flow' && renderFlowAnalysis()}
                            {activeVisualization === 'vam' && renderVAM()}
                        </div>
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisAdvancedView;