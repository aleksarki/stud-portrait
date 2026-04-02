import { useEffect, useState } from "react";

import {
    postGetVamDotplotData,
    postGetLgmSpaghettiData,
    postPortraitCreateDataSession,
    getPortraitGetDisciplines,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow from "../../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import TitledCard from "../../../components/cards/TitledCard";

import VamDotPlot from "../../../components/charts/VamDotPlot";
import LgmSpaghettiPlot from "../../../components/charts/LgmSpaghettiPlot";

import Button, { BUTTON_PALETTE } from "../../../components/ui/Button";
import MultiSelect from "../../../components/ui/MultiSelect";

import "./AdminAnalysisVamLgmView.scss";
import Select, { Option } from "../../../components/ui/Select";

function AdminAnalysisVamLgmView() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

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
                    getPortraitGetDisciplines()
                        .onSuccess(async resp => {
                            const d = await resp.json();
                            if (d.status === 'success') {
                                //disciplines = d.disciplines || [];
                            }
                        })
                        .onError(error => {
                            disciplines = [];
                            console.error('Error loading disciplines:', error);
                        });

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
        console.log(data);
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
                <TitledCard title={COMPETENCIES_NAMES[comp]}>
                    {analysisMethod === 'vam' ? renderVAMChart(comp) : renderLGMChart(comp)}
                </TitledCard>
            );
        }
        return (
            <div className="charts-grid">
                {selectedCompetencies.map(comp => (
                    <TitledCard title={COMPETENCIES_NAMES[comp]}>
                        {analysisMethod === 'vam' ? renderVAMChart(comp) : renderLGMChart(comp)}
                    </TitledCard>
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
    
    return (
        <div className="AdminAnalysisVamLgmView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>VAM / LGM</h2>

                    {/* Панель управления */}
                    <TitledCard title="Метод анализа">
                        <FlexRow>
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
                            {analysisMethod === 'vam' && <>
                                <label>Группировать по: </label>
                                <Select value={vamGroupBy} onChange={setVamGroupBy}>
                                    <Option value="institution" label="ВУЗам" />
                                    <Option value="direction" label="Направлениям" />
                                    <Option value="course" label="Курсам" />
                                </Select>
                            </>}
                        </FlexRow>
                    </TitledCard>

                    {/* Фильтры */}
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
                            <FlexRow>
                                <Button
                                    text={loading ? "Загрузка..." : "Применить"}
                                    onClick={analysisMethod === 'vam' ? loadVAMData : loadLGMData}
                                    disabled={loading || selectedCompetencies.length === 0}
                                    palette={BUTTON_PALETTE.CYAN}
                                />
                                <Button
                                    text="Очистить"
                                    onClick={clearFilters}
                                    palette={BUTTON_PALETTE.GRAY}
                                />
                            </FlexRow>
                        </div>
                    </TitledCard>

                    {/* Графики */}
                    {renderChartsGrid()}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisVamLgmView;
