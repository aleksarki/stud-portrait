import { useState, useEffect } from 'react';
import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Select from 'react-select';

import "./AdminAPView.scss";
const competencyLabels = {
    "res_comp_info_analysis": "Анализ информации",
    "res_comp_planning": "Планирование",
    "res_comp_result_orientation": "Ориентация на результат",
    "res_comp_stress_resistance": "Стрессоустойчивость",
    "res_comp_partnership": "Партнёрство",
    "res_comp_rules_compliance": "Соблюдение правил",
    "res_comp_self_development": "Саморазвитие",
    "res_comp_leadership": "Лидерство",
    "res_comp_emotional_intel": "Эмоциональный интеллект",
    "res_comp_client_focus": "Клиентоориентированность",
    "res_comp_communication": "Коммуникация",
    "res_comp_passive_vocab": "Пассивный словарный запас",

    'res_mot_autonomy': 'Автономия',
    'res_mot_altruism': 'Альтруизм',
    'res_mot_challenge': 'Вызов',
    'res_mot_salary': 'Заработок',
    'res_mot_career': 'Карьера',
    'res_mot_creativity': 'Креативность',
    'res_mot_relationships': 'Отношения',
    'res_mot_recognition': 'Признание',
    'res_mot_affiliation': 'Принадлежность',
    'res_mot_self_development': 'Саморазвитие',
    'res_mot_purpose': 'Смысл',
    'res_mot_cooperation': 'Сотрудничество',
    'res_mot_stability': 'Стабильность',
    'res_mot_tradition': 'Традиция',
    'res_mot_management': 'Управление',
    'res_mot_work_conditions': 'Условия труда'
    
};
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
            {Object.keys(competencyLabels).map(k => (
                <option key={k} value={k}>{competencyLabels[k]}</option>
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
                domain={[2, 6]}
                ticks={[2, 3, 4, 5]}
                name="Оценка"
                label={{ value: 'Оценка', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
            />
            <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(value, name) => [value, name === 'x' ? 'Балл' : 'Оценка']}
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
    console.log(disciplines);
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
          
          
          
const FilterHeader = ({ onFilterChange }) => {
    const [options, setOptions] = useState({ institutes: [], specialties: [], years: [] });
    const [loading, setLoading] = useState(true);

    //загрузка вариантов
    useEffect(() => {
        fetch(`http://localhost:8000/portrait/filter-dash`)
        .then(response => response.json()) 
        .then(data => {
        setOptions(data.data); 
        console.log(data.data);
        setLoading(false);
        })
        .catch(err => console.error("Ошибка загрузки опций", err));
    }, []);
    const handleChange = (selectedOption, action) => {
        const value = selectedOption ? selectedOption.value : '';
        onFilterChange(action.name, value);
    };
  
    const customStyles = {
        container: (base) => ({ ...base, flex: 1, minWidth: '200px' }),
        control: (base) => ({ ...base, borderRadius: '8px', borderColor: '#ddd' })
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
            onChange={handleChange}
            styles={customStyles}
            />
            
            <Select
            name="specialty"
            placeholder="Направление..."
            isClearable
            isSearchable
            options={options?.specialties || []}
            onChange={handleChange}
            styles={customStyles}
            />
    
            <Select
            name="year"
            placeholder="Год..."
            isClearable
            isSearchable
            options={options?.years || []}
            onChange={handleChange}
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

    const loadScoresResult = async (currentFilters) => {
        setLoading(true);
        setErrorStatus(false);
        try {
            let baseUrl = `http://localhost:8000/portrait/scores-result`;
            const params = new URLSearchParams();

            if (currentFilters.institute) params.append('institute', currentFilters.institute);
            if (currentFilters.specialty) params.append('specialty', currentFilters.specialty);
            if (currentFilters.year) params.append('year', currentFilters.year);

            const queryString = params.toString();
            const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

            const response = await fetch(finalUrl);
            if (!response.ok) {setErrorStatus(true); throw new Error('Ошибка сервера');}
            
            const data = await response.json();
            setScatterData(data); 
            
        } catch (error) {
            console.error("Ошибка при загрузке данных:", error);
            setErrorStatus(true);
        } finally {
            setLoading(false); 
        }
    };
    useEffect(() => {
        loadScoresResult(filters);
    }, [filters]);
    
    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    return (
        <div className="AdminAPView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Академические показатели" name="Админимтратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                <FilterHeader onFilterChange={updateFilter} 
                            currentFilters={filters}/>
                {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                    (<>{LoadingData ? (
                    <div className="p-10 text-center">Загрузка данных...</div>)
                    : <><DisciplineScatterGrid data={ScatterData?.data} disciplines={ScatterData?.names}/></>}
                    </>)}
                </Content>
            </SidebarLayout>
        </div>
    )}

export default AdminAPView;