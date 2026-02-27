import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Button from '../../components/ui/Button.jsx';
import MultiSelect from '../../components/MultiSelect';

import "./AdminAnalysisView.scss";

const COLORS = [
    '#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2',
    '#0288d1', '#c2185b', '#5d4037', '#00796b', '#fbc02d',
];

function AdminAnalysisView() {

    // -------------------- STATE --------------------

    const [sessionId, setSessionId] = useState(null);
    const [rawData, setRawData] = useState([]);
    const [lgmData, setLgmData] = useState(null); // ← ДОБАВЛЕНО
    const [groupedData, setGroupedData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summaryStats, setSummaryStats] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);

    const [visualizationType, setVisualizationType] = useState("bar");

    // Multi-select фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);

    const [selectedCompetencies, setSelectedCompetencies] = useState([]);
    const [analysisMethod, setAnalysisMethod] = useState("vam"); // "vam" или "lgm"

    // ← ДОБАВЛЕНО: Словарь названий компетенций
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

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
        testAttempts: [],
        competencies: [],
        students: []
    });

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

    // -------------------- INIT SESSION --------------------

    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            try {
                const response = await fetch(
                    "http://localhost:8000/portrait/create-data-session/",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" }
                    }
                );

                const json = await response.json();

                if (json.status === "success") {
                    setSessionId(json.session_id);
                    await loadFilterOptions(json.session_id, false);
                    await loadVAMData(json.session_id);
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        
        initializeData();
        loadSummaryStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // -------------------- LOAD SUMMARY STATS --------------------

    const loadSummaryStats = async () => {
        try {
            const response = await fetch(
                "http://localhost:8000/portrait/vam-summary-statistics/"
            );
            const json = await response.json();
            if (json.status === "success") {
                setSummaryStats(json);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // -------------------- LOAD VAM DATA --------------------

    const loadVAMData = async (sid = sessionId) => {
        if (!sid) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                session_id: sid
            });

            selectedInstitutions.forEach(id => params.append('institution_ids[]', id));
            selectedDirections.forEach(dir => params.append('directions[]', dir));
            selectedCourses.forEach(course => params.append('courses[]', course));
            selectedTestAttempts.forEach(attempts => params.append('test_attempts[]', attempts));
            selectedCompetencies.forEach(comp => params.append('competencies[]', comp));
            selectedStudents.forEach(id => params.append('student_ids[]', id));

            const response = await fetch(
                `http://localhost:8000/portrait/get-vam-unified/?${params}`
            );

            const json = await response.json();

            if (json.status === "success") {
                setRawData(json.data);
                setGroupedData(json.grouped || null);
                prepareChartData(json.data, json.grouped);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // -------------------- LOAD LGM DATA (НОВОЕ!) --------------------

    const loadLGMData = async (sid = sessionId) => {
        if (!sid) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                session_id: sid
            });

            selectedInstitutions.forEach(id => params.append('institution_ids[]', id));
            selectedDirections.forEach(dir => params.append('directions[]', dir));
            selectedCourses.forEach(course => params.append('courses[]', course));
            selectedTestAttempts.forEach(attempts => params.append('test_attempts[]', attempts));
            selectedCompetencies.forEach(comp => params.append('competencies[]', comp));
            selectedStudents.forEach(id => params.append('student_ids[]', id));

            const response = await fetch(
                `http://localhost:8000/portrait/get-latent-growth/?${params}`
            );

            const json = await response.json();

            if (json.status === "success") {
                setLgmData(json.data);
                prepareLGMChartData(json.data);
            }

        } catch (err) {
            console.error("❌ Ошибка загрузки LGM:", err);
        } finally {
            setLoading(false);
        }
    };

    // -------------------- PREPARE LGM CHART DATA (НОВОЕ!) --------------------

    const prepareLGMChartData = (data) => {
        if (!data) {
            setChartData([]);
            return;
        }

        // data может быть:
        // 1. Без группировки: { "res_comp_leadership": [{course: 1, mean: 450}, ...], ... }
        // 2. С группировкой: { "res_comp_leadership": { "МГУ": [{course: 1, mean: 450}, ...], "СПбГУ": [...] }, ... }

        if (selectedCompetencies.length === 0) {
            // Один общий график - проверяем структуру данных
            const firstComp = Object.keys(data)[0];
            const firstCompData = data[firstComp];
            
            // Проверяем: массив (без группировки) или объект (с группировкой)
            if (Array.isArray(firstCompData)) {
                // БЕЗ группировки - среднее по всем компетенциям
                const allCourses = new Set();
                const byCourse = {};

                Object.values(data).forEach(trajectory => {
                    trajectory.forEach(point => {
                        allCourses.add(point.course);
                        if (!byCourse[point.course]) {
                            byCourse[point.course] = [];
                        }
                        byCourse[point.course].push(point.mean);
                    });
                });

                const chartData = Array.from(allCourses)
                    .sort((a, b) => a - b)
                    .map(course => ({
                        course: `${course} курс`,
                        mean: parseFloat((
                            byCourse[course].reduce((a, b) => a + b, 0) / byCourse[course].length
                        ).toFixed(2))
                    }));

                setChartData(chartData);
            } else {
                // С ГРУППИРОВКОЙ - среднее по группам
                const groups = {};
                
                // Извлекаем группы из первой компетенции
                Object.keys(firstCompData).forEach(groupName => {
                    groups[groupName] = {};
                });
                
                // Для каждой группы вычисляем среднее по всем компетенциям
                Object.keys(groups).forEach(groupName => {
                    const byCourse = {};
                    
                    Object.values(data).forEach(compData => {
                        if (compData[groupName]) {
                            compData[groupName].forEach(point => {
                                if (!byCourse[point.course]) {
                                    byCourse[point.course] = [];
                                }
                                byCourse[point.course].push(point.mean);
                            });
                        }
                    });
                    
                    // Средние по курсам для этой группы
                    Object.keys(byCourse).forEach(course => {
                        const values = byCourse[course];
                        const avg = values.reduce((a, b) => a + b, 0) / values.length;
                        if (!groups[groupName][course]) {
                            groups[groupName][course] = avg;
                        }
                    });
                });
                
                // Преобразуем в формат для multi-line графика
                const allCourses = new Set();
                Object.values(groups).forEach(courseData => {
                    Object.keys(courseData).forEach(course => allCourses.add(parseInt(course)));
                });
                
                const chartData = Array.from(allCourses)
                    .sort((a, b) => a - b)
                    .map(course => {
                        const point = { course: `${course} курс` };
                        Object.keys(groups).forEach(groupName => {
                            point[groupName] = groups[groupName][course] || 0;
                        });
                        return point;
                    });
                
                setChartData(chartData);
            }
        } else {
            // Для сетки графиков - данные уже в нужном формате
            setChartData(data);
        }
    };

    // -------------------- LOAD FILTER OPTIONS WITH CROSS-FILTERING --------------------

    const loadFilterOptions = async (sid = sessionId, updateCounts = false) => {
        if (!sid) return;
        
        try {
            const params = new URLSearchParams({
                session_id: sid
            });
            
            if (updateCounts) {
                selectedInstitutions.forEach(id => params.append('institution_ids[]', id));
                selectedDirections.forEach(dir => params.append('directions[]', dir));
                selectedCourses.forEach(course => params.append('courses[]', course));
                selectedTestAttempts.forEach(attempts => params.append('test_attempts[]', attempts));
                selectedCompetencies.forEach(comp => params.append('competencies[]', comp));
            }

            const url = `http://localhost:8000/portrait/get-filter-options-with-counts/?${params}`;
            
            const response = await fetch(url);
            const json = await response.json();

            if (json.status === "success") {
                setFilterOptions({
                    institutions: json.data?.institutions || [],
                    directions: json.data?.directions || [],
                    allDirections: json.data?.directions || [],
                    courses: json.data?.courses || [],
                    testAttempts: json.data?.test_attempts || [],
                    competencies: json.data?.competencies || [],
                    students: json.data?.students || []  // ← ДОБАВЛЕНО!
                });
            }

        } catch (err) {
            console.error("❌ Ошибка загрузки фильтров:", err);
        }
    };

    // -------------------- GET VAM DATA FOR COMPETENCY (НОВОЕ!) --------------------

    const getVAMDataForCompetency = (comp) => {
        // Проверяем структуру rawData
        if (!rawData || rawData.length === 0) return [];
        
        // Проверяем есть ли данные по компетенции в каждой записи
        const firstItem = rawData[0];
        
        // Если есть vam_by_competency - используем его
        if (firstItem.vam_by_competency && firstItem.vam_by_competency[comp] !== undefined) {
            // Группируем по курсам
            const byCourse = {};

            rawData.forEach(item => {
                if (item.vam_by_competency && item.vam_by_competency[comp] !== undefined) {
                    const course = item.course || item.to_course || 1;
                    if (!byCourse[course]) {
                        byCourse[course] = [];
                    }
                    byCourse[course].push(item.vam_by_competency[comp]);
                }
            });

            return Object.entries(byCourse)
                .map(([course, values]) => ({
                    course: `${course} курс`,
                    mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                }))
                .sort((a, b) => parseInt(a.course) - parseInt(b.course));
        }
        
        // Иначе - вычисляем из основного mean_vam (общий VAM без разбивки по компетенциям)
        // Для простоты возвращаем общий VAM
        const byCourse = {};

        rawData.forEach(item => {
            const course = item.course || item.to_course || 1;
            if (!byCourse[course]) {
                byCourse[course] = [];
            }
            byCourse[course].push(item.mean_vam || 0);
        });

        return Object.entries(byCourse)
            .map(([course, values]) => ({
                course: `${course} курс`,
                mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
            }))
            .sort((a, b) => parseInt(a.course) - parseInt(b.course));
    };

    // -------------------- RENDER CHARTS GRID (ОБНОВЛЕНО!) --------------------

    const renderChartsGrid = () => {
        if (selectedCompetencies.length === 0) {
            // Один общий график
            return (
                <div className="chart-container">
                    <div className="chart-info">
                        <span>Записей: {rawData.length}</span>
                    </div>
                    {loading ? (
                        <div className="loading">
                            <div className="spinner"></div>
                            <div className="loading-text">Загрузка данных...</div>
                        </div>
                    ) : (
                        analysisMethod === "vam" ? renderChart() : renderLGMChart()
                    )}
                </div>
            );
        }
        
        // Сетка графиков (2 в ряд)
        return (
            <div className="charts-grid">
                {selectedCompetencies.map((comp, index) => {
                    let compData;
                    
                    if (analysisMethod === "vam") {
                        compData = getVAMDataForCompetency(comp);
                    } else {
                        // LGM данные
                        const lgmCompData = lgmData?.[comp];
                        
                        if (!lgmCompData) {
                            compData = [];
                        } else if (Array.isArray(lgmCompData)) {
                            // БЕЗ группировки - просто массив
                            compData = lgmCompData;
                        } else {
                            // С ГРУППИРОВКОЙ - объект с группами
                            // Преобразуем в формат для multi-line
                            const groups = Object.keys(lgmCompData);
                            const allCourses = new Set();
                            
                            groups.forEach(groupName => {
                                lgmCompData[groupName].forEach(point => {
                                    allCourses.add(point.course);
                                });
                            });
                            
                            compData = Array.from(allCourses)
                                .sort((a, b) => a - b)
                                .map(course => {
                                    const point = { course: `${course} курс` };
                                    groups.forEach(groupName => {
                                        const coursePoint = lgmCompData[groupName].find(p => p.course === course);
                                        point[groupName] = coursePoint ? coursePoint.mean : null;
                                    });
                                    return point;
                                });
                        }
                    }

                    if (!compData || compData.length === 0) {
                        return (
                            <div key={comp} className="chart-grid-item">
                                <h4>{competencyLabels[comp]}</h4>
                                <div className="no-data">Нет данных</div>
                            </div>
                        );
                    }

                    // Проверяем: один график или multi-line
                    const isMultiLine = compData.length > 0 && Object.keys(compData[0]).length > 2; // course + минимум 2 группы

                    return (
                        <div key={comp} className="chart-grid-item">
                            <h4>{competencyLabels[comp]}</h4>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={compData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="course" />
                                    <YAxis />
                                    <Tooltip />
                                    {isMultiLine && <Legend />}
                                    
                                    {isMultiLine ? (
                                        // Multi-line график
                                        Object.keys(compData[0])
                                            .filter(key => key !== 'course')
                                            .map((groupName, i) => (
                                                <Line
                                                    key={groupName}
                                                    type="monotone"
                                                    dataKey={groupName}
                                                    stroke={COLORS[i % COLORS.length]}
                                                    strokeWidth={2}
                                                    name={groupName}
                                                />
                                            ))
                                    ) : (
                                        // Одна линия
                                        <Line
                                            type="monotone"
                                            dataKey="mean"
                                            stroke={COLORS[index % COLORS.length]}
                                            strokeWidth={2}
                                            name={competencyLabels[comp]}
                                        />
                                    )}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    );
                })}
            </div>
        );
    };

    // -------------------- RENDER LGM CHART (НОВОЕ!) --------------------

    const renderLGMChart = () => {
        if (!chartData || chartData.length === 0) {
            return (
                <div className="no-data">
                    <p>Нет данных для отображения</p>
                </div>
            );
        }

        // Проверяем: один график или multi-line
        const isMultiLine = Object.keys(chartData[0]).length > 2; // course + минимум 2 группы

        return (
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="course" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    
                    {isMultiLine ? (
                        // Multi-line график
                        Object.keys(chartData[0])
                            .filter(key => key !== 'course')
                            .map((groupName, index) => (
                                <Line
                                    key={groupName}
                                    type="monotone"
                                    dataKey={groupName}
                                    stroke={COLORS[index % COLORS.length]}
                                    strokeWidth={2}
                                    name={groupName}
                                />
                            ))
                    ) : (
                        // Одна линия
                        <Line
                            type="monotone"
                            dataKey="mean"
                            stroke="#1976d2"
                            strokeWidth={2}
                            name="Средняя траектория роста"
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // -------------------- UPDATE DIRECTIONS WHEN INSTITUTIONS CHANGE --------------------

    useEffect(() => {
        const updateDirections = async () => {
            if (selectedInstitutions.length === 0) {
                setFilterOptions(prev => ({
                    ...prev,
                    directions: prev.allDirections
                }));
                return;
            }

            try {
                const params = new URLSearchParams();
                selectedInstitutions.forEach(id => params.append('institution_ids[]', id));

                const response = await fetch(
                    `http://localhost:8000/portrait/get-institution-directions/?${params}`
                );
                const json = await response.json();

                if (json.status === "success") {
                    const directionsWithCounts = json.directions.map(dirName => {
                        const found = filterOptions.allDirections.find(d => d.name === dirName);
                        return found || { name: dirName, count: 0 };
                    });
                    
                    setFilterOptions(prev => ({
                        ...prev,
                        directions: directionsWithCounts
                    }));

                    setSelectedDirections(prev =>
                        prev.filter(dir => json.directions.includes(dir))
                    );
                }
            } catch (err) {
                console.error(err);
            }
        };

        updateDirections();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInstitutions]);

    // -------------------- RELOAD FILTER COUNTS ON ANY FILTER CHANGE --------------------

    useEffect(() => {
        if (sessionId) {
            loadFilterOptions(sessionId, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, sessionId]);

    // -------------------- PREPARE CHART DATA --------------------

    const prepareChartData = (data, grouped = null) => {
        if (!data || data.length === 0) {
            setChartData([]);
            return;
        }

        switch (visualizationType) {
            case "bar":
                prepareBarData(data);
                break;
            case "line":
                prepareLineData(data, grouped);
                break;
            case "comparison":
                prepareComparisonData(data);
                break;
            default:
                prepareBarData(data);
        }
    };

    const prepareBarData = (data) => {
        const ranges = {
            "< -100": 0,
            "-100 до -50": 0,
            "-50 до 0": 0,
            "0 до 50": 0,
            "50 до 100": 0,
            "> 100": 0
        };

        data.forEach(item => {
            const vam = item.mean_vam || 0;
            if (vam < -100) ranges["< -100"]++;
            else if (vam < -50) ranges["-100 до -50"]++;
            else if (vam < 0) ranges["-50 до 0"]++;
            else if (vam < 50) ranges["0 до 50"]++;
            else if (vam < 100) ranges["50 до 100"]++;
            else ranges["> 100"]++;
        });

        const chartData = Object.entries(ranges).map(([range, count]) => ({
            range,
            count
        }));

        setChartData(chartData);
    };

    const prepareLineData = (data, grouped = null) => {
        if (!grouped) {
            const byCourse = {};

            data.forEach(item => {
                const course = item.course || item.to_course || 1;
                if (!byCourse[course]) {
                    byCourse[course] = [];
                }
                byCourse[course].push(item.mean_vam || 0);
            });

            const chartData = Object.entries(byCourse)
                .map(([course, values]) => ({
                    course: `${course} курс`,
                    mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                }))
                .sort((a, b) => parseInt(a.course) - parseInt(b.course));

            setChartData(chartData);
            return;
        }

        const groupBy = selectedInstitutions.length > 0 && selectedDirections.length === 0
            ? 'by_institution'
            : selectedDirections.length > 0 && selectedInstitutions.length === 0
            ? 'by_direction'
            : selectedInstitutions.length > 0 && selectedDirections.length > 0
            ? 'by_institution_direction'
            : 'overall';

        if (groupBy === 'overall') {
            const byCourse = {};

            data.forEach(item => {
                const course = item.course || item.to_course || 1;
                if (!byCourse[course]) {
                    byCourse[course] = [];
                }
                byCourse[course].push(item.mean_vam || 0);
            });

            const chartData = Object.entries(byCourse)
                .map(([course, values]) => ({
                    course: `${course} курс`,
                    mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                }))
                .sort((a, b) => parseInt(a.course) - parseInt(b.course));

            setChartData(chartData);
            return;
        }

        const groupData = grouped[groupBy] || {};
        const groups = Object.keys(groupData);

        if (groups.length === 0) {
            const byCourse = {};

            data.forEach(item => {
                const course = item.course || item.to_course || 1;
                if (!byCourse[course]) {
                    byCourse[course] = [];
                }
                byCourse[course].push(item.mean_vam || 0);
            });

            const chartData = Object.entries(byCourse)
                .map(([course, values]) => ({
                    course: `${course} курс`,
                    mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                }))
                .sort((a, b) => parseInt(a.course) - parseInt(b.course));

            setChartData(chartData);
            return;
        }

        const allCourses = new Set();
        Object.values(groupData).forEach(courseData => {
            Object.keys(courseData).forEach(course => allCourses.add(parseInt(course)));
        });

        const sortedCourses = Array.from(allCourses).sort((a, b) => a - b);

        const chartData = sortedCourses.map(course => {
            const dataPoint = {
                course: `${course} курс`
            };

            groups.forEach(group => {
                dataPoint[group] = groupData[group][course] || 0;
            });

            return dataPoint;
        });

        setChartData(chartData);
    };

    const prepareComparisonData = (data) => {
        const groups = {};

        data.forEach(item => {
            const key = selectedInstitutions.length > 0 ? 
                (item.direction || "Неизвестно") : 
                (item.institution_name || "Неизвестно");

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item.mean_vam || 0);
        });

        const chartData = Object.entries(groups)
            .map(([group, values]) => ({
                group,
                mean: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)),
                count: values.length
            }))
            .sort((a, b) => b.mean - a.mean)
            .slice(0, 10);

        setChartData(chartData);
    };

    // -------------------- EFFECTS (ОБНОВЛЕНО!) --------------------

    useEffect(() => {
        if (sessionId) {
            if (analysisMethod === "vam") {
                loadVAMData();
            } else {
                loadLGMData();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analysisMethod, selectedInstitutions, selectedDirections, selectedCourses, 
        selectedTestAttempts, selectedCompetencies, selectedStudents, sessionId]);

    useEffect(() => {
        if (rawData.length > 0) {
            prepareChartData(rawData, groupedData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visualizationType]);

    // -------------------- RENDER HELPERS --------------------

    const renderChart = () => {
        if (chartData.length === 0) {
            return (
                <div className="no-data">
                    <p>Нет данных для отображения</p>
                    <p>Попробуйте изменить фильтры</p>
                </div>
            );
        }

        switch (visualizationType) {
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#1976d2" name="Количество студентов" />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case "line":
                return renderMultiLineChart();

            case "comparison":
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="group" width={200} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="mean" fill="#1976d2" name="Средний VAM" />
                        </BarChart>
                    </ResponsiveContainer>
                );

            default:
                return null;
        }
    };

    const renderMultiLineChart = () => {
        if (!chartData || chartData.length === 0) return null;

        const groups = Object.keys(chartData[0]).filter(key => key !== 'course');

        return (
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="course" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {groups.map((group, index) => (
                        <Line
                            key={group}
                            type="monotone"
                            dataKey={group}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            name={group}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    const renderDataQualityWarning = () => {
        if (selectedTestAttempts.length === 0) return null;

        const minAttempts = Math.min(...selectedTestAttempts.map(a => parseInt(a)));

        if (rawData.length < 100) {
            return (
                <div className="data-warning low-data">
                    📊 <strong>Малая выборка:</strong> В текущей выборке {rawData.length} записей. 
                    Для более точных выводов рекомендуется минимум 100 записей.
                </div>
            );
        }

        return null;
    };

    const clearAllFilters = () => {
        setSelectedInstitutions([]);
        setSelectedDirections([]);
        setSelectedCourses([]);
        setSelectedTestAttempts([]);
        setSelectedCompetencies([]);
        setSelectedStudents([]);
        
        console.log("🗑️ Все фильтры очищены");
    };

    return (
        <div className="AdminAnalysisView">
            <Header
                title="Админ: Анализ данных"
                name="Администратор1"
                style="modeus"
            />

            <div className="main-area">
                <SidebarLayout
                    sidebar={<Sidepanel links={linkList} style="modeus" />}
                    style="modeus"
                >

                    <h2>Анализ развития компетенций</h2>

                    {/* Сводная статистика */}
                    {summaryStats && (
                        <div className="summary-stats">
                            <div className="stat-card">
                                <div className="stat-value">{summaryStats.total_students}</div>
                                <div className="stat-label">Всего студентов</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{summaryStats.total_measurements}</div>
                                <div className="stat-label">Всего замеров</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">{summaryStats.longitudinal_eligible}</div>
                                <div className="stat-label">С повторными замерами</div>
                            </div>
                        </div>
                    )}

                    {/* КНОПКИ VAM/LGM (ДОБАВЛЕНО!) */}
                    <div className="analysis-method-section">
                        <h3>Метод анализа</h3>
                        <div className="analysis-method-buttons">
                            <Button
                                text="Value-Added Model (VAM)"
                                onClick={() => setAnalysisMethod("vam")}
                                fg={analysisMethod === "vam" ? "white" : "#1976d2"}
                                bg={analysisMethod === "vam" ? "#1976d2" : "white"}
                                border="1px solid #1976d2"
                            />
                            <Button
                                text="Latent Growth Model (LGM)"
                                onClick={() => setAnalysisMethod("lgm")}
                                fg={analysisMethod === "lgm" ? "white" : "#1976d2"}
                                bg={analysisMethod === "lgm" ? "#1976d2" : "white"}
                                border="1px solid #1976d2"
                            />
                        </div>
                        <p className="method-description">
                            {analysisMethod === "vam" 
                                ? "VAM показывает отклонение результата студента от ожидаемого уровня."
                                : "LGM показывает средние траектории развития компетенций на уровне популяции."}
                        </p>
                    </div>

                    {/* Data Quality Warning */}
                    {renderDataQualityWarning()}

                    {/* Контролы */}
                    <div className="controls">
                        <div className="control-section">
                            <h3>Тип визуализации</h3>
                            <div className="button-group">
                                <Button
                                    text="📊 Распределение"
                                    onClick={() => setVisualizationType("bar")}
                                    fg={visualizationType === "bar" ? "white" : "#666"}
                                    bg={visualizationType === "bar" ? "#28a745" : "white"}
                                    border="1px solid #28a745"
                                />
                                <Button
                                    text="📈 Динамика"
                                    onClick={() => setVisualizationType("line")}
                                    fg={visualizationType === "line" ? "white" : "#666"}
                                    bg={visualizationType === "line" ? "#28a745" : "white"}
                                    border="1px solid #28a745"
                                />
                                <Button
                                    text="⚖️ Сравнение групп"
                                    onClick={() => setVisualizationType("comparison")}
                                    fg={visualizationType === "comparison" ? "white" : "#666"}
                                    bg={visualizationType === "comparison" ? "#28a745" : "white"}
                                    border="1px solid #28a745"
                                />
                            </div>
                        </div>

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
                                    withSearch={true}
                                    showCounts={true}
                                />

                                <MultiSelect
                                    options={filterOptions.directions}
                                    value={selectedDirections}
                                    onChange={setSelectedDirections}
                                    placeholder="Все направления"
                                    searchPlaceholder="Поиск направлений..."
                                    label="Направления подготовки"
                                    withSearch={true}
                                    showCounts={true}
                                />

                                <MultiSelect
                                    options={filterOptions.courses}
                                    value={selectedCourses}
                                    onChange={setSelectedCourses}
                                    placeholder="Все курсы"
                                    label="Курсы"
                                    withSearch={false}
                                    showCounts={true}
                                />

                                <MultiSelect
                                    options={filterOptions.testAttempts}
                                    value={selectedTestAttempts}
                                    onChange={setSelectedTestAttempts}
                                    placeholder="Все прохождения"
                                    label="Количество прохождений"
                                    withSearch={false}
                                    showCounts={true}
                                />

                                {/* ФИЛЬТР КОМПЕТЕНЦИЙ (ДОБАВЛЕНО!) */}
                                <MultiSelect
                                    options={filterOptions.competencies}
                                    value={selectedCompetencies}
                                    onChange={setSelectedCompetencies}
                                    placeholder="Все компетенции"
                                    searchPlaceholder="Поиск компетенций..."
                                    label="Компетенции"
                                    withSearch={true}
                                    showCounts={true}  // ← ИЗМЕНИТЕ С false НА true!
                                />

                                <MultiSelect
                                    options={filterOptions.students}
                                    value={selectedStudents}
                                    onChange={setSelectedStudents}
                                    placeholder="Все студенты"
                                    searchPlaceholder="Поиск по имени или ID..."
                                    label="Студенты (индивидуальный анализ)"
                                    withSearch={true}
                                    showCounts={true}
                                    maxHeight="400px"
                                />

                                <div className="filter-actions">
                                    <Button
                                        text={`${loading ? '⏳' : '🔄'} Обновить`}
                                        onClick={() => analysisMethod === "vam" ? loadVAMData() : loadLGMData()}
                                        disabled={!sessionId || loading}
                                        fg="white"
                                        bg="#17a2b8"
                                        hoverBg="#138496"
                                        disabledBg="#6c757d"
                                    />
                                    
                                    {/* НОВАЯ КНОПКА ОЧИСТКИ! */}
                                    <Button
                                        text="🗑️ Очистить фильтры"
                                        onClick={clearAllFilters}
                                        fg="#666"
                                        bg="white"
                                        border="1px solid #ddd"
                                        hoverBg="#f5f5f5"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* СЕТКА ГРАФИКОВ (ОБНОВЛЕНО!) */}
                    {renderChartsGrid()}

                    {/* Интерпретация (ОБНОВЛЕНО!) */}
                    <div className="interpretation">
                        <h3>💡 Интерпретация результатов</h3>
                        <div className="interpretation-content">
                            {analysisMethod === "vam" ? (
                                <>
                                    <p><strong>VAM (Value-Added Measure)</strong> показывает:</p>
                                    <ul>
                                        <li><strong>Положительное значение (+)</strong> - студент развивается быстрее ожидаемого</li>
                                        <li><strong>Ноль (0)</strong> - развитие соответствует ожиданиям</li>
                                        <li><strong>Отрицательное значение (-)</strong> - развитие медленнее ожидаемого</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p><strong>LGM (Latent Growth Model)</strong> показывает:</p>
                                    <ul>
                                        <li>Средние траектории развития компетенций на уровне популяции</li>
                                        <li>Общую динамику изменения компетенций от курса к курсу</li>
                                        <li>Тенденции роста или снижения показателей</li>
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>

                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminAnalysisView;