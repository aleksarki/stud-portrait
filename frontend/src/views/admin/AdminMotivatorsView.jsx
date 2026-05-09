import React, { useEffect, useState, useMemo, useRef } from "react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import {
    Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import Select from 'react-select';

import MotivatorStatistics from "../../components/MotivatorStatistics.jsx";

import "./AdminMotivatorsView.scss";

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
    "res_comp_passive_vocab": "Пассивный словарь",

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
const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');

const formatValue = (value) => Math.abs(value);

const Legendy = ({ selectedCourses, colors }) => (
    <div style={{ marginBottom: '24px', marginLeft: '40px' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '20px 8px', fontSize: '13px' }}>
        <thead>
            <tr>
            <th style={{ marginLeft: '5px', textAlign: 'right', color: '#999', fontWeight: 'normal' }}>Курсы</th>
            {selectedCourses.map(c => (
                <th key={c} style={{ textAlign: 'center', fontWeight: 'bold', minWidth: '20px' }}>{c}</th>
            ))}
            </tr>
        </thead>
        <tbody>
            <tr>
            <td style={{ textAlign: 'right', fontWeight: '500', color: '#333' }}>Мотиваторы</td>
            {selectedCourses.map(c => (
                <td key={c}>
                <div style={{ width: '12px', height: '12px', borderRadius: '1px', backgroundColor: colors[c].high, margin: '0 auto' }} />
                </td>
            ))}
            </tr>
            <tr>
            <td style={{ textAlign: 'left', fontWeight: '500', color: '#333' }}>Демотиваторы</td>
            {selectedCourses.map(c => (
                <td key={c}>
                <div style={{ width: '12px', height: '12px', borderRadius: '1px', backgroundColor: colors[c].low, margin: '0 auto' }} />
                </td>
            ))}
            </tr>
        </tbody>
        </table>
    </div>
);

const Tooltippy = ({ active, payload = [], coordinate = {}, chartHeight = 0, label }) => {
    if (!active || !payload.length) return null;
    const isTopHalf = coordinate.y < chartHeight / 2;

    const filtered = payload
    .filter(e => (isTopHalf ? e.value > 0 : e.value < 0))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    if (!filtered.length) return null;

    return (
    <div className="tooltip">
        <p className="font-bold text-gray-800 mb-2 border-b pb-1" style={{marginBottom: "2px"}}>{getLabel(label)}
        </p>{isTopHalf ? <p style={{color: "rgb(2, 81, 62)"}}>Мотиваторы</p> : <p style={{color: "rgb(107, 0, 0)"}}>Демотиваторы</p>}
        {filtered.map((entry, i) => {
            const courseNum = entry.payload[`${entry.dataKey}_course`];
            const color = entry.payload[`${entry.dataKey}_color`];
            return (
                <div key={i} className="nums">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{courseNum} курс:   </span>
                <span className="font-bold" style={{ color }}>{Math.abs(entry.value)}</span></div>
                </div>
                
            );
        })}
    </div>
    );
};
  
function MotTable({ data }) {

    const [tableOpen, setTableOpen] = useState(false);
    if (!data) return null;

    return(
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
            <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
            {tableOpen ? 'Скрыть таблицу' : 'Таблица'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>
            <table className="ct-table">
                <thead>
                <tr>
                    <th rowSpan={2} colSpan={1}>Мотиватор</th>
                    <th></th> 
                    <th rowSpan={1} colSpan={4}>Количество студентов</th>
                </tr>
                <tr>
                    <th style={{ textAlign: 'right' }}>Курс: </th> 
                    <th style={{ textAlign: 'center' }}>{1}</th>
                    <th style={{ textAlign: 'center' }}>{2}</th>
                    <th style={{ textAlign: 'center' }}>3</th>
                    <th style={{ textAlign: 'center' }}>4</th>
                </tr>
                </thead>
                <tbody>
                {data.map((row) => (
                    <React.Fragment key={row.name}>
                    <tr>
                        <td rowSpan={2} className="ct-name" style={{ verticalAlign: 'middle' }}>
                        {getLabel(row.name)}
                        </td>
                        <td className="ct-pos">М</td>
                        {Array.from({ length: 4 }, (_, i) => {
                        const val = row[`course_${i + 1}_high`];
                        return (
                            <td key={`m-${i}`} className="mot">
                            {val || val === 0 ? val : '—'}
                            </td>
                        );
                        })}
                    </tr>

                    <tr>
                        <td className="ct-neg">Д</td>
                        {Array.from({ length: 4 }, (_, i) => {
                        const val = row[`course_${i + 1}_low`];
                        return (
                            <td key={`d-${i}`} className="demot">
                            {val || val === 0 ? val : '—'}
                            </td>
                        );
                        })}
                    </tr>
                    </React.Fragment>
                ))}
                
                </tbody>
            </table>
        </div>
        </div>);
}

//до 400 - демотиватор, 600+ мотиватор

function MotivatorStackedChart({ chart_data }) {
    const allCourses = [1, 2, 3, 4];
    const [selectedCourses, setSelectedCourses] = useState(allCourses);
  
    const toggleCourse = (course) => {
        setSelectedCourses(prev =>{
            const next = prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
            return next.sort((a, b) => a - b);}
        );
    };

    const containerRef = useRef(null);
    const [chartHeight, setChartHeight] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const getSvgHeight = () => {
          const svg = el.querySelector("svg");
          return svg ? svg.clientHeight : 0;
        };
        setChartHeight(getSvgHeight());
      
        const ro = new ResizeObserver(() => setChartHeight(getSvgHeight()));
        ro.observe(el);
        return () => ro.disconnect();
    }, [chart_data]);
      

    const colors = {
        1: { high: " #A2CB8B", low: " #f5cd70" }, 
        2: { high: " #81ae71", low: " #eaa157" },
        3: { high: " #619257", low: " #da744a" },
        4: { high: " #42763f", low: " #C44545" },
    };
  
    const processedData = useMemo(() => {
        if (!chart_data) return [];
        return chart_data.map(item => {
            const newItem = { ...item };
            
            //сортировка
            const posValues = selectedCourses
            .map(c => ({ course: c, val: item[`course_${c}_high`] || 0 }))
            .sort((a, b) => a.val - b.val); // от меньшего к большему

            posValues.forEach((obj, index) => {
            newItem[`pos_seg_${index}`] = obj.val;
            newItem[`pos_seg_${index}_course`] = obj.course;
            newItem[`pos_seg_${index}_color`] = colors[obj.course].high;
            });

            const negValues = selectedCourses
            .map(c => ({ course: c, val: item[`course_${c}_low`] || 0 }))
            .sort((a, b) => a.val - b.val); 

            negValues.forEach((obj, index) => {
            newItem[`neg_seg_${index}`] = -obj.val; // делаем отрицательным для графика
            newItem[`neg_seg_${index}_course`] = obj.course;
            newItem[`neg_seg_${index}_color`] = colors[obj.course].low;
            });

            return newItem;
        });
    }, [chart_data, selectedCourses]);
  
    if (!chart_data || chart_data.length === 0) {
        console.log('MotivatorChart: нет данных');
        return <div className="p-4 text-gray-500 text-center">Нет данных для отображения</div>;
    }

    return (
    <div className="motBarContainer w-full p-4 bg-white">
        <div className="course-filters">
            {[1, 2, 3, 4].map(course => (
                <label key={course} className="filter-item">
                <input
                    type="checkbox"
                    checked={selectedCourses.includes(course)}
                    onChange={() => toggleCourse(course)}
                />
                <span>{course} Курс</span>
                </label>
            ))}
        </div>
        <Legendy selectedCourses={selectedCourses} colors={colors}/>
        
        <div ref={containerRef} className="chart-container h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={processedData}
                    barGap={-30}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                        
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                    dataKey="name"
                    tickFormatter={getLabel}
                    angle={-45}
                    tickMargin={20}
                    textAnchor={"end"}
                    interval={0}
                    height={80}
                    stroke="#666"
                />
                <YAxis 
                    tickFormatter={formatValue} 
                    stroke="#666"
                    label={{ value: 'Количество студентов', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
                
                />
                <Tooltip content={(props) => <Tooltippy {...props} chartHeight={chartHeight}
                wrapperStyle={{ overflow: "visible", pointerEvents: "none", zIndex: 9999 }} />} />
                
                <ReferenceLine y={0} stroke="#333" strokeWidth={1.5} />

                {selectedCourses.map((_, index) => (
                <Bar 
                    key={`pos_${index}`} 
                    dataKey={`pos_seg_${index}`} 
                    stackId="positive" 
                    barSize={30}
                    barGap={5}
                    strokeWidth={1.5}
                >
                    {processedData.map((entry, i) => (
                    <Cell key={i} fill={entry[`pos_seg_${index}_color`]} />
                    ))}
                </Bar>
                ))}

                {selectedCourses.map((_, index) => (
                    <Bar 
                        key={`neg_${index}`} 
                        dataKey={`neg_seg_${index}`} 
                        stackId="negative" 
                        barSize={30}
                        strokeWidth={1.5}
                    >
                        {processedData.map((entry, i) => (
                        <Cell key={i} fill={entry[`neg_seg_${index}_color`]} />
                        ))}
                    </Bar>
                ))}
                </BarChart>
            </ResponsiveContainer>
            
        </div>
        <div style={{margin:20, marginTop:5}}>
        <MotTable data={chart_data}/></div>
      </div>
    );
}

//верх фильтры
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
  


function AdminMotivatorsView(){
    const [MotivationData, setMotivationData] = useState(null);
    const [loadingMotDash, setLoadingMotDash] = useState(false);
    const [isError, setErrorStatus] = useState(false);
    const [filters, setFilters] = useState({ institute: '', specialty: '', year: '' });
    
    const loadMotivationCounts = async (currentFilters) => {
        setLoadingMotDash(true)
        setErrorStatus(false)
        try {
            console.log(currentFilters);
            let baseUrl = `http://localhost:8000/portrait/motivation-counts`;
            const params = new URLSearchParams();

            if (currentFilters.institute) params.append('institute', currentFilters.institute);
            if (currentFilters.specialty) params.append('specialty', currentFilters.specialty);
            if (currentFilters.year) params.append('year', currentFilters.year);

            const queryString = params.toString();
            const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

            const response = await fetch(finalUrl);
            if (!response.ok) {setErrorStatus(true); throw new Error('Ошибка сервера');}
            
            const data = await response.json();
            setMotivationData(data); 
            
        } catch (error) {
            console.error("Ошибка при загрузке мотиваторов:", error);
            setErrorStatus(true);
        } finally {
            setLoadingMotDash(false); 
        }
    };
    useEffect(() => {
        loadMotivationCounts(filters);
    }, [filters]);
    
    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
            <div className="AdminMotivatorView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: График мотиваторов" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <FilterHeader onFilterChange={updateFilter} 
                        currentFilters={filters}/>
                        {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                        (<>{loadingMotDash ? (
                            <div className="p-10 text-center">Загрузка данных...</div>
                                
                            ) : <><MotivatorStackedChart chart_data={MotivationData?.data}/>
                            <MotivatorStatistics filters={filters} />
                        </>}</>)}
                        
                    </Content>
                </SidebarLayout>
            </div>
        );
}
                    

export default AdminMotivatorsView;

