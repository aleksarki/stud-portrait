import { useState, useEffect } from 'react';
import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Chart from 'react-apexcharts';
import Button from '../../components/ui/Button.jsx';
import { FIELD_NAMES } from "../../utilities.js";

import "./AdminStatsView.scss";

function AdminStatsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [sessionId, setSessionId] = useState(null);
    const [filters, setFilters] = useState([]);
    const [pendingFilters, setPendingFilters] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [availableValues, setAvailableValues] = useState({});

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

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
        try {
            const response = await fetch('http://localhost:8000/portrait/create-data-session/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                setSessionId(data.session_id);
                await fetchStats(data.session_id);
            } else {
                console.error('Failed to create session:', data.message);
                await fetchStats();
            }
        } catch (error) {
            console.error('Error initializing session:', error);
            await fetchStats();
        }
    };

    const fetchStats = async (sessionIdToUse = null) => {
        setLoading(true);
        try {
            let url = 'http://localhost:8000/portrait/stats/';
            const body = sessionIdToUse ? { session_id: sessionIdToUse } : {};
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                setStats(data.stats);
                // Извлекаем доступные значения для фильтрации
                if (data.stats.available_values) {
                    console.log('Available values:', data.stats.available_values);
                    setAvailableValues(data.stats.available_values);
                } else {
                    console.log('No available values in response');
                    // Временная заглушка для тестирования
                    const testAvailableValues = {
                        'res_year': ['2023', '2024', '2025'],
                        'part_gender': ['Мужской', 'Женский'],
                        'center': ['ЦК1', 'ЦК2', 'ЦК3'],
                        'institution': ['Университет 1', 'Университет 2'],
                        'edu_level': ['Бакалавриат', 'Магистратура'],
                        'res_course_num': ['1', '2', '3', '4'],
                        'study_form': ['Очная', 'Заочная'],
                        'specialty': ['Информатика', 'Математика', 'Физика']
                    };
                    setAvailableValues(testAvailableValues);
                }
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Обновление фильтров сессии
    const updateSessionFilters = async (newFilters) => {
        if (!sessionId) return;
        
        try {
            const response = await fetch('http://localhost:8000/portrait/update-session-filters/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    filters: newFilters
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Перезагружаем статистику с новыми фильтрами
                await fetchStats(sessionId);
            }
        } catch (error) {
            console.error('Error updating session filters:', error);
        }
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

    if (loading) {
        return (
            <div className="AdminStatsView">
                <Header title="Админ: Статистика тестирования" name="Администратор1" style="modeus" />
                <div className="main-area">
                    <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
                        <div className="loading">
                            <div className="spinner"></div>
                            <div>Загрузка статистики...</div>
                        </div>
                    </SidebarLayout>
                </div>
            </div>
        );
    }

    return (
        <div className="AdminStatsView">
            <Header title="Админ: Статистика тестирования" name="Администратор1" style="modeus" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="modeus" />} style="modeus">
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
                            <div className="header-controls">
                                <Button
                                    text={showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
                                    onClick={() => setShowFilters(!showFilters)}
                                    fg="#212529"
                                    bg="#ffc107"
                                    hoverBg="#e0a800"
                                />
                                <Button
                                    text="🔄 Обновить"
                                    onClick={() => fetchStats(sessionId)}
                                    disabled={loading}
                                    fg="white"
                                    bg="#17a2b8"
                                    hoverBg="#138496"
                                    disabledBg="#6c757d"
                                />
                            </div>
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
                                                        text={`${loading ? '⏳' : '✅'} Применить фильтры`}
                                                        onClick={applyFilters}
                                                        disabled={pendingFilters.length === 0 || !sessionId || loading}
                                                        fg="white"
                                                        bg="#28a745"
                                                        hoverBg="#218838"
                                                        disabledBg="#6c757d"
                                                    />
                                                    <Button
                                                        text="Очистить все"
                                                        onClick={clearAllFilters}
                                                        disabled={!sessionId || loading}
                                                        fg="white"
                                                        bg="#dc3545"
                                                        hoverBg="#c82333"
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
                        <div className="stats-tabs">
                            <button 
                                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                📊 Обзор
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'competences' ? 'active' : ''}`}
                                onClick={() => setActiveTab('competences')}
                            >
                                ⚡ Компетенции
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'motivators' ? 'active' : ''}`}
                                onClick={() => setActiveTab('motivators')}
                            >
                                🎯 Мотиваторы
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'values' ? 'active' : ''}`}
                                onClick={() => setActiveTab('values')}
                            >
                                ❤️ Ценности
                            </button>
                        </div>

                        {activeTab === 'overview' && (
                            <div className="overview-tab">
                                {/* Карточки с общей статистикой */}
                                <div className="stats-cards">
                                    <div className="stat-card">
                                        <div className="stat-value">{stats?.totalParticipants || 0}</div>
                                        <div className="stat-label">Всего участников</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats?.totalTests || 0}</div>
                                        <div className="stat-label">Всего тестирований</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats?.uniqueInstitutions || 0}</div>
                                        <div className="stat-label">Учебных заведений</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats?.uniqueCenters || 0}</div>
                                        <div className="stat-label">Центров компетенций</div>
                                    </div>
                                </div>

                                {/* Первый ряд диаграмм */}
                                <div className="charts-row">
                                    <div className="chart-container">
                                        <h3>Участники по году первой оценки</h3>
                                        <Chart
                                            options={{
                                                ...barChartOptions,
                                                xaxis: { categories: stats?.participantsByFirstYear?.years || [] }
                                            }}
                                            series={[{
                                                name: 'Участники',
                                                data: stats?.participantsByFirstYear?.counts || []
                                            }]}
                                            type="bar"
                                            height={350}
                                        />
                                    </div>
                                    <div className="chart-container">
                                        <h3>Динамика тестирований по годам</h3>
                                        <Chart
                                            options={{
                                                ...lineChartOptions,
                                                xaxis: { categories: stats?.testsByYear?.years || [] },
                                                yaxis: { title: { text: 'Количество тестирований' } }
                                            }}
                                            series={[{
                                                name: 'Тестирования',
                                                data: stats?.testsByYear?.counts || []
                                            }]}
                                            type="line"
                                            height={350}
                                        />
                                    </div>
                                </div>

                                {/* Второй ряд диаграмм */}
                                <div className="charts-row">
                                    <div className="chart-container">
                                        <h3>Топ-15 учебных заведений</h3>
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
                                    </div>
                                    <div className="chart-container">
                                        <h3>Топ-15 центров компетенций</h3>
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
                                    </div>
                                </div>

                                {/* Третий ряд диаграмм */}
                                <div className="charts-row">
                                    <div className="chart-container">
                                        <h3>Распределение по специальностям</h3>
                                        <Chart
                                            options={{
                                                ...pieChartOptions,
                                                labels: stats?.specialtiesDistribution?.specialties || []
                                            }}
                                            series={stats?.specialtiesDistribution?.counts || []}
                                            type="pie"
                                            height={400}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'competences' && (
                            <div className="competences-tab">
                                <h2>Статистика по компетенциям</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        📊 Данные отображаются с примененными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.competencesByYear?.map((competence, index) => (
                                        <div key={index} className="chart-container">
                                            <h3>{competence.name}</h3>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { categories: competence.years }
                                                }}
                                                series={[{
                                                    name: competence.name,
                                                    data: competence.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'motivators' && (
                            <div className="motivators-tab">
                                <h2>Статистика по мотиваторам</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        📊 Данные отображаются с примененными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.motivatorsByYear?.map((motivator, index) => (
                                        <div key={index} className="chart-container">
                                            <h3>{motivator.name}</h3>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { categories: motivator.years }
                                                }}
                                                series={[{
                                                    name: motivator.name,
                                                    data: motivator.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'values' && (
                            <div className="values-tab">
                                <h2>Статистика по ценностям</h2>
                                {filters.length > 0 && (
                                    <div className="filtered-data-notice">
                                        📊 Данные отображаются с примененными фильтрами
                                    </div>
                                )}
                                <div className="charts-grid">
                                    {stats?.valuesByYear?.map((value, index) => (
                                        <div key={index} className="chart-container">
                                            <h3>{value.name}</h3>
                                            <Chart
                                                options={{
                                                    ...lineChartOptions,
                                                    xaxis: { categories: value.years }
                                                }}
                                                series={[{
                                                    name: value.name,
                                                    data: value.values
                                                }]}
                                                type="line"
                                                height={300}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </SidebarLayout>
            </div>
        </div>
    );
}

export default AdminStatsView;
