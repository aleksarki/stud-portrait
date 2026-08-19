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
import CorrelationHeatmap from './CorrelationHeatmap';
import CorrelationScatter from './CorrelationScatter';
import TopCorrelationsTable from './TopCorrelationsTable';

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
                    <TopCorrelationsTable filters={filters} />
                </Content>
            </SidebarLayout>
        </div>
    )}

export default AdminAPView;