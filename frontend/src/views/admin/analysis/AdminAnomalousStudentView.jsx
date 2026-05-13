// views/admin/analysis/AdminAnomalousStudentView.jsx

import { useEffect, useState } from "react";

import {
    postGetBoxplotData,
    getPortraitGetFilterOptionsWithCounts,
    postPortraitDataseshNew,
    getPortraitGetInstitutionDirections,
} from "../../../api";
import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";

import AiInsightPanel from "../../../components/AiInsightPanel";
import FlexRow, { JUSTIFY, WRAP } from "../../../components/FlexRow";
import LabelledBox from "../../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";
import TitledCard from "../../../components/cards/TitledCard";
import ValueCard from "../../../components/cards/ValueCard";
import Button from "../../../components/ui/Button";
import NoData from "../../../components/ui/NoData";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import MultiSelect from "../../../components/ui/MultiSelect";
import { ADMIN_PALETTE } from "../../../components/ui/palette";
import Select, { Option } from "../../../components/ui/Select";

import BoxplotChart from "../../../components/charts/BoxplotChart";
import "./AdminAnomalousStudentView.scss";

function AdminAnomalousStudentView() {
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);

    const [selectedInstitutions, setSelectedInstitutions] = useState([]);
    const [selectedDirections, setSelectedDirections] = useState([]);
    const [selectedCompetency, setSelectedCompetency] = useState('res_comp_leadership');

    const [filterOptions, setFilterOptions] = useState({
        institutions: [],
        directions: [],
        allDirections: [],
    });

    const [boxplotData, setBoxplotData] = useState(null);
    const [outliers, setOutliers] = useState([]);
    const [stats, setStats] = useState(null);

    const [groupedData, setGroupedData] = useState(null);
    const [groupByMode, setGroupByMode] = useState('auto');

    useEffect(() => {
        postPortraitDataseshNew()
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    setSessionId(data.session_id);
                    loadFilterOptions(data.session_id);
                }
            })
            .onError(console.error);
    }, []);

    const loadFilterOptions = async (sid) => {
        getPortraitGetFilterOptionsWithCounts(sid, [], [], [], [], [])
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    const institutions = (data.data?.institutions || []).map(i => ({
                        id: Number(i.id),
                        name: i.name,
                        count: i.count,
                    }));
                    const allDirections = (data.data?.directions || []).map(d => ({
                        id: Number(d.id),
                        name: d.name,
                        count: d.count,
                    }));
                    setFilterOptions({
                        institutions,
                        directions: allDirections,
                        allDirections,
                    });
                }
            })
            .onError(console.error);
    };

    useEffect(() => {
        if (!sessionId) return;
        if (selectedInstitutions.length === 0) {
            setFilterOptions(prev => ({ ...prev, directions: prev.allDirections }));
            return;
        }
        getPortraitGetInstitutionDirections(selectedInstitutions)
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    const directions = data.directions.map(d => ({ id: d.id, name: d.name, count: 0 }));
                    setFilterOptions(prev => ({ ...prev, directions }));
                    const newIds = new Set(directions.map(d => d.id));
                    setSelectedDirections(prev => prev.filter(id => newIds.has(id)));
                }
            })
            .onError(console.error);
    }, [selectedInstitutions, sessionId]);

    const loadAnomalies = () => {
        if (!selectedCompetency) {
            alert("Выберите компетенцию");
            return;
        }
        setLoading(true);
        postGetBoxplotData(
            selectedCompetency,
            selectedInstitutions.map(id => Number(id)),
            selectedDirections.map(id => Number(id)),
            groupByMode   // передаём режим группировки
        )
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    if (data.grouped) {
                        // Группированный режим
                        setGroupedData(data.groups);
                        setStats(null);
                        setOutliers([]);
                        setBoxplotData(data);
                    } else {
                        // Одиночный режим (совместимость со старой версией)
                        setBoxplotData(data);
                        setStats(data.statistics);
                        setOutliers(data.outliers);
                        setGroupedData(null);
                    }
                } else {
                    alert(data.message || "Ошибка загрузки");
                    setBoxplotData(null);
                    setOutliers([]);
                    setStats(null);
                    setGroupedData(null);
                }
            })
            .onError(err => {
                console.error(err);
                alert("Ошибка при загрузке данных");
            })
            .finally(() => setLoading(false));
    };

    const resetFilters = () => {
        setSelectedInstitutions([]);
        setSelectedDirections([]);
        setSelectedCompetency('res_comp_leadership');
        setBoxplotData(null);
        setOutliers([]);
        setStats(null);
    };

    return (
        <div className="AdminAnomalousStudentView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Аномальные студенты" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Выявление выбросов по компетенциям (метод ящиков с усами)</h2>

                    <div className="filters-section">
                        <FlexRow wrap={WRAP.DO} gap="15" alignItems="end">
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
                            <LabelledBox label="Компетенция:" inrow nopad>
                                <Select initValue={selectedCompetency} onChange={setSelectedCompetency}>
                                    {Object.entries(COMPETENCIES_NAMES).map(([key, name]) => (
                                        <Option key={key} value={key} label={name} />
                                    ))}
                                </Select>
                            </LabelledBox>
                            <Button
                                text="Найти аномалии"
                                onClick={loadAnomalies}
                                palette={ADMIN_PALETTE.CYAN}
                                disabled={loading}
                            />
                            <Button
                                text="Сбросить"
                                onClick={resetFilters}
                                palette={ADMIN_PALETTE.GRAY}
                                disabled={loading}
                            />
                        </FlexRow>
                        <LabelledBox label="Группировка:" inrow nopad>
                            <Select initValue={groupByMode} onChange={setGroupByMode}>
                                <Option value="auto" label="Авто (по вузам/направлениям)" />
                                <Option value="institution" label="По вузам" />
                                <Option value="direction" label="По направлениям" />
                                <Option value="none" label="Общая" />
                            </Select>
                        </LabelledBox>
                    </div>

                    <LoadingSpinner loading={loading} text="Анализ распределения..." />

                    {!loading && groupedData && (
                        <>
                            <FlexRow justify={JUSTIFY.CENTER} gap="10" wrap={WRAP.DO}>
                                <ValueCard value={groupedData.length} text="Групп" />
                                <ValueCard value={groupedData.reduce((sum, g) => sum + g.statistics.count, 0)} text="Всего студентов" />
                                <ValueCard value={groupedData.reduce((sum, g) => sum + g.outliers.length, 0)} text="Аномальных студентов" />
                            </FlexRow>

                            <TitledCard title={`Распределение по ${groupByMode === 'institution' ? 'вузам' : 'направлениям'}`}>
                                <div className="boxplot-grid">
                                    {groupedData.map(group => (
                                        <div key={group.group_id} className="boxplot-group-card">
                                            <h4>{group.group_name}</h4>
                                            <div className="boxplot-container-small">
                                                <BoxplotChart stats={group.statistics} width={300} height={250} />
                                            </div>
                                            <div className="boxplot-stats-summary">
                                                <span>n={group.statistics.count}</span>
                                                <span>медиана={group.statistics.median.toFixed(1)}</span>
                                                <span>выбросов={group.outliers.length}</span>
                                            </div>
                                            <details className="outliers-details">
                                                <summary>Аномальные студенты ({group.outliers.length})</summary>
                                                <table className="anomalies-table-small">
                                                    <thead><tr><th>Студент</th><th>Балл</th></tr></thead>
                                                    <tbody>
                                                        {group.outliers.map(s => (
                                                            <tr key={s.student_id}>
                                                                <td>{s.name}</td>
                                                                <td className={s.score > group.statistics.upper_fence ? "high" : "low"}>{s.score}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            </TitledCard>
                        </>
                    )}

                    {!loading && !stats && (
                        <NoData text="Выберите фильтры и нажмите 'Найти аномалии'" />
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminAnomalousStudentView;