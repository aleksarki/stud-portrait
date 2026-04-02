import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Chart from 'react-apexcharts';

import { FIELD_NAMES, LINK_TREE } from "../../utilities.js";
import { postPortraitGroupData } from '../../api.js';

import FlexRow from "../../components/FlexRow";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import TitledCard from "../../components/cards/TitledCard";

import Button, { BUTTON_PALETTE } from '../../components/ui/Button';
import Label from '../../components/ui/Label';
import Select, { Option } from '../../components/ui/Select.jsx';

import "./AdminGroupingView.scss";

function AdminGroupingView() {
    const location = useLocation(); // Теперь это работает правильно
    const navigate = useNavigate();
    const [groupingData, setGroupingData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('line'); // 'line', 'bar', 'area'
    const [activeTab, setActiveTab] = useState('competences'); // 'competences', 'motivators', 'values'

    useEffect(() => {
        if (location.state) {
            setGroupingData(location.state);
            fetchGroupedData(location.state);
        } else {
            // Если нет данных, возвращаем на страницу результатов
            navigate('/admin/results');
        }
    }, [location, navigate]);

    const fetchGroupedData = async (data) => {
        setLoading(true);
        postPortraitGroupData(data.sessionId, data.selectedIds, data.groupingColumn)
            .onSuccess(async response => {
                const result = await response.json();
                if (result.status === 'success') {
                    setChartData(result.grouped_data);
                } else {
                    console.error("Error from server:", result.message);
                }
            })
            .onError(error => console.error("Error fetching grouped data:", error))
            .finally(() => setLoading(false));
    };

    // Опции для диаграмм
    const getChartOptions = (title, categories) => ({
        chart: {
            type: chartType,
            height: 400,
            toolbar: {
                show: true
            }
        },
        xaxis: {
            categories: categories,
            title: {
                text: groupingData ? FIELD_NAMES[groupingData.groupingColumn] || groupingData.groupingColumn : 'Группа'
            }
        },
        yaxis: {
            title: {
                text: 'Среднее значение'
            },
            min: 200,
            max: 800
        },
        stroke: {
            curve: 'smooth',
            width: 3
        },
        markers: {
            size: 5
        },
        dataLabels: {
            enabled: chartType === 'bar'
        },
        colors: ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']
    });

    if (loading) {
        return (
            <div className="AdminGroupingView">
                <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                    <Header title="Админ: Группировка данных" name="Администратор1" />
                    <Sidebar linkTree={LINK_TREE} />
                    <Content>
                        <div className="loading">
                            <div className="spinner"></div>
                            <div>Загрузка данных для группировки...</div>
                        </div>
                    </Content>
                </SidebarLayout>
            </div>
        );
    }

    return (
        <div className="AdminGroupingView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Группировка данных" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="grouping-container">
                        <div className="grouping-header">
                            <h1>Группировка данных</h1>
                            <FlexRow>
                                <label>Тип диаграммы:</label>
                                <Select value={chartType} onChange={setChartType}>
                                    <Option value="line" label="Линейная" />
                                    <Option value="bar" label="Столбчатая" />
                                    <Option value="area" label="Областная" />
                                </Select>
                                <Button
                                    text="← Назад к результатам"
                                    onClick={() => navigate('/admin/results')}
                                    palette={BUTTON_PALETTE.GRAY}
                                />
                                {groupingData && (
                                    <Label>
                                        Группировка по: <strong>{FIELD_NAMES[groupingData.groupingColumn] || groupingData.groupingColumn}</strong> | 
                                        Записей: <strong>{groupingData.selectedIds.length}</strong> | 
                                        Фильтров: <strong>{groupingData.filters.length}</strong>
                                    </Label>
                                )}
                            </FlexRow>
                        </div>

                        {/* Навигация по типам данных */}
                        <FlexRow>
                            <Button
                                text="Компетенции"
                                onClick={() => setActiveTab('competences')}
                                palette={activeTab === 'competences' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                            />
                            <Button
                                text="Мотиваторы"
                                onClick={() => setActiveTab('motivators')}
                                palette={activeTab === 'motivators' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                            />
                            <Button
                                text="Ценности"
                                onClick={() => setActiveTab('values')}
                                palette={activeTab === 'values' ? BUTTON_PALETTE.BLUE : BUTTON_PALETTE.GRAY}
                            />
                        </FlexRow>
                        <div className="data-tabs">
                        </div>

                        {/* Компетенции */}
                        {activeTab === 'competences' && chartData?.competences && (
                            <div className="charts-grid">
                                {Object.entries(chartData.competences).map(([competence, data]) => (
                                    <TitledCard title={FIELD_NAMES[competence]}>
                                        <Chart
                                            options={getChartOptions(
                                                FIELD_NAMES[competence] || competence,
                                                data.groups
                                            )}
                                            series={[{
                                                name: FIELD_NAMES[competence] || competence,
                                                data: data.values
                                            }]}
                                            type={chartType}
                                            height={400}
                                        />
                                    </TitledCard>
                                ))}
                            </div>
                        )}

                        {/* Мотиваторы */}
                        {activeTab === 'motivators' && chartData?.motivators && (
                            <div className="charts-grid">
                                {Object.entries(chartData.motivators).map(([motivator, data]) => (
                                    <div key={motivator} className="chart-container">
                                        <Chart
                                            options={getChartOptions(
                                                FIELD_NAMES[motivator] || motivator,
                                                data.groups
                                            )}
                                            series={[{
                                                name: FIELD_NAMES[motivator] || motivator,
                                                data: data.values
                                            }]}
                                            type={chartType}
                                            height={400}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Ценности */}
                        {activeTab === 'values' && chartData?.values && (
                            <div className="charts-grid">
                                {Object.entries(chartData.values).map(([value, data]) => (
                                    <div key={value} className="chart-container">
                                        <Chart
                                            options={getChartOptions(
                                                FIELD_NAMES[value] || value,
                                                data.groups
                                            )}
                                            series={[{
                                                name: FIELD_NAMES[value] || value,
                                                data: data.values
                                            }]}
                                            type={chartType}
                                            height={400}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!chartData && !loading && (
                            <div className="no-data">
                                <div className="no-data-icon">📊</div>
                                <div className="no-data-text">
                                    <strong>Нет данных для отображения</strong><br />
                                    Не удалось загрузить данные для группировки
                                </div>
                            </div>
                        )}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminGroupingView;
