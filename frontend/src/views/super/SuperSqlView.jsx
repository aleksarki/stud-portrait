import { useState } from "react";
import * as XLSX from "xlsx";

import { postAuditSQL } from "../../api";
import { SUPER_LINK_TREE } from "../../utilities";

import FlexColumn from "../../components/FlexColumn";
import FlexRow from "../../components/FlexRow";
import LabelledBox from "../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import DbContentTable from "../../components/tables/DbContentTable";

import Button from "../../components/ui/Button";
import Dropdown from "../../components/ui/Dropdown";
import Label, { LABEL_PALETTE } from "../../components/ui/Label";
import { ADMIN_PALETTE } from "../../components/ui/palette";
import { Option } from "../../components/ui/Select";

import "./SuperSqlView.scss";

// fixme: move these two to utils (and other uses of XLSX)
const exportToExcel = (data, query) => {
    if (!data.rows || data.rows.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    // Получаем заголовки столбцов
    const headers = data.columns || Object.keys(data.rows[0]);
    
    // Формируем данные для Excel
    const excelData = [
        headers, // Заголовки
        ...data.rows.map(row => headers.map(header => row[header] !== null && row[header] !== undefined ? row[header] : ''))
    ];

    // Создаем Workbook
    const XLSX = require('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Настройка ширины колонок
    const colWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    ws['!cols'] = colWidths;
    
    // Стилизация заголовков (жирный шрифт)
    headers.forEach((_, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
        if (!ws[cellRef]) ws[cellRef] = {};
        ws[cellRef].s = { font: { bold: true } };
    });
    
    // Создаем Workbook и добавляем лист
    const wb = XLSX.utils.book_new();
    const sheetName = `SQL_Result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Сохраняем файл
    XLSX.writeFile(wb, `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
};

// Функция для экспорта в CSV
const exportToCSV = (data, query) => {
    if (!data.rows || data.rows.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    const headers = data.columns || Object.keys(data.rows[0]);
    
    // Формируем CSV строки
    const csvRows = [
        headers.join(','), // Заголовки
        ...data.rows.map(row => 
            headers.map(header => {
                const value = row[header];
                // Экранируем значения, содержащие запятые или кавычки
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ];
    
    // Создаем Blob и скачиваем
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

function SuperSqlView() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const executeQuery = async () => {
        if (!query.trim()) return;
        
        setLoading(true);
        setError(null);
        setResult(null);
        
        postAuditSQL(query)
            .onSuccess(async response => {
                const data = await response.json();
                if (data.status === 'success') {
                    setResult(data.data);
                } else {
                    setError(data.message);
                }
            })
            .onError(err => {
                setError(err.message);
            })
            .finally(() => setLoading(false));
    };

    const clearConsole = () => {
        setQuery('');
        setResult(null);
        setError(null);
    };

    const handleExport = format => {
        if (format === 'xlsx') {
            exportToExcel(result, query);
        } else {
            exportToCSV(result, query);
        }
    };

    // Примеры запросов для быстрой вставки
    const insertExampleQuery = type => {
        const examples = {
            results: "SELECT * FROM results LIMIT 50;",
            participants: "SELECT * FROM participants LIMIT 50;",
            join: `SELECT 
    r.res_id,
    p.part_rsv_id,
    r.res_year,
    r.res_course_num
FROM results r
LEFT JOIN participants p ON r.res_participant = p.part_id
LIMIT 50;`
        };
        setQuery(examples[type] || '');
    };

    return (
        <div className="SuperSqlView">
            <SidebarLayout style={LAYOUT_STYLE.ADMIN}>
                <Header title="Суперадмин: SQL-запросник" name="СуперАдминистратор1" />
                <Sidebar linkTree={SUPER_LINK_TREE} />
                <Content>
                    <h3>SQL Консоль</h3>

                    <LabelledBox label="Быстрый доступ">
                        <FlexRow>
                            <Button
                                text="Results"
                                onClick={() => insertExampleQuery('results')}
                                palette={ADMIN_PALETTE.CYAN}
                                small
                            />
                            <Button
                                text="Participants"
                                onClick={() => insertExampleQuery('participants')}
                                palette={ADMIN_PALETTE.CYAN}
                                small
                            />
                            <Button
                                text="JOIN"
                                onClick={() => insertExampleQuery('join')}
                                palette={ADMIN_PALETTE.CYAN}
                                small
                            />
                        </FlexRow>
                    </LabelledBox>

                    <FlexColumn>
                        <textarea
                            className="sql-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Введите SQL запрос...&#10;Например: SELECT * FROM auth_user LIMIT 10;"
                            rows={6}
                        />
                        <FlexRow justifyContent="space-between">
                            <FlexRow gap="12">
                                <Button
                                    text="Очистить"
                                    onClick={clearConsole}
                                    palette={ADMIN_PALETTE.RED}
                                />
                                <Button
                                    text={loading ? 'Выполнение...' : 'Выполнить'}
                                    onClick={executeQuery}
                                    disabled={loading}
                                    palette={ADMIN_PALETTE.GREEN}
                                />
                            </FlexRow>
                        </FlexRow>
                    </FlexColumn>

                    {(error || result) && <>
                        <h4>Результат:</h4>
                        {error && (
                            <FlexRow>
                                <Label
                                    text={error}
                                    palette={LABEL_PALETTE.RED}
                                />
                            </FlexRow>
                        )}
                        {result?.message && (
                            <FlexRow>
                                <Label
                                    text={result?.message}
                                    palette={LABEL_PALETTE.GREEN}
                                />
                            </FlexRow>
                        )}
                        {result?.rows && result.rows.length > 0 && (
                            <FlexColumn>
                                <FlexRow>
                                    <Label
                                        text={`Найдено строк: ${result.row_count}`}
                                        palette={LABEL_PALETTE.GREEN}
                                    />
                                    <Dropdown label="Выгрузить выбранные данные...">
                                        <Option label="В формате Excel" value='xlsx' onClick={handleExport} />
                                        <Option label="В формате CSV" value='csv' onClick={handleExport} />
                                    </Dropdown>
                                </FlexRow>
                                <LabelledBox label="Результат запроса">
                                    <DbContentTable data={result} />
                                </LabelledBox>
                            </FlexColumn>
                        )}
                        {result?.rows && result.rows.length === 0 && (
                            <FlexRow>
                                <Label
                                    text="Запрос выполнен успешно; данных не выделено"
                                    palette={LABEL_PALETTE.YELLOW}
                                />
                            </FlexRow>
                        )}
                    </>}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default SuperSqlView;
