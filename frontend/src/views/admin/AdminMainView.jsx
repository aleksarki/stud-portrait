import { useEffect, useState } from "react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import {
    PieChart, Pie, ReferenceLine, LabelList, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Select from 'react-select';
import { ArrowUpRight, ArrowDownRight, Award, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import "./AdminMainView.scss";

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

const max_comp=25; //самые длинные названия
const max_mot=15;

const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');
// для сравнения

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
    const getOpacity = (course) => {
        if (!hoveredCourse) return 0.2;
        return hoveredCourse === course ? 0.6 : 0.05;
    };

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
        <div className="ChoiceContainer">
            {/*панель с чекбоксами */}
            <div className="chooseBoxes">
                <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Курсы</h3>
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
        
        <div style={{ flex: 1}}>
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
    const fixedSize = (name) => max_comp - name.length <= 0 ? name : ' '.repeat(max_comp - name.length) + name;
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
    if (data.col2.uni_place!=0){
        col2_data['header'] = "Рейтинг ВУЗа";
        col2_data['name'] = "Топ "+(Math.round(data.col2.uni_place,1)).toString()+"%";
    }
    return (
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
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>

                    <div class="absolute-center">
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
                label={`Лучшая: ${getLabel(data.col3.best.name)}`} 
                value={data.col3.best.val} 
                //prev={data.col3.best_prev.val || 0} 
            /> 
            <Stat 
                label={`Худшая: ${getLabel(data.col3.worst.name)}`} 
                value={data.col3.worst.val} 
                //prev={data.col3.worst_prev.val || 0} 
            />
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
                </div>
            </div>
            <div>
            <CompRadar data={data.radar}/>
            </div>
       </div>
    );
}



function AdminMainView() {

    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(false);
    const [filters, setFilters] = useState({ institute: '', specialty: '', year: '' });
             
    const loadDashboardStats = async (currentFilters) => {
        setLoadingDash(true)
        try {
            console.log(currentFilters);
            let baseUrl = `http://localhost:8000/portrait/dashboard-stats`;
            const params = new URLSearchParams();

            if (currentFilters.institute) params.append('institute', currentFilters.institute);
            if (currentFilters.specialty) params.append('specialty', currentFilters.specialty);
            if (currentFilters.year) params.append('year', currentFilters.year);

            const queryString = params.toString();
            const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

            const response = await fetch(finalUrl);
            
            if (!response.ok) throw new Error('Ошибка сервера');
    
            const data = await response.json();
            setDashboardData(data); 
    
        } catch (error) {
            console.error("Ошибка при загрузке дашборда:", error);
        } finally {
            setLoadingDash(false); 
        }
    };
    useEffect(() => {
            loadDashboardStats(filters);
    }, [filters]); 
    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="AdminMainView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Главная" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <FilterHeader onFilterChange={updateFilter} 
                        currentFilters={filters}/>
                    <span><>
                            {loadingDash ? (
                                <div className="p-20 text-center text-gray-400">Загрузка статистики...</div>
                            ) : (
                                <Dashboard data={dashboardData} />
                            )}
                        </></span>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminMainView;
