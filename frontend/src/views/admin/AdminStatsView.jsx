import { useState, useEffect } from 'react';
import Header from "../../components/Header";
import SidebarLayout from "../../components/SidebarLayout";
import Sidepanel from "../../components/Sidepanel";
import Chart from 'react-apexcharts';

import "./AdminStatsView.scss";

function AdminStatsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const linkList = [
        {to:'/admin/', title: "Главная"},
        {to:'/admin/stats', title: "Статистика тестирования"},
        {to:'/admin/results', title: "Результаты тестирования"},
        {to:'/admin/analysis', title: "Анализ данных"},
        {to:'/admin/courses', title: "Образовательные курсы"},
        {to:'/admin/upload', title: "Загрузка данных"},
    ];

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/portrait/stats/');
            const data = await response.json();
            if (data.status === 'success') {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Опции для столбчатых диаграмм
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

    // Опции для линейных диаграмм
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

    // Опции для круговой диаграммы
    const pieChartOptions = {
        chart: {
            type: 'pie',
            height: 350
        },
        labels: [],
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
                <Header title="Админ: Статистика тестирования" name="Администратор1" style="admin" />
                <div className="main-area">
                    <SidebarLayout sidebar={<Sidepanel links={linkList} style="admin" />} style="admin">
                        <div className="loading">Загрузка статистики...</div>
                    </SidebarLayout>
                </div>
            </div>
        );
    }

    return (
        <div className="AdminStatsView">
            <Header title="Админ: Статистика тестирования" name="Администратор1" style="admin" />
            <div className="main-area">
                <SidebarLayout sidebar={<Sidepanel links={linkList} style="admin" />} style="admin">
                    <div className="stats-container">
                        <div className="stats-header">
                            <h1>Статистика тестирования</h1>
                            <button className="refresh-btn" onClick={fetchStats}>
                                🔄 Обновить
                            </button>
                        </div>

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
