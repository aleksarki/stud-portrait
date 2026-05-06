import { useEffect, useState } from "react";

import { getAuditSchema, getAuditTableData, getAuditStats } from "../../api";
import { SUPER_LINK_TREE } from "../../utilities";

import FlexColumn from "../../components/FlexColumn";
import FlexRow from "../../components/FlexRow";
import LabelledBox from "../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import ValueCard from "../../components/cards/ValueCard";

import Table, { TableHeader, TableItem, TableRow } from "../../components/tables/Table";
import DbContentTable from "../../components/tables/DbContentTable";

import Button, { BUTTON_PALETTE } from "../../components/ui/Button";
import Label from "../../components/ui/Label";
import NoData from "../../components/ui/NoData";

import "./SuperAuditView.scss";

function SuperAuditView() {
    const [schema, setSchema] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadStats();
        loadSchema();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            loadTableData(selectedTable);
        } else {
            setTableData(null);
        }
    }, [selectedTable]);

    const loadStats = async () => {
        getAuditStats()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setStats(data.data);
                }
            })
            .onError(error => console.error("Ошибка загрузки статистики:", error));
    };

    const loadSchema = async () => {
        setLoading(true);
        getAuditSchema()
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setSchema(data.data);
                }
            })
            .onError(error => console.error("Ошибка загрузки схемы:", error))
            .finally(() => setLoading(false));
    };

    const loadTableData = async (tableName) => {
        getAuditTableData(tableName, 20)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setTableData(data.data);
                }
            })
            .onError(error => console.error("Ошибка загрузки данных таблицы:", error));
    };

    const filteredTables = schema?.tables.filter(table =>
        table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        table.verbose_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="SuperAuditView">
            <SidebarLayout style={LAYOUT_STYLE.ADMIN}>
                <Header title="Суперадмин: Аудит данных" name="СуперАдминистратор1" />
                <Sidebar linkTree={SUPER_LINK_TREE} />
                <Content>
                    <h2>Статистика и аудит данных</h2>
                    {stats && (
                        <div className="stats-grid">
                            <ValueCard value={stats.total_tables} text="Таблиц" />
                            <ValueCard value={stats.total_models} text="Моделей" />
                            <ValueCard value={stats.total_rows.toLocaleString()} text="Всего строк" />
                            <ValueCard value={`${stats.db_size_mb} МБ`} text="Размер БД" />
                            <ValueCard value={stats.db_engine} text="Движок" />
                        </div>
                    )}

                    <div className="audit-content">
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Поиск таблиц..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <span className="search-count">
                                Найдено: {filteredTables.length} / {schema?.tables.length}
                            </span>
                        </div>

                        <div className="tables-list">
                            <div className="tables-sidebar">
                                <h3>Таблицы</h3>
                                <ul>
                                    {filteredTables.map(table => (
                                        <li
                                            key={table.name}
                                            className={selectedTable === table.name ? 'active' : ''}
                                            onClick={() => setSelectedTable(table.name)}
                                        >
                                            <div className="table-name">{table.name}</div>
                                            <div className="table-meta">
                                                <span className="rows">{table.row_count} строк</span>
                                                <span className="cols">{table.column_count} колонок</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="tables-detail">
                                {selectedTable ? (
                                    <>
                                        <h4>Таблица "{selectedTable}"</h4>
                                        <LabelledBox label="Колонки таблицы">
                                            {schema?.tables.find(t => t.name === selectedTable)?.columns && (
                                                <Table>
                                                    <TableHeader>
                                                        <TableItem>Название</TableItem>
                                                        <TableItem>Тип</TableItem>
                                                        <TableItem>Тип БД</TableItem>
                                                        <TableItem>Null</TableItem>
                                                        <TableItem>PK</TableItem>
                                                        <TableItem>Unique</TableItem>
                                                        <TableItem>Связано с</TableItem>
                                                    </TableHeader>
                                                    {schema.tables.find(t => t.name === selectedTable).columns.map(col => (
                                                        <TableRow key={col.name}>
                                                            <TableItem><code>{col.name}</code></TableItem>
                                                            <TableItem>{col.type}</TableItem>
                                                            <TableItem>{col.db_type}</TableItem>
                                                            <TableItem>{col.null ? '✓' : '✗'}</TableItem>
                                                            <TableItem>{col.primary_key ? '✓' : '✗'}</TableItem>
                                                            <TableItem>{col.unique ? '✓' : '✗'}</TableItem>
                                                            <TableItem>{col.references || '—'}</TableItem>
                                                        </TableRow>
                                                    ))}
                                                </Table>
                                            )}
                                        </LabelledBox>
                                        <LabelledBox label={`Предпросмотр данных (${tableData?.rows?.length} строк)`}>
                                            {tableData && (
                                                <FlexColumn>
                                                    {(!tableData?.rows || tableData?.rows?.length === 0) ? (
                                                        <NoData text="Нет данных для отображения" />
                                                    ) : <>
                                                        <DbContentTable data={tableData} />
                                                    </>}
                                                </FlexColumn>
                                            )}
                                        </LabelledBox>
                                    </>
                                ) : (
                                    <div className="no-selection">
                                        Выберите таблицу для просмотра деталей
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default SuperAuditView;
