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
    const [groupedData, setGroupedData] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summaryStats, setSummaryStats] = useState(null);

    const [visualizationType, setVisualizationType] = useState("bar");

    // Multi-select фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
        testAttempts: []
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
                    await loadFilterOptions(json.session_id, false);  // Первая загрузка БЕЗ фильтров
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

    // -------------------- LOAD FILTER OPTIONS WITH CROSS-FILTERING --------------------

    const loadFilterOptions = async (sid = sessionId, updateCounts = false) => {
        if (!sid) return;
        
        try {
            const params = new URLSearchParams({
                session_id: sid
            });
            
            // Добавляем текущие выбранные фильтры для cross-filtering
            if (updateCounts) {
                selectedInstitutions.forEach(id => params.append('institution_ids[]', id));
                selectedDirections.forEach(dir => params.append('directions[]', dir));
                selectedCourses.forEach(course => params.append('courses[]', course));
                selectedTestAttempts.forEach(attempts => params.append('test_attempts[]', attempts));
            }

            const url = `http://localhost:8000/portrait/get-filter-options-with-counts/?${params}`;
            console.log("🔄 Загрузка фильтров с cross-filtering:", url);
            
            const response = await fetch(url);
            const json = await response.json();

            if (json.status === "success") {
                console.log("✅ Filter options loaded with counts");
                console.log("   Institutions:", json.data.institutions?.length);
                console.log("   Directions:", json.data.directions?.length);
                console.log("   Courses:", json.data.courses?.length);
                console.log("   Test attempts:", json.data.test_attempts?.length, "(max:", json.data.max_attempts, ")");
                
                setFilterOptions({
                    institutions: json.data?.institutions || [],
                    directions: json.data?.directions || [],
                    allDirections: json.data?.directions || [],
                    courses: json.data?.courses || [],
                    testAttempts: json.data?.test_attempts || []
                });
            }

        } catch (err) {
            console.error("❌ Ошибка загрузки фильтров:", err);
        }
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
                    // Преобразуем в формат с count (используем из allDirections)
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
            console.log("🔄 Фильтры изменились, обновляем счётчики всех фильтров...");
            loadFilterOptions(sessionId, true);  // updateCounts = true → cross-filtering!
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

    // -------------------- EFFECTS --------------------

    useEffect(() => {
        if (sessionId) {
            loadVAMData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, sessionId]);

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

                    <h2>Анализ развития компетенций (Value-Added Model)</h2>

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

                    {/* Описание анализа */}
                    <div className="analysis-description">
                        <strong>Value-Added Model (VAM)</strong> - метод оценки развития компетенций, 
                        который показывает отклонение результата студента от ожидаемого уровня. 
                        Автоматически адаптируется под выбранные фильтры.
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

                                <div className="filter-actions">
                                    <Button
                                        text={`${loading ? '⏳' : '🔄'} Обновить`}
                                        onClick={() => loadVAMData()}
                                        disabled={!sessionId || loading}
                                        fg="white"
                                        bg="#17a2b8"
                                        hoverBg="#138496"
                                        disabledBg="#6c757d"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* График */}
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
                            renderChart()
                        )}
                    </div>

                    {/* Интерпретация */}
                    <div className="interpretation">
                        <h3>💡 Интерпретация результатов</h3>
                        <div className="interpretation-content">
                            <p><strong>VAM (Value-Added Measure)</strong> показывает:</p>
                            <ul>
                                <li><strong>Положительное значение (+)</strong> - студент развивается быстрее ожидаемого</li>
                                <li><strong>Ноль (0)</strong> - развитие соответствует ожиданиям</li>
                                <li><strong>Отрицательное значение (-)</strong> - развитие медленнее ожидаемого</li>
                            </ul>
                        </div>
                    </div>

                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminAnalysisView;