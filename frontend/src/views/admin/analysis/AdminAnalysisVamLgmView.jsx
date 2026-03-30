import { useEffect, useState } from "react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import Button from "../../../components/ui/Button";
import MultiSelect from "../../../components/ui/MultiSelect";
import VamDotPlot from "../../../components/charts/VamDotPlot";
import LgmSpaghettiPlot from "../../../components/charts/LgmSpaghettiPlot";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";
import { postGetVamDotplotData, postGetLgmSpaghettiData, postPortraitCreateDataSession, getPortraitGetDisciplines, getPortraitGetFilterOptionsWithCounts, getPortraitGetInstitutionDirections } from "../../../api";

import "./AdminAnalysisVamLgmView.scss";

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
                    <h3>{COMPETENCIES_NAMES[comp]}</h3>
                    {analysisMethod === 'vam' ? renderVAMChart(comp) : renderLGMChart(comp)}
                </div>
            );
        }
        return (
            <div className="charts-grid">
                {selectedCompetencies.map(comp => (
                    <div key={comp} className="chart-grid-item">
                        <h4>{COMPETENCIES_NAMES[comp]}</h4>
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
    
    return (
        <div className="AdminAnalysisVamLgmView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>VAM / LGM</h2>

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
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisVamLgmView;
