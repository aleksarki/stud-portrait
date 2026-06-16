import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import ReactApexChart from 'react-apexcharts';

import { getFilterDash, getScoresResult, 
    getGradesCompetencyCorrelation } from '../../api.js';

import { COMPETENCIES_NAMES, COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import FlexRow, { WRAP } from '../../components/FlexRow.jsx';

import "./AdminAPView.scss";


const scores={
    2:'неудовл.',
    3:'удовл.',
    4:'хор.',
    5:'отл.'
};

function DisciplineScatter({ discipline, participants }) {
    const [selectedComp, setSelectedComp] = useState('avg');
    
    const chartData = participants.map(p => {
        const x = selectedComp === 'avg' ? p.avg : p[selectedComp];
        return x != null && x != 0 && p.grade != null
            ? { x, y: p.grade, id: p.participant_id }
            : null;
        })
        .filter(Boolean);
    let label_text = selectedComp ==='avg' ? 'Средний балл компетенций' : `${COMPETENCIES_NAMES[selectedComp]} - балл`
    return (
        <div className="ds-card">
        <div className="ds-header">
            <h4 className="ds-title">{discipline}</h4>
            <select
                className="ds-select"
                value={selectedComp}
                onChange={e => setSelectedComp(e.target.value)}
                
            >
            <option value="avg">Средний балл</option>
            {Object.keys(COMPETENCIES_NAMES).map(k => (
                <option key={k} value={k}>{COMPETENCIES_NAMES[k]}</option>
            ))}
            </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 32, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <ReferenceLine y={0} stroke="#333" strokeWidth={1} />

            <XAxis
                type="number"
                dataKey="x"
                domain={[170, 800]}
                name="Балл"
                label={{ value: label_text, position: 'insideBottom', offset: -16, fontSize: 11, fill: '#94a3b8' }}
                tick={{ fontSize: 11, fill: ' #94a3b8' }}
                tickLine={false}
            />
            <YAxis
                type="number"
                dataKey="y"
                domain={[1, 6]}
                ticks={[2, 3, 4, 5]}
                name="Оценка"
                label={{ value: 'Оценка', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
                tick={{ fontSize: 11, fill: ' #94a3b8' }}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(value, name, props) =>  [Math.round(value*100)/100, (props.dataKey === 'y' ? 'Оценка' : 'Балл')]}
                cursor={{ strokeDasharray: '3 3' }}
            />

            <Scatter
                data={chartData}
                fill="rgb(101, 142, 208)"
                fillOpacity={0.15}
                stroke="rgb(101, 142, 208)"
                strokeOpacity={0.5}
                r={4}
            />
            </ScatterChart>
        </ResponsiveContainer>

        </div>
    );}
          
function DisciplineScatterGrid({ data, discipline }) {
    if (data == [] || !discipline)
        return <div> Нет данных для отображения по текущим параметрам </div>;
    console.log(data, discipline);
    if (!(data.find(d => d.discipline === discipline))) return <div>Ошибка при загрузке дисциплин</div>;
    const filtered = data.find(d => d.discipline === discipline);   
    return (
        <div className="ds-grid">
        <DisciplineScatter
            key={discipline}
            discipline={discipline}
            participants={filtered.participants}
            />
        </div>
    );
}

function CorrelationHeatmap({ data, loading }) {
    // Состояние: сколько дисциплин показывать (по умолчанию топ-20 по объёму данных)
    const [topN, setTopN] = useState(20);

    if (loading) {
        return <div style={{ padding: 20 }}>Загрузка тепловой карты...</div>;
    }
    if (!data || !data.correlations || data.correlations.length === 0) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                Нет данных для построения тепловой карты корреляций
            </div>
        );
    }

    const competencies = data.competencies || [];

    // Группируем correlations по дисциплинам и считаем суммарный объём данных n
    const disciplineStats = {};
    data.correlations.forEach(c => {
        if (!disciplineStats[c.discipline]) {
            disciplineStats[c.discipline] = { total_n: 0, items: {} };
        }
        disciplineStats[c.discipline].total_n += c.n || 0;
        disciplineStats[c.discipline].items[c.competency] = c.value;
    });

    // Сортируем дисциплины по объёму данных (от большего к меньшему)
    const sortedDisciplines = Object.keys(disciplineStats)
        .sort((a, b) => disciplineStats[b].total_n - disciplineStats[a].total_n)
        .slice(0, topN);

    // Готовим series для ApexCharts:
    // каждая series — это одна компетенция (строка),
    // её data — массив {x: дисциплина, y: значение корреляции}
    const series = competencies.map(compKey => ({
        name: COMPETENCIES_NAMES[compKey] || compKey,
        data: sortedDisciplines.map(disc => ({
            x: disc.length > 30 ? disc.slice(0, 30) + '…' : disc,
            y: disciplineStats[disc].items[compKey] != null
                ? Math.round(disciplineStats[disc].items[compKey] * 100) / 100
                : null,
        })),
    }));

    const options = {
        chart: {
            type: 'heatmap',
            toolbar: { show: true },
            fontFamily: 'inherit',
        },
        plotOptions: {
            heatmap: {
                shadeIntensity: 0.5,
                radius: 2,
                useFillColorAsStroke: false,
                colorScale: {
                    ranges: [
                        { from: -1.00, to: -0.50, name: 'Сильная отрицательная', color: '#c0392b' },
                        { from: -0.50, to: -0.20, name: 'Умеренная отрицательная', color: '#e67e22' },
                        { from: -0.20, to: 0.20, name: 'Слабая / нет связи', color: '#ecf0f1' },
                        { from: 0.20, to: 0.50, name: 'Умеренная положительная', color: '#3498db' },
                        { from: 0.50, to: 1.00, name: 'Сильная положительная', color: '#1f66b6' },
                    ],
                },
            },
        },
        dataLabels: {
            enabled: true,
            style: { fontSize: '10px', colors: ['#000'] },
            formatter: v => v == null ? '' : v.toFixed(2),
        },
        xaxis: {
            type: 'category',
            labels: {
                rotate: -45,
                style: { fontSize: '10px' },
                trim: true,
            },
        },
        yaxis: {
            labels: { style: { fontSize: '11px' } },
        },
        tooltip: {
            y: {
                formatter: v => v == null ? 'нет данных' : `корреляция ${v.toFixed(2)}`,
            },
        },
        title: {
            text: '',
        },
    };

    return (
        <div className="correlation-heatmap" style={{
            background: '#fff',
            borderRadius: 8,
            padding: 20,
            marginTop: 20,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
            }}>
                <h2 style={{ margin: 0, color: '#333' }}>
                    Корреляция оценок и компетенций
                </h2>
                <label style={{ fontSize: 14, color: '#555' }}>
                    Дисциплин показать:&nbsp;
                    <select
                        value={topN}
                        onChange={e => setTopN(Number(e.target.value))}
                        style={{ padding: '4px 8px', borderRadius: 4 }}
                    >
                        <option value={10}>Топ-10</option>
                        <option value={20}>Топ-20</option>
                        <option value={30}>Топ-30</option>
                        <option value={50}>Топ-50</option>
                    </select>
                </label>
            </div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Корреляция Пирсона между оценкой за дисциплину и баллом по компетенции.
                Дисциплины отсортированы по количеству наблюдений.
            </div>
            <ReactApexChart
                options={options}
                series={series}
                type="heatmap"
                height={Math.max(400, competencies.length * 35)}
            />
        </div>
    );
}

function CorrelationScatter({ correlationData, loading, filters }) {
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedCompetency, setSelectedCompetency] = useState('');
    const [scatterPoints, setScatterPoints] = useState([]);
    const [loadingScatter, setLoadingScatter] = useState(false);

    // При получении общего correlationData — выставляем первую пару (с авто-scatter)
    useEffect(() => {
        if (correlationData && correlationData.scatter && correlationData.scatter.length > 0) {
            const first = correlationData.scatter[0];
            setSelectedDiscipline(first.discipline);
            setSelectedCompetency(first.competency);
            setScatterPoints(correlationData.scatter);
        }
    }, [correlationData]);

    // Перезагружаем точки при изменении пары
    useEffect(() => {
        if (!selectedDiscipline || !selectedCompetency) return;
        setLoadingScatter(true);
        getGradesCompetencyCorrelation(
            filters.institute,
            filters.specialty,
            filters.year,
            selectedDiscipline,
            selectedCompetency,
        )
            .onSuccess(async response => {
                const data = await response.json();
                setScatterPoints(data.scatter || []);
            })
            .onError(err => console.error("Ошибка при загрузке точек:", err))
            .finally(() => setLoadingScatter(false));
    }, [selectedDiscipline, selectedCompetency, filters]);

    if (loading) return <div style={{ padding: 20 }}>Загрузка диаграммы рассеяния...</div>;
    if (!correlationData || !correlationData.disciplines || correlationData.disciplines.length === 0) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                Нет данных для построения диаграммы рассеяния
            </div>
        );
    }

    const currentCorr = (correlationData.correlations || []).find(
        c => c.discipline === selectedDiscipline && c.competency === selectedCompetency
    );

    // Статистика по оценкам
    const gradeStats = {};
    scatterPoints.forEach(p => {
        const g = p.grade;
        if (!gradeStats[g]) gradeStats[g] = { count: 0, sum: 0 };
        gradeStats[g].count += 1;
        gradeStats[g].sum += p.comp_value;
    });

    // Цвета по оценкам
    const GRADE_COLORS = {
        2: '#c0392b',  // красный
        3: '#e67e22',  // оранжевый
        4: '#3498db',  // голубой
        5: '#1f66b6',  // тёмно-синий
    };
    const GRADE_LABELS = { 2: 'Неуд.', 3: 'Удовл.', 4: 'Хор.', 5: 'Отл.' };

    // Группировка точек по оценкам (для разноцветных series)
    const seriesByGrade = {};
    scatterPoints.forEach(p => {
        const g = p.grade;
        if (!seriesByGrade[g]) seriesByGrade[g] = [];
        seriesByGrade[g].push({
            x: p.grade + (Math.random() - 0.5) * 0.35,  // jitter
            y: p.comp_value,
        });
    });

    const series = Object.keys(seriesByGrade)
        .sort((a, b) => Number(a) - Number(b))
        .map(g => ({
            name: `Оценка ${g} (${GRADE_LABELS[g] || ''})`,
            type: 'scatter',
            data: seriesByGrade[g],
            color: GRADE_COLORS[g] || '#888',
        }));

    // Линия тренда — линейная регрессия y = a*x + b
    let trendSeries = null;
    if (scatterPoints.length >= 2) {
        const n = scatterPoints.length;
        const xs = scatterPoints.map(p => p.grade);
        const ys = scatterPoints.map(p => p.comp_value);
        const sumX = xs.reduce((s, x) => s + x, 0);
        const sumY = ys.reduce((s, y) => s + y, 0);
        const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
        const sumX2 = xs.reduce((s, x) => s + x * x, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (denom !== 0) {
            const slope = (n * sumXY - sumX * sumY) / denom;
            const intercept = (sumY - slope * sumX) / n;
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            trendSeries = {
                name: 'Линия тренда',
                type: 'line',
                data: [
                    { x: minX, y: slope * minX + intercept },
                    { x: maxX, y: slope * maxX + intercept },
                ],
                color: '#2c3e50',
            };
        }
    }
    const finalSeries = trendSeries ? [...series, trendSeries] : series;

    // Автомасштаб Y
    const allYs = scatterPoints.map(p => p.comp_value);
    const yMin = allYs.length ? Math.max(0, Math.floor(Math.min(...allYs) - 50)) : 0;
    const yMax = allYs.length ? Math.ceil(Math.max(...allYs) + 50) : 1000;

    // Опции ApexCharts
    const options = {
        chart: {
            type: 'line',
            zoom: { enabled: true, type: 'xy' },
            toolbar: { show: true },
            fontFamily: 'inherit',
        },
        xaxis: {
            type: 'numeric',
            tickAmount: 4,
            min: 1.5,
            max: 5.5,
            title: { text: 'Оценка' },
            labels: { formatter: v => Math.round(v).toString() },
        },
        yaxis: {
            title: { text: 'Балл по компетенции' },
            min: yMin,
            max: yMax,
            labels: { formatter: v => Math.round(v) },
        },
        markers: {
            size: [3, 3, 3, 3, 0],
            strokeWidth: 0,
            fillOpacity: 0.55,
        },
        stroke: {
            width: [0, 0, 0, 0, 3],
            curve: 'straight',
            dashArray: [0, 0, 0, 0, 6],
        },
        legend: {
            position: 'top',
            horizontalAlign: 'center',
            fontSize: '13px',
        },
        tooltip: {
            shared: false,
            x: { formatter: v => `оценка ${Math.round(v)}` },
            y: { formatter: v => `${Math.round(v)} баллов` },
        },
        grid: { strokeDashArray: 4 },
    };

    return (
        <div className="correlation-scatter" style={{
            background: '#fff',
            borderRadius: 8,
            padding: 20,
            marginTop: 20,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}>
            <h2 style={{ marginBottom: 16, color: '#333' }}>
                Диаграмма рассеяния: оценка ↔ компетенция
            </h2>

            {/* Селекты выбора пары */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 250 }}>
                    <span style={{ fontSize: 13, color: '#666' }}>Дисциплина</span>
                    <select
                        value={selectedDiscipline}
                        onChange={e => setSelectedDiscipline(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
                    >
                        <option value="">— выберите —</option>
                        {correlationData.disciplines.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 250 }}>
                    <span style={{ fontSize: 13, color: '#666' }}>Компетенция</span>
                    <select
                        value={selectedCompetency}
                        onChange={e => setSelectedCompetency(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
                    >
                        <option value="">— выберите —</option>
                        {(correlationData.competencies || []).map(c => (
                            <option key={c} value={c}>
                                {COMPETENCIES_NAMES[c] || c}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Корреляция */}
            {currentCorr && (
                <div style={{ fontSize: 14, color: '#444', marginBottom: 12 }}>
                    Корреляция Пирсона: <strong>{currentCorr.value.toFixed(3)}</strong>
                    {' '}(на основе {currentCorr.n} наблюдений)
                </div>
            )}

            {/* Статистика по оценкам */}
            {Object.keys(gradeStats).length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 16,
                    padding: 12,
                    background: '#f8f9fa',
                    borderRadius: 6,
                }}>
                    {Object.keys(gradeStats)
                        .sort((a, b) => Number(a) - Number(b))
                        .map(g => {
                            const s = gradeStats[g];
                            const avg = (s.sum / s.count).toFixed(1);
                            return (
                                <div
                                    key={g}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#fff',
                                        border: `2px solid ${GRADE_COLORS[g] || '#888'}`,
                                        borderRadius: 4,
                                        fontSize: 13,
                                        minWidth: 130,
                                    }}
                                >
                                    <div style={{ fontWeight: 600, color: GRADE_COLORS[g] || '#333' }}>
                                        Оценка {g} ({GRADE_LABELS[g] || ''})
                                    </div>
                                    <div style={{ color: '#666', marginTop: 2 }}>
                                        {s.count} студ. · среднее <strong>{avg}</strong>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Сама диаграмма */}
            {loadingScatter ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Загрузка точек...</div>
            ) : scatterPoints.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                    Выберите дисциплину и компетенцию
                </div>
            ) : (
                <ReactApexChart
                    options={options}
                    series={finalSeries}
                    type="line"
                    height={480}
                />
            )}
        </div>
    );
}

const FilterHeader = ({ filters, onFilterChange }) => {
    const [options, setOptions] = useState({ institutes: [], specialties: [], years: [] });
    const [loading, setLoading] = useState(true);
    const reqRef = useRef(0);

    //загрузка вариантов
    useEffect(() => {
        getFilterDash()
            .onSuccess(async response => {
                const data = await response.json();
                setOptions(data.data); 
                setLoading(false);
            })
            .onError(err => console.error("Ошибка загрузки опций", err));
    }, []);
    

    useEffect(() => {
        const institute = filters?.institute;
        if (!institute) {
            getFilterDash()
            .onSuccess(async response => {
                const data = await response.json();
                setOptions(data.data); 
            })
            .onError(err => console.error("Ошибка загрузки опций", err));
            return;
        }
        const id = ++reqRef.current;
        getFilterDash(institute)
            .onSuccess(async res => {
                if (id !== reqRef.current) return;
                const data = await res.json();
                const newSpecs = data.data.specialties || [];
                setOptions(prev => ({ ...prev, specialties: newSpecs }));
        
                // если выбранная спец не в новом списке - сброс
                if (filters?.specialty && !newSpecs.some(s => s.value === filters.specialty)) {
                onFilterChange('specialty', '');
                }
            })
            .onError(() => { if (id === reqRef.current) setLoading(false); });
      }, [filters?.institute]);
    
    const handleChange = (opt, name) => {
        onFilterChange(name, opt ? opt.value : '');
    };
    const customStyles = {
        container: (base) => ({ ...base, flex: 1, minWidth: '200px' }),
        control: (base) => ({ ...base, borderRadius: '8px', borderColor: '#ddd' })
    };
    const findOption = (opts, value) => {
        if (!value) return null; 
        return opts?.find(o => o.value === value) || null;
    };
    const sorted = (opts) =>
        (opts || []).slice().sort((a, b) =>
          a.label.localeCompare(b.label, 'ru', {numeric: true, sensitivity: 'base' })
        );

    if (loading) return <div>Загрузка фильтров...</div>;
    
    return (
        <div className="filter-row">
            <Select
            name="institute"
            placeholder="Институт..."
            isClearable
            isSearchable
            options={sorted(options?.institutes) || []}
            onChange={opt => handleChange(opt, 'institute')}
            styles={customStyles}
            />
            
            <Select
            name="specialty"
            placeholder="Направление..."
            isClearable
            isSearchable
            options={sorted(options?.specialties) || []}
            value={findOption(options?.specialties, filters?.specialty)}
            onChange={opt => handleChange(opt, 'specialty')}
            styles={customStyles}
            />
    
            <Select
            name="year"
            placeholder="Год..."
            isClearable
            isSearchable
            options={sorted(options?.years) || []}
            onChange={opt => handleChange(opt, 'year')}
            styles={customStyles}
            />
        </div>
    );
};
  
function AdminAPView() {
    const [ScatterData, setScatterData] = useState(null);
    const [LoadingData, setLoading] = useState(false);
    const [filters, setFilters] = useState({ institute: '', specialty: '', year: '' });
    const [isError, setErrorStatus] = useState(false);
    const [activeTab, setActiveTab] = useState('pir');

    const [correlationData, setCorrelationData] = useState(null);
    const [loadingCorr, setLoadingCorr] = useState(false);


    const loadScoresResult = async (currentFilters) => {
        setLoading(true);
        setErrorStatus(false);
        getScoresResult(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setScatterData(data); 
                console.log(data);
                if (data.data==[] || data.names.length<4){
                    console.error("Ошибка при загрузке данных: данные пусты");
                    setErrorStatus(true);
                }
            })
            .onError(err => {
                console.error("Ошибка при загрузке данных:", err);
                setErrorStatus(true);
            })
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        loadScoresResult(filters);
    }, [filters]);
    
    const updateFilter = (name, value) => {
        setFilters(prev => {
          const updated = { ...prev, [name]: value };
          if (name == 'institute') updated.specialty = '';
          return updated;
        });
    };
    
    const loadCorrelation = async (currentFilters) => {
        setLoadingCorr(true);
        getGradesCompetencyCorrelation(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setCorrelationData(data);
            })
            .onError(err => console.error("Ошибка при загрузке корреляции:", err))
            .finally(() => setLoadingCorr(false));
    };
    useEffect(() => {
        loadCorrelation(filters);
    }, [filters]);

    return (
        <div className="AdminAPView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Академические показатели и компетенции" name="Админимтратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                <div className="filters-cont">
                    <FilterHeader onFilterChange={updateFilter} 
                            filters={filters}/></div>
                {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                    (<>{LoadingData ? (
                    <div className="p-10 text-center">Загрузка данных...</div>)
                    : <>
                <FlexRow margin="0 0 30 0" wrap={WRAP.DO}>
                        <button
                            onClick={() => setActiveTab('pir')}
                            className={activeTab === 'pir' ? "active" : "not-active"}
                        >ПИР</button>
                        <button
                            onClick={() => setActiveTab('yp')}
                            className={activeTab === 'yp' ? "active" : "not-active"}
                        >УП</button>
                        <button
                            onClick={() => setActiveTab('pract3')}
                            className={activeTab === 'pract3' ? "active" : "not-active"}
                        >Экспл. практика</button>
                        <button
                            onClick={() => setActiveTab('pract4')}
                            className={activeTab === 'pract4' ? "active" : "not-active"}
                        >Преддипл. практика</button>
                    </FlexRow>
                    {activeTab === 'pir' && (<DisciplineScatterGrid data={ScatterData?.data} discipline={ScatterData?.names[0] || ''}/>)}
                    {activeTab === 'yp' && (<DisciplineScatterGrid data={ScatterData?.data} discipline={ScatterData?.names[1] || ''}/>)}
                    {activeTab === 'pract3' && (<DisciplineScatterGrid data={ScatterData?.data} discipline={ScatterData?.names[2] || ''}/>)}
                    {activeTab === 'pract4' && (<DisciplineScatterGrid data={ScatterData?.data} discipline={ScatterData?.names[3] || ''}/>)}
        
                    </>}</>)}
                    <CorrelationHeatmap data={correlationData} loading={loadingCorr} />
                    <CorrelationScatter correlationData={correlationData} loading={loadingCorr} filters={filters} />
                        
                </Content>
            </SidebarLayout>
        </div>
    )}

export default AdminAPView;