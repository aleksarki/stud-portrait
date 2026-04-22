import { useState, useEffect } from "react";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import { LINK_TREE, COMPETENCIES_NAMES } from "../../../utilities";
import { postPortraitCreateDataSession, getPortraitGetFilterOptionsWithCounts, postAiAnalyticsSummary } from "../../../api";
import MultiSelect from "../../../components/ui/MultiSelect";
import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import Select, { Option } from "../../../components/ui/Select";
import "./AdminAiAnalyticsView.scss";

function AdminAiAnalyticsView() {
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [summary, setSummary] = useState("");

    // Фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedCompetency, setSelectedCompetency] = useState("res_comp_leadership");
    const [analysisType, setAnalysisType] = useState("general");

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
    });

    // Инициализация сессии
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

    const loadFilterOptions = async (sid) => {
        if (!sid) return;
        getPortraitGetFilterOptionsWithCounts(sid)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setFilterOptions({
                        institutions: data.data?.institutions || [],
                        directions: data.data?.directions || [],
                        allDirections: data.data?.directions || [],
                        courses: data.data?.courses || [],
                    });
                }
            })
            .onError(console.error);
    };

    const generateReport = async () => {
        setGenerating(true);
        setSummary("");
        try {
            const response = await postAiAnalyticsSummary(analysisType, {
                institutions: selectedInstitutions,
                directions: selectedDirections,
                courses: selectedCourses,
                competency: selectedCompetency,
            });
            response.onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    setSummary(data.summary);
                } else {
                    setSummary("❌ Ошибка: " + (data.message || "Неизвестная ошибка"));
                }
            }).onError(err => {
                console.error(err);
                setSummary("❌ Ошибка при запросе к серверу.");
            }).finally(() => setGenerating(false));
        } catch (err) {
            console.error(err);
            setSummary("❌ Ошибка при генерации отчёта.");
            setGenerating(false);
        }
    };

    return (
        <div className="AdminAiAnalyticsView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: AI-аналитика" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Интеллектуальная аналитика</h2>
                    <p>Выберите тип анализа и фильтры, затем нажмите "Сгенерировать отчёт". ИИ проанализирует данные и выдаст краткие выводы.</p>

                    <div className="filters-panel" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 15, alignItems: 'end' }}>
                        <div style={{ minWidth: 200 }}>
                            <label>Тип анализа:</label>
                            <Select initValue={analysisType} onChange={setAnalysisType}>
                                <Option value="general" label="Общая сводка" />
                                <Option value="institution_comparison" label="Сравнение вузов" />
                                <Option value="discipline_impact" label="Влияние дисциплин" />
                                <Option value="vam_trend" label="Динамика по курсам (VAM)" />
                            </Select>
                        </div>

                        <MultiSelect
                            options={filterOptions.institutions}
                            value={selectedInstitutions}
                            onChange={setSelectedInstitutions}
                            placeholder="Все вузы"
                            label="Вузы"
                            withSearch
                            showCounts
                        />

                        <MultiSelect
                            options={filterOptions.directions}
                            value={selectedDirections}
                            onChange={setSelectedDirections}
                            placeholder="Все направления"
                            label="Направления"
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

                        <div style={{ minWidth: 200 }}>
                            <label>Компетенция:</label>
                            <Select initValue={selectedCompetency} onChange={setSelectedCompetency}>
                                {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                    <Option key={key} value={key} label={name} />
                                ))}
                            </Select>
                        </div>

                        <Button
                            text={generating ? "Генерация..." : "Сгенерировать отчёт"}
                            onClick={generateReport}
                            disabled={generating || loading}
                            palette={BUTTON_PALETTE.CYAN}
                        />
                    </div>

                    <LoadingSpinner loading={loading || generating} text="Загрузка..." />

                    {summary && (
                        <div className="ai-summary" style={{ marginTop: 20, padding: 20, background: '#f8f9fa', borderRadius: 12, borderLeft: '4px solid #1976d2' }}>
                            <h3>📊 Аналитический отчёт</h3>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '1rem', lineHeight: 1.5 }}>
                                {summary}
                            </div>
                            <Button
                                text="Копировать текст"
                                onClick={() => navigator.clipboard.writeText(summary)}
                                palette={BUTTON_PALETTE.GRAY}
                                style={{ marginTop: 15 }}
                            />
                        </div>
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAiAnalyticsView;