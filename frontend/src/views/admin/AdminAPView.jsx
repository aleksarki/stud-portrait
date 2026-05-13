import { useState, useEffect } from 'react';
import Select from 'react-select';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

import { getFilterDash, getScoresResult, getDataBoxplot } from '../../api.js';
import { COMPETENCIES_NAMES, COURSES_NAMES, LINK_TREE } from "../../utilities.js";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import Button from '../../components/ui/Button.jsx';
import { ADMIN_PALETTE } from '../../components/ui/palette.js';
import FlexRow, { WRAP } from '../../components/FlexRow.jsx';

import "./AdminAPView.scss";

import ReactApexChart from 'react-apexcharts';
//
function BoxPlots({data}){
    const [selected, setSelected] = useState(null);
    if (!data){
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
            }))
          ),
        },
      ];
      
    const options = {
        chart: {
          type: 'boxPlot',
          toolbar: { show: false },
          events: {
            dataPointSelection: (e, chart, config) => {
              if (config.seriesIndex !== 1) return;
              const point = series[1].data[config.dataPointIndex];
              setSelected(point);
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
              const [min, q1, med, q3, max] = d.y;
              return `
                <div style="padding:12px 16px;font-size:12px;line-height:1.8">
                  <b style="color:#334155">${d.x}</b><br/>
                  <span style="color:#94a3b8">Макс (ус):</span> <b>${max}</b><br/>
                  <span style="color:#94a3b8">Q3:</span> <b>${q3}</b><br/>
                  <span style="color:#94a3b8">Медиана:</span> <b>${med}</b><br/>
                  <span style="color:#94a3b8">Q1:</span> <b>${q1}</b><br/>
                  <span style="color:#94a3b8">Мин (ус):</span> <b>${min}</b>
                </div>`;
            }
            if (seriesIndex === 1) {
              const d = series[1].data[dataPointIndex];
              return `
                <div style="padding:12px 16px;font-size:12px;line-height:1.8">
                  <b style="color:#e24b4a">Выброс</b><br/>
                  <span style="color:#94a3b8">ID:</span> <b>${d.id}</b><br/>
                  <span style="color:#94a3b8">Балл:</span> <b>${d.y}</b>
                </div>`;
            }
          },
        },
        yaxis: { min: 150, max: 850, labels: { style: { fontSize: '11px' } } },
        xaxis: { labels: { style: { fontSize: '11px', colors: '#64748b' }, rotate: -20 } },
        grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: false } } },
        legend: { show: false },
    };
    return (
        <div className="ds-card">
          <h4 className="ds-title">Распределение по компетенциям</h4>
          <ReactApexChart type="boxPlot" series={series} options={options} height={420} />
    
          {selected && (
            <div className="bp-modal-overlay" onClick={() => setSelected(null)}>
              <div className="bp-modal" onClick={e => e.stopPropagation()}>
                <button className="bp-modal__close" onClick={() => setSelected(null)}>✕</button>
                <p className="bp-modal__title">Выброс</p>
                <p>ID участника: <b>{selected.id}</b></p>
                <p>Компетенция: <b>{COMPETENCIES_NAMES[selected.comp]}</b></p>
                <p>Балл: <b>{selected.y}</b></p>
              </div>
            </div>
          )}
        </div>
    );
}


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

function AdminAPView() {
    const [ScatterData, setScatterData] = useState(null);
    const [LoadingData, setLoading] = useState(false);
    const [filters, setFilters] = useState({ institute: '', specialty: '', year: '' });
    const [isError, setErrorStatus] = useState(false);
    const [BoxplotData, setBoxplotData] = useState(null);
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
        loadBoxPlot(filters);
    }, [filters]);

    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    return (
        <div className="AdminAPView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Академические показатели и компетенции" name="Админимтратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                <FilterHeader onFilterChange={updateFilter} 
                            currentFilters={filters}/>
                {<>{LoadingData ? (
                    <div className="p-10 text-center">Загрузка данных...</div>)
                    : <><BoxPlots data={BoxplotData?.data}/></>}
                    </>}

                <FlexRow margin="0 0 30 0" wrap={WRAP.DO}>
                        <Button
                            text="Обзор"
                            onClick={() => setActiveTab('pir')}
                            palette={activeTab === 'ПИР' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="Компетенции"
                            onClick={() => setActiveTab('up')}
                            palette={activeTab === 'УП' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="Мотиваторы"
                            onClick={() => setActiveTab('pract3')}
                            palette={activeTab === 'Экспл. практика' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
                        />
                        <Button
                            text="Ценности"
                            onClick={() => setActiveTab('pract4')}
                            palette={activeTab === 'Преддипл. практика' ? ADMIN_PALETTE.BLUE : ADMIN_PALETTE.GRAY}
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