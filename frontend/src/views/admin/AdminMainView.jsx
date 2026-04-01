import { useEffect, useState } from "react";

import FlexRow, { WRAP } from '../../components/FlexRow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import ColorBox, { BOX_COLOR } from '../../components/ui/ColorBox.jsx';
import Button, { BUTTON_PALETTE } from '../../components/ui/Button.jsx';
import Label from '../../components/ui/Label.jsx';
import ValueCard from '../../components/cards/ValueCard.jsx';
import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { getPortraitCourses } from '../../api.js';
import {
    getPortraitGetFilterOptionsWithCounts,
    getPortraitGetInstitutionDirections,
    getPortraitGetDisciplines,
    postPortraitCreateDataSession,
} from "../../api.js";
import {
    PieChart, Pie, LabelList, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

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
const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');
// для сравнения

const Stat = ({ label, value, prev, suffix = "", isGrowth = false }) => {
    if (prev==0){
        return(
            <div className="stat-block">
            <div className="value">{value}{suffix}</div>
            <div className="prev-year">прошлый год: - </div>
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

function Dashboard({ data }) {
    if (!data) return null;

        const chartData = data.chart.map(item => {
        const translatedName = getLabel(item.name);
        return {
            ...item,
            displayName: translatedName
        };
    });
    const pieData = [
        { "name": 'Прошли', "value" : data.col2.participated.amount_in, fill: '#1f66b6'},
        {"name" : "Не прошли", "value" : data.col2.participated.students_all - data.col2.participated.amount_in, fill: 'transparent'}
                                
    ];

    return (
        <div className="dashboard-container">
        <h2 className="dashboard-title">Статистика</h2>
        
        <div className="dashboard-grid">
            {/* Левая колонка */}
            <div className="col-left">
            <Stat label="студентов прошли доп. курсы" value={data.col1.courses.val} prev={data.col1.courses.prev} suffix="%" />
            <Stat label="средний уровень компетенций" value={data.col1.avg_lvl.val} prev={data.col1.avg_lvl.prev} />
            <Stat label="общее изменение компетенций за год" value={data.col1.growth.val} prev={data.col1.growth.prev} suffix="%" isGrowth />
            </div>

            {/* Центральная колонка */} 
            <div className="col-center">
                <div className="uni-info mb-6">
                    <h4 className="text-xs uppercase text-gray-400 font-bold">Лидирующий ВУЗ</h4>
                    <div className="text-xl font-bold text-blue-600">{data.col2.uni_name}</div>
                    <div className="text-sm text-gray-500">{data.col2.uni_score} баллов (среднее)</div>
                </div>
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
                        <h2>{Math.round(data.col2.participated.amount_in/data.col2.participated.students_all*100,1) }%</h2>
                        <p>Студентов прошли тестирование</p>
                    </div>
                </div>
            </div>

            {/* Правая колонка */}
            <div className="col-right">
            <h4 className="text-xs uppercase text-gray-400 font-bold mb-6">Компетенции</h4>
            <Stat 
                label={`Лучшая: ${getLabel(data.col3.best.name)}`} 
                value={data.col3.best.val} 
                prev={data.col3.best.prev || 0} 
            /> 
            <Stat 
                label={`Худшая: ${getLabel(data.col3.worst.name)}`} 
                value={data.col3.worst.val} 
                prev={data.col3.worst.prev || 0} 
            />
            </div>
        </div>
        <div className="dashboard-chart-row">
                <div className="chart-container">
                    <h4 className="section-label">Распределение по компетенциям (средний балл)</h4>
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="displayName" 
                                interval={0}
                                angle={-20} 
                                tick={{
                                    fontSize: 11, 
                                    fill: '#64748b',
                                    dy: 10}} 
                                tickMargin={10}
                                tickLine={false}
                                dx={-40}
                                height={25}
                                textAnchor="end"
                            />
                            <YAxis 
                                domain={[0, 850]} 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{fill: '#94a3b8'}} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                                labelFormatter={(label) => `Компетенция: ${label}`}
                            />
                            <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={45} >
                                <LabelList
                                    
                                    position="top"
                                    offset={5}
                                    fontSize={12}
                                    fill="black"
                                /></Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>);
}



function AdminMainView() {

    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(false);
    const [isLoaded, setDashStatus] = useState(false);
    const loadDashboardStats = async () => {
        setLoadingDash(true)
        try {
            const response = await fetch(`http://localhost:8000/portrait/dashboard-stats/`);
            
            if (!response.ok) throw new Error('Ошибка сервера');
    
            const data = await response.json();
            setDashboardData(data); 
            setDashStatus(true);
    
        } catch (error) {
            console.error("Ошибка при загрузке дашборда:", error);
        } finally {
            setLoadingDash(false); 
        }
    };
    useEffect(() => {
            if (isLoaded == false)
                loadDashboardStats();
    }, ); 


    return (
        <div className="AdminMainView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Главная" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
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
