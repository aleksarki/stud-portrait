import { useEffect, useState } from "react";
import {
    ResponsiveContainer, BarChart, CartesianGrid,
    XAxis, YAxis, Tooltip, Bar, LineChart, Legend, Line
} from "recharts";

import {
    getAnalyzeByDimension,
    getAnalyzeCohortLgm,
    getPortraitGetDisciplines,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    postPortraitCreateDataSession
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow, { JUSTIFY } from "../../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import TitledCard from "../../../components/cards/TitledCard";
import ValueCard from "../../../components/cards/ValueCard";

import Table, { TableHeader, TableItem, TableRow } from "../../../components/tables/Table";

import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import NoData from "../../../components/ui/NoData";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Select, { Option } from "../../../components/ui/Select";

import "./AdminAnalysisAdvancedView.scss";

function AdminAnalysisAdvancedView() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Фильтры (значения – ID, для направлений – ID, т.к. бэкенд ожидает числа)
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetencies, setSelectedCompetencies] = useState([]);

    // Управление вкладками и методом
    const [activeMainTab, setActiveMainTab] = useState('vam_lgm');

    // Опции фильтров (приходят с сервера)
    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
        testAttempts: [],
        competencies: [],
        students: [],
        disciplines: [] // добавить
    });

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
                    // Загружаем дисциплины
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

    // ======================================= //

    const [dimensionData, setDimensionData] = useState(null);
    const [lgmCohortData, setLgmCohortData] = useState(null);
    const [activeVisualization, setActiveVisualization] = useState('dimension');
    const [selectedDimension, setSelectedDimension] = useState('institution');

    const loadDimensionData = async () => {
        setLoading(true);
        const competency = selectedCompetencies[0] || 'res_comp_leadership';

        getAnalyzeByDimension(selectedDimension, competency)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDimensionData(data);
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

    const renderDimensionAnalysis = () => {
        if (!dimensionData) {
            return <NoData text="Нет данных для отображения" />;
        }

        const { groups, dimension, competency } = dimensionData;

        if (!groups || groups.length === 0) {
            return <NoData text="Нет данных по выбранному измерению" />;
        }

        const chartData = groups.map(g => ({
            name: g.dimension_value,
            mean: g.mean,
            median: g.median,
            min: g.min,
            max: g.max,
            n: g.n,
            std: g.std
        })).slice(0, 30);

        console.log('Chart data:', chartData); // отладка

        return (
            <div>
                <h4>Анализ по измерению: {dimension}</h4>
                <p>Компетенция: {COMPETENCIES_NAMES[competency] || competency}</p>

                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={230}
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const se = data.std / Math.sqrt(data.n);
                                    const ciLower = data.mean - 1.96 * se;
                                    const ciUpper = data.mean + 1.96 * se;
                                    return (
                                        <div className="custom-tooltip" style={{ background: 'white', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                            <p><strong>{data.name}</strong></p>
                                            <p>Среднее: {data.mean.toFixed(1)}</p>
                                            <p>Медиана: {data.median?.toFixed(1) || '–'}</p>
                                            <p>Стд.откл.: {data.std.toFixed(1)}</p>
                                            <p>n: {data.n}</p>
                                            <p>Мин: {data.min?.toFixed(1) || '–'}</p>
                                            <p>Макс: {data.max?.toFixed(1) || '–'}</p>
                                            <p>95% ДИ: [{ciLower.toFixed(1)}; {ciUpper.toFixed(1)}]</p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="mean" fill="#1976d2" name="Средний балл" />
                    </BarChart>
                </ResponsiveContainer>
                
                {/* Отладочная таблица */}
                <Table>
                    <TableHeader>
                        <TableItem>Группа</TableItem>
                        <TableItem>Среднее</TableItem>
                        <TableItem>Медиана</TableItem>
                        <TableItem>Мин</TableItem>
                        <TableItem>Макс</TableItem>
                        <TableItem>n</TableItem>
                        <TableItem>Стд.откл.</TableItem>
                    </TableHeader>
                    {chartData.slice(0, 10).map((g, idx) => (
                        <TableRow key={idx}>
                            <TableItem>{g.name}</TableItem>
                            <TableItem>{g.mean?.toFixed(1) ?? '–'}</TableItem>
                            <TableItem>{g.median?.toFixed(1) ?? '–'}</TableItem>
                            <TableItem>{g.min?.toFixed(1) ?? '–'}</TableItem>
                            <TableItem>{g.max?.toFixed(1) ?? '–'}</TableItem>
                            <TableItem>{g.n}</TableItem>
                            <TableItem>{g.std?.toFixed(1) ?? '–'}</TableItem>
                        </TableRow>
                    ))}
                </Table>

                {dimensionData.anova && (
                    <div className="anova-results">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h5 style={{ margin: 0 }}>ANOVA тест</h5>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: '#1976d2',
                                    color: 'white',
                                    fontSize: '12px',
                                    cursor: 'help',
                                    fontWeight: 'bold'
                                }}
                                title="ANOVA (дисперсионный анализ) проверяет, есть ли статистически значимые различия между средними значениями нескольких групп. 
                        F-статистика – отношение межгрупповой дисперсии к внутригрупповой. 
                        p-value – вероятность ошибиться, утверждая, что различия есть. 
                        Если p < 0.05, различия считаются значимыми."
                            >
                                ?
                            </span>
                        </div>
                        <p>
                            F-статистика: {dimensionData.anova.f_statistic.toFixed(3)} | 
                            p-value: {dimensionData.anova.p_value.toFixed(4)}
                        </p>
                        <p className={dimensionData.anova.significant_difference ? 'significant' : 'not-significant'}>
                            {dimensionData.anova.significant_difference 
                                ? '✓ Статистически значимые различия между группами' 
                                : '✗ Нет статистически значимых различий'}
                        </p>
                    </div>
                )}

                <details style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>📘 Как интерпретировать результаты?</summary>
                    <div style={{ marginTop: '10px', lineHeight: '1.6' }}>
                        <p><strong>Среднее</strong> – средний балл по группе. Позволяет сравнить группы между собой.</p>
                        <p><strong>Медиана</strong> – значение, которое делит группу пополам: половина студентов имеет балл ниже медианы, половина – выше. Медиана менее чувствительна к выбросам, чем среднее.</p>
                        <p><strong>Стандартное отклонение</strong> – показывает, насколько значения разбросаны. Чем больше отклонение, тем разнороднее группа.</p>
                        <p><strong>n</strong> – количество студентов в группе. Чем больше n, тем надёжнее статистика.</p>
                        <p><strong>Минимум и максимум</strong> – самый низкий и самый высокий результат в группе.</p>
                        <p><strong>95% доверительный интервал</strong> – диапазон, в котором с 95% вероятностью находится истинное среднее значение для всей генеральной совокупности (а не только для данной выборки). Если доверительные интервалы двух групп не пересекаются, можно говорить о статистически значимом различии.</p>
                    </div>
                </details>
            </div>
        );
    };

    const renderLGMCohort = () => {
        if (!lgmCohortData) {
            return <NoData text="Нет данных для отображения" />;
        }

        const { mean_intercept, mean_slope, n_students, interpretation, trajectories } = lgmCohortData;

        // Подготовка данных для графика
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
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="course" />
                                <YAxis />
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

    return (
        <div className="AdminAnalysisAdvancedView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Визуализации</h2>

                    <FlexRow>
                        <Button
                            text="Анализ по измерениям"
                            onClick={() => {
                                setActiveVisualization('dimension');
                                loadDimensionData();
                            }}
                            palette={activeVisualization === 'dimension' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                        />
                        <Button
                            text="LGM Когорта"
                            onClick={() => {
                                setActiveVisualization('lgm');
                                loadLGMCohortData();
                            }}
                            palette={activeVisualization === 'lgm' ? BUTTON_PALETTE.BROWN : BUTTON_PALETTE.GRAY}
                        />
                        {activeVisualization === 'dimension' && <>
                            <span>Измерение:</span>
                            <Select value={selectedDimension} onChange={setSelectedDimension}>
                                <Option value="institution" label="ВУЗы" />
                                <Option value="spec" label="Направления" />
                                <Option value="form" label="Формы обучения" />
                                <Option value="course" label="Курсы" />
                            </Select>
                            <Button
                                text="Загрузить"
                                onClick={loadDimensionData}
                                disabled={loading}
                                palette={BUTTON_PALETTE.CYAN}
                            />
                        </>}
                        {activeVisualization === 'lgm' && (
                            <Button
                                text="Загрузить LGM данные"
                                onClick={loadLGMCohortData}
                                disabled={loading}
                                palette={BUTTON_PALETTE.CYAN}
                            />
                        )}
                    </FlexRow>

                    <LoadingSpinner loading={loading} text="Загрузка визуализации..." />

                    {!loading && (
                        <div className="visualization-container">
                            {activeVisualization === 'dimension' && renderDimensionAnalysis()}
                            {activeVisualization === 'lgm' && renderLGMCohort()}
                        </div>
                    )}
                    
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisAdvancedView;
