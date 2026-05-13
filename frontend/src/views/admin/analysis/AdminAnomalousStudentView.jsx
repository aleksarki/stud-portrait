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
            selectedDirections.map(id => Number(id))
        )
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    setBoxplotData(data);
                    setStats(data.statistics);
                    setOutliers(data.outliers);
                } else {
                    alert(data.message || "Ошибка загрузки");
                    setBoxplotData(null);
                    setOutliers([]);
                    setStats(null);
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
        <div className="AnomalousStudentsView">
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
                    </div>

                    <LoadingSpinner loading={loading} text="Анализ распределения..." />

                    {!loading && stats && (
                        <>
                            <FlexRow justify={JUSTIFY.CENTER} gap="10" wrap={WRAP.DO}>
                                <ValueCard value={stats.count} text="Всего студентов" />
                                <ValueCard value={stats.mean.toFixed(1)} text="Средний балл" />
                                <ValueCard value={stats.median.toFixed(1)} text="Медиана" />
                                <ValueCard value={`${stats.lower_fence.toFixed(1)} – ${stats.upper_fence.toFixed(1)}`} text="Границы нормы" />
                                <ValueCard value={outliers.length} text="Аномальных студентов" />
                            </FlexRow>

                            <TitledCard title="📊 Распределение баллов (ящик с усами)">
                                <div className="boxplot-container">
                                    <BoxplotChart stats={stats} />
                                </div>
                                <div className="boxplot-legend">
                                    <div><span className="box"></span> Межквартильный размах (IQR)</div>
                                    <div><span className="whisker"></span> Усы (1.5×IQR)</div>
                                    <div><span className="median"></span> Медиана</div>
                                    <div><span className="outlier"></span> Аномальные значения (выбросы)</div>
                                </div>
                            </TitledCard>

                            <TitledCard title="⚠️ Список аномальных студентов">
                                {outliers.length === 0 ? (
                                    <NoData text="Аномалий не обнаружено" />
                                ) : (
                                    <table className="anomalies-table">
                                        <thead>
                                            <tr><th>Студент</th><th>ВУЗ</th><th>Направление</th><th>Балл</th><th>Отклонение</th></tr>
                                        </thead>
                                        <tbody>
                                            {outliers.map(s => {
                                                const isHigh = s.score > stats.upper_fence;
                                                const deviation = isHigh
                                                    ? (s.score - stats.upper_fence).toFixed(1)
                                                    : (stats.lower_fence - s.score).toFixed(1);
                                                return (
                                                    <tr key={s.student_id}>
                                                        <td>{s.name}</td>
                                                        <td>{s.institution}</td>
                                                        <td>{s.direction}</td>
                                                        <td className={isHigh ? "high" : "low"}>{s.score}</td>
                                                        <td>{isHigh ? `↑ ${deviation}` : `↓ ${deviation}`}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </TitledCard>

                            <AiInsightPanel
                                contextType="general"
                                filters={{
                                    institutions: selectedInstitutions,
                                    directions: selectedDirections,
                                    competency: selectedCompetency,
                                }}
                                label="Анализ аномалий"
                                disabled={loading}
                            />
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