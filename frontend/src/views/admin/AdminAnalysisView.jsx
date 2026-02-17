import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
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

import "./AdminAnalysisView.scss";

function AdminAnalysisView() {

    // -------------------- STATE --------------------

    const [sessionId, setSessionId] = useState(null);
    const [rawData, setRawData] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [summaryStats, setSummaryStats] = useState(null);

    // Тип анализа
    const [analysisType, setAnalysisType] = useState("cross_sectional"); // cross_sectional, longitudinal, comparison
    
    // Тип визуализации
    const [visualizationType, setVisualizationType] = useState("bar"); // bar, line, radar, comparison

    // Фильтры
    const [selectedInstitution, setSelectedInstitution] = useState("");
    const [selectedDirection, setSelectedDirection] = useState("");
    const [selectedCourse, setSelectedCourse] = useState("");

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        courses: []
    });

    const competencies = [
        "res_comp_info_analysis",
        "res_comp_planning",
        "res_comp_result_orientation",
        "res_comp_stress_resistance",
        "res_comp_partnership",
        "res_comp_rules_compliance",
        "res_comp_self_development",
        "res_comp_leadership",
        "res_comp_emotional_intel",
        "res_comp_client_focus",
        "res_comp_communication",
        "res_comp_passive_vocab"
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
        "res_comp_emotional_intel": "Эмоц. интеллект",
        "res_comp_client_focus": "Клиентоориентир.",
        "res_comp_communication": "Коммуникация",
        "res_comp_passive_vocab": "Пассивный словарь"
    };

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
                    await loadFilterOptions(json.session_id);
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

    const createSession = async () => {
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
                await loadFilterOptions(json.session_id);
                await loadVAMData(json.session_id);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
                session_id: sid,
                type: analysisType
            });

            if (selectedInstitution) params.append("institution", selectedInstitution);
            if (selectedDirection) params.append("direction", selectedDirection);
            if (selectedCourse) params.append("course", selectedCourse);

            const response = await fetch(
                `http://localhost:8000/portrait/value-added-improved/?${params}`
            );

            const json = await response.json();

            if (json.status === "success") {
                setRawData(json.data);
                prepareChartData(json.data);
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // -------------------- LOAD FILTER OPTIONS --------------------

    const loadFilterOptions = async (sid = sessionId) => {
        if (!sid) {
            console.log("⚠️ loadFilterOptions: No session ID provided");
            return;
        }

        console.log("📡 Loading filter options for session:", sid);
        
        try {
            const url = `http://localhost:8000/portrait/get-filter-options/?session_id=${sid}`;
            console.log("🔗 Request URL:", url);
            
            const response = await fetch(url);
            console.log("📥 Response status:", response.status);
            
            const json = await response.json();
            console.log("📦 Response data:", json);

            if (json.status === "success") {
                console.log("✅ Filter options loaded successfully");
                console.log("   - Institutions:", json.data?.institutions?.length || 0);
                console.log("   - Directions:", json.data?.directions?.length || 0);
                console.log("   - Courses:", json.data?.courses?.length || 0);
                
                // Проверяем структуру данных
                if (json.data?.institutions) {
                    console.log("   - First institution:", json.data.institutions[0]);
                }
                if (json.data?.directions) {
                    console.log("   - First direction:", json.data.directions[0]);
                }
                if (json.data?.courses) {
                    console.log("   - Courses list:", json.data.courses);
                }
                
                setFilterOptions({
                    institutions: json.data?.institutions || [],
                    directions: json.data?.directions || [],
                    courses: json.data?.courses || [1, 2, 3, 4, 5, 6] // Fallback
                });
                
                console.log("✅ Filter options state updated");
            } else {
                console.error("❌ Failed to load filter options:", json.message);
            }

        } catch (err) {
            console.error("💥 Error loading filter options:", err);
        }
    };

    // -------------------- PREPARE CHART DATA --------------------

    const prepareChartData = (data) => {
        if (!data || data.length === 0) {
            setChartData([]);
            return;
        }

        switch (visualizationType) {
            case "bar":
                prepareBarData(data);
                break;
            case "line":
                prepareLineData(data);
                break;
            case "radar":
                prepareRadarData(data);
                break;
            case "comparison":
                prepareComparisonData(data);
                break;
            default:
                prepareBarData(data);
        }
    };

    // -------------------- BAR CHART (распределение VAM) --------------------

    const prepareBarData = (data) => {
        // Распределение студентов по диапазонам VAM
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

    // -------------------- LINE CHART (динамика по курсам) --------------------

    const prepareLineData = (data) => {
        // Группировка по курсам
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
                mean: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
                count: values.length
            }))
            .sort((a, b) => parseInt(a.course) - parseInt(b.course));

        setChartData(chartData);
    };

    // -------------------- RADAR CHART (профиль компетенций) --------------------

    const prepareRadarData = (data) => {
        // Средние значения по каждой компетенции
        const competencyAverages = {};

        competencies.forEach(comp => {
            const values = data
                .filter(item => item.vam_by_competency && item.vam_by_competency[comp] !== undefined)
                .map(item => item.vam_by_competency[comp]);

            if (values.length > 0) {
                competencyAverages[comp] = values.reduce((a, b) => a + b, 0) / values.length;
            }
        });

        const chartData = Object.entries(competencyAverages).map(([comp, value]) => ({
            competency: competencyLabels[comp] || comp,
            value: parseFloat(value.toFixed(2))
        }));

        setChartData(chartData);
    };

    // -------------------- COMPARISON CHART (сравнение групп) --------------------

    const prepareComparisonData = (data) => {
        if (analysisType !== "comparison") {
            // Группируем по ВУЗам или направлениям
            const groups = {};

            data.forEach(item => {
                const key = selectedInstitution ? 
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
                    mean: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
                    count: values.length
                }))
                .sort((a, b) => b.mean - a.mean)
                .slice(0, 10); // Топ-10

            setChartData(chartData);
        } else {
            // Данные уже агрегированы на бэкенде
            const chartData = data
                .map(item => ({
                    group: `${item.institution} - ${item.direction}`,
                    mean: item.mean_all_competencies,
                    count: item.student_count
                }))
                .sort((a, b) => b.mean - a.mean)
                .slice(0, 10);

            setChartData(chartData);
        }
    };

    // -------------------- EFFECTS --------------------

    useEffect(() => {
        if (sessionId) {
            loadVAMData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analysisType, selectedInstitution, selectedDirection, selectedCourse, sessionId]);

    useEffect(() => {
        if (rawData.length > 0) {
            prepareChartData(rawData);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visualizationType, rawData]);

    // -------------------- RENDER --------------------

    const renderChart = () => {
        if (chartData.length === 0) {
            return (
                <div className="no-data">
                    <p>Нет данных для отображения</p>
                    <p>Попробуйте изменить фильтры или тип анализа</p>
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
                return (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="course" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="mean" 
                                stroke="#1976d2" 
                                strokeWidth={2}
                                name="Средний VAM"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case "radar":
                return (
                    <ResponsiveContainer width="100%" height={500}>
                        <RadarChart data={chartData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="competency" />
                            <PolarRadiusAxis />
                            <Tooltip />
                            <Legend />
                            <Radar 
                                name="VAM" 
                                dataKey="value" 
                                stroke="#1976d2" 
                                fill="#1976d2" 
                                fillOpacity={0.6} 
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                );

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

    const getAnalysisDescription = () => {
        switch (analysisType) {
            case "cross_sectional":
                return "Сравнение студентов с нормой их курса. Показывает, насколько студент отличается от среднего уровня группы.";
            case "longitudinal":
                return "Отслеживание личного прогресса студентов с повторными замерами. Показывает, как развиваются компетенции во времени.";
            case "comparison":
                return "Сравнение средних показателей между ВУЗами и направлениями для проверки гипотезы о влиянии программы.";
            default:
                return "";
        }
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

                    {/* Описание текущего анализа */}
                    <div className="analysis-description">
                        <strong>Тип анализа:</strong> {getAnalysisDescription()}
                    </div>

                    {/* Контролы */}
                    <div className="controls">
                        <div className="control-section">
                            <h3>Тип анализа</h3>
                            <div className="button-group">
                                <Button
                                    text="Cross-Sectional (все студенты)"
                                    onClick={() => setAnalysisType("cross_sectional")}
                                    fg={analysisType === "cross_sectional" ? "white" : "#1976d2"}
                                    bg={analysisType === "cross_sectional" ? "#1976d2" : "white"}
                                    border="1px solid #1976d2"
                                />
                                <Button
                                    text="Longitudinal (прогресс)"
                                    onClick={() => setAnalysisType("longitudinal")}
                                    fg={analysisType === "longitudinal" ? "white" : "#1976d2"}
                                    bg={analysisType === "longitudinal" ? "#1976d2" : "white"}
                                    border="1px solid #1976d2"
                                />
                                <Button
                                    text="Comparison (сравнение)"
                                    onClick={() => setAnalysisType("comparison")}
                                    fg={analysisType === "comparison" ? "white" : "#1976d2"}
                                    bg={analysisType === "comparison" ? "#1976d2" : "white"}
                                    border="1px solid #1976d2"
                                />
                            </div>
                        </div>

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
                                    text="🎯 Компетенции"
                                    onClick={() => setVisualizationType("radar")}
                                    fg={visualizationType === "radar" ? "white" : "#666"}
                                    bg={visualizationType === "radar" ? "#28a745" : "white"}
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
                            <div className="filters-row" style={{
                                display: 'flex',
                                gap: '12px',
                                flexWrap: 'wrap',
                                alignItems: 'center'
                            }}>
                                <select
                                    value={selectedInstitution}
                                    onChange={(e) => setSelectedInstitution(e.target.value)}
                                    style={{
                                        minWidth: '180px',
                                        maxWidth: '250px',
                                        padding: '10px 12px',
                                        border: '1px solid #ced4da',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Все ВУЗы</option>
                                    {filterOptions.institutions?.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={selectedDirection}
                                    onChange={(e) => setSelectedDirection(e.target.value)}
                                    style={{
                                        minWidth: '180px',
                                        maxWidth: '250px',
                                        padding: '10px 12px',
                                        border: '1px solid #ced4da',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Все направления</option>
                                    {filterOptions.directions?.map(dir => (
                                        <option key={dir} value={dir}>
                                            {dir}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    style={{
                                        minWidth: '150px',
                                        maxWidth: '180px',
                                        padding: '10px 12px',
                                        border: '1px solid #ced4da',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Все курсы</option>
                                    {filterOptions.courses?.map(course => (
                                        <option key={course} value={course}>
                                            {course} курс
                                        </option>
                                    ))}
                                </select>

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

                    {/* Интерпретация результатов */}
                    <div className="interpretation">
                        <h3>💡 Интерпретация результатов</h3>
                        <div className="interpretation-content">
                            <p><strong>VAM (Value-Added Measure)</strong> показывает:</p>
                            <ul>
                                <li><strong>Положительное значение (+)</strong> - студент развивается быстрее ожидаемого</li>
                                <li><strong>Ноль (0)</strong> - развитие соответствует ожиданиям</li>
                                <li><strong>Отрицательное значение (-)</strong> - развитие медленнее ожидаемого</li>
                            </ul>
                            {analysisType === "comparison" && (
                                <p className="hypothesis-note">
                                    <strong>Проверка гипотезы:</strong> Если средние VAM значительно различаются между 
                                    ВУЗами/направлениями, это подтверждает влияние программы обучения на развитие компетенций.
                                </p>
                            )}
                        </div>
                    </div>

                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminAnalysisView;