import { useEffect, useState } from "react";

import {
    getAnalyzeAllDisciplinesImpact,
    getPortraitGetDisciplines,
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    postAnalyzeDisciplineImpactAdvanced,
    postGetDisciplineHeatmapData,
    postPortraitCreateDataSession
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import FlexRow from "../../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import TitledCard from "../../../components/cards/TitledCard";

import Table, { TableHeader, TableItem, TableRow } from "../../../components/tables/Table";

import Button, { BUTTON_PALETTE } from '../../../components/ui/Button';
import ColorBox, { BOX_COLOR } from "../../../components/ui/ColorBox";
import Label from "../../../components/ui/Label";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import MultiSelect from '../../../components/ui/MultiSelect';
import NoData from "../../../components/ui/NoData";

import SankeyDiagram from '../../../components/charts/SankeyDiagram';

import "./AdminAnalysisDisciplinesView.scss";

function AdminAnalysisDisciplinesView() {
    // -------------------- STATE --------------------
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Фильтры (значения – ID, для направлений – ID, т.к. бэкенд ожидает числа)
    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [selectedTestAttempts, setSelectedTestAttempts] = useState([]);
    const [selectedCompetencies, setSelectedCompetencies] = useState([]);

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

    const [disciplineData, setDisciplineData] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [allDisciplinesData, setAllDisciplinesData] = useState(null);
    const [selectedDisciplines, setSelectedDisciplines] = useState([]);
    const [activeTab, setActiveTab] = useState('impact');
    const [sankeyImpactData, setSankeyImpactData] = useState(null);

    // Загрузка комплексного анализа всех дисциплин
    const loadAllDisciplinesImpact = async () => {
        setLoading(true);
        setActiveTab('all');

        getAnalyzeAllDisciplinesImpact()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setAllDisciplinesData(data);
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

    const loadDisciplineImpact = async () => {
        setLoading(true);
        setActiveTab('impact');

        const competencies = selectedCompetencies.length > 0 
            ? selectedCompetencies 
            : Object.keys(COMPETENCIES_NAMES).slice(0, 3); // По умолчанию первые 3 компетенции

        postAnalyzeDisciplineImpactAdvanced(
            competencies,
            selectedDisciplines,
            selectedInstitutions,
            selectedDirections,
            5
        )
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setDisciplineData(data.results);
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

    const loadHeatmapData = async () => {
        setLoading(true);
        setActiveTab('heatmap');

        postGetDisciplineHeatmapData(selectedInstitutions, selectedDirections)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setHeatmapData(data.data);
                } else {
                    alert('Ошибка при загрузке данных тепловой карты: ' + (data.message || 'Неизвестная ошибка'));
                }
            })
            .onError(error => {
                console.error(error);
                alert('Ошибка при загрузке данных: ' + error.message);
            })
            .finally(() => setLoading(false));
    };

    const renderAllDisciplinesImpact = () => {
        if (!allDisciplinesData) {
            return <NoData text="Нет данных для отображения" />
        }

        const { impact_matrix, competencies_analyzed } = allDisciplinesData;

        if (!impact_matrix || impact_matrix.length === 0) {
            return <NoData text="Нет данных о влиянии дисциплин" />;
        }

        // Группируем по компетенциям
        const byCompetency = {};
        impact_matrix.forEach(item => {
            if (!byCompetency[item.competency]) {
                byCompetency[item.competency] = [];
            }
            byCompetency[item.competency].push(item);
        });

        return (
            <div className="all-disciplines-results">
                <h4>Комплексный анализ всех дисциплин</h4>
                <p className="info-text">Проанализировано компетенций: {competencies_analyzed}</p>
                
                {Object.entries(byCompetency).map(([comp, items]) => (
                    <div key={comp} className="competency-group">
                        <h5>{COMPETENCIES_NAMES[comp] || comp}</h5>
                        <table className="impact-table">
                            <thead>
                                <tr>
                                    <th>Дисциплина</th>
                                    <th>Effect Size</th>
                                    <th>Эффективность</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.discipline}</td>
                                        <td>
                                            <span className={`effect-badge ${
                                                Math.abs(item.impact_data?.average_effect_size || 0) > 0.5 ? 'large' : 'small'
                                            }`}>
                                                {(item.impact_data?.average_effect_size || 0).toFixed(3)}
                                            </span>
                                        </td>
                                        <td>
                                            {item.impact_data?.effective ? '✅' : '⚠️'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        );
    };

    const renderHeatmap = () => {
        if (!heatmapData || heatmapData.length === 0) {
            return <NoData text="Нет данных для тепловой карты" />;
        }

        const disciplines = [...new Set(heatmapData.map(d => d.discipline))].sort();
        const competencies = [...new Set(heatmapData.map(d => d.competency))].sort();

        return (
            <div className="heatmap-container">
                <Table>
                    <TableHeader>
                        <TableItem>Дисциплина</TableItem>
                        {competencies.map(comp => (
                            <TableItem>{COMPETENCIES_NAMES[comp]}</TableItem>
                        ))}
                    </TableHeader>
                    {disciplines.map(disc => (
                        <TableRow key={disc}>
                            <TableItem>{disc}</TableItem>
                            {competencies.map(comp => {
                                const cell = heatmapData.find(
                                    d => d.discipline === disc && d.competency === comp
                                );
                                const effectSize = cell?.effect_size || 0;
                                const intensity = Math.min(Math.abs(effectSize) / 1.0, 1);
                                const color = (
                                    effectSize >= 0
                                    ? `rgba(76, 175, 80, ${intensity * 0.7})`
                                    : `rgba(244, 67, 54, ${intensity * 0.7})`
                                );
                                return (
                                    <TableItem
                                        className={cell?.significant ? "significant" : ''}
                                        cssVars={{"--bg-color": color}}
                                        title={`Effect size: ${effectSize?.toFixed(2) || '0'}, p=${cell?.p_value?.toFixed(3) || 'N/A'}, n=${cell?.n_students || 0}`}
                                    >
                                        {cell ? effectSize.toFixed(2) : '-'}
                                    </TableItem>
                                );
                            })}
                        </TableRow>
                    ))}
                </Table>
                <FlexRow margin="20 0 0 0">
                    <Label>
                        <FlexRow gap="20">
                            <FlexRow>
                                <ColorBox color={BOX_COLOR.GREEN} />
                                <span>Положительный эффект</span>
                            </FlexRow>
                            <FlexRow>
                                <ColorBox color={BOX_COLOR.RED} />
                                <span>Отрицательный эффект</span>
                            </FlexRow>
                            <span>Жирная граница = статистически значим (p &lt; 0.05)</span>
                        </FlexRow>
                    </Label>
                </FlexRow>
            </div>
        );
    };

    const renderDisciplineImpact = () => {
        if (!disciplineData || disciplineData.length === 0) {
            return <NoData text="Нет данных для анализа влияния" />;
        }

        return (
            <div className="discipline-impact-results">
                {disciplineData.map((result, idx) => (
                    <div key={idx} className="discipline-result-card">
                        <h5>📊 {COMPETENCIES_NAMES[result.competency] || result.competency}</h5>

                        {result.results && result.results.length > 0 ? (
                            result.results.map((disc, didx) => (
                                <TitledCard title={disc.discipline}>
                                    <Table>
                                        <TableHeader>
                                            <TableItem>Оценка</TableItem>
                                            <TableItem>n студ.</TableItem>
                                            <TableItem>Среднее ДО</TableItem>
                                            <TableItem>Среднее ПОСЛЕ</TableItem>
                                            <TableItem>Прирост</TableItem>
                                            <TableItem>Effect Size</TableItem>
                                            <TableItem>p-value</TableItem>
                                            <TableItem>Значим</TableItem>
                                        </TableHeader>
                                        {Object.entries(disc.grade_impacts || {}).map(([grade, impact]) => (
                                            <TableRow key={grade}>
                                                <TableItem>{grade}</TableItem>
                                                <TableItem>{impact.n_students}</TableItem>
                                                <TableItem>{impact.mean_before?.toFixed(1) || '0.0'}</TableItem>
                                                <TableItem>{impact.mean_after?.toFixed(1) || '0.0'}</TableItem>
                                                <TableItem>{impact.mean_gain > 0 ? '+' : ''}{impact.mean_gain?.toFixed(1) || '0.0'}</TableItem>
                                                <TableItem>{impact.cohens_d?.toFixed(3) || '0.000'}</TableItem>
                                                <TableItem>{impact.p_value?.toFixed(4) || '0.0000'}</TableItem>
                                                <TableItem>{impact.significant ? '✓' : '✗'}</TableItem>
                                            </TableRow>
                                        ))}
                                    </Table>
                                    <FlexRow>
                                        <Label>
                                            <FlexRow gap="15">
                                                <span>{disc.summary?.effective ? 'Эффективна' : 'Неэффективна'}</span>
                                                {disc.summary && <>
                                                    <span>Средний эффект: {disc.summary.average_effect_size?.toFixed(3) || '0.000'}</span>
                                                    <span>Средний прирост: {disc.summary.average_gain?.toFixed(1) || '0.0'}</span>
                                                </>}
                                            </FlexRow>
                                        </Label>
                                    </FlexRow>
                                </TitledCard>
                            ))
                        ) : (
                            <NoData text="Нет результатов для этой компетенции" />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    // Функция преобразования
    const prepareSankeyFromHeatmap = (heatmapData) => {
        if (!heatmapData || heatmapData.length === 0) return null;
        const disciplines = [...new Set(heatmapData.map(d => d.discipline))];
        const competencies = [...new Set(heatmapData.map(d => d.competency_label))];
        const nodes = [
            ...disciplines.map(d => ({ name: d, type: 'discipline' })),
            ...competencies.map(c => ({ name: c, type: 'competency' }))
        ];
        const nodeIndex = {};
        nodes.forEach((node, idx) => { nodeIndex[node.name] = idx; });

        const links = heatmapData
            .filter(d => d.effect_size !== null && d.effect_size !== 0)
            .map(d => ({
                source: nodeIndex[d.discipline],
                target: nodeIndex[d.competency_label],
                value: Math.abs(d.effect_size)
            }));
        return { nodes, links };
    };

    // Функция показа Санки
    const showImpactSankey = () => {
        if (!heatmapData) return;
        const prepared = prepareSankeyFromHeatmap(heatmapData);
        if (prepared) {
            setSankeyImpactData(prepared);
            setActiveTab('sankey');
        } else {
            alert('Не удалось построить диаграмму Санки: недостаточно данных.');
        }
    };

    return (
        <div className="AdminAnalysisDisciplinesView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ данных" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Анализ влияния дисциплин на компетенции</h2>

                    <div className="analysis-controls">
                        <MultiSelect
                            options={filterOptions.disciplines || []}
                            value={selectedDisciplines}
                            onChange={setSelectedDisciplines}
                            placeholder="Все дисциплины"
                            searchPlaceholder="Поиск дисциплин..."
                            label="Выберите дисциплины"
                            withSearch={true}
                            showCounts={true}
                            maxHeight="300px"
                        />

                        <FlexRow>
                            <Button
                                text="Анализ влияния"
                                onClick={loadDisciplineImpact}
                                disabled={loading}
                                palette={BUTTON_PALETTE.BLUE}
                            />
                            <Button
                                text="Тепловая карта"
                                onClick={loadHeatmapData}
                                disabled={loading}
                                palette={BUTTON_PALETTE.BROWN}
                            />
                            <Button
                                text="Все дисциплины"
                                onClick={loadAllDisciplinesImpact}
                                disabled={loading}
                                palette={BUTTON_PALETTE.GREEN}
                            />
                            <Button
                                text="Санки влияния"
                                onClick={showImpactSankey}
                                disabled={!heatmapData || loading}
                                palette={BUTTON_PALETTE.PURPLE}
                            />
                        </FlexRow>
                    </div>

                    <LoadingSpinner loading={loading} text="Загрузка анализа дисциплин..." />

                    {!loading && (disciplineData || heatmapData || allDisciplinesData) && <>
                        <FlexRow>
                            {disciplineData && (
                                <Button
                                    text="Влияние дисциплин"
                                    onClick={() => setActiveTab('impact')}
                                    palette={activeTab === 'impact' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                                />
                            )}
                            {heatmapData && (
                                <Button
                                    text="Тепловая карта"
                                    onClick={() => setActiveTab('heatmap')}
                                    palette={activeTab === 'heatmap' ? BUTTON_PALETTE.BROWN : BUTTON_PALETTE.GRAY}
                                />
                            )}
                            {allDisciplinesData && (
                                <Button
                                    text="Комплексный анализ"
                                    onClick={() => setActiveTab('all')}
                                    palette={activeTab === 'all' ? BUTTON_PALETTE.GREEN : BUTTON_PALETTE.GRAY}
                                />
                            )}
                            {sankeyImpactData && (
                                <Button
                                    text="Санки влияния"
                                    onClick={() => setActiveTab('sankey')}
                                    palette={activeTab === 'sankey' ? BUTTON_PALETTE.PURPLE : BUTTON_PALETTE.GRAY}
                                />
                            )}
                        </FlexRow>

                        <div className="tab-content">
                            {activeTab === 'impact' && renderDisciplineImpact()}
                            {activeTab === 'heatmap' && renderHeatmap()}
                            {activeTab === 'all' && renderAllDisciplinesImpact()}
                            {activeTab === 'sankey' && sankeyImpactData && (
                                <>
                                    <SankeyDiagram data={sankeyImpactData} title="Влияние дисциплин на компетенции" height={500} />
                                    <details style={{ marginTop: 16, background: '#f8f9fa', borderRadius: 6, padding: '10px 14px', border: '1px solid #e9ecef' }}>
                                        <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#2c3e50' }}>📖 Что показывает эта диаграмма?</summary>
                                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
                                            <p><strong>Диаграмма Санки</strong> отображает влияние дисциплин на развитие компетенций.</p>
                                            <p>🔵 <strong>Левые узлы</strong> — дисциплины, <strong>правые узлы</strong> — компетенции.</p>
                                            <p>📊 <strong>Толщина потока</strong> пропорциональна величине эффекта (Cohen's d). Чем толще линия, тем сильнее дисциплина влияет на компетенцию.</p>
                                            <p>🎨 <strong>Цвет узлов</strong>: дисциплины — синий, компетенции — оранжевый.</p>
                                            <p>💡 <strong>Совет:</strong> Наведите курсор на поток, чтобы увидеть точное значение Effect Size.</p>
                                        </div>
                                    </details>
                                </>
                            )}
                        </div>
                    </>}
                    
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnalysisDisciplinesView;
