import { useState, useEffect, React, useRef } from 'react';
import Select from 'react-select';
import {
    PieChart, Pie, ReferenceLine, LabelList, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ArrowUp, ArrowDown } from "lucide-react";
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import * as XLSX from 'xlsx';

import FlexRow, { ALIGN, JUSTIFY, WRAP } from '../../components/FlexRow.jsx';
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import ReactApexChart from 'react-apexcharts';

import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { ADMIN_PALETTE } from '../../components/ui/palette.js';

import {
    getDashboardStats,
    getFilterDash,
    getDataBoxplot,
    getCompetencyTrendByYear
} from '../../api.js';
import { COMPETENCIES_NAMES, FIELD_NAMES, LINK_TREE, MOTIVATORS_NAMES } from "../../utilities.js";

import "./AdminCompetencesView.scss";

const competencyLabels = {
    ...COMPETENCIES_NAMES,
    ...MOTIVATORS_NAMES
};


const getLabel = (key) => competencyLabels[key] || competencyLabels[key.replace('res_comp_', '').replace('_', ' ')] || key.replace('res_comp_', '').replace('_', ' ');
// для сравнения

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
            a.label.localeCompare(b.label, 'ru', { numeric: true, sensitivity: 'base' })
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

const Stat = ({ label, value, prev = 0, suffix = "", isGrowth = false, isText = false, note = undefined }) => {
    if (prev == 0) {
        return (<div className="stat-block">
            <div className="value">{value}{suffix}</div>
            <div className="label">{label}</div>
        </div>
        );
    }
    else if (isText) {
        return (
            <div className="stat-block">
                <div className="value">{value}{suffix}</div>
                <div className="prev-year">прошлый год: {prev}{suffix}</div>
                <div className="label">{label}</div>
                {note != undefined ? <div className="note">{note}</div> : ''}
            </div>
        );
    }
    else {
        const diff = ((value || 0) - (prev || 0)) / prev * 100;
        const isUp = diff >= 0;

        return (
            <div className="stat-block">
                <div className={`trend ${isUp ? 'up' : 'down'}`}>
                    {isUp ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
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
function CompetencyTable({ data, filters, year }) {
    //??data: [{ name: 'Командная работа', score, below350, above650 }]
    const [tableOpen, setTableOpen] = useState(false);
    if (!data) return null;

    const exportToExcel = () => {
        try {
            const excelData = [];
            data.forEach((row) => {
                if (!row) return;

                const hasPrev = row.prev_score !== 0 && row.prev_score;
                const hasCurrent = row.score !== 0 && row.score;

                const delta = hasPrev && hasCurrent
                    ? Math.round(row.score) - Math.round(row.prev_score)
                    : null;

                const procent = delta !== null && hasPrev
                    ? Math.round((delta * 100) / Math.round(row.prev_score))
                    : null;

                const formatValue = (val) => val === 0 ? 0 : (val || '—');
                const formatDelta = (val) => val === null ? '—' : (val > 0 ? `+${val}` : val);
                const formatPercent = (val) => val === null ? '—' : (val > 0 ? `+${val}%` : `${val}%`);

                excelData.push({
                    'Компетенция': row.displayName || '—',
                    [`Средний балл ${year - 2}/${year - 1}`]: formatValue(hasPrev ? Math.round(row.prev_score) : null),
                    [`Средний балл ${year - 1}/${year}`]: formatValue(hasCurrent ? Math.round(row.score) : null),
                    'Разница': formatDelta(delta),
                    '%': formatPercent(procent)
                });
            });

            const header = `${filters.institute ? `${filters.institute}, ` : ''} ${filters.specialty ? `${filters.specialty}, ` : ''} ${filters.year ? `${filters.year} учебный год ` : ''}`;
            const worksheet = XLSX.utils.aoa_to_sheet([[header]]);
            XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A2", skipHeader: false });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `Компетенции ${year ? `${year - 2}_${year}` : ''}`);
            XLSX.writeFile(workbook, `Показатели_Компетенций${year ? `_${year - 2}_${year}` : ''}.xlsx`);

        } catch (error) {
            console.error("Ошибка при генерации Excel файла:", error);
            alert("Не удалось сгенерировать Excel.");
        }

    }

    return (
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
                <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
                {tableOpen ? 'Скрыть таблицу' : 'Показать таблицу'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>
                <div className="table-container">
                    <div className="ct-top">
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
                                <th rowSpan={2}>Компетенция</th>
                                <th colSpan={3}>Средний балл</th>
                                <th rowSpan={2}>%</th>
                            </tr>
                            <tr>

                                <th style={{ textAlign: 'center' }}>{year - 2}/{year - 1}</th>
                                <th style={{ textAlign: 'center' }}>{year - 1}/{year}</th>
                                <th style={{ textAlign: 'center' }}>Разница</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(row => {
                                const delta = row.score != 0 && row.prev_score != 0
                                    ? Math.round(row.score) - Math.round(row.prev_score)
                                    : null;
                                const procent = delta != null
                                    ? Math.round(delta * 100 / Math.round(row.prev_score), 2)
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
            </div>
        </div>);
}
function CompetencyTable_course({ data, filters }) {
    const [tableOpen, setTableOpen] = useState(false);
    const [range, setRange] = useState([1, 4]);
    if (!data) return null;
    const course = [
        { key: 'course_1', name: '1 Курс' },
        { key: 'course_2', name: '2 Курс' },
        { key: 'course_3', name: '3 Курс' },
        { key: 'course_4', name: '4 Курс' },
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
    };
    const exportToExcel = () => {
        try {
            const year = filters.year.split('/')[1];
            const excelData = [];
            data.forEach((row) => {
                if (!row) return;

                const label = getLabel(row.name);

                // Вычисляем динамику по ползунку
                let deltaValue = '—';
                const delta = calculateDelta(row);

                if (delta) {
                    deltaValue = delta > 0 ? `+${delta}` : delta;
                }

                const rowObject = {
                    'Компетенция': label
                };

                for (let i = 1; i <= 4; i++) {
                    const val = row[`course_${i}`];
                    const columnName = `${i} курс`;

                    rowObject[columnName] = (val !== 0 && !val) ? '—' : Math.round(val);
                }

                const deltaHeader = range && range.length === 2
                    ? `Динамика (курсы с ${range[0]} по ${range[1]})`
                    : 'Динамика';

                rowObject[deltaHeader] = deltaValue;

                excelData.push(rowObject);
            });
            const header = `${filters.institute ? `${filters.institute}, ` : ''} ${filters.specialty ? `${filters.specialty}, ` : ''} ${filters.year ? `${filters.year} учебный год ` : ''}`;
            const worksheet = XLSX.utils.aoa_to_sheet([[header]]);
            XLSX.utils.sheet_add_json(worksheet, excelData, { origin: "A2", skipHeader: false });

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `Компетенции ${year ? `${year - 1}/${year}` : ''}`);
            XLSX.writeFile(workbook, `Компетенции_по_курсам_${year || ''}.xlsx`);

        } catch (error) {
            console.error("Ошибка при генерации Excel файла:", error);
            alert("Не удалось сгенерировать Excel.");
        }
    }

    return (
        <div className='table'>
            <button className="ct-toggle" onClick={() => setTableOpen(v => !v)}>
                <span className={`ct-arrow ${tableOpen ? 'open' : ''}`}>▼</span>
                {tableOpen ? 'Скрыть таблицу' : 'Показать таблицу'}
            </button>
            <div className={`ct-table-wrap ${tableOpen ? 'open' : ''}`}>
                <div className="table-container">
                    <div className="ct-top">
                        <button className="btnExcel"
                            onClick={() => exportToExcel()}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#15803d'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#16a34a'}
                        >
                            Скачать
                        </button>
                        <p className="slider-note">*перетащите полузнки, чтобы изменить</p>
                    </div>
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
                                {course.map(i => {
                                    return (
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
                                        const prev = i > 1 ? row[`course_${i + 1}`] : value;
                                        const className = value > prev ? 'ct-pos' : value < prev ? 'ct-neg' : 'ct-zero';
                                        return <td className={className} key={i}>{(value != 0 || value) ? Math.round(value) : '—'}</td>;
                                    })}
                                    <td className="ct-zero">
                                        {(() => {
                                            const delta = calculateDelta(row);
                                            return (
                                                <DeltaCell value={delta} />
                                            );
                                        })()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

            <div className="radarChart" style={{ flex: 1 }}>
                <ResponsiveContainer width="110%" height="100%" >
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data} marginLeft={50}>
                        <PolarGrid stroke="#e0e0e0" />
                        <PolarAngleAxis
                            dataKey="name"
                            tickFormatter={getLabel}
                            tick={{ fill: '#666', fontSize: 10 }}
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

function Dashboard({ data, filters }) {
    if (!data) return null;
    const year = data.year;
    const chartData = data.chart.map(item => {
        const name = getLabel(item.name);
        return {
            ...item,
            displayName: name
        };
    });
    const pieData = [
        { "name": 'Прошли', "value": data.col2.participated?.amount_in, fill: '#1f66b6' },
        { "name": "Не прошли", "value": data.col2.participated?.students_all - data.col2.participated?.amount_in, fill: 'transparent' }

    ];
    //col2 uni
    const col2_data = { 'header': "Лидирующий ВУЗ", 'name': data.col2.uni_name, 'score': data.col2.uni_score };
    console.log(data.col2.uni_place);
    if (data.col2.uni_place == -1) {
        col2_data['header'] = "Нет данных за этот год";
        col2_data['name'] = "Рейтинг";
    }
    else if (data.col2.uni_place != 0) {
        col2_data['header'] = "Рейтинг ВУЗа";
        col2_data['name'] = "Топ " + (Math.round(data.col2.uni_place, 1)).toString() + "%";
    }
    return (
        <div>
            <div className="dashboard-container">
                <h2 className="dashboard-title">Статистика
                    <p className="extra-title">  за {year - 1}/{year} учебный год</p></h2>

                <div className="dashboard-grid">
                    {/* Левая колонка */}
                    <div className="col-left">
                        <Stat label="студентов прошли курсы" value={data.col1.courses.val} prev={data.col1.courses.prev} suffix="%" />
                        <Stat label="средний уровень компетенций" value={data.col1.avg_lvl.val} prev={data.col1.avg_lvl.prev} />
                        <Stat label={data.col1.motiv.count.curr != 0 ? `Наибольший мотиватор (${data.col1.motiv.count.curr}%)*` : "Нет данных за этот год"} value={getLabel(data.col1.motiv.name.curr)} prev={data.col1.motiv.count.prev != 0 ? getLabel(data.col1.motiv.name.prev) + ` (${data.col1.motiv.count.prev}%)` : 0} isText={true} note={"*По доли среди студентов"} />
                        <Stat label={data.col1.demotiv.count.curr != 0 ? `Наибольший демотиватор (${data.col1.demotiv.count.curr}%)*` : "Нет данных за этот год"} value={getLabel(data.col1.demotiv.name.curr)} prev={data.col1.demotiv.count.prev != 0 ? getLabel(data.col1.demotiv.name.prev) + ` (${data.col1.demotiv.count.prev}%)` : 0} isText={true} note={"*По доли среди студентов"} />
                    </div>

                    {/* Центральная колонка */}
                    <div className="col-center">
                        {data.col2.uni_place != 0 ? <Stat label={col2_data['header']} value={col2_data['name']} /> :
                            (<div className="uni-info mb-6">
                                <h4 className="text-xs uppercase text-gray-400 font-bold">{col2_data['header']}</h4>
                                <div className="text-xl font-bold text-blue-600">{col2_data['name']}</div>
                                <div className="text-sm text-gray-500">{Math.round(col2_data['score'], 1)} баллов (среднее)</div>
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
                                {data.col2.participated.students_all == 0 ? <p> Нет данных </p> :
                                    (<><h2>{Math.round(data.col2.participated?.amount_in / data.col2.participated?.students_all * 100, 1)}%</h2>
                                        <p>Студентов прошли тестирование</p></>)}
                            </div>
                        </div>
                    </div>

            {/* Правая колонка */}
            <div className="col-right">
            <h4 className="text-xs uppercase text-gray-400 font-bold mb-6">Компетенции</h4>
            <Stat 
                label={`Наиболее развитая. Средний балл: ${data.col3.best.val}`} 
                value={getLabel(data.col3.best.name)} isText={true}
                prev={data.col3.best_prev.val !=0 ? `${getLabel(data.col3.best_prev.name)} (${data.col3.best_prev.val})` : 0} 
            /> 
            <div style={{height:20}}></div>
            <Stat 
                label={`Наименее развитая. Средний балл: ${data.col3.worst.val}`} 
                value={getLabel(data.col3.worst.name)} isText={true}
                prev={data.col3.worst_prev.val !=0 ? `${getLabel(data.col3.worst_prev.name)} (${data.col3.worst_prev.val})` : 0} 
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
                <CompetencyTable data={chartData} filters={filters} year={year}/>
            </div>
            <CompRadar data={data.radar}/> 
            <div style={{padding:5, margin:20}}>
            <CompetencyTable_course data={data.radar} filters={filters}/></div>
       </div>
       </div>
    );
}

//
function BoxPlots({ data }) {
    const [selected, setSelected] = useState(null);
    const chartRef = useRef(null);

    if (!data) {
        return <div> Boxplot: Нет данных для отображения</div>
    }

    const series = [
        {
            name: 'boxplot',
            type: 'boxPlot',
            data: data.map(item => ({
                x: COMPETENCIES_NAMES[item.comp],
                y: item.box,  // [min_fence, q1, median, q3, max_fence]
            })),
        },
        {
            name: 'outliers',
            type: 'scatter',
            data: data.flatMap(item =>
                item.out.map(o => ({
                    x: COMPETENCIES_NAMES[item.comp],
                    y: o.y,
                    id: o.id,
                    comp: item.comp,
                }))
            ),
        },
    ];

    const options = {
        chart: {
            type: 'boxPlot',
            toolbar: { show: false },
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    // Предотвращаем всплытие события
                    event?.stopPropagation();
                    
                    // Проверяем, что клик именно по выбросам
                    if (config.seriesIndex !== 1) return;
                    
                    // Получаем точку из данных
                    const point = series[1].data[config.dataPointIndex];
                    if (point) {
                        setSelected(point);
                    }
                },
            },
        },
        colors: ['rgb(101,142,208)', '#e24b4a'],
        markers: { size: [0, 4] },
        plotOptions: {
            boxPlot: {
                colors: {
                    upper: 'rgba(101,142,208,0.35)',
                    lower: 'rgba(101,142,208,0.15)',
                },
            },
        },
        tooltip: {
            shared: false,
            intersect: true,
            custom: ({ seriesIndex, dataPointIndex, w }) => {
                if (seriesIndex === 0) {
                    // тултип для ящика
                    const d = w.config.series[0].data[dataPointIndex];
                    if (!d || !d.y) return '<div></div>';
                    
                    const [min, q1, med, q3, max] = d.y;
                    return `
                <div style="padding:12px 16px;font-size:12px;line-height:1.8">
                  <b style="color:#334155">${d.x || ''}</b><br/>
                  <span style="color:#94a3b8">Макс (ус):</span> <b>${max}</b><br/>
                  <span style="color:#94a3b8">Q3:</span> <b>${q3}</b><br/>
                  <span style="color:#94a3b8">Медиана:</span> <b>${med}</b><br/>
                  <span style="color:#94a3b8">Q1:</span> <b>${q1}</b><br/>
                  <span style="color:#94a3b8">Мин (ус):</span> <b>${min}</b>
                </div>`;
                }
                if (seriesIndex === 1) {
                    const d = series[1].data[dataPointIndex];
                    if (!d) return '<div></div>';
                    
                    return `
                <div style="padding:12px 16px;font-size:12px;line-height:1.8">
                  <b style="color:#e24b4a">Выброс</b><br/>
                  <span style="color:#94a3b8">ID:</span> <b>${d.id}</b><br/>
                  <span style="color:#94a3b8">Балл:</span> <b>${d.y}</b>
                </div>`;
                }
                return '<div></div>';
            },
        },
        yaxis: { 
            min: 150, 
            max: 850, 
            labels: { style: { fontSize: '11px' } } 
        },
        xaxis: { 
            labels: { 
                style: { fontSize: '11px', colors: '#64748b' }, 
                rotate: -20,
                trim: true,
            } 
        },
        grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: false } } },
        legend: { show: false },
    };

    // Обработчик закрытия модального окна
    const handleCloseModal = () => {
        setSelected(null);
    };

    // Обработчик клика по оверлею
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            setSelected(null);
        }
    };

    return (
        <div className="ds-card">
            <h4 className="ds-title">Распределение по компетенциям</h4>
            <ReactApexChart 
                type="boxPlot" 
                series={series} 
                options={options} 
                height={420}
            />

            {selected && (
                <div 
                    className="bp-modal-overlay" 
                    onClick={handleOverlayClick}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div 
                        className="bp-modal" 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '20px',
                            minWidth: '300px',
                            maxWidth: '400px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            position: 'relative',
                        }}
                    >
                        <button 
                            className="bp-modal__close" 
                            onClick={handleCloseModal}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                fontSize: '20px',
                                cursor: 'pointer',
                                color: '#666',
                            }}
                        >
                            ✕
                        </button>
                        <p className="bp-modal__title" style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            marginBottom: '15px',
                            color: '#e24b4a'
                        }}>
                            Выброс
                        </p>
                        <p style={{ marginBottom: '10px' }}>
                            ID участника: <b>{selected.id}</b>
                        </p>
                        <p style={{ marginBottom: '10px' }}>
                            Компетенция: <b>{COMPETENCIES_NAMES[selected.comp] || selected.comp}</b>
                        </p>
                        <p style={{ marginBottom: '0' }}>
                            Балл: <b>{selected.y}</b>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}


const TREND_COLORS = [
    '#1f66b6', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#16a085',
    '#e67e22', '#34495e', '#d35400', '#2980b9', '#c0392b', '#7f8c8d',
];

function CompetencyTrendLine({ data, loading }) {
    const [hiddenLines, setHiddenLines] = useState({});
    if (loading) return <div style={{ padding: 20 }}>Загрузка графика динамики...</div>;
    if (!data || !data.trends || data.trends.length === 0) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
                Нет данных для построения графика динамики компетенций
            </div>
        );
    }

    const allCourses = new Set();
    data.trends.forEach(t => t.points.forEach(p => allCourses.add(p.course)));
    const sortedCourses = Array.from(allCourses).sort((a, b) => a - b);

    const chartData = sortedCourses.map(course => {
        const row = { course: `${course} курс` };
        data.trends.forEach(t => {
            const point = t.points.find(p => p.course === course);
            const label = COMPETENCIES_NAMES[t.competency] || t.competency;
            row[label] = point ? point.avg : null;
        });
        return row;
    });

    return (
        <div className="competency-trend-line" style={{
            background: '#fff',
            borderRadius: 8,
            marginTop: 20,
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
            }}>
                <h2 style={{ margin: 0, color: '#333' }}>
                    Динамика компетенций по курсам обучения
                </h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => setHiddenLines({})}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        Показать все
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const all = {};
                            data.trends.forEach(t => {
                                const lbl = COMPETENCIES_NAMES[t.competency] || t.competency;
                                all[lbl] = true;
                            });
                            setHiddenLines(all);
                        }}
                        style={{
                            padding: '6px 12px',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 13,
                        }}
                    >
                        Скрыть все
                    </button>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={500}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                        dataKey="course"
                        tick={{ fill: '#555', fontSize: 12 }}
                    />
                    <YAxis
                        tick={{ fill: '#555', fontSize: 12 }}
                        domain={['dataMin - 20', 'dataMax + 20']}
                        allowDecimals={false}
                        label={{
                            value: 'Среднее значение',
                            angle: -90,
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: '#555' },
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: 4,
                        }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: 10, cursor: 'pointer' }}
                        iconType="line"
                        onClick={(entry) => {
                            setHiddenLines(prev => ({
                                ...prev,
                                [entry.dataKey]: !prev[entry.dataKey],
                            }));
                        }}
                        formatter={(value) => (
                            <span style={{
                                color: hiddenLines[value] ? '#bbb' : '#333',
                                textDecoration: hiddenLines[value] ? 'line-through' : 'none',
                            }}>
                                {value}
                            </span>
                        )}
                    />
                    {data.trends.map((trend, idx) => {
                        const label = COMPETENCIES_NAMES[trend.competency] || trend.competency;
                        return (
                            <Line
                                key={trend.competency}
                                type="monotone"
                                dataKey={label}
                                stroke={TREND_COLORS[idx % TREND_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                                connectNulls={true}
                                hide={!!hiddenLines[label]}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function AdminCompetencesView() {
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState(null);
    const [loadingDash, setLoadingDash] = useState(false);
    const [filters_, setFilters_] = useState({ institute: '', specialty: '', year: '' });

    const [BoxplotData, setBoxplotData] = useState(null);

    const [trendData, setTrendData] = useState(null);
    const [loadingTrend, setLoadingTrend] = useState(false);

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
        setFilters_(prev => {
            const updated = { ...prev, [name]: value };
            if (name == 'institute') updated.specialty = '';
            return updated;
        });
    };

    const loadBoxPlot = async (currentFilters) => {
        setLoading(true);
        getDataBoxplot(currentFilters.institute, currentFilters.specialty, currentFilters.year)
            .onSuccess(async response => {
                const data = await response.json();
                setBoxplotData(data);
            })
            .onError(err => {
                console.error("Ошибка при загрузке данных:", err);
            })
            .finally(() => setLoading(false));
    };
    useEffect(() => {
        loadBoxPlot(filters_);
    }, [filters_]);

    const loadCompetencyTrend = async (currentFilters) => {
        setLoadingTrend(true);
        getCompetencyTrendByYear(currentFilters.institute, currentFilters.specialty)
            .onSuccess(async response => {
                const data = await response.json();
                setTrendData(data);
            })
            .onError(err => console.error("Ошибка при загрузке динамики:", err))
            .finally(() => setLoadingTrend(false));
    };
    useEffect(() => {
        loadCompetencyTrend(filters_);
    }, [filters_]);

    if (loadingDash) {
        return (
            <div className="AdminCompetencesView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: Компетенции" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <FilterHeader onFilterChange={updateFilter} filters={filters_} />
                        <div className="loading-content">
                            <LoadingSpinner text="Загрузка статистики..." />
                        </div>
                    </Content>
                </SidebarLayout>
            </div>
        );
    }

    return (
        <div className="AdminCompetencesView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Компетенции" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <FilterHeader onFilterChange={updateFilter} filters={filters_} />
                    <span><>
                        <Dashboard data={dashboardData} filters={filters_} />
                    </></span>
                    {loading ? <div>Загрузка диаграммы..</div> :
                        <><BoxPlots data={BoxplotData?.data} />
                        <CompetencyTrendLine data={trendData} loading={loadingTrend} />
                        </>}
                </Content>
            </SidebarLayout>
        </div>);
}
export default AdminCompetencesView;