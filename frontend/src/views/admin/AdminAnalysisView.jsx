import { useEffect, useState } from "react";
import {
    BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import { ArrowUpRight, ArrowDownRight, Award, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import Button from '../../components/ui/Button.jsx';
import MultiSelect from '../../components/ui/MultiSelect';
import {
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    getPortraitGetDisciplines,
    postPortraitCreateDataSession,
    postGetVamDotplotData,
    postGetLgmSpaghettiData
} from "../../api.js";

import VamDotPlot from '../../components/charts/VamDotPlot';
import LgmSpaghettiPlot from '../../components/charts/LgmSpaghettiPlot';
import { DisciplineAnalysisSection } from '../../components/DisciplineAnalysisSection';
import { AdvancedVisualizationSection } from '../../components/AdvancedVisualizationSection';

import "./AdminAnalysisView.scss";

const COLORS = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#0288d1', '#c2185b', '#5d4037', '#00796b', '#fbc02d',
];

const competencyLabels = {
    "res_comp_info_analysis": "Анализ информации",
    "res_comp_planning": "Планирование",
    "res_comp_result_orientation": "Ориентация на результат",
    "res_comp_stress_resistance": "Стрессоустойчивость",
    "res_comp_partnership": "Партнёрство",
    "res_comp_rules_compliance": "Соблюдение правил",
    "res_comp_self_development": "Саморазвитие",
    "res_comp_leadership": "Лидерство",
    "res_comp_emotional_intel": "Эмоциональный интеллект",
    "res_comp_client_focus": "Клиентоориентированность",
    "res_comp_communication": "Коммуникация",
    "res_comp_passive_vocab": "Пассивный словарь"
};
const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');

const Stat = ({ label, value, prev, suffix = "", isGrowth = false }) => {
  const diff = (value || 0) - (prev || 0);
  const isUp = diff >= 0;
  
  return (
    <div className="stat-block">
      <div className={`trend ${isUp ? 'up' : 'down'}`}>
        {isUp ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}
        {Math.abs(isGrowth ? value : diff).toFixed(1)}%
      </div>
      <div className="value">{value}{suffix}</div>
      <div className="prev-year">прошлый год: {prev}{suffix}</div>
      <div className="label">{label}</div>
    </div>
  );
};

function Dashboard({ data }) {
  if (!data) return null;

    const chartData = data.chart.map(item => {
    const translatedName = getLabel(item.name);
    return {
        ...item,
        displayName: translatedName
    };
  });

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Результаты</h2>
      
      <div className="dashboard-grid">
        {/* Левая колонка */}
        <div className="col-left">
          <Stat label="студентов прошли доп. курсы" value={data.col1.courses.val} prev={data.col1.courses.prev} suffix="%" />
          <Stat label="средний уровень компетенций" value={data.col1.avg_lvl.val} prev={data.col1.avg_lvl.prev} />
          <Stat label="общий прирост за год" value={data.col1.growth.val} prev={data.col1.growth.prev} suffix="%" isGrowth />
        </div>

        {/* Центральная колонка */}
        <div className="col-center">
          <div className="uni-info mb-6">
            <h4 className="text-xs uppercase text-gray-400 font-bold">Лидирующий ВУЗ</h4>
            <div className="text-xl font-bold text-blue-600">{data.col2.uni_name}</div>
            <div className="text-sm text-gray-500">{data.col2.uni_score} баллов (среднее)</div>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="col-right">
          <h4 className="text-xs uppercase text-gray-400 font-bold mb-6">Компетенции</h4>
          <Stat 
            label={`Лучшая: ${getLabel(data.col3.best.name)}`} 
            value={data.col3.best.val} 
            prev={data.col3.best.prev || 0} 
          /> 
          <Stat 
            label={`Худшая: ${getLabel(data.col3.worst.name)}`} 
            value={data.col3.worst.val} 
            prev={data.col3.worst.prev || 0} 
          />
        </div>
      </div>
      <div className="dashboard-chart-row">
            <div className="chart-container">
                <h4 className="section-label">Распределение по компетенциям (средний балл)</h4>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="displayName" 
                            interval={0}
                            angle={-35} 
                            textAnchor="end"
                            tick={{
                                fontSize: 11, 
                                fill: '#64748b',
                                dy: 15}}
                        />
                        <YAxis 
                            domain={[0, 850]} 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{fill: '#94a3b8'}} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                            labelFormatter={(label) => `Компетенция: ${label}`}
                        />
                        <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={45} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>);
}

function MotivationRadar ({data}) {
    const [hoveredCourse, setHoveredCourse] = useState(null);

    const getOpacity = (course) => {
        if (!hoveredCourse) return 0.2;
        return hoveredCourse === course ? 0.6 : 0.05;
      };
    
      const getStrokeOpacity = (course) => {
        if (!hoveredCourse) return 1;
        return hoveredCourse === course ? 1 : 0.1;
      };
    
      const handleMouseEnter = (o) => {
        const { dataKey } = o;
        setHoveredCourse(dataKey);
      };
    
      const handleMouseLeave = () => {
        setHoveredCourse(null);
      };

    if (!data || data.length === 0) return <div className="p-8 text-center">Нет данных для анализа мотивации</div>;

    return (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 mt-4">
        <h3 className="text-xl font-bold mb-8 text-slate-800 text-center">Профиль мотивации по курсам</h3>
        <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                
                <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                
                {/* 1 Курс */}
                <Radar 
                name="1 Курс" 
                dataKey="course_1" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={getOpacity('course_1')} 
                strokeOpacity={getStrokeOpacity('course_1')}
                strokeWidth={hoveredCourse === 'course_1' ? 3 : 1}
                />
                
                {/* 2 Курс */}
                <Radar 
                name="2 Курс" 
                dataKey="course_2" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={getOpacity('course_2')} 
                strokeOpacity={getStrokeOpacity('course_2')}
                strokeWidth={hoveredCourse === 'course_2' ? 3 : 1}
                />

                {/* 3 Курс */}
                <Radar 
                name="3 Курс" 
                dataKey="course_3" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={getOpacity('course_3')} 
                strokeOpacity={getStrokeOpacity('course_3')}
                strokeWidth={hoveredCourse === 'course_3' ? 3 : 1}
                />

                {/* 4 Курс */}
                <Radar 
                name="4 Курс" 
                dataKey="course_4" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={getOpacity('course_4')} 
                strokeOpacity={getStrokeOpacity('course_4')}
                strokeWidth={hoveredCourse === 'course_4' ? 3 : 1}
                />
                
                <Legend 
                onMouseEnter={handleMouseEnter} 
                onMouseLeave={handleMouseLeave}
                verticalAlign="bottom" 
                wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }}
                />
            </RadarChart>
            </ResponsiveContainer>
        </div>
        </div>
    );
}


function AdminAnalysisViewV2() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [summaryStats, setSummaryStats] = useState(null);

    // Фильтры (значения – ID, для направлений – ID, т.к. бэкенд ожидает числа)
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetencies, setSelectedCompetencies] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Данные для отображения
    const [vamDataByCompetency, setVamDataByCompetency] = useState({});
    const [lgmDataByCompetency, setLgmDataByCompetency] = useState({});

    // Управление вкладками и методом
    const [activeMainTab, setActiveMainTab] = useState('vam_lgm');
    const [analysisMethod, setAnalysisMethod] = useState('vam');
    const [vamGroupBy, setVamGroupBy] = useState('institution');

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

    const linkList = [
        { to: '/admin/', title: "Главная" },
        { to: '/admin/stats', title: "Статистика тестирования" },
        { to: '/admin/results', title: "Результаты тестирования" },
        { to: '/admin/analysis', title: "Анализ данных" },
        { to: '/admin/courses', title: "Образовательные курсы" },
        { to: '/admin/upload', title: "Загрузка данных" },
    ];

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
        const chain = updateCounts
            ? getPortraitGetFilterOptionsWithCounts(sid, selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, selectedCompetencies)
            : getPortraitGetFilterOptionsWithCounts(sid);

        chain
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
                        competencies: data.data?.competencies || Object.keys(competencyLabels).map(c => ({ id: c, name: competencyLabels[c], count: 0 })),
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

//дашбордовое
    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(false);
    const [MotivationData, setMotivationData] = useState(null);
    const [loadingMotDash, setLoadingMotDash] = useState(false);

    const loadDashboardStats = async () => {
        setLoadingDash(true)
        try {
            const response = await fetch(`http://localhost:8000/portrait/dashboard-stats/?session_id=${sessionId}&institutions=${selectedInstitutions.join(',')}`);
            
            if (!response.ok) throw new Error('Ошибка сервера');
    
            const data = await response.json();
            setDashboardData(data); 
    
        } catch (error) {
            console.error("Ошибка при загрузке дашборда:", error);
        } finally {
            setLoadingDash(false); 
        }
    };
    useEffect(() => {
        //console.log("Текущая вкладка:", activeMainTab);
        //console.log("ID сессии:", sessionId);
        
        if (activeMainTab === 'stat' && sessionId) {
            loadDashboardStats();
        }
    }, [activeMainTab, sessionId, selectedInstitutions]); 

    const loadMotivationStats = async () => {
        setLoadingMotDash(true)
        try {
            const response = await fetch(`http://localhost:8000/portrait/motivation-stats/?session_id=${sessionId}&institutions=${selectedInstitutions.join(',')}`);
            
            if (!response.ok) throw new Error('Ошибка сервера');
    
            const data = await response.json();
            setMotivationData(data.data); 
    
        } catch (error) {
            console.error("Ошибка при загрузке мотиваторов:", error);
        } finally {
            setLoadingMotDash(false); 
        }
    };
    useEffect(() => {
        
        if (activeMainTab === 'motiv' && sessionId) {
            loadMotivationStats();
        }
    }, [activeMainTab, sessionId, selectedInstitutions]); 

    // -------------------- ЗАГРУЗКА ДАННЫХ VAM --------------------
    const loadVAMData = async () => {
        if (selectedCompetencies.length === 0) {
            alert('Выберите хотя бы одну компетенцию');
            return;
        }
        setLoading(true);
        const promises = selectedCompetencies.map(comp =>
            new Promise(resolve => {
                postGetVamDotplotData(
                    vamGroupBy,
                    comp,
                    selectedInstitutions,
                    selectedDirections,
                    selectedCourses,
                    selectedTestAttempts
                )
                    .onSuccess(async response => {
                        const data = await response.json();
                        if (data.status === 'success') resolve({ comp, data: data.data });
                        else resolve({ comp, data: [] });
                    })
                    .onError(() => resolve({ comp, data: [] }));
            })
        );
        const results = await Promise.all(promises);
        const newData = {};
        results.forEach(({ comp, data }) => { newData[comp] = data; });
        setVamDataByCompetency(newData);
        setLoading(false);
    };

    // -------------------- ЗАГРУЗКА ДАННЫХ LGM --------------------
    const loadLGMData = async () => {
        if (selectedCompetencies.length === 0) {
            alert('Выберите хотя бы одну компетенцию');
            return;
        }
        setLoading(true);
        const promises = selectedCompetencies.map(comp =>
            new Promise(resolve => {
                postGetLgmSpaghettiData(
                    'institution', // group_by – пока только по вузам, можно потом добавить выбор
                    comp,
                    selectedInstitutions,
                    selectedDirections,
                    selectedCourses,
                    selectedTestAttempts
                )
                    .onSuccess(async response => {
                        const data = await response.json();
                        if (data.status === 'success') resolve({ comp, data: data.data });
                        else resolve({ comp, data: null });
                    })
                    .onError(() => resolve({ comp, data: null }));
            })
        );
        const results = await Promise.all(promises);
        const newData = {};
        results.forEach(({ comp, data }) => { newData[comp] = data; });
        setLgmDataByCompetency(newData);
        setLoading(false);
    };

    // -------------------- ОТОБРАЖЕНИЕ ГРАФИКОВ --------------------
    const renderVAMChart = (comp) => {
        const data = vamDataByCompetency[comp];
        if (!data || data.length === 0) return <div className="no-data">Нет данных</div>;
        return <VamDotPlot data={data} />;
    };

    const renderLGMChart = (comp) => {
        const data = lgmDataByCompetency[comp];
        if (!data || !data.trend_lines) {
            return <div className="no-data">Нет данных</div>;
        }
        return <LgmSpaghettiPlot data={data} />;
    };

    const renderChartsGrid = () => {
        if (selectedCompetencies.length === 0) {
            return <div className="no-data">Выберите компетенции для анализа</div>;
        }
        if (selectedCompetencies.length === 1) {
            const comp = selectedCompetencies[0];
            return (
                <div className="chart-container">
                    <h3>{competencyLabels[comp]}</h3>
                    {analysisMethod === 'vam' ? renderVAMChart(comp) : renderLGMChart(comp)}
                </div>
            );
        }
        return (
            <div className="charts-grid">
                {selectedCompetencies.map(comp => (
                    <div key={comp} className="chart-grid-item">
                        <h4>{competencyLabels[comp]}</h4>
                        {analysisMethod === 'vam' ? renderVAMChart(comp) : renderLGMChart(comp)}
                    </div>
                ))}
            </div>
        );
    };

    // -------------------- ОЧИСТКА ФИЛЬТРОВ --------------------
    const clearFilters = () => {
        setSelectedInstitutions([]);
        setSelectedDirections([]);
        setSelectedCourses([]);
        setSelectedTestAttempts([]);
        setSelectedCompetencies([]);
        setSelectedStudents([]);
    };

    // -------------------- РЕНДЕР --------------------
    return (
        <div className="AdminAnalysisView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar links={linkList} />
                <Content>
                    <h2>Анализ развития компетенций</h2>

                    {/* Главные табы */}
                    <div className="main-tabs">
                        {['vam_lgm', 'disciplines', 'advanced', 'stat', 'motiv'].map(tab => (
                            <button
                                key={tab}
                                className={`main-tab ${activeMainTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveMainTab(tab)}
                            >
                                {tab === 'vam_lgm' && '🎯 VAM / LGM'}
                                {tab === 'disciplines' && '📚 Анализ дисциплин'}
                                {tab === 'advanced' && '📈 Продвинутые визуализации'}
                                {tab === 'stat' && 'Статистика и анализ'}
                                {tab === 'motiv' && 'Мотиваторы'}
                            </button>
                        ))}
                    </div>

                    {/* Сводная статистика – пока заглушка, можно загрузить через отдельный эндпоинт */}
                    {/* {summaryStats && (...)} */}

                    {activeMainTab === 'vam_lgm' && (
                        <>
                            {/* Панель управления */}
                            <div className="analysis-method-section">
                                <h3>Метод анализа</h3>
                                <div className="analysis-method-buttons">
                                    <Button
                                        text="Value-Added Model (VAM)"
                                        onClick={() => setAnalysisMethod('vam')}
                                        fg={analysisMethod === 'vam' ? 'white' : '#1976d2'}
                                        bg={analysisMethod === 'vam' ? '#1976d2' : 'white'}
                                        border="1px solid #1976d2"
                                    />
                                    <Button
                                        text="Latent Growth Model (LGM)"
                                        onClick={() => setAnalysisMethod('lgm')}
                                        fg={analysisMethod === 'lgm' ? 'white' : '#1976d2'}
                                        bg={analysisMethod === 'lgm' ? '#1976d2' : 'white'}
                                        border="1px solid #1976d2"
                                    />
                                </div>
                                {analysisMethod === 'vam' && (
                                    <div className="vam-group-select" style={{ marginTop: 10 }}>
                                        <label>Группировать по: </label>
                                        <select value={vamGroupBy} onChange={e => setVamGroupBy(e.target.value)}>
                                            <option value="institution">ВУЗам</option>
                                            <option value="direction">Направлениям</option>
                                            <option value="course">Курсам</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Фильтры */}
                            <div className="controls">
                                <div className="control-section">
                                    <h3>Фильтры</h3>
                                    <div className="filters-grid">
                                        <MultiSelect
                                            options={filterOptions.institutions}
                                            value={selectedInstitutions}
                                            onChange={setSelectedInstitutions}
                                            placeholder="Все ВУЗы"
                                            searchPlaceholder="Поиск ВУЗов..."
                                            label="Учебные заведения"
                                            withSearch
                                            showCounts
                                        />
                                        <MultiSelect
                                            options={filterOptions.directions}
                                            value={selectedDirections}
                                            onChange={setSelectedDirections}
                                            placeholder="Все направления"
                                            searchPlaceholder="Поиск направлений..."
                                            label="Направления подготовки"
                                            withSearch
                                            showCounts
                                        />
                                        <MultiSelect
                                            options={filterOptions.courses}
                                            value={selectedCourses}
                                            onChange={setSelectedCourses}
                                            placeholder="Все курсы"
                                            label="Курсы"
                                            showCounts
                                        />
                                        <MultiSelect
                                            options={filterOptions.testAttempts}
                                            value={selectedTestAttempts}
                                            onChange={setSelectedTestAttempts}
                                            placeholder="Все прохождения"
                                            label="Количество прохождений"
                                            showCounts
                                        />
                                        <MultiSelect
                                            options={filterOptions.competencies}
                                            value={selectedCompetencies}
                                            onChange={setSelectedCompetencies}
                                            placeholder="Выберите компетенции"
                                            searchPlaceholder="Поиск компетенций..."
                                            label="Компетенции"
                                            withSearch
                                            showCounts
                                        />
                                        <MultiSelect
                                            options={filterOptions.students}
                                            value={selectedStudents}
                                            onChange={setSelectedStudents}
                                            placeholder="Все студенты"
                                            searchPlaceholder="Поиск по имени или ID..."
                                            label="Студенты (индивидуальный анализ)"
                                            withSearch
                                            showCounts
                                            maxHeight="400px"
                                        />
                                        <div className="filter-actions">
                                            <Button
                                                text={loading ? '⏳ Загрузка...' : '🔄 Применить'}
                                                onClick={analysisMethod === 'vam' ? loadVAMData : loadLGMData}
                                                disabled={loading || selectedCompetencies.length === 0}
                                                fg="white"
                                                bg="#17a2b8"
                                                hoverBg="#138496"
                                            />
                                            <Button
                                                text="🗑️ Очистить"
                                                onClick={clearFilters}
                                                fg="#666"
                                                bg="white"
                                                border="1px solid #ddd"
                                                hoverBg="#f5f5f5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Графики */}
                            {renderChartsGrid()}
                        </>
                    )}

                    {activeMainTab === 'disciplines' && (
                        <DisciplineAnalysisSection
                            filterOptions={filterOptions}
                            selectedInstitutions={selectedInstitutions}
                            selectedDirections={selectedDirections}
                            selectedCompetencies={selectedCompetencies}
                        />
                    )}

                    {activeMainTab === 'advanced' && (
                        <AdvancedVisualizationSection
                            filterOptions={filterOptions}
                            selectedInstitutions={selectedInstitutions}
                            selectedDirections={selectedDirections}
                            selectedCompetencies={selectedCompetencies}
                        />
                    )}

                    {activeMainTab === 'stat' && (
                        <>
                            {loadingDash ? (
                                <div className="p-20 text-center text-gray-400">Загрузка статистики...</div>
                            ) : (
                                <Dashboard data={dashboardData} />
                            )}
                        </>
                    )}

                    {activeMainTab === 'motiv' && (
                        <>
                            {MotivationData && MotivationData.data ? (
                                <MotivationRadar data={MotivationData.data} />
                                ) : (
                                <div className="p-10 text-center">Загрузка данных...</div>
                            )}
                        </>
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisViewV2;