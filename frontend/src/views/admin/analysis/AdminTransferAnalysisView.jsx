import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

import { COMPETENCIES_NAMES, LINK_TREE } from "../../../utilities";
import { getInstitutions, getAnalyzeTransfers, postAnalyzeTransferStudents } from "../../../api";

import FlexRow, { WRAP } from "../../../components/FlexRow";
import LabelledBox from "../../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../../components/SidebarLayout";

import ValueCard from "../../../components/cards/ValueCard";

import Button from "../../../components/ui/Button";
import Select, { Option } from "../../../components/ui/Select";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import NoData from "../../../components/ui/NoData";
import { ADMIN_PALETTE } from "../../../components/ui/palette";

import Table, { TableHeader, TableItem, TableRow } from "../../../components/tables/Table";

import SankeyDiagram from "../../../components/charts/SankeyDiagram";

import "./AdminTransferAnalysisView.scss";

// ── Цвета по типу перевода ──────────────────────────────────
const TYPE_LABEL = {
    institution: 'Смена вуза',
    direction:   'Смена направления',
    both:        'Смена вуза и направления',
};
const TYPE_COLOR = {
    institution: '#e53935',
    direction:   '#1e88e5',
    both:        '#8e24aa',
};

// ── Кастомный тултип для LineChart ─────────────────────────
const TrajectoryTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="traj-tooltip">
            <div className="traj-tooltip-year">{label}</div>
            <div className="traj-tooltip-inst">{d?.institution}</div>
            <div className="traj-tooltip-dir">{d?.direction}</div>
            {d?.score != null && (
                <div className="traj-tooltip-score">Балл: <b>{d.score.toFixed(0)}</b></div>
            )}
        </div>
    );
};

function AdminTransferAnalysisView() {
    // ── Фильтры ────────────────────────────────────────────
    const [institutions, setInstitutions]         = useState([]);
    const [selectedInst, setSelectedInst]         = useState('');
    const [selectedComp, setSelectedComp]         = useState('res_comp_leadership');
    const [selectedType, setSelectedType]         = useState('');

    // ── Данные ────────────────────────────────────────────
    const [summary, setSummary]                   = useState(null);
    const [sankeyData, setSankeyData]             = useState(null);
    const [byType, setByType]                     = useState({});
    const [students, setStudents]                 = useState([]);

    // ── UI ────────────────────────────────────────────────
    const [loading, setLoading]                   = useState(false);
    const [loadingStudents, setLoadingStudents]   = useState(false);
    const [activeTab, setActiveTab]               = useState('sankey');
    const [expandedStudent, setExpandedStudent]   = useState(null);
    const [studentsLoaded, setStudentsLoaded]     = useState(false);

    // ── Загрузка вузов ────────────────────────────────────
    useEffect(() => {
        getInstitutions()
            .onSuccess(r => r.json())
            .onSuccess(data => {
                if (data.status === 'success') setInstitutions(data.institutions || []);
            })
            .onError(console.error);
    }, []);

    // ── Основной анализ ───────────────────────────────────
    const runAnalysis = () => {
        setLoading(true);
        setSummary(null);
        setSankeyData(null);
        setStudents([]);
        setStudentsLoaded(false);

        const params = new URLSearchParams({
            competency:    selectedComp,
            transfer_type: selectedType,
        });
        if (selectedInst) params.set('institution_id', selectedInst);

        getAnalyzeTransfers(params.toString())
            .onSuccess(r => r.json())
            .onSuccess(data => {
                if (data.status === 'success') {
                    setSummary(data.summary);
                    setSankeyData(data.sankey?.nodes?.length ? data.sankey : null);
                    setByType(data.by_type || {});
                    setActiveTab('sankey');
                }
            })
            .onError(console.error)
            .finally(() => setLoading(false));
    };

    // ── Детальный список студентов (по кнопке) ───────────
    const loadStudents = () => {
        setLoadingStudents(true);
        postAnalyzeTransferStudents({
            institution_id: selectedInst || null,
            competency:     selectedComp,
            transfer_type:  selectedType,
            limit: 100,
        })
            .onSuccess(r => r.json())
            .onSuccess(data => {
                if (data.status === 'success') {
                    setStudents(data.students || []);
                    setStudentsLoaded(true);
                    setActiveTab('students');
                }
            })
            .onError(console.error)
            .finally(() => setLoadingStudents(false));
    };

    // ── Рендер вкладки Санки ──────────────────────────────
    const renderSankey = () => {
        if (!sankeyData) return <NoData text="Нет данных о переводах. Запустите анализ." />;
        return (
            <>
                <SankeyDiagram
                    data={sankeyData}
                    title="Потоки переводов студентов"
                    height={520}
                />
                <div className="sankey-legend">
                    <p>Каждый узел — пара «вуз / направление». Толщина потока = число переведённых студентов.</p>
                </div>
            </>
        );
    };

    // ── Рендер списка студентов ───────────────────────────
    const renderStudents = () => {
        if (!studentsLoaded) return (
            <div style={{ textAlign: 'center', padding: 24 }}>
                <Button
                    text={loadingStudents ? "Загрузка..." : "Загрузить список студентов"}
                    onClick={loadStudents}
                    disabled={loadingStudents || !summary}
                    palette={ADMIN_PALETTE.BLUE}
                />
            </div>
        );
        if (!students.length) return <NoData text="Нет студентов с переводами по заданным фильтрам." />;

        return (
            <div className="students-list">
                {students.map(student => {
                    const isOpen = expandedStudent === student.part_id;
                    // Точки перевода для ReferenceLine
                    const transferYears = student.transfers.map(t => t.year);

                    return (
                        <div key={student.part_id} className="student-card">
                            <div
                                className="student-card-header"
                                onClick={() => setExpandedStudent(isOpen ? null : student.part_id)}
                            >
                                <span className="student-rsv">{student.rsv_id}</span>
                                <span className="transfer-badges">
                                    {student.transfers.map((t, i) => (
                                        <span
                                            key={i}
                                            className="transfer-badge"
                                            style={{ background: TYPE_COLOR[t.type] }}
                                            title={`${t.year}: ${TYPE_LABEL[t.type]}`}
                                        >
                                            {t.year}
                                        </span>
                                    ))}
                                </span>
                                <span className="expand-icon">{isOpen ? '▲' : '▼'}</span>
                            </div>

                            {isOpen && (
                                <div className="student-card-body">
                                    {/* История переводов */}
                                    <div className="transfers-history">
                                        {student.transfers.map((t, i) => (
                                            <div key={i} className="transfer-event" style={{ borderLeftColor: TYPE_COLOR[t.type] }}>
                                                <span className="te-year">{t.year}</span>
                                                <span className="te-type" style={{ color: TYPE_COLOR[t.type] }}>
                                                    {TYPE_LABEL[t.type]}
                                                </span>
                                                <div className="te-detail">
                                                    {t.type !== 'direction' && (
                                                        <div>🏛 {t.from_inst} → {t.to_inst}</div>
                                                    )}
                                                    {t.type !== 'institution' && (
                                                        <div>📚 {t.from_dir} → {t.to_dir}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* График траектории */}
                                    {student.trajectory.some(p => p.score != null) && (
                                        <div className="trajectory-chart">
                                            <ResponsiveContainer width="100%" height={200}>
                                                <LineChart
                                                    data={student.trajectory}
                                                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                                                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                                                    <Tooltip content={<TrajectoryTooltip />} />
                                                    {transferYears.map(year => (
                                                        <ReferenceLine
                                                            key={year}
                                                            x={year}
                                                            stroke="#e53935"
                                                            strokeDasharray="4 3"
                                                            label={{ value: '↑ перевод', position: 'top', fontSize: 10, fill: '#e53935' }}
                                                        />
                                                    ))}
                                                    <Line
                                                        type="monotone"
                                                        dataKey="score"
                                                        stroke="#1565c0"
                                                        strokeWidth={2}
                                                        dot={{ r: 4 }}
                                                        connectNulls={false}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}

                                    {/* Таблица-траектория */}
                                    <Table>
                                        <TableHeader>
                                            <TableItem>Год</TableItem>
                                            <TableItem>Курс</TableItem>
                                            <TableItem>Вуз</TableItem>
                                            <TableItem>Направление</TableItem>
                                            <TableItem>{COMPETENCIES_NAMES[selectedComp] || 'Балл'}</TableItem>
                                        </TableHeader>
                                        {student.trajectory.map((point, pi) => {
                                            const isTransfer = transferYears.includes(point.year);
                                            return (
                                                <TableRow key={pi} style={isTransfer ? { background: 'rgba(229,57,53,0.07)' } : {}}>
                                                    <TableItem>
                                                        {isTransfer
                                                            ? <b style={{ color: '#e53935' }}>{point.year} ↑</b>
                                                            : point.year}
                                                    </TableItem>
                                                    <TableItem>{point.course ?? '—'}</TableItem>
                                                    <TableItem>{point.institution}</TableItem>
                                                    <TableItem>{point.direction}</TableItem>
                                                    <TableItem>{point.score?.toFixed(0) ?? '—'}</TableItem>
                                                </TableRow>
                                            );
                                        })}
                                    </Table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── Render ────────────────────────────────────────────
    return (
        <div className="AdminTransferAnalysisView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Анализ переводов" name="Администратор" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <h2>Анализ студентов, сменивших вуз или направление</h2>
                    <p className="page-description">
                        Анализирует как меняются компетенции у студентов после перевода.
                        Диаграмма Санки показывает потоки между парами «вуз / направление».
                    </p>

                    {/* ── Фильтры ── */}
                    <div className="filters-bar">
                        <LabelledBox label="Вуз:" inrow nopad>
                            <Select initValue="" onChange={setSelectedInst}>
                                <Option value="" label="Все вузы" />
                                {institutions.map(i => (
                                    <Option key={i.inst_id} value={String(i.inst_id)} label={i.inst_name} />
                                ))}
                            </Select>
                        </LabelledBox>

                        <LabelledBox label="Компетенция:" inrow nopad>
                            <Select initValue={selectedComp} onChange={setSelectedComp}>
                                {Object.entries(COMPETENCIES_NAMES).map(([k, name]) => (
                                    <Option key={k} value={k} label={name} />
                                ))}
                            </Select>
                        </LabelledBox>

                        <LabelledBox label="Тип перевода:" inrow nopad>
                            <Select initValue="" onChange={setSelectedType}>
                                <Option value=""            label="Все типы" />
                                <Option value="institution" label="Смена вуза" />
                                <Option value="direction"   label="Смена направления" />
                                <Option value="both"        label="Смена вуза и направления" />
                            </Select>
                        </LabelledBox>

                        <Button
                            text={loading ? "Анализ..." : "Запустить анализ"}
                            onClick={runAnalysis}
                            disabled={loading}
                            palette={ADMIN_PALETTE.CYAN}
                        />
                    </div>

                    <LoadingSpinner loading={loading} text="Поиск студентов с переводами..." />

                    {/* ── Сводка ── */}
                    {summary && (
                        <FlexRow wrap={WRAP.DO} gap="12" margin="16 0">
                            {/* Студентов с переводами */}
                            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                <ValueCard
                                    title="Студентов с переводами"
                                    value={summary.total_transfer_students}
                                    tooltip="Уникальные студенты, у которых зафиксирован хотя бы один перевод (смена вуза, направления или оба)"
                                />
                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                    Уникальных студентов
                                </div>
                            </div>

                            {/* Смен вуза */}
                            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                <ValueCard
                                    title="Смен вуза"
                                    value={(byType.institution || 0) + (byType.both || 0)}
                                    tooltip="Суммарное количество событий, где студент сменил вуз (включая одновременную смену направления)"
                                />
                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                    Переводов по ВУЗам
                                </div>
                            </div>

                            {/* Смен направления */}
                            <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                <ValueCard
                                    title="Смен направления"
                                    value={(byType.direction || 0) + (byType.both || 0)}
                                    tooltip="Суммарное количество событий, где студент сменил направление обучения (включая одновременную смену вуза)"
                                />
                                <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                    Переводов по направлениям
                                </div>
                            </div>

                            {/* Средний балл ДО перевода */}
                            {summary.avg_comp_before_transfer != null && (
                                <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                    <ValueCard
                                        title="Ср. балл ДО перевода"
                                        value={summary.avg_comp_before_transfer}
                                        tooltip="Средний балл по выбранной компетенции за год, предшествующий переводу"
                                    />
                                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                        Баллы за год до перевода
                                    </div>
                                </div>
                            )}

                            {/* Средний балл ПОСЛЕ перевода */}
                            {summary.avg_comp_after_transfer != null && (
                                <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                    <ValueCard
                                        title="Ср. балл ПОСЛЕ перевода"
                                        value={summary.avg_comp_after_transfer}
                                        tooltip="Средний балл по выбранной компетенции за первый год после перевода"
                                    />
                                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                        Баллы за год после перевода
                                    </div>
                                </div>
                            )}

                            {/* Дельта (изменение) */}
                            {summary.delta != null && (
                                <div style={{ flex: '1 1 180px', minWidth: '140px' }}>
                                    <ValueCard
                                        title="Δ после перевода"
                                        value={`${summary.delta > 0 ? '+' : ''}${summary.delta}`}
                                        tooltip="Разница среднего балла после перевода и до него. Положительное значение = рост компетенции."
                                    />
                                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px', textAlign: 'center' }}>
                                        Дельта (после − до)
                                    </div>
                                </div>
                            )}
                        </FlexRow>
                    )}

                    {/* ── Вкладки ── */}
                    {summary && (
                        <>
                            <FlexRow wrap={WRAP.DO} gap="8" margin="0 0 12 0">
                                <Button
                                    text="Диаграмма Санки"
                                    onClick={() => setActiveTab('sankey')}
                                    palette={activeTab === 'sankey' ? ADMIN_PALETTE.CYAN : ADMIN_PALETTE.GRAY}
                                />
                                <Button
                                    text={`Студенты${studentsLoaded ? ` (${students.length})` : ''}`}
                                    onClick={() => { setActiveTab('students'); if (!studentsLoaded) loadStudents(); }}
                                    disabled={loadingStudents}
                                    palette={activeTab === 'students' ? ADMIN_PALETTE.BROWN : ADMIN_PALETTE.GRAY}
                                />
                            </FlexRow>

                            <LoadingSpinner loading={loadingStudents} text="Загрузка студентов..." />

                            {!loading && !loadingStudents && (
                                <div className="tab-content">
                                    {activeTab === 'sankey'   && renderSankey()}
                                    {activeTab === 'students' && renderStudents()}
                                </div>
                            )}
                        </>
                    )}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminTransferAnalysisView;