import { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { getFilterDash, getScoresResult, getDataBoxplot } from '../../api.js';
import { COMPETENCIES_NAMES, COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import Button from '../../components/ui/Button.jsx';
import { ADMIN_PALETTE } from '../../components/ui/palette.js';
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
    console.log(participants[0]);
    const chartData = participants
        .map(p => {
        const x = selectedComp === 'avg' ? p.avg : p[selectedComp];
        return x != null && p.grade != null
            ? { x, y: p.grade, id: p.participant_id }
            : null;
        })
        .filter(Boolean);
    
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
                domain={[150, 800]}
                name="Балл"
                label={{ value: 'Средний балл', position: 'insideBottom', offset: -16, fontSize: 11, fill: '#94a3b8' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
            />
            <YAxis
                type="number"
                dataKey="y"
                domain={[1, 6]}
                ticks={[2, 3, 4, 5]}
                name="Оценка"
                label={{ value: 'Оценка', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(value, key) =>  [value, (key == 'x' ? 'Балл' : 'Оценка')]}
                cursor={{ strokeDasharray: '3 3' }}
            />

            <Scatter
                data={chartData}
                fill="rgb(101, 142, 208)"
                fillOpacity={0.25}
                stroke="rgb(101, 142, 208)"
                strokeOpacity={0.6}
                r={4}
            />
            </ScatterChart>
        </ResponsiveContainer>

        </div>
    );}
          
function DisciplineScatterGrid({ data, disciplines }) {
    if (data == 0)
        return <div> Нет данных для отображения по текущим параметрам </div>;

    if (!disciplines?.length) return <div>Ошибка при загрузке дисциплин</div>;

    const filtered = disciplines.map(disc =>
    data.find(d => d.discipline === disc)
    ).filter(Boolean);
    return (
        <div className="ds-grid">
        {filtered.map(({ discipline, participants }) => (
            <DisciplineScatter
            key={discipline}
            discipline={discipline}
            participants={participants}
            />
        ))}
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
    if (loading) return <div>Загрузка фильтров...</div>;
    
    return (
        <div className="filter-row">
            <Select
            name="institute"
            placeholder="Институт..."
            isClearable
            isSearchable
            options={options?.institutes || []}
            onChange={opt => handleChange(opt, 'institute')}
            styles={customStyles}
            />
            
            <Select
            name="specialty"
            placeholder="Направление..."
            isClearable
            isSearchable
            options={options?.specialties || []}
            value={findOption(options?.specialties, filters?.specialty)}
            onChange={opt => handleChange(opt, 'specialty')}
            styles={customStyles}
            />
    
            <Select
            name="year"
            placeholder="Год..."
            isClearable
            isSearchable
            options={options?.years || []}
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

    const loadScoresResult = async (currentFilters) => {
        setLoading(true);
        setErrorStatus(false);
        getScoresResult(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setScatterData(data); 
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

    return (
        <div className="AdminAPView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Академические показатели и компетенции" name="Админимтратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                <FilterHeader onFilterChange={updateFilter} 
                            filters={filters}/>

                <FlexRow margin="0 0 30 0" wrap={WRAP.DO}>
                        <Button
                            text="ПИР"
                            onClick={() => setActiveTab('pir')}
                            palette={activeTab === 'pir' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="УП"
                            onClick={() => setActiveTab('yp')}
                            palette={activeTab === 'yp' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="Экспл. практика"
                            onClick={() => setActiveTab('pract3')}
                            palette={activeTab === 'pract3' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="Преддипл. практика"
                            onClick={() => setActiveTab('pract4')}
                            palette={activeTab === 'pract4' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                    </FlexRow>
                
                {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                    (<>{LoadingData ? (
                    <div className="p-10 text-center">Загрузка данных...</div>)
                    : <><DisciplineScatterGrid data={ScatterData?.data} disciplines={ScatterData?.names}/></>}
                    </>)}

                {activeTab === 'values' && (true)}
                </Content>
            </SidebarLayout>
        </div>
    )}

export default AdminAPView;