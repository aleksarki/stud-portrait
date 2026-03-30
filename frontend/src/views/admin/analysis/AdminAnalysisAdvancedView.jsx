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
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import Button from "../../../components/ui/Button";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import NoData from "../../../components/ui/NoData";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

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
            <div className="dimension-container">
                <h4>Анализ по измерению: {dimension}</h4>
                <p className="info-text">Компетенция: {COMPETENCIES_NAMES[competency] || competency}</p>
                
                {/* Отладочная таблица */}
                <table style={{ margin: '10px 0', borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>
                            <th>Группа</th>
                            <th>Среднее</th>
                            <th>Медиана</th>
                            <th>Мин</th>
                            <th>Макс</th>
                            <th>n</th>
                            <th>Стд.откл.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chartData.slice(0, 10).map((g, idx) => (
                            <tr key={idx}>
                                <td>{g.name}</td>
                                <td>{g.mean?.toFixed(1) ?? '–'}</td>
                                <td>{g.median?.toFixed(1) ?? '–'}</td>
                                <td>{g.min?.toFixed(1) ?? '–'}</td>
                                <td>{g.max?.toFixed(1) ?? '–'}</td>
                                <td>{g.n}</td>
                                <td>{g.std?.toFixed(1) ?? '–'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, bottom: 20, left: 250 }}
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
                
                <div className="lgm-stats">
                    <div className="stat-card">
                        <div className="stat-value">{n_students}</div>
                        <div className="stat-label">Студентов</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{mean_intercept?.toFixed(1) || '0'}</div>
                        <div className="stat-label">Средний начальный уровень</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{mean_slope?.toFixed(3) || '0'}</div>
                        <div className="stat-label">Средняя скорость роста</div>
                    </div>
                </div>

                {interpretation && (
                    <div className="interpretation-box">
                        <h5>Интерпретация</h5>
                        <p>Средняя скорость роста: <strong>{interpretation.average_growth_rate?.toFixed(3) || '0'}</strong></p>
                        <p>Вариабельность роста: <strong>{interpretation.growth_variability?.toFixed(3) || '0'}</strong></p>
                        <p>Быстрорастущие: {interpretation.fast_growers_count || 0} ({interpretation.fast_growers_pct?.toFixed(1) || 0}%)</p>
                        <p>Медленнорастущие: {interpretation.slow_growers_count || 0} ({interpretation.slow_growers_pct?.toFixed(1) || 0}%)</p>
                    </div>
                )}

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
        );
    };

    return (
        <div className="AdminAnalysisAdvancedView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Продвинутые визуализации</h2>

                    <div className="viz-controls">
                        <div className="button-group">
                            <Button
                                text="📊 Анализ по измерениям"
                                onClick={() => {
                                    setActiveVisualization('dimension');
                                    loadDimensionData();
                                }}
                                fg={activeVisualization === 'dimension' ? 'white' : '#666'}
                                bg={activeVisualization === 'dimension' ? '#1976d2' : 'white'}
                                border="1px solid #1976d2"
                            />
                            <Button
                                text="📈 LGM Когорта"
                                onClick={() => {
                                    setActiveVisualization('lgm');
                                    loadLGMCohortData();
                                }}
                                fg={activeVisualization === 'lgm' ? 'white' : '#666'}
                                bg={activeVisualization === 'lgm' ? '#ff9800' : 'white'}
                                border="1px solid #ff9800"
                            />
                        </div>

                        {activeVisualization === 'dimension' && (
                            <div className="sub-controls">
                                <label>Измерение:</label>
                                <select value={selectedDimension} onChange={(e) => setSelectedDimension(e.target.value)}>
                                    <option value="institution">ВУЗы</option>
                                    <option value="spec">Направления</option>
                                    <option value="form">Формы обучения</option>
                                    <option value="course">Курсы</option>
                                </select>
                                <Button
                                    text="Загрузить"
                                    onClick={loadDimensionData}
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {activeVisualization === 'lgm' && (
                            <div className="sub-controls">
                                <Button
                                    text="Загрузить LGM данные"
                                    onClick={loadLGMCohortData}
                                    disabled={loading}
                                />
                            </div>
                        )}
                    </div>

                    <LoadingSpinner loading={loading} text="Загрузка визуализации..." />

                    <div className="visualization-container">
                        {activeVisualization === 'dimension' && renderDimensionAnalysis()}
                        {activeVisualization === 'lgm' && renderLGMCohort()}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisAdvancedView;
