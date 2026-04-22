import { useEffect, useState } from "react";
import {
    ResponsiveContainer, LineChart, Legend, Line, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";

import {
    postAnalyzeCohortLgm,
    getPortraitGetDisciplines,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    postPortraitCreateDataSession,
    postGetCompetencyLevelFlow,
    postGetVamTrendData
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow, { JUSTIFY, WRAP } from "../../../components/FlexRow";
import LabelledBox from "../../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import MultiSelect from '../../../components/ui/MultiSelect';

import TitledCard from "../../../components/cards/TitledCard";
import ValueCard from "../../../components/cards/ValueCard";

import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import NoData from "../../../components/ui/NoData";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Select, { Option } from "../../../components/ui/Select";

import SankeyDiagram from '../../../components/charts/SankeyDiagram';
import VamCourseScatter from '../../../components/charts/VamCourseScatter';

import AiInsightPanel from "../../../components/AiInsightPanel";
import "./AdminAnalysisAdvancedView.scss";

function AdminAnalysisAdvancedView() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Общие фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetencies, setSelectedCompetencies] = useState([]);

    const [activeVisualization, setActiveVisualization] = useState('lgm');

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

    // Поток уровней
    const [flowData, setFlowData] = useState(null);
    const [flowCompetency, setFlowCompetency] = useState('res_comp_leadership');

    // LGM
    const [lgmCohortData, setLgmCohortData] = useState(null);
    const [lgmCompetency, setLgmCompetency] = useState('res_comp_leadership');
    const [lgmChartMode, setLgmChartMode] = useState('combined');
    const [lgmGroupBy, setLgmGroupBy] = useState('institution');

    // VAM
    const [vamData, setVamData] = useState(null);
    const [vamStats, setVamStats] = useState(null);
    const [vamCompetency, setVamCompetency] = useState('res_comp_leadership');
    const [vamGroupBy, setVamGroupBy] = useState('institution');
    const [vamChartMode, setVamChartMode] = useState('combined');

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

                    // Приводим ID к числам, чтобы избежать дублирования
                    const institutions = (data.data?.institutions || []).map(i => ({
                        id: Number(i.id),
                        name: i.name,
                        count: i.count
                    })).filter(i => !isNaN(i.id));

                    const allDirections = (data.data?.directions || []).map(d => ({
                        id: Number(d.id),
                        name: d.name,
                        count: d.count
                    })).filter(d => !isNaN(d.id));

                    setFilterOptions({
                        institutions: institutions,
                        directions: allDirections,
                        allDirections: allDirections,
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

    // Обновление направлений при выборе вузов (как в рабочем VamLgmView)
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
                    // Предполагаем, что API возвращает массив объектов с полями id и name
                    const directions = data.directions.map(d => ({ id: d.id, name: d.name, count: 0 }));
                    setFilterOptions(prev => ({ ...prev, directions }));
                    // Оставляем только те выбранные направления, которые есть в новом списке
                    const newDirectionIds = directions.map(d => d.id);
                    setSelectedDirections(prev => prev.filter(id => newDirectionIds.includes(id)));
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
        if (!lgmCompetency) {
            alert('Выберите компетенцию');
            return;
        }
        // Приводим ID к числам
        const instIds = selectedInstitutions.map(id => Number(id)).filter(v => !isNaN(v));
        const dirIds = selectedDirections.map(id => Number(id)).filter(v => !isNaN(v));

        setLoading(true);
        setActiveVisualization('lgm');
        postAnalyzeCohortLgm(lgmCompetency, instIds, dirIds, lgmGroupBy)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setLgmCohortData(data);
                } else {
                    alert('Ошибка: ' + (data.message || 'Неизвестная ошибка'));
                    setLgmCohortData(null);
                }
            })
            .onError(err => {
                console.error(err);
                alert('Ошибка при загрузке LGM');
                setLgmCohortData(null);
            })
            .finally(() => setLoading(false));
    };

    // -------------------- Поток уровней --------------------
    const loadLevelFlow = () => {
        setLoading(true);
        setActiveVisualization('flow');
        // Для потока уровней направление может быть передано как ID или имя – используем ID
        const directionIds = selectedDirections.map(id => Number(id)).filter(v => !isNaN(v));

        postGetCompetencyLevelFlow(flowCompetency, selectedInstitutions, directionIds)
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

    // -------------------- VAM --------------------
    const loadVAMData = async () => {
        if (!vamCompetency) {
            alert('Выберите компетенцию');
            return;
        }
        const cleanInstitutions = selectedInstitutions.map(id => Number(id)).filter(v => !isNaN(v));
        const cleanDirections = selectedDirections.map(id => Number(id)).filter(v => !isNaN(v));

        setLoading(true);
        setActiveVisualization('vam');
        postGetVamTrendData({
            group_by: vamGroupBy,
            competency: vamCompetency,
            selected_groups: vamGroupBy === 'institution' ? cleanInstitutions : cleanDirections,
            filter_institutions: cleanInstitutions,
            filter_directions: cleanDirections,
            filter_courses: selectedCourses,
            filter_test_attempts: selectedTestAttempts
        })
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
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

                    // Статистика
                    const groups = new Set(points.map(p => p.group));
                    const coursesMap = new Map();
                    points.forEach(p => {
                        if (!coursesMap.has(p.course)) coursesMap.set(p.course, []);
                        coursesMap.get(p.course).push(p.value_added);
                    });
                    const avgByCourse = Array.from(coursesMap.entries()).map(([course, values]) => ({
                        course,
                        avg: values.reduce((a, b) => a + b, 0) / values.length,
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
        if (!lgmCohortData || !lgmCohortData.data || lgmCohortData.data.length === 0) {
            return <NoData text="Нет данных для отображения" />;
        }
        const { competency, group_by, data: groups } = lgmCohortData;

        const combinedData = [];
        for (let course = 1; course <= 4; course++) {
            const point = { course: `${course} курс` };
            groups.forEach(group => {
                point[group.group_name] = group.mean_intercept + group.mean_slope * (course - 1);
            });
            combinedData.push(point);
        }

        const colors = ['#1976d2', '#e67e22', '#2ecc71', '#e74c3c', '#9b59b6', '#f1c40f', '#1abc9c', '#e84393'];

        return (
            <div className="lgm-cohort-container">
                <h4>Latent Growth Model – Когортный анализ</h4>
                <p>Компетенция: {COMPETENCIES_NAMES[competency] || competency}</p>
                <p>Группировка: {group_by === 'institution' ? 'по ВУЗам' : 'по направлениям'}</p>

                <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <LabelledBox label="Режим отображения:" inrow nopad>
                        <Select initValue={lgmChartMode} onChange={setLgmChartMode}>
                            <Option value="combined" label="Сводный график (все группы)" />
                            <Option value="grid" label="Отдельные графики по группам" />
                        </Select>
                    </LabelledBox>
                </div>

                {lgmChartMode === 'combined' ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={combinedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="course" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {groups.map((group, idx) => (
                                <Line
                                    key={group.group_id}
                                    type="monotone"
                                    dataKey={group.group_name}
                                    stroke={colors[idx % colors.length]}
                                    strokeWidth={2}
                                    name={group.group_name}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="lgm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
                        {groups.map(group => {
                            const chartData = [];
                            for (let course = 1; course <= 4; course++) {
                                chartData.push({
                                    course: `${course} курс`,
                                    value: group.mean_intercept + group.mean_slope * (course - 1)
                                });
                            }
                            return (
                                <div key={group.group_id} className="lgm-group-card" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                                    <h5 style={{ marginBottom: 12 }}>{group.group_name}</h5>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={chartData}>
                                            <XAxis dataKey="course" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="value" stroke="#1976d2" strokeWidth={2} name="Средняя траектория" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                    <div style={{ fontSize: 12, marginTop: 8 }}>
                                        <div>Студентов: {group.n_students}</div>
                                        <div>Начальный уровень: {group.mean_intercept.toFixed(1)}</div>
                                        <div>Скорость роста: {group.mean_slope.toFixed(3)}</div>
                                    </div>
                                    {group.interpretation && (
                                        <details style={{ marginTop: 8 }}>
                                            <summary style={{ fontSize: 12, cursor: 'pointer' }}>Интерпретация</summary>
                                            <div style={{ fontSize: 12, marginTop: 4 }}>
                                                <p>Средняя скорость роста: <strong>{group.interpretation.average_growth_rate?.toFixed(3)}</strong></p>
                                                <p>Быстрорастущие: {group.interpretation.fast_growers_count} ({group.interpretation.fast_growers_pct?.toFixed(1)}%)</p>
                                                <p>Медленнорастущие: {group.interpretation.slow_growers_count} ({group.interpretation.slow_growers_pct?.toFixed(1)}%)</p>
                                            </div>
                                        </details>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // -------------------- Рендер потока уровней --------------------
    const renderFlowAnalysis = () => {
        if (!flowData) return <NoData text="Нет данных. Нажмите 'Поток уровней' для загрузки." />;
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

        const groupsMap = new Map();
        vamData.forEach(point => {
            if (!groupsMap.has(point.group)) groupsMap.set(point.group, []);
            groupsMap.get(point.group).push(point);
        });
        const groups = Array.from(groupsMap.entries()).map(([name, dataPoints]) => ({ name, data: dataPoints }));

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

                <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <LabelledBox label="Режим отображения:" inrow nopad>
                        <Select initValue={vamChartMode} onChange={setVamChartMode}>
                            <Option value="combined" label="Сводный график (все группы)" />
                            <Option value="grid" label="Отдельные графики по группам" />
                        </Select>
                    </LabelledBox>
                </div>

                {vamChartMode === 'combined' ? (
                    <div className="vam-chart">
                        <VamCourseScatter data={vamData} groupBy={vamGroupBy} />
                    </div>
                ) : (
                    <div className="vam-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
                        {groups.map(group => (
                            <div key={group.name} className="vam-group-card" style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                                <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>{group.name}</h5>
                                <VamCourseScatter data={group.data} groupBy={vamGroupBy} />
                                <div style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                                    Количество точек: {group.data.length}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <details style={{ marginTop: 16, background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', border: '1px solid #e9ecef' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#2c3e50' }}>📖 Что показывает этот график?</summary>
                    <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                        <p><strong>Точечный график с доверительными интервалами</strong> показывает средний балл по выбранной компетенции на каждом курсе для каждой группы (вуза или направления).</p>
                        <p>🎨 <strong>Разные цвета</strong> — разные группы.</p>
                        <p>📏 <strong>Вертикальные линии</strong> — 95% доверительные интервалы (чем уже интервал, тем надёжнее оценка).</p>
                        <p>💡 <strong>Совет:</strong> Наведите курсор на точку, чтобы увидеть точные значения и количество студентов.</p>
                        {vamChartMode === 'grid' && <p>📋 В режиме сетки каждый график соответствует отдельной группе (вузу/направлению).</p>}
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

                    {/* Общие фильтры */}
                    <div className="filters-section" style={{ marginBottom: 20 }}>
                        <FlexRow wrap={WRAP.DO} gap="15" alignItems="end">
                            <MultiSelect
                                options={filterOptions.institutions || []}
                                value={selectedInstitutions}
                                onChange={setSelectedInstitutions}
                                placeholder="Все вузы"
                                label="Вузы"
                                withSearch
                                showCounts
                            />
                            <MultiSelect
                                options={filterOptions.directions || []}
                                value={selectedDirections}
                                onChange={setSelectedDirections}
                                placeholder="Все направления"
                                label="Направления"
                                withSearch
                                showCounts
                            />
                            <Button
                                text="Применить фильтры"
                                onClick={() => {
                                    if (activeVisualization === 'lgm') loadLGMCohortData();
                                    else if (activeVisualization === 'flow') loadLevelFlow();
                                    else if (activeVisualization === 'vam') loadVAMData();
                                }}
                                palette={BUTTON_PALETTE.CYAN}
                                disabled={loading}
                            />
                            <Button
                                text="Сбросить фильтры"
                                onClick={() => {
                                    setSelectedInstitutions([]);
                                    setSelectedDirections([]);
                                    setSelectedCourses([]);
                                    setSelectedTestAttempts([]);
                                    setSelectedCompetencies([]);
                                }}
                                palette={BUTTON_PALETTE.GRAY}
                                disabled={loading}
                            />
                        </FlexRow>
                    </div>

                    <FlexRow wrap={WRAP.DO} gap="10">
                        <Button
                            text="Поток уровней"
                            onClick={() => { setActiveVisualization('flow'); loadLevelFlow(); }}
                            disabled={loading}
                            palette={activeVisualization === 'flow' ? BUTTON_PALETTE.CYAN : BUTTON_PALETTE.GRAY}
                        />
                        <Button
                            text="LGM Когорта"
                            onClick={() => setActiveVisualization('lgm')}
                            disabled={loading}
                            palette={activeVisualization === 'lgm' ? BUTTON_PALETTE.BROWN : BUTTON_PALETTE.GRAY}
                        />
                        <Button
                            text="VAM динамика"
                            onClick={() => { setActiveVisualization('vam'); loadVAMData(); }}
                            disabled={loading}
                            palette={activeVisualization === 'vam' ? BUTTON_PALETTE.CYAN : BUTTON_PALETTE.GRAY}
                        />

                        {activeVisualization === 'flow' && (
                            <>
                                <LabelledBox label="Компетенция:" inrow nopad>
                                    <Select initValue={flowCompetency} onChange={setFlowCompetency}>
                                        {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                            <Option key={key} value={key} label={name} />
                                        ))}
                                    </Select>
                                </LabelledBox>
                                <Button text="Загрузить" onClick={loadLevelFlow} disabled={loading} palette={BUTTON_PALETTE.CYAN} />
                            </>
                        )}

                        {activeVisualization === 'lgm' && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <LabelledBox label="Компетенция:" inrow nopad>
                                    <Select initValue={lgmCompetency} onChange={setLgmCompetency}>
                                        {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                            <Option key={key} value={key} label={name} />
                                        ))}
                                    </Select>
                                </LabelledBox>
                                <LabelledBox label="Группировка:" inrow nopad>
                                    <Select initValue={lgmGroupBy} onChange={setLgmGroupBy}>
                                        <Option value="institution" label="По ВУЗам" />
                                        <Option value="direction" label="По направлениям" />
                                    </Select>
                                </LabelledBox>
                                <Button text="Загрузить LGM" onClick={loadLGMCohortData} disabled={loading} palette={BUTTON_PALETTE.CYAN} />
                            </div>
                        )}

                        {activeVisualization === 'vam' && (
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <LabelledBox label="Компетенция:" inrow nopad>
                                    <Select initValue={vamCompetency} onChange={setVamCompetency}>
                                        {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                            <Option key={key} value={key} label={name} />
                                        ))}
                                    </Select>
                                </LabelledBox>
                                <LabelledBox label="Группировка:" inrow nopad>
                                    <Select initValue={vamGroupBy} onChange={setVamGroupBy}>
                                        <Option value="institution" label="По ВУЗам" />
                                        <Option value="direction" label="По направлениям" />
                                    </Select>
                                </LabelledBox>
                                <Button text="Загрузить VAM" onClick={loadVAMData} disabled={loading} palette={BUTTON_PALETTE.CYAN} />
                            </div>
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

                    <AiInsightPanel
                        contextType={activeVisualization === 'vam' ? 'vam_trend' : 'general'}
                        filters={{
                            institutions: selectedInstitutions,
                            directions:   selectedDirections,
                            courses:      selectedCourses,
                            competency:   activeVisualization === 'vam'  ? vamCompetency
                                        : activeVisualization === 'lgm'  ? lgmCompetency
                                        : flowCompetency,
                        }}
                        label={
                            activeVisualization === 'vam'  ? 'Динамика по курсам' :
                            activeVisualization === 'lgm'  ? 'LGM Когорта' :
                            'Поток уровней'
                        }
                        disabled={loading}
                    />
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisAdvancedView;