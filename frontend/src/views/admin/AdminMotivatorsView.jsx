import { useEffect, useState } from "react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { getPortraitCourses } from '../../api.js';
import {
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    getPortraitGetDisciplines,
    postPortraitCreateDataSession,
} from "../../api.js";
import {
    LabelList, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

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


function MotivationRadar({ data }) {

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
        console.log('MotivationRadar: ошибка загрузки данных');
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

    const handleMouseEnter = (o) => {
        const { dataKey } = o;
        setHoveredCourse(dataKey);
    };

    const handleMouseLeave = () => {
        setHoveredCourse(null);
    };

    const formatName = (name) => getLabel(name);

    const toggleCourse = (courseKey) => {
        setVisibleCourses(prev => ({
            ...prev,
            [courseKey]: !prev[courseKey]
        }));
    };

    console.log("данные дошли");
    return (
        <div className="MotChartContainer">
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
        
        <div style={{ flex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
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


function AdminMotivatorsView(){
        const [MotivationData, setMotivationData] = useState(null);
        const [loadingMotDash, setLoadingMotDash] = useState(false);
        const [isLoaded, setStatus] = useState(false);
    
        const loadMotivationStats = async () => {
            setLoadingMotDash(true)
            try {
                const response = await fetch(`http://localhost:8000/portrait/motivation-stats`);
                //const response = await fetch(`motivation-stats/`);
                if (!response.ok) throw new Error('Ошибка сервера');
        
                const data = await response.json();
                //console.log('response:', data);
                setMotivationData(data); 
                setStatus(true);
                
        
            } catch (error) {
                console.error("Ошибка при загрузке мотиваторов:", error);
                setStatus(false);
            } finally {
                setLoadingMotDash(false); 
            }
        };
        useEffect(() => {
            
            if (isLoaded==false) {
                loadMotivationStats();
            }
        }); 
    

    return (
            <div className="AdminMotivatorView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: График мотиваторов" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        {loadingMotDash ? (
                            <div className="p-10 text-center">Загрузка данных...</div>
                                
                            ) : (<MotivationRadar data={MotivationData?.data}/>
                            
                        )}
                    </Content>
                </SidebarLayout>
            </div>
        );
}
                    

export default AdminMotivatorsView;

