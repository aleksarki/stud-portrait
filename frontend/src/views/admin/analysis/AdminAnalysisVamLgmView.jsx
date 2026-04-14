// AdminAnalysisVamLgmView.jsx
import { useEffect, useState } from "react";
import {
    postGetVamTrendData,
    postPortraitCreateDataSession,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow, { WRAP } from "../../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import TitledCard from "../../../components/cards/TitledCard";
import VamCourseScatter from "../../../components/charts/VamCourseScatter";
import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import MultiSelect from "../../../components/ui/MultiSelect";
import Select, { Option } from "../../../components/ui/Select";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import NoData from "../../../components/ui/NoData";
import "./AdminAnalysisVamLgmView.scss";

function AdminAnalysisVamLgmView() {
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Фильтры
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetency, setSelectedCompetency] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Группировка: по вузам или по направлениям
    const [groupBy, setGroupBy] = useState('institution');

    // Метод анализа: 'vam' или 'lgm'
    const [analysisMethod, setAnalysisMethod] = useState('vam');

    // Данные для графика (массив точек: group, course, value_added, ci_lower, ci_upper, n)
    const [chartData, setChartData] = useState(null);

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
        courses: [],
        testAttempts: [],
        competencies: [],
        students: [],
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

    const loadFilterOptions = async (sid, updateCounts = false) => {
        if (!sid) return;
        const req = updateCounts
            ? getPortraitGetFilterOptionsWithCounts(sid, selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, [selectedCompetency].filter(Boolean))
            : getPortraitGetFilterOptionsWithCounts(sid);
        req.onSuccess(async response => {
            const data = await response.json();
            if (data.status === 'success') {
                setFilterOptions({
                    institutions: data.data?.institutions || [],
                    directions: data.data?.directions || [],
                    allDirections: data.data?.directions || [],
                    courses: data.data?.courses || [],
                    testAttempts: data.data?.test_attempts || [],
                    competencies: data.data?.competencies || Object.keys(COMPETENCIES_NAMES).map(c => ({ id: c, name: COMPETENCIES_NAMES[c], count: 0 })),
                    students: data.data?.students || [],
                });
            }
        }).onError(console.error);
    };

    // Обновление направлений при выборе вузов
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
                    const directions = data.directions.map(d => ({ id: d.id, name: d.name, count: 0 }));
                    setFilterOptions(prev => ({ ...prev, directions }));
                    setSelectedDirections(prev => prev.filter(id => directions.some(d => d.id === id)));
                }
            })
            .onError(console.error);
    }, [selectedInstitutions, sessionId]);

    // Перезагрузка фильтров при изменении выбранных значений
    useEffect(() => {
        if (sessionId) loadFilterOptions(sessionId, true);
    }, [selectedInstitutions, selectedDirections, selectedCourses, selectedTestAttempts, selectedCompetency]);

    // Загрузка данных для графика (сейчас только VAM, LGM можно добавить позже)
    const loadChartData = async () => {
        if (!selectedCompetency) {
            alert('Выберите компетенцию');
            return;
        }
        setLoading(true);
        postGetVamTrendData({
            group_by: groupBy,
            competency: selectedCompetency,
            selected_groups: groupBy === 'institution' ? selectedInstitutions : selectedDirections,
            filter_institutions: selectedInstitutions,
            filter_directions: selectedDirections,
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
                    setChartData(points);
                } else {
                    setChartData(null);
                }
            })
            .onError(err => {
                console.error(err);
                setChartData(null);
            })
            .finally(() => setLoading(false));
    };

    const clearFilters = () => {
        setSelectedInstitutions([]);
        setSelectedDirections([]);
        setSelectedCourses([]);
        setSelectedTestAttempts([]);
        setSelectedCompetency(null);
        setSelectedStudents([]);
        setChartData(null);
    };

    const competencyOptions = filterOptions.competencies.map(c => ({ id: c.id, name: c.name }));

    return (
        <div className="AdminAnalysisVamLgmView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Динамика компетенций по курсам (VAM)" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>VAM / LGM</h2>

                    {/* Панель управления */}
                    <TitledCard title="Метод анализа">
                        <FlexRow wrap={WRAP.DO}>
                            <Button
                                text="Value-Added Model (VAM)"
                                onClick={() => setAnalysisMethod('vam')}
                                palette={analysisMethod === 'vam' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                            />
                            <Button
                                text="Latent Growth Model (LGM)"
                                onClick={() => setAnalysisMethod('lgm')}
                                palette={analysisMethod === 'lgm' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                            />
                            {analysisMethod === 'vam' && (
                                <>
                                    <label>Группировать по: </label>
                                    <Select initValue={groupBy} onChange={setGroupBy}>
                                        <Option value="institution" label="ВУЗам" />
                                        <Option value="direction" label="Направлениям" />
                                    </Select>
                                </>
                            )}
                            <div style={{ minWidth: 200 }}>
                                <label>Компетенция: </label>
                                <select
                                    value={selectedCompetency || ''}
                                    onChange={(e) => setSelectedCompetency(e.target.value)}
                                    style={{ width: '100%', padding: 6 }}
                                >
                                    <option value="">-- Выберите --</option>
                                    {competencyOptions.map(comp => (
                                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </FlexRow>
                    </TitledCard>

                    <TitledCard title="Фильтры">
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
                        </div>
                    </TitledCard>

                    <FlexRow style={{ marginTop: 16, gap: 10 }}>
                        <Button
                            text={loading ? "Загрузка..." : "Построить график"}
                            onClick={loadChartData}
                            disabled={loading || !selectedCompetency}
                            palette={BUTTON_PALETTE.CYAN}
                        />
                        <Button text="Очистить всё" onClick={clearFilters} palette={BUTTON_PALETTE.GRAY} />
                    </FlexRow>

                    <LoadingSpinner loading={loading} text="Загрузка данных..." />

                    {!loading && chartData && chartData.length > 0 && (
                        <TitledCard title={`Динамика – ${competencyOptions.find(c => c.id === selectedCompetency)?.name || selectedCompetency}`}>
                            <VamCourseScatter data={chartData} groupBy={groupBy} />
                            <div style={{ marginTop: 16, fontSize: 13, color: '#666' }}>
                                * Каждая точка — средний балл на курсе для группы (вуза или направления).<br />
                                Разные цвета — разные группы.<br />
                                Вертикальные линии — 95% доверительные интервалы.
                            </div>
                        </TitledCard>
                    )}

                    {!loading && !chartData && selectedCompetency && (
                        <NoData text="Нет данных для выбранных фильтров. Попробуйте изменить параметры." />
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisVamLgmView;