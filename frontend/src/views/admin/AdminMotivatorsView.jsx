import React, { useEffect, useState, useMemo, useRef } from "react";
import Select from 'react-select';
import {
    Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";

import MotivatorStatistics from "../../components/MotivatorStatistics.jsx";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import { getFilterDash, getMotivationCounts } from "../../api.js";
import { COMPETENCIES_NAMES, COURSES_NAMES, LINK_TREE, MOTIVATORS_NAMES } from "../../utilities.js";
import * as XLSX from 'xlsx';

import "./AdminMotivatorsView.scss";

const competencyLabels = {
    ...COMPETENCIES_NAMES,
    ...MOTIVATORS_NAMES
};

const getLabel = key => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');

const formatValue = value => Math.abs(value);
const roundFormat = (value, num) => Number((value).toFixed(num));

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

const Tooltippy = ({ active, payload = [], mot=true, label }) => {
    if (!active || !payload.length) return null;

    const filtered = payload
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    if (!filtered.length) return null;

    return (
    <div className="tooltip">
        {mot ? <p style={{color: "rgb(2, 81, 62)"}}>Мотиватор </p> : <p style={{color: "rgb(107, 0, 0)"}}>Демотиватор </p>}
        <p style={{fontWeight: 500}}>{getLabel(label)}
        </p>
        <p className="tp-note">Доля студентов: </p>
        {filtered.map((entry, i) => {
            const courseNum = entry.payload[`${entry.dataKey}_course`];
            const color = entry.payload[`${entry.dataKey}_color`];
            return (
                <div key={i} className="nums">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span>{courseNum} курс:   </span>
                <span className="font-bold" style={{ color }}>{Math.round(entry.value*10000)/100}%</span></div>
                </div>
                
            );
        })}
    </div>
    );
};
  


function MotTable({ data, currentFilters }) {
    const [tableOpen, setTableOpen] = useState(false);
    const [selected, setSelected] = useState(['М', 'Д', 'Н']);

    if (!data) return null;

    const mot_demot = ['М', 'Д', 'Н'];
    const toggleChoice = (mot_demot) => {
        setSelected(prev =>{
            const next = prev.includes(mot_demot) ? prev.filter(c => c !== mot_demot) : [...prev, mot_demot]
            return next;}
        );
    };
    const exportToExcel = () => {
        console.log(currentFilters);
        const excelData = [];
        if (!data || (!selected.includes('М') && !selected.includes('Д') && !selected.includes('Н'))){
            alert('Отсутствуют данные для скачивания.');
            return;
        }
        data.forEach((row) => {
            if (!row) return;

            const label = getLabel(row.name);
        
            // Строка для М
            if (selected.includes('М')){
                excelData.push({
                'Показатель': label,
                'Тип': 'М',
                '1 курс': row.course_1_high || 0,
                '2 курс': row.course_2_high || 0,
                '3 курс': row.course_3_high || 0,
                '4 курс': row.course_4_high || 0,
                'Все' : (row.all_high || 0),
            });}
        
            // Строка для Д
            if (selected.includes('Д')){
                excelData.push({
                'Показатель': label,
                'Тип': 'Д',
                '1 курс': row.course_1_low || 0,
                '2 курс': row.course_2_low || 0,
                '3 курс': row.course_3_low || 0,
                '4 курс': row.course_4_low || 0,
                'Все' : (row.all_low || 0),
            });}

            if (selected.includes('Н')){
                excelData.push({
                'Показатель': label,
                'Тип': 'Н',
                '1 курс': row.course_1_mid || 0,
                '2 курс': row.course_2_mid || 0,
                '3 курс': row.course_3_mid || 0,
                '4 курс': row.course_4_mid || 0,
                'Все' : (row.all_mid || 0),
            });}
        });
        
        const header = `${currentFilters.institute ? `${currentFilters.institute}, ` : ''} ${currentFilters.specialty ? `${currentFilters.specialty}, ` : ''} ${currentFilters.year ? `${currentFilters.year} учебный год ` : ''}`; 
        const worksheet = XLSX.utils.aoa_to_sheet([[header]]);
        XLSX.utils.sheet_add_json(worksheet, excelData,{ origin: "A2", skipHeader: false });
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Статистика Мотиваторов");
    
        XLSX.writeFile(workbook, `Статистика_Мотиваторов${currentFilters.year ? `_${currentFilters.year}` : ''}.xlsx`);
    };
    console.log(selected.length, selected);

    return(
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
            <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
            {tableOpen ? 'Скрыть таблицу' : 'Таблица'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>

            <div className="table-container">
            <div className="ct-top">
                <div className="ct-note"><span className="ct-pos">М</span> - мотиватор, <span>   </span> 
                <span className="ct-neg"> Д</span> - демотиватор, <span>   </span> <span className="ct-mid"> Н</span> - непроявленный</div>
                <div className="choice-row">
                    {mot_demot.map((i) => 
                    <label key={i} className={i=='М' ? "box-mot" : (i=='Д' ? "box-demot" : "box-neutral")}>
                    <input
                    type="checkbox"
                    checked={selected.includes(i)}
                    onChange={() => toggleChoice(i)}
                    /> {i} </label>)}</div>
                <button className="btnExcel"
                    onClick={() => exportToExcel()}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#16a34a'}
                >
            Скачать
          </button></div>

            <table className="ct-table">
                <thead>
                <tr>
                    <th rowSpan={2} colSpan={1}>Мотиватор</th>
                    <th></th> 
                    <th rowSpan={1} colSpan={5}>Доля студентов</th>
                </tr>
                <tr>
                    <th style={{ textAlign: 'right' }}>Курс: </th> 
                    <th style={{ textAlign: 'center' }}>{1}</th>
                    <th style={{ textAlign: 'center' }}>{2}</th>
                    <th style={{ textAlign: 'center' }}>3</th>
                    <th style={{ textAlign: 'center' }}>4</th>
                    <th style={{ textAlign: 'center' }}>Все курсы</th>
                </tr>
                </thead>
                <tbody>
                {data.map((row) => (
                    <React.Fragment key={row.name}>
                    {selected.length != 0 && (
                    <td rowSpan={selected.length+1} className="ct-name" style={{ verticalAlign: 'middle' }}>
                        {getLabel(row.name)}
                    </td>)}
                    {selected.includes('М') && (
                    <tr>
                        <td className="ct-pos">М</td>
                        {Array.from({ length: 4 }, (_, i) => {
                        const val = Number((row[`course_${i + 1}_high`]).toFixed(3));
                        return (
                            <td key={`m-${i}`} className="mot">
                            {val || val === 0 ? val : '—'}
                            </td>
                        );
                        })}
                        <td className="mot">{Number((row['all_high']).toFixed(3))}</td></tr>)}
                    {selected.includes('Д') &&( 
                    <tr>
                        <td className="ct-neg">Д</td>
                        {Array.from({ length: 4 }, (_, i) => {
                        const val = Number((row[`course_${i + 1}_low`]).toFixed(3));
                        return (
                            <td key={`d-${i}`} className="demot">
                            {val || val === 0 ? val : '—'}
                            </td>
                        );})}
                        <td className="demot">{Number((row['all_low']).toFixed(3))}</td>
                    </tr>)}
                    {selected.includes('Н') &&( 
                    <tr>
                        <td className="ct-mid">Н</td>
                        {Array.from({ length: 4 }, (_, i) => {
                        const val = Number((row[`course_${i + 1}_mid`]).toFixed(3));
                        return (
                            <td key={`d-${i}`} className="neutral">
                            {val || val === 0 ? val : '—'}
                            </td>
                        );})}
                        <td className="neutral">{Number((row['all_mid']).toFixed(3))}</td>
                    </tr>)}
                </React.Fragment>))}</tbody>
            </table>
            </div>
        </div>
       </div> );
}

//до 400 - демотиватор, 600+ мотиватор

function MotivatorStackedChart({ chart_data, currentFilters }) {
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
            .sort((a, b) => a.val - b.val); 

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
        <MotTable data={chart_data} currentFilters={currentFilters}/></div>
      </div>
    );
}

function MotivatorCharts({ chart_data, currentFilters }) {
    const allCourses = [1, 2, 3, 4];
    const [selectedCourses, setSelectedCourses] = useState(allCourses);
  
    const toggleCourse = (course) => {
        setSelectedCourses(prev =>{
            const next = prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
            return next.sort((a, b) => a - b);}
        );
    };
     
    const colors = {
        1: { high: " #A2CB8B", low: " #f5cd70" }, 
        2: { high: " #81ae71", low: " #eaa157" },
        3: { high: " #619257", low: " #da744a" },
        4: { high: " #42763f", low: " #C44545" },
    };
    console.log(chart_data);
    const processedData_pos = useMemo(() => {
        if (!chart_data) return [];
        return chart_data.map(item => {
            const newItem = { ...item };
            
            //сортировка
            const posValues = selectedCourses
            .map(c => ({ course: c, val: item[`course_${c}_high`] || 0 }))
            .sort((a, b) => a.val - b.val); 

            let sum = 0;
            posValues.forEach((obj, index) => {
                sum = sum + obj.val;
            newItem[`pos_seg_${index}`] = obj.val;
            newItem[`pos_seg_${index}_course`] = obj.course;
            newItem[`pos_seg_${index}_color`] = colors[obj.course].high;
            });
            newItem['sum'] = sum;

            return newItem;
        }).sort((a, b) => b.sum - a.sum);
    }, [chart_data, selectedCourses]);

    const processedData_neg = useMemo(() => {
        if (!chart_data) return [];
        return chart_data.map(item => {
            const newItem = { ...item };
            
            //сортировка
            const negValues = selectedCourses
            .map(c => ({ course: c, val: item[`course_${c}_low`] || 0 }))
            .sort((a, b) => a.val - b.val); 

            let sum = 0;
            negValues.forEach((obj, index) => {
                sum = sum + obj.val;
            newItem[`neg_seg_${index}`] = obj.val;
            newItem[`neg_seg_${index}_course`] = obj.course;
            newItem[`neg_seg_${index}_color`] = colors[obj.course].low;
            });
            newItem['sum'] = sum;

            return newItem;
        }).sort((a, b) => b.sum - a.sum); //сорт столбцов
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
        <div>
        <div className="chart-container h-[100px]">
            <ResponsiveContainer width="100%" height="80%">
                <BarChart
                    data={processedData_pos}
                    barGap={-30}
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                    dataKey="name"
                    tickFormatter={getLabel}
                    angle={-45}
                    tickMargin={25}
                    dx={-10}
                    textAnchor={"end"}
                    interval={0}
                    height={80}
                    stroke="#666"
                />
                <YAxis 
                    tickFormatter={formatValue} 
                    stroke="#666"
                    label={{ value: 'Доля студентов', angle: -90, position: 'insideLeft', fontWeight: 500, fontSize: 11, fill: '#94a3b8' }}
                
                />
                <Tooltip content={(props) => <Tooltippy {...props} mot={true}
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
                    {processedData_pos.map((entry, i) => (
                    <Cell key={i} fill={entry[`pos_seg_${index}_color`]} />
                    ))}
                </Bar>
                ))}
                </BarChart>
            </ResponsiveContainer></div>
            <div className="chart-container h-[100px]">
            <ResponsiveContainer width="100%" height="80%">
                <BarChart
                    data={processedData_neg}
                    barGap={-30}
                    margin={{ top: 10, right: 30, left: 20, bottom: 40 }}
                >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis
                    dataKey="name"
                    tickFormatter={getLabel}
                    angle={-45}
                    tickMargin={25}
                    dx={-10}
                    textAnchor={"end"}
                    interval={0}
                    height={80}
                    stroke="#666"
                />
                <YAxis 
                    stroke="#666"
                    label={{ value: 'Количество студентов', angle: -90, position: 'insideLeft', fontWeight: 500, fontSize: 11, fill: '#94a3b8' }}
                
                />
                <Tooltip content={(props) => <Tooltippy {...props} mot={false}
                wrapperStyle={{ overflow: "visible", pointerEvents: "none", zIndex: 9999 }} />} />
                
                <ReferenceLine y={0} stroke="#333" strokeWidth={1.5} />

                {selectedCourses.map((_, index) => (
                    <Bar 
                        key={`neg_${index}`} 
                        dataKey={`neg_seg_${index}`} 
                        stackId="negative" 
                        barSize={30}
                        strokeWidth={1.5}
                    >
                        {processedData_neg.map((entry, i) => (
                        <Cell key={i} fill={entry[`neg_seg_${index}_color`]} />
                        ))}
                    </Bar>
                ))}
            </BarChart></ResponsiveContainer>
        </div></div>
        <div style={{margin:20, marginTop:0}}>
        <MotTable data={chart_data} currentFilters={currentFilters}/></div>
      </div>
    );
}

//верх фильтры
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
  


function AdminMotivatorsView(){
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [MotivationData, setMotivationData] = useState(null);
    const [loadingMotDash, setLoadingMotDash] = useState(false);
    const [isError, setErrorStatus] = useState(false);
    const [filters, setFilters] = useState({ institute: '', specialty: '', year: '' });
    const savedY = useRef(0);

    const loadMotivationCounts = async currentFilters => {
        setLoadingMotDash(true)
        setErrorStatus(false)
        getMotivationCounts(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setMotivationData(data);
            })
            .onError(err => {
                console.error("Ошибка при загрузке мотиваторов:", err);
                setErrorStatus(true);
            })
            .finally(() => setLoadingMotDash(false));
    };
    useEffect(() => {
        loadMotivationCounts(filters);
    }, [filters]);
    
    const updateFilter = (name, value) => {
        setFilters(prev => {
          const updated = { ...prev, [name]: value };
          if (name == 'institute') updated.specialty = '';
          return updated;
        });
        savedY.current = window.scrollY;
    };
    useEffect(() => {
        requestAnimationFrame(() => window.scrollTo(0, savedY.current));
      }, [filters]);

    return (
            <div className="AdminMotivatorView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: График мотиваторов" name={user.username} />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <div className="filters-cont">
                        <FilterHeader
                            onFilterChange={updateFilter} 
                            filters={filters}
                        /></div>
                        {
                            isError ? <div className="p-10 text-center"> Ошибка при загрузке данных </div> :
                            loadingMotDash ? <div className="p-10 text-center">Загрузка данных...</div> :
                            <>
                                <MotivatorCharts chart_data={MotivationData?.data} currentFilters={filters}/>
                                <MotivatorStatistics filters={filters} />
                            </>
                        }
                        
                    </Content>
                </SidebarLayout>
            </div>
        );
}
                    

export default AdminMotivatorsView;

