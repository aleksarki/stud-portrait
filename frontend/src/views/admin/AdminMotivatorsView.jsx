import React, { useEffect, useState } from "react";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import {
    LabelList, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";

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

//до 400 - демотиватор, 600+ мотиватор

function MotivatorChart ({ chart_data }){
    const [selectedCourses, setSelectedCourses] = useState([1, 2, 3, 4]);
  
    const toggleCourse = (course) => {
      setSelectedCourses(prev => 
        prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
      );
    };
  
    // Цветовая палитра для 4 курсов 
    const colors = {
      1: { high: " #2ecc71", low: "rgb(167, 65, 65)" }, 
      2: { high: "rgb(47, 205, 173)", low: "rgb(153, 33, 20)" },
      3: { high: " #27ae60", low: "rgb(184, 106, 27)" },
      4: { high: " #1a7438", low: " #862663" },
    };
    const formatValue = (value) => Math.abs(value);
    if (!chart_data) {
        console.log('MotivationBars: ошибка загрузки данных');
        return <div className="p-4 text-gray-500">Нет данных для отображения</div>;
    }
    else{
        return (
            <div className="mot_bar">
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
        
                <div className="chart-container">
                <ResponsiveContainer width="100%" height={500}>
                    
                    <BarChart
                        data={chart_data}
                        barGap={-35} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                    <Legend layout="vertical" align="left" verticalAlign="top" wrapperStyle={{ paddingBottom: '20px' }} />
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis 
                        dataKey="name" 
                        tickFormatter={getLabel}
                        angle={-45} 
                        tickMargin={20}
                        textAnchor={"end"} 
                        interval={0} 
                        height={80}
                    />
                    <YAxis tickFormatter={formatValue} />
                    <Tooltip 
                        formatter={(value, course) => [formatValue(value), `${course} у`]}
                        cursor={{ fill: '#f5f5f5' }}
                        labelFormatter={(label) => `${getLabel(label)}`}
                    />
                   
                    <ReferenceLine y={0} stroke="#333" strokeWidth={1} />
        
                    {selectedCourses.map(course => (
                        <React.Fragment key={course}>
                        {/* Верхний >600 */}
                        <Bar
                            dataKey={`course_${course}_high`}
                            fill={colors[course].high}
                            fillOpacity={0.5}
                            stroke={colors[course].high}
                            strokeWidth={1}
                            name={`Курс ${course}: Мотиваторы`}
                            barSize={35}
                        />
                        {/* нижний */}
                        <Bar
                            dataKey={(data) => -(data[`course_${course}_low`] || 0)}
                            fill={colors[course].low}
                            fillOpacity={0.4}
                            stroke={colors[course].low}
                            strokeWidth={1}
                            name={`Курс ${course}: Демотиваторы`}
                            barSize={35}
                        />
                        </React.Fragment>
                    ))}
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>
    );}
  };




function AdminMotivatorsView(){
        const [MotivationData, setMotivationData] = useState(null);
        const [loadingMotDash, setLoadingMotDash] = useState(false);
        const [isLoaded, setStatus] = useState(false);
        const [isError, setErrorStatus] = useState(false);
    
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
        const loadMotivationCounts = async () => {
            setLoadingMotDash(true)
            try {
                const response = await fetch(`http://localhost:8000/portrait/motivation-counts`);
                
                if (!response.ok) {setErrorStatus(true); throw new Error('Ошибка сервера');}
                
                const data = await response.json();
                console.log(data.data)
                setMotivationData(data); 
                setStatus(true);
             
            } catch (error) {
                console.error("Ошибка при загрузке мотиваторов:", error);
                setStatus(false);
                setErrorStatus(true);
            } finally {
                setLoadingMotDash(false); 
            }
        };
        useEffect(() => {
            
            if (isLoaded==false && isError==false) {
                loadMotivationCounts();
            }
        },[isLoaded]); 
    

    return (
            <div className="AdminMotivatorView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: График мотиваторов" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                        (<>{loadingMotDash ? (
                            <div className="p-10 text-center">Загрузка данных...</div>
                                
                            ) : (<MotivatorChart chart_data={MotivationData?.data}/>
                            
                        )}</>)}
                    </Content>
                </SidebarLayout>
            </div>
        );
}
                    

export default AdminMotivatorsView;

