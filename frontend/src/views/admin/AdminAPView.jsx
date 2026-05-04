import { useState, useEffect } from 'react';
import { COURSES_NAMES, LINK_TREE } from "../../utilities.js";

import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Select from 'react-select';

import "./AdminAPView.scss";


function ScatterPlot({ data }) {
    if (!data){
        console.log('нет данных');
        return <div className="p-4 text-gray-500 text-center">Нет данных для отображения</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis
              dataKey="mean"
              name="Mean"
              type="number"
              label={{ value: 'mean', position: 'insideBottom', offset: -10 }}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              dataKey="score"
              name="Score"
              label={{ value: 'score', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={data}
              fill="darkred"
              fillOpacity={0.1}    
              stroke="darkred"
              strokeOpacity={0.3}
              r={4}       
            />
          </ScatterChart>
        </ResponsiveContainer>
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
        <div className="MainPage">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Академические показатели" name="Админимтратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <FilterHeader onFilterChange={updateFilter} 
                            currentFilters={filters}/>
                <Content>
                {isError ? (<div className="p-10 text-center"> Ошибка при загрузке данных </div>) :
                    (<>{LoadingData ? (
                    <div className="p-10 text-center">Загрузка данных...</div>)
                    : <><ScatterPlot data={ScatterData?.data}/></>}
                    </>)}
                </Content>
            </SidebarLayout>
        </div>
    )}

export default AdminAPView;