import { useState, useEffect, React } from 'react';
import Select from 'react-select';
import Chart from 'react-apexcharts';
import {
    PieChart, Pie, ReferenceLine, LabelList, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Award, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import FlexRow, { ALIGN, JUSTIFY, WRAP } from '../../components/FlexRow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import Card from '../../components/cards/Card.jsx';
import TitledCard from '../../components/cards/TitledCard.jsx';
import ValueCard from '../../components/cards/ValueCard.jsx';

import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { ADMIN_PALETTE } from '../../components/ui/palette.js';

import {
    getDashboardStats,
    getFilterDash,
    postPortraitDataseshNew,
    postPortraitDataseshCountStats,
    postPortraitDataseshUpdateFilters
} from '../../api.js';
import { COMPETENCIES_NAMES, FIELD_NAMES, LINK_TREE, MOTIVATORS_NAMES } from "../../utilities.js";

import "./AdminStatsView.scss";

const competencyLabels = {
    ...COMPETENCIES_NAMES,
    ...MOTIVATORS_NAMES
};

const max_comp=25; //самые длинные названия
const max_mot=15;

const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');
// для сравнения

const FilterHeader = ({ onFilterChange }) => {
    const [options, setOptions] = useState({ institutes: [], specialties: [], years: [] });
    const [loading, setLoading] = useState(true);

    //загрузка вариантов
    useEffect(() => {
        getFilterDash()
            .onSuccess(async response => {
                const data = await response.json();
                setOptions(data.data); 
                console.log(data.data);
                setLoading(false);
            })
            .onError(err => console.error("Ошибка загрузки опций", err));
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

const Stat = ({ label, value, prev=0, suffix = "", isGrowth = false, isText=false}) => {
    if (prev==0){
        return(<div className="stat-block">
            <div className="value">{value}{suffix}</div>
            <div className="label">{label}</div>
            </div>
        );
    }
    else if(isText){
        return (
            <div className="stat-block">
            <div className="value">{value}{suffix}</div>
            <div className="prev-year">прошлый год: {prev}{suffix}</div>
            <div className="label">{label}</div>
            </div>
        );
    }
    else{
        const diff = ((value || 0) - (prev || 0)) / prev *100;
        const isUp = diff >= 0;  
        
        return (
            <div className="stat-block">
            <div className={`trend ${isUp ? 'up' : 'down'}`}>
                {isUp ? <ArrowUp size={16}/> : <ArrowDown size={16}/>}
                {Math.abs(isGrowth ? value : diff).toFixed(1)}%
            </div>
            <div className="value">{value}{suffix}</div>
            <div className="prev-year">прошлый год: {prev}{suffix}</div>
            <div className="label">{label}</div>
            </div>
        );
    }
    
};

//таблица
function CompetencyTable({ data, year }) {
    //??data: [{ name: 'Командная работа', score, below350, above650 }]
    const [tableOpen, setTableOpen] = useState(false);
    if (!data) return null;

    return(
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
            <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
            {tableOpen ? 'Скрыть таблицу' : 'Подробная таблица'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>
            <table className="ct-table">
                <thead>
                <tr>
                    <th rowSpan={2}>Компетенция</th>
                    <th colSpan={3}>Средний балл</th> 
                    <th rowSpan={2}>%</th>
                </tr>
                <tr>
                    
                    <th style={{ textAlign: 'center' }}>{year - 1}</th>
                    <th style={{ textAlign: 'center' }}>{year}</th>
                    <th style={{ textAlign: 'center' }}>Разница</th>
                </tr>
                </thead>
                <tbody>
                {data.map(row => {
                    const delta = row.score != 0 && row.prev_score != 0
                    ? Math.round(row.score) - Math.round(row.prev_score)
                    : null;
                    const procent = delta != null
                    ? Math.round(delta*100/Math.round(row.prev_score),2)
                    : null;
                    return (
                    <tr key={row.displayName}>
                        <td className="ct-name">{row.displayName}</td>
                        <td>{row.prev_score != 0 ? Math.round(row.prev_score) : '—'}</td>
                        <td>{row.score != 0 ? Math.round(row.score) : '—'}</td>
                        <td>
                        {delta === null ? '—' : (
                            <span className={delta > 0 ? 'ct-pos' : delta < 0 ? 'ct-neg' : 'ct-zero'}>
                            {delta > 0 ? '+' : ''}{delta}
                            </span>
                        )}
                        </td>
                        <td>
                        {procent === null ? '—' : (
                            <span className={procent > 0 ? 'ct-pos' : procent < 0 ? 'ct-neg' : 'ct-zero'}>
                            {procent > 0 ? '+' : ''}{procent}
                            </span>
                        )}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
        </div>
        </div>);
}
function CompetencyTable_course({ data }) {
    const [tableOpen, setTableOpen] = useState(false);
    const [range, setRange] = useState([1, 4]);
    if (!data) return null;
    const course = [
        { key: 'course_1', name: '1 Курс'},
        { key: 'course_2', name: '2 Курс'},
        { key: 'course_3', name: '3 Курс'},
        { key: 'course_4', name: '4 Курс'},
    ];
    const DeltaCell = ({ value }) => {
        if (value === null) return <span style={{ color: '#ccc' }}>—</span>;
        
        const className = value > 0 ? 'ct-pos' : value < 0 ? 'ct-neg' : 'ct-zero';
        const prefix = value > 0 ? '+' : '';
        return (
          <span className={className}>
            {prefix}{value}%
          </span>
        );
    };
    const calculateDelta = (row) => {
        const [start, end] = range;
        const vStart = Number(row[`course_${start}`]) || 0;
        const vEnd = Number(row[`course_${end}`]) || 0;

        if (vStart === 0 || vEnd === 0) return null;

        const delta = vEnd - vStart;
        return Math.round((delta * 100) / vStart);
    }
    return(
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
            <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
            {tableOpen ? 'Скрыть таблицу' : 'Подробная таблица'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>
            
            <p className="slider-note">*перетащите полузнки, чтобы изменить</p>
            <table className="ct-table">
                <thead>
                <tr>
                    <th rowSpan={2}>Компетенция</th>
                    <th colSpan={4}>Средний балл</th> 
                    <th rowSpan={2}> 
                    <div className="slider-wrapper">
                        <div className="slider-container">
                            <p className="slider-label">
                                Динамика по курсам с {range[0]} по {range[1]}
                            </p>
                            <Slider
                            range
                            min={1}
                            max={4}
                            step={1}
                            value={range}
                            onChange={setRange}
                            marks={{
                                1: '1',
                                2: '2',
                                3: '3',
                                4: '4'
                            }}
                            />
                        </div>
                    </div>
                    </th>
                </tr>
                <tr>
                    {course.map(i =>{
                        return(
                            <th style={{ textAlign: 'center' }}>{i.name}</th>
                        );
                    })}
                </tr>
                </thead>
                <tbody>
                {data.map((row) => (
                    <tr key={row.name}>
                    <td className="ct-name">{getLabel(row.name)}</td>
                    {Array.from({ length: 4 }, (_, i) => {
                        const value = row[`course_${i + 1}`];
                        const prev = i>1? row[`course_${i + 1}`] : value;
                        const className = value > prev ? 'ct-pos' : value < prev ? 'ct-neg' : 'ct-zero';
                        return <td className={className} key={i}>{(value!=0 || value) ? Math.round(value) : '—'}</td>;
                    })}
                    <td className="ct-zero">
                    {(() => {
                        const delta = calculateDelta(row);
                        return (
                            <DeltaCell value={delta}/>
                        );
                    })()}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
        </div>);
}

//паутинка пред
function CompRadar({ data }) {

    const [hoveredCourse, setHoveredCourse] = useState(null);
    const [visibleCourses, setVisibleCourses] = useState({
        course_1: true,
        course_2: true,
        course_3: true,
        course_4: true,
    });

    const courseConfig = [
        { key: 'course_1', name: '1 Курс', color: '#8884d8' },
        { key: 'course_2', name: '2 Курс', color: '#82ca9d' },
        { key: 'course_3', name: '3 Курс', color: '#ffc658' },
        { key: 'course_4', name: '4 Курс', color: '#ff8042' },
    ];
    if (!data) {
        console.log('CompRadar: ошибка загрузки данных');
        return <div className="p-4 text-gray-500">Нет данных для отображения</div>;
    }

    const getStrokeOpacity = (course) => {
        if (!hoveredCourse) return 1;
        return hoveredCourse === course ? 1 : 0.1;
    };


    const toggleCourse = (courseKey) => {
        setVisibleCourses(prev => ({
            ...prev,
            [courseKey]: !prev[courseKey]
        }));
    };

    //console.log("данные дошли");
    return (
        <div className="RadarContainer">
            {/*панель с чекбоксами */}
            <div className="chooseBoxes">
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Курсы</h3>
                {courseConfig.map(course => (
                <label key={course.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px', cursor: 'pointer' }}>
                    <input 
                    type="checkbox" 
                    checked={visibleCourses[course.key]} 
                    onChange={() => toggleCourse(course.key)}
                    style={{ accentColor: course.color }}
                    />
                    <span style={{ fontSize: '12px' }}>{course.name}</span>
                </label>
                ))}
            </div>
        
            <div className="radarChart" style={{ flex: 1}}>
                <ResponsiveContainer width="110%" height="100%" >
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data} marginLeft={50}>
                        <PolarGrid stroke="#e0e0e0" />
                        <PolarAngleAxis 
                            dataKey="name" 
                            tickFormatter={getLabel} 
                            tick={{fill: '#666', fontSize: 10 }} 
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 800]} tick={false} axisLine={false} />
                        
                        {courseConfig.map(course => visibleCourses[course.key] && (
                        <Radar
                            key={course.key}
                            name={course.name}
                            dataKey={course.key}
                            stroke={course.color}
                            fill={course.color}
                            fillOpacity={0.08}
                            strokeOpacity={getStrokeOpacity(course.key)}
                            onMouseEnter={() => setHoveredCourse(course.key)}
                            onMouseLeave={() => setHoveredCourse(null)}
                            animationDuration={400}
                        />
                        ))}
                        
                        <Tooltip 
                            labelFormatter={(label) => getLabel(label)}
                            // name имя из конфига 
                            formatter={(value, name) => [value.toFixed(1), name]}
                            contentStyle={{ 
                                borderRadius: '8px', 
                                border: 'none', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                            }}
                        />
                        <Legend verticalAlign="bottom" onMouseEnter={(o) => setHoveredCourse(o.dataKey)} onMouseLeave={() => setHoveredCourse(null)} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
       </div>
    );
}

function Dashboard({ data }) {
    if (!data) return null;
    const year = data.year;
    const chartData = data.chart.map(item => { 
        const name = getLabel(item.name);
        return {
            ...item,
            displayName: name
    };});
    const pieData = [
        { "name": 'Прошли', "value" : data.col2.participated?.amount_in, fill: '#1f66b6'},
        {"name" : "Не прошли", "value" : data.col2.participated?.students_all - data.col2.participated?.amount_in, fill: 'transparent'}
                                
    ];
    //col2 uni
    const col2_data={ 'header': "Лидирующий ВУЗ", 'name': data.col2.uni_name,'score': data.col2.uni_score};
    console.log(data.col2.uni_place);
    if (data.col2.uni_place==-1){
        col2_data['header'] = "Нет данных за этот год";
        col2_data['name'] = "Рейтинг";
    }
    else if (data.col2.uni_place!=0){
        col2_data['header'] = "Рейтинг ВУЗа";
        col2_data['name'] = "Топ "+(Math.round(data.col2.uni_place,1)).toString()+"%";
    }
    return (
        <div>
        <div className="dashboard-container">
        <h2 className="dashboard-title">Статистика
        <p className="extra-title">  за {year-1}/{year} год</p></h2>
        
        <div className="dashboard-grid">
            {/* Левая колонка */}
            <div className="col-left">
            <Stat label="студентов прошли доп. курсы" value={data.col1.courses.val} prev={data.col1.courses.prev} suffix="%" />
            <Stat label="средний уровень компетенций" value={data.col1.avg_lvl.val} prev={data.col1.avg_lvl.prev} />
            <Stat label={data.col1.motiv.count.curr!=0 ?`Наибольший мотиватор (${data.col1.motiv.count.curr})` : "Нет данных за этот год"} value={getLabel(data.col1.motiv.name.curr)} prev={data.col1.motiv.count.prev!=0 ? getLabel(data.col1.motiv.name.prev)+`(${data.col1.motiv.count.prev})` : 0 } isText={true} />
            </div>

            {/* Центральная колонка */} 
            <div className="col-center">
                {data.col2.uni_place!=0 ? <Stat label={col2_data['header']} value={col2_data['name']} /> :
                (<div className="uni-info mb-6"> 
                    <h4 className="text-xs uppercase text-gray-400 font-bold">{col2_data['header']}</h4>
                    <div className="text-xl font-bold text-blue-600">{col2_data['name']}</div>
                    <div className="text-sm text-gray-500">{col2_data['score']} баллов (среднее)</div>
                </div>)}
                <div class="chart-wrapper">
                    <ResponsiveContainer width="100%" height="300">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey={"value"}
                                nameKey={"name"}
                                innerRadius="80"
                                outerRadius="100"
                                startAngle={90}
                                endAngle={-270}
                            >
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute-center">
                        {data.col2.participated.students_all==0 ? <p> Нет данных </p> :
                        (<><h2>{Math.round(data.col2.participated?.amount_in/data.col2.participated?.students_all*100,1) }%</h2>
                        <p>Студентов прошли тестирование</p></>)}
                    </div>
                </div>
            </div>

            {/* Правая колонка */}
            <div className="col-right">
            <h4 className="text-xs uppercase text-gray-400 font-bold mb-6">Компетенции</h4>
            <Stat 
                label={`Самая развитая: ${getLabel(data.col3.best.name)}`} 
                value={data.col3.best.val} 
                //prev={data.col3.best_prev.val || 0} 
            /> 
            <Stat 
                label={`Наименее развитая: ${getLabel(data.col3.worst.name)}`} 
                value={data.col3.worst.val} 
                //prev={data.col3.worst_prev.val || 0} 
            />
            </div>
        </div>
    </div>
    <div className="dashboard-chart-row">
            <div className="chart-container">
                <h4 className="section-label">Распределение по компетенциям (средний балл)</h4>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} barGap={5} barCategoryGap="25%"
                            margin={{ top: 20, right: 30, left: 10, bottom: 70 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        
                        <ReferenceLine y={0} stroke="#333" strokeWidth={1.5} />
                        <XAxis 
                            dataKey="displayName" 
                            interval={0}
                            angle={-20} 
                            tick={{
                                fontSize: 11, 
                                fill: ' #64748b',
                                dy: 11}} 
                            tickMargin={12}
                            tickLine={false}
                            dx={-50}
                            height={45}
                            textAnchor="end"
                        />
                        <YAxis 
                            domain={[0, 850]} 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{fill: ' #94a3b8'}} 
                            label={{ value: 'Средний балл', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'rgb(122, 136, 156)' }}
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                            labelFormatter={(label) => `Компетенция: ${label}`}
                            formatter={(value)=>[value, 'баллы ']}
                            
                        />
                                
                        <Bar name={year} dataKey="score" fill="rgb(101, 142, 208)" radius={[6, 6, 0, 0]} barSize={22} >
                            <LabelList
                                formatter={(value)=>Math.round(value)}
                                position="top"
                                offset={5}
                                fontSize={12}
                                fill="rgb(81, 87, 110)"
                            /></Bar>
                        <Bar name={year-1} dataKey="prev_score" fill=" #904acc" radius={[6, 6, 0, 0]} barSize={22} >
                            <LabelList
                                formatter={(value)=>Math.round(value)}
                                position="top"
                                offset={5}
                                fontSize={11}
                                fill="rgb(139, 148, 174)"
                            /></Bar>
                        <Legend verticalAlign="top" align="right" fontSize={8} 
                            formatter={(label)=>`${label-1}/${label}`}>
                        </Legend>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <CompetencyTable data={chartData} year={year}/>
            </div>
            <CompRadar data={data.radar}/> 
            <div style={{padding:5, margin:20}}>
            <CompetencyTable_course data={data.radar} /></div>
       </div>
       </div>
    );
}

function AdminStatsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [sessionId, setSessionId] = useState(null);
    const [filters, setFilters] = useState([]);
    const [pendingFilters, setPendingFilters] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [availableValues, setAvailableValues] = useState({});
    const [showAllCenters, setShowAllCenters] = useState(false);
    const [showAllInstitutions, setShowAllInstitutions] = useState(false);

    // Базовые поля для фильтрации
    const basicFields = [
        'res_year',
        'part_gender',
        'center',
        'institution',
        'edu_level',
        'res_course_num',
        'study_form',
        'specialty'
    ];

    useEffect(() => {
        initializeSession();
    }, []);

    // Инициализация сессии
    const initializeSession = async () => {
        setLoading(true);
        postPortraitDataseshNew()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setSessionId(data.session.id);
                    await fetchStats(data.session.id);
                } else {
                    console.error("Failed to create session:", data.message);
                    await fetchStats();
                }
            })
            .onError(async error => {
                console.error("Error initializing session:", error);
                await fetchStats();
            });
    };

    const fetchStats = async (sessionIdToUse = null) => {
        setLoading(true);
        postPortraitDataseshCountStats(sessionIdToUse)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStats(data.stats);
                    setAvailableValues(data.stats.available_values);  // Извлекаем доступные значения для фильтрации
                }
            })
            .onError(error => console.error("Error fetching stats:", error))
            .finally(() => setLoading(false));
    };

    // Обновление фильтров сессии
    const updateSessionFilters = async (newFilters) => {
        if (!sessionId) return;

        postPortraitDataseshUpdateFilters(sessionId, newFilters)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    await fetchStats(sessionId);  // Перезагружаем статистику с новыми фильтрами
                }
            })
            .onError(error => console.error("Error updating session filters:", error));
    };

    // Функции для работы с фильтрами
    const addBasicFilter = (field) => {
        const newFilter = {
            id: Date.now(),
            type: 'basic',
            field: field,
            selectedValues: []
        };
        setPendingFilters(prev => [...prev, newFilter]);
    };

    const removePendingFilter = (filterId) => {
        setPendingFilters(prev => prev.filter(f => f.id !== filterId));
    };

    const updatePendingBasicFilter = (filterId, selectedValues) => {
        setPendingFilters(prev => prev.map(f => 
            f.id === filterId ? { ...f, selectedValues } : f
        ));
    };

    const applyFilters = async () => {
        await updateSessionFilters(pendingFilters);
        setFilters([...pendingFilters]);
        setShowFilters(false);
    };

    const clearAllFilters = async () => {
        setPendingFilters([]);
        await updateSessionFilters([]);
        setFilters([]);
    };

    const getFilteredDataInfo = () => {
        if (filters.length === 0) return null;
        
        const filterDescriptions = filters.map(filter => {
            if (filter.type === 'basic' && filter.selectedValues.length > 0) {
                return `${FIELD_NAMES[filter.field]}: ${filter.selectedValues.length} значений`;
            }
            return FIELD_NAMES[filter.field];
        });
        
        return filterDescriptions.join(' • ');
    };

    // Опции для диаграмм
    const barChartOptions = {
        chart: {
            type: 'bar',
            height: 350,
            toolbar: {
                show: true
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: false,
            }
        },
        dataLabels: {
            enabled: false
        },
        xaxis: {
            type: 'category',
        },
        yaxis: {
            title: {
                text: 'Количество участников'
            }
        },
        colors: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6']
    };

    const lineChartOptions = {
        chart: {
            height: 350,
            type: 'line',
            zoom: {
                enabled: false
            },
            toolbar: {
                show: true
            }
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        markers: {
            size: 5
        },
        xaxis: {
            type: 'category'
        },
        yaxis: {
            title: {
                text: 'Средняя оценка'
            },
            min: 200,
            max: 800
        }
    };

    const pieChartOptions = {
        chart: {
            type: 'pie',
            height: 350
        },
        labels: [],
        legend: { show: false },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    width: 300
                },
                legend: {
                    position: 'bottom'
                }
            }
        }],
        colors: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']
    };

    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(false);
    const [filters_, setFilters_] = useState({ institute: '', specialty: '', year: '' });
             
    const loadDashboardStats = async currentFilters => {
        setLoadingDash(true)
        getDashboardStats(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setDashboardData(data);
            })
            .onError(err => console.error("Ошибка при загрузке дашборда:", err))
            .finally(() => setLoadingDash(false));
    };
    useEffect(() => {
            loadDashboardStats(filters_);
    }, [filters_]); 
    const updateFilter = (name, value) => {
        setFilters_(prev => ({ ...prev, [name]: value }));
    };

    if (loading) {
        return (
            <div className="AdminStatsView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: Статистика тестирования" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <div className="loading-content">
                            <LoadingSpinner text="Загрузка статистики..." />
                        </div>
                    </Content>
                </SidebarLayout>
            </div>
        );
    }

    return (
        <div className="AdminStatsView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Статистика тестирования" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="stats-container">
                        <div className="stats-header">
                            <div className="header-left">
                                <h1>Статистика тестирования</h1>
                                {filters.length > 0 && (
                                    <div className="active-filters-info">
                                        <span className="filters-badge">Фильтры: {filters.length}</span>
                                        <span className="filters-description">{getFilteredDataInfo()}</span>
                                    </div>
                                )}
                            </div>
                            <FlexRow wrap={WRAP.DO}>
                                <Button
                                    text={showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                                    onClick={() => setShowFilters(!showFilters)}
                                    palette={ADMIN_PALETTE.YELLOW}
                                />
                                <Button
                                    text={loading ? "Загрузка..." : "Обновить"}
                                    onClick={() => fetchStats(sessionId)}
                                    disabled={loading}
                                    palette={ADMIN_PALETTE.CYAN}
                                />
                            </FlexRow>
                        </div>

                        {/* Система фильтров */}
                        {showFilters && (
                            <div className="filters-system">
                                <div className="filters-header">
                                    <h3>Фильтры для статистики</h3>
                                    <div className="filters-controls">
                                        <div className="add-filter-dropdown">
                                            <select 
                                                className="filter-select"
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value.startsWith('basic:')) {
                                                        addBasicFilter(value.replace('basic:', ''));
                                                    }
                                                    e.target.value = '';
                                                }}
                                                disabled={!sessionId}
                                            >
                                                <option value="">+ Добавить фильтр</option>
                                                <optgroup label="Базовые сведения">
                                                    {basicFields.map(field => (
                                                        <option key={field} value={`basic:${field}`}>
                                                            {FIELD_NAMES[field]}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="filters-action-buttons">
                                            {(pendingFilters.length > 0 || filters.length > 0) && (
                                                <>
                                                    <Button
                                                        text={loading ? "Загрузка..." :  "Применить"}
                                                        onClick={applyFilters}
                                                        disabled={pendingFilters.length === 0 || !sessionId || loading}
                                                        palette={ADMIN_PALETTE.GREEN}
                                                    />
                                                    <Button
                                                        text="Очистить"
                                                        onClick={clearAllFilters}
                                                        disabled={!sessionId || loading}
                                                        palette={ADMIN_PALETTE.RED}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Ожидающие применения фильтры */}
                                <div className="pending-filters">
                                    {pendingFilters.map(filter => (
                                        <div key={filter.id} className="filter-item pending">
                                            <div className="filter-header">
                                                <span className="filter-name">
                                                    {FIELD_NAMES[filter.field]}
                                                </span>
                                                <button
                                                    className="remove-filter-btn"
                                                    onClick={() => removePendingFilter(filter.id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            
                                            {filter.type === 'basic' && (
                                                <div className="filter-content">
                                                    <select 
                                                        multiple
                                                        className="multi-select"
                                                        value={filter.selectedValues}
                                                        onChange={(e) => {
                                                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                                                            updatePendingBasicFilter(filter.id, selected);
                                                        }}
                                                    >
                                                        {availableValues[filter.field] && availableValues[filter.field].length > 0 ? (
                                                            availableValues[filter.field].map(value => (
                                                                <option key={value} value={value}>
                                                                    {value}
                                                                </option>
                                                            ))
                                                        ) : (
                                                            <option disabled>Нет доступных значений</option>
                                                        )}
                                                    </select>
                                                    <div className="filter-hint">
                                                        Выберите значения (удерживайте Ctrl для множественного выбора)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Активные фильтры */}
                                {filters.length > 0 && (
                                    <div className="active-filters-section">
                                        <div className="active-filters-header">
                                            <h4>Активные фильтры:</h4>
                                        </div>
                                        <div className="active-filters">
                                            {filters.map(filter => (
                                                <div key={filter.id} className="filter-item active">
                                                    <div className="filter-header">
                                                        <span className="filter-name">
                                                            {FIELD_NAMES[filter.field]}
                                                        </span>
                                                        <span className="filter-status">✓ Применен</span>
                                                    </div>
                                                    
                                                    {filter.type === 'basic' && (
                                                        <div className="filter-content">
                                                            <div className="selected-values">
                                                                Выбрано значений: {filter.selectedValues.length}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Навигация по разделам */}
                        <FlexRow margin="0 0 30 0" wrap={WRAP.DO}>
                            <Button
                                text="Обзор"
                                onClick={() => setActiveTab('overview')}
                                palette={activeTab === 'overview' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                            />
                            <Button
                                text="Компетенции"
                                onClick={() => setActiveTab('competences')}
                                palette={activeTab === 'competences' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                            />
                            <Button
                                text="Мотиваторы"
                                onClick={() => setActiveTab('motivators')}
                                palette={activeTab === 'motivators' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                            />
                            <Button
                                text="Ценности"
                                onClick={() => setActiveTab('values')}
                                palette={activeTab === 'values' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                            />
                        </FlexRow>

                        {activeTab === 'overview' && (
                            <div className="overview-tab">
                                {/* Карточки с общей статистикой */}
                                <div className="stats-cards">
                                    <ValueCard value={stats?.totalParticipants || 0} text="Всего участников (с 2021 г.)" />
                                    <ValueCard value={stats?.totalTests || 0} text="Всего тестирований" />
                                    <ValueCard value={stats?.uniqueInstitutions || 0} text="Учебных заведений" />
                                    <ValueCard value={stats?.uniqueCenters || 0} text="Центров компетенций" />
                                </div>

                                <FilterHeader onFilterChange={updateFilter} currentFilters={filters}/>
                                <span><>
                                    {loadingDash ? (
                                        <div className="p-20 text-center text-gray-400">Загрузка статистики...</div>
                                    ) : (
                                        <Dashboard data={dashboardData} />
                                    )}
                                </></span>

                                {/* Первый ряд диаграмм */}
                                <div className="charts-row">
                                    <TitledCard title="Динамика тестирований по годам">
                                        <Chart
                                            options={{
                                                ...barChartOptions,
                                                xaxis: { 
                                                    categories: stats?.testsByYear?.years || [],
                                                    title: {
                                                        text: 'Учебный год'
                                                    }
                                                },
                                                yaxis: { 
                                                    title: { 
                                                        text: 'Количество тестирований' 
                                                    }
                                                },
                                                plotOptions: {
                                                    bar: {
                                                        borderRadius: 4,
                                                        horizontal: false,
                                                        columnWidth: '50%',
                                                    }
                                                },
                                                colors: ['#10B981'],
                                                dataLabels: {
                                                    enabled: true,
                                                    formatter: function(val) {
                                                        return val.toFixed(0);
                                                    },
                                                    offsetY: -20,
                                                    style: {
                                                        fontSize: '12px',
                                                        colors: ['#333']
                                                    }
                                                }
                                            }}
                                            series={[{
                                                name: 'Тестирования',
                                                data: stats?.testsByYear?.counts || []
                                            }]}
                                            type="bar"
                                            height={400}
                                        />
                                    </TitledCard>
                                    <TitledCard title="Прохождение тестирования за текущий период">
                                    </TitledCard>
                                </div>

                                {/* Второй ряд диаграмм */}
                                <div className="charts-row">
                                    <TitledCard title="Топ-15 учебных заведений">
                                        <Chart
                                            options={{
                                                ...barChartOptions,
                                                xaxis: { categories: stats?.participantsByInstitution?.institutions || [] },
                                                plotOptions: {
                                                    bar: {
                                                        horizontal: true
                                                    }
                                                }
                                            }}
                                            series={[{
                                                name: 'Участники',
                                                data: stats?.participantsByInstitution?.counts || []
                                            }]}
                                            type="bar"
                                            height={400}
                                        />
                                    </TitledCard>
                                    <TitledCard title="Топ-15 центров компетенций">
                                        <Chart
                                            options={{
                                                ...barChartOptions,
                                                xaxis: { categories: stats?.participantsByCenter?.centers || [] },
                                                plotOptions: {
                                                    bar: {
                                                        horizontal: true
                                                    }
                                                }
                                            }}
                                            series={[{
                                                name: 'Участники',
                                                data: stats?.participantsByCenter?.counts || []
                                            }]}
                                            type="bar"
                                            height={400}
                                        />
                                    </TitledCard>
                                </div>

                                {/* Третий ряд диаграмм */}
                                <div className="charts-row">
                                    <Card>
                                        <FlexRow margin='0 0 20 0' align={ALIGN.CENTER} justify={JUSTIFY.SPACE_BETWEEN}>
                                            <span className="card-title">Все центры компетенций ({stats?.uniqueCenters || 0})</span>
                                            <Button
                                                text={showAllCenters ? 'Скрыть' : 'Показать все'}
                                                onClick={() => setShowAllCenters(!showAllCenters)}
                                                palette={ADMIN_PALETTE.CYAN}
                                            />
                                        </FlexRow>
                                        <div className="centers-list">
                                            {stats?.available_values?.center && stats.available_values.center.length > 0 ? (
                                                <div className={`centers-grid ${showAllCenters ? 'expanded' : 'collapsed'}`}>
                                                    {stats.available_values.center.map((center, index) => (
                                                        <div key={index} className="center-item">
                                                            <span className="center-name">{center}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="no-data">
                                                    Нет данных о центрах компетенций
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                    <Card>
                                        <FlexRow margin='0 0 20 0' align={ALIGN.CENTER} justify={JUSTIFY.SPACE_BETWEEN}>
                                            <span className="card-title">Все учебные заведения ({stats?.uniqueInstitutions || 0})</span>
                                            <Button
                                                text={showAllInstitutions ? 'Скрыть' : 'Показать все'}
                                                onClick={() => setShowAllInstitutions(!showAllInstitutions)}
                                                palette={ADMIN_PALETTE.CYAN}
                                            />
                                        </FlexRow>
                                        <div className="institutions-list">
                                            {stats?.available_values?.institution && stats.available_values.institution.length > 0 ? (
                                                <div className={`institutions-grid ${showAllInstitutions ? 'expanded' : 'collapsed'}`}>
                                                    {stats.available_values.institution.map((institution, index) => (
                                                        <div key={index} className="institution-item">
                                                            <span className="institution-name">{institution}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="no-data">
                                                    Нет данных об учебных заведениях
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>

                                {/* Четвёртый ряд диаграмм */}
                                <div className="charts-row">
                                    <TitledCard title="Распределение по специальностям">
                                        <Chart
                                            options={{
                                                ...pieChartOptions,
                                                labels: stats?.specialtiesDistribution?.specialties || []
                                            }}
                                            series={stats?.specialtiesDistribution?.counts || []}
                                            type="pie"
                                            height={400}
                                        />
                                    </TitledCard>
                                </div>
                            </div>
                        )}

                        {activeTab === 'competences' && (
                            <div className="competences-tab">
                                <h2>Статистика по компетенциям</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        Данные отображаются с применёнными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.competencesByYear?.map((competence, index) => (
                                        <TitledCard title={competence.name}>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { 
                                                        categories: competence.years,
                                                        title: {
                                                            text: 'Учебный год'
                                                        }
                                                    }
                                                }}
                                                series={[{
                                                    name: competence.name,
                                                    data: competence.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </TitledCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'motivators' && (
                            <div className="motivators-tab">
                                <h2>Статистика по мотиваторам</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        Данные отображаются с примененными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.motivatorsByYear?.map((motivator, index) => (
                                        <TitledCard title={motivator.name}>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { 
                                                        categories: motivator.years,
                                                        title: {
                                                            text: 'Учебный год'
                                                        }
                                                    }
                                                }}
                                                series={[{
                                                    name: motivator.name,
                                                    data: motivator.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </TitledCard>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'values' && (
                            <div className="values-tab">
                                <h2>Статистика по ценностям</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        Данные отображаются с примененными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.valuesByYear?.map((value, index) => (
                                        <TitledCard title={value.name}>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { 
                                                        categories: value.years,
                                                        title: {
                                                            text: 'Учебный год'
                                                        }
                                                    }
                                                }}
                                                series={[{
                                                    name: value.name,
                                                    data: value.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </TitledCard>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminStatsView;
