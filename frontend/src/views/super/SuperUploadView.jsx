import { useState, useEffect, useRef } from "react";

import {
    getDataloadExpectedFields,
    getDataloadTemplates,
    postDataloadTemplateSave,
    deleteDataloadTemplateDelete,
    postDataloadImportExcel
} from "../../api";
import { SUPER_LINK_TREE, xlsxReadColumns } from "../../utilities";

import FlexColumn from "../../components/FlexColumn";
import FlexRow from "../../components/FlexRow";
import LabelledBox from "../../components/LabelledBox";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";

import TitledCard from "../../components/cards/TitledCard";

import Table, { TableHeader, TableItem, TableRow } from "../../components/tables/Table";

import Button from "../../components/ui/Button";
import FileInput from "../../components/ui/FileInput";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import NumberField from "../../components/ui/NumberField";
import { ADMIN_PALETTE } from "../../components/ui/palette";
import Select, { Option } from "../../components/ui/Select";

import "./SuperUploadView.scss";

/** Конвертирует 0-based индекс колонки в Excel-нотацию: 0→A, 25→Z, 26→AA, 27→AB, ... */
function colIndexToLetter(idx) {
    let letter = "";
    let n = idx + 1; // переходим к 1-based
    while (n > 0) {
        const rem = (n - 1) % 26;
        letter = String.fromCharCode(65 + rem) + letter;
        n = Math.floor((n - 1) / 26);
    }
    return letter;
}

/** Обратная конвертация: "AA" → 26 (0-based) */
function colLetterToIndex(letter) {
    if (!letter) return -1;
    let idx = 0;
    for (let i = 0; i < letter.length; i++) {
        idx = idx * 26 + (letter.charCodeAt(i) - 64);
    }
    return idx - 1; // возвращаем 0-based
}

function SuperUploadView() {
    const [step, setStep] = useState("upload");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileHeaders, setFileHeaders] = useState({});
    const [mappingConfig, setMappingConfig] = useState(null);
    const [expectedFields, setExpectedFields] = useState({});
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [selectedTemplateName, setSelectedTemplateName] = useState("");
    const [newTemplateName, setNewTemplateName] = useState("");
    const [templatesLoading, setTemplatesLoading] = useState(false);

    // Ref для доступа к актуальному expectedFields внутри колбэков FileReader
    const expectedFieldsRef = useRef({});
    useEffect(() => {
        expectedFieldsRef.current = expectedFields;
    }, [expectedFields]);

    useEffect(() => {
        // ФИX 1: добавлен .onSuccess(r => r.json()) для парсинга ответа
        getDataloadExpectedFields()
            .onSuccess(r => r.json())
            .onSuccess(data => {
                const { status, ...sheets } = data;
                setExpectedFields(sheets);
                expectedFieldsRef.current = sheets;
                // ФИX 2: если файл уже загружен до получения fields — перегенерировать маппинг
                if (Object.keys(fileHeaders).length > 0) {
                    autoGenerateConfig(fileHeaders, sheets);
                }
            })
            .onError(err => console.error("Ошибка expected fields", err));

        loadTemplatesFromServer();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadTemplatesFromServer = () => {
        setTemplatesLoading(true);
        // ФИX 3: используем серверное хранение шаблонов вместо localStorage
        getDataloadTemplates()
            .onSuccess(r => r.json())
            .onSuccess(data => {
                setSavedTemplates(data.templates || []);
            })
            .onError(err => {
                console.error("Ошибка загрузки шаблонов", err);
                // Fallback на localStorage если сервер недоступен
                const stored = localStorage.getItem("upload_templates");
                if (stored) {
                    try { setSavedTemplates(JSON.parse(stored)); } catch(e) {}
                }
            })
            .finally(() => setTemplatesLoading(false));
    };

    const handleFileChange = files => {
        const file = files[0];
        if (!file) return;
        setSelectedFile(file);
        setError(null);
        setUploadResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const headers = xlsxReadColumns(data);
            setFileHeaders(headers);

            // Если шаблон уже выбран — применяем его, иначе автогенерация
            const chosenTemplate = savedTemplates.find(
                t => t.name === selectedTemplateName || String(t.id) === String(selectedTemplateName)
            );
            if (chosenTemplate) {
                setMappingConfig(chosenTemplate.config);
            } else {
                autoGenerateConfig(headers, expectedFieldsRef.current);
            }
            setStep("mapping");
        };
        reader.readAsArrayBuffer(file);
    };

    // ФИX 5: autoGenerateConfig принимает fields явным аргументом — нет зависимости от стейта
    const autoGenerateConfig = (headers, fields) => {
        if (!fields || Object.keys(fields).length === 0) {
            // Fields ещё не загружены — создаём пустой маппинг, который заполнится позже
            const sheets = Object.keys(headers).map(sheetName => ({
                name: sheetName,
                start_row: 2,
                columns: {}
            }));
            setMappingConfig({ sheets });
            return;
        }

        const sheets = [];
        for (const sheetName of Object.keys(headers)) {
            if (!fields[sheetName]) continue;
            const expectedCols = fields[sheetName];
            const availableHeaders = headers[sheetName];

            const columnMapping = {};
            expectedCols.forEach(expected => {
                // Точное совпадение (без учёта регистра)
                let idx = availableHeaders.findIndex(
                    h => h.toLowerCase() === expected.toLowerCase()
                );
                // Нечёткое совпадение: ищем expected как подстроку заголовка и наоборот
                if (idx === -1) {
                    idx = availableHeaders.findIndex(h => {
                        const hLow = h.toLowerCase();
                        const eLow = expected.toLowerCase();
                        return hLow.includes(eLow) || eLow.includes(hLow);
                    });
                }
                columnMapping[expected] = idx !== -1 ? colIndexToLetter(idx) : "";
            });

            sheets.push({ name: sheetName, start_row: 2, columns: columnMapping });
        }
        setMappingConfig({ sheets });
    };

    const updateSheetMapping = (sheetIndex, newColumns) => {
        const newSheets = [...mappingConfig.sheets];
        newSheets[sheetIndex] = { ...newSheets[sheetIndex], columns: newColumns };
        setMappingConfig({ sheets: newSheets });
    };

    const updateStartRow = (sheetIndex, newStartRow) => {
        const newSheets = [...mappingConfig.sheets];
        newSheets[sheetIndex] = { ...newSheets[sheetIndex], start_row: newStartRow };
        setMappingConfig({ sheets: newSheets });
    };

    const handleSaveTemplate = () => {
        if (!newTemplateName.trim()) {
            setError("Введите имя шаблона");
            return;
        }
        // ФИX 6: сохраняем на сервер, не в localStorage
        postDataloadTemplateSave(newTemplateName.trim(), mappingConfig)
            .onSuccess(r => r.json())
            .onSuccess(() => {
                setNewTemplateName("");
                setError(null);
                loadTemplatesFromServer(); // перезагружаем список
            })
            .onError(err => setError(`Ошибка сохранения шаблона: ${err.message}`));
    };

    const handleDeleteTemplate = (templateId, e) => {
        e.stopPropagation();
        if (!window.confirm("Удалить шаблон?")) return;
        deleteDataloadTemplateDelete(templateId)
            .onSuccess(r => r.json())
            .onSuccess(() => loadTemplatesFromServer())
            .onError(err => setError(`Ошибка удаления: ${err.message}`));
    };

    const loadTemplate = () => {
        const tmpl = savedTemplates.find(t =>
            (t.name === selectedTemplateName) || (String(t.id) === String(selectedTemplateName))
        );
        if (!tmpl) return;
        setMappingConfig(tmpl.config);
        if (selectedFile && Object.keys(fileHeaders).length > 0) {
            // Файл уже загружен — сразу идём на маппинг
            setStep("mapping");
        } else {
            // Файл ещё не выбран — остаёмся на шаге upload,
            // шаблон будет применён автоматически при выборе файла
            setError(null);
        }
    };

    const handleImport = () => {
        if (!selectedFile || !mappingConfig) return;
        setUploading(true);
        setError(null);
        // ФИX 7: добавлен .onSuccess(r => r.json()) для парсинга ответа импорта
        postDataloadImportExcel(selectedFile, mappingConfig)
            .onSuccess(r => r.json())
            .onSuccess(data => {
                if (data.status === "success") {
                    setUploadResult(data);
                    setStep("upload");
                    setSelectedFile(null);
                    const fileInput = document.getElementById("excel-file");
                    if (fileInput) fileInput.value = "";
                } else {
                    setError(data.message || "Ошибка импорта");
                }
                setUploading(false);
            })
            .onError(err => {
                setError(`Ошибка импорта: ${err.message}`);
                setUploading(false);
            });
    };

    const renderMappingEditor = () => {
        if (!mappingConfig || !fileHeaders) return null;

        const allFieldsMapped = mappingConfig.sheets.every(sheet =>
            Object.values(sheet.columns).some(v => v !== "")
        );

        return <>
                <Button
                    text="← Назад"
                    onClick={() => setStep("upload")}
                    palette={ADMIN_PALETTE.CYAN}
                />

                <h3>Сопоставление колонок (можно изменить вручную)</h3>

                <FlexColumn className="mapping-options">
                    {/* ── Смена файла или шаблона не уходя со страницы маппинга ── */}
                    {savedTemplates.length > 0 && (
                        <div className="template-switch-row">
                            <label>Сменить шаблон:</label>
                            <select
                                value={selectedTemplateName}
                                onChange={e => {
                                    setSelectedTemplateName(e.target.value);
                                    if (!e.target.value) return;
                                    const tmpl = savedTemplates.find(
                                        t => t.name === e.target.value || String(t.id) === String(e.target.value)
                                    );
                                    if (tmpl) setMappingConfig(tmpl.config);
                                }}
                            >
                                <option value="">— автоопределение —</option>
                                {savedTemplates.map(t => (
                                    <option key={t.id ?? t.name} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {Object.keys(expectedFields).length === 0 && (
                        <div className="warning-banner">
                            ⚠️ Список ожидаемых полей ещё загружается. Автосопоставление будет недоступно.
                        </div>
                    )}

                    {mappingConfig.sheets.length === 0 && (
                        <div className="warning-banner">
                            ⚠️ Ни один лист файла не совпал с ожидаемыми листами ({Object.keys(expectedFields).join(", ")}).
                            Проверьте названия листов в Excel-файле.
                        </div>
                    )}

                    {mappingConfig.sheets.map((sheet, idx) => (
                        <TitledCard title={`Лист: ${sheet.name}`}>
                            <Table>
                                <TableHeader>
                                    <TableItem>Ожидаемое поле</TableItem>
                                    <TableItem>Колонка в Excel</TableItem>
                                    <TableItem>Предпросмотр заголовка</TableItem>
                                </TableHeader>
                                {Object.entries(sheet.columns).map(([field, colLetter]) => {
                                    const colIdx = colLetter ? colLetterToIndex(colLetter) : -1;
                                    const headerPreview = colIdx >= 0
                                        ? fileHeaders[sheet.name]?.[colIdx] || ""
                                        : "—";
                                    const isMissing = !colLetter;

                                    return (
                                        <TableRow key={field}>
                                            <TableItem>{field}</TableItem>
                                            <TableItem>
                                                <Select
                                                    initValue={colLetter}
                                                    onChange={value => {
                                                        const newCols = { ...sheet.columns, [field]: value };
                                                        updateSheetMapping(idx, newCols);
                                                    }}
                                                >
                                                    {fileHeaders[sheet.name]?.map((header, colIdx) => (
                                                        <Option
                                                            key={colIdx}
                                                            value={colIndexToLetter(colIdx)} label={`${colIndexToLetter(colIdx)}: ${header}`}   
                                                        />
                                                    ))}
                                                </Select>
                                            </TableItem>
                                            <TableItem>{headerPreview}</TableItem>
                                        </TableRow>
                                    );
                                })}
                            </Table>
                            <LabelledBox label="Начальная строка данных">
                                <NumberField
                                    value={sheet.start_row}
                                    min="2"
                                    onChange={value => updateStartRow(idx, value || 2)}
                                />
                            </LabelledBox>
                        </TitledCard>
                    ))}

                    <FlexRow>
                        <input
                            type="text"
                            placeholder="Имя шаблона"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                        />
                        <Button
                            text="Сохранить шаблон"
                            onClick={handleSaveTemplate}
                            palette={ADMIN_PALETTE.BLUE}
                        />
                        <Button
                            text={uploading ? "Импорт..." : "Импортировать данные"}
                            onClick={handleImport}
                            disabled={uploading || !allFieldsMapped}
                            palette={ADMIN_PALETTE.GREEN}
                        />
                        {!allFieldsMapped && (
                            <span className="hint">Заполните хотя бы одно поле в каждом листе</span>
                        )}
                    </FlexRow>

                    {error && <div className="error-banner">{error}</div>}
                </FlexColumn>

                
        </>;
    };

    // true если шаблон выбран и применён к mappingConfig
    const isTemplateActive = Boolean(
        selectedTemplateName &&
        mappingConfig &&
        savedTemplates.find(t => t.name === selectedTemplateName || String(t.id) === String(selectedTemplateName))
    );

    const renderUploadStep = () => (
        <div>
            {/* ── Шаблоны — выбираем ДО или ВМЕСТЕ с файлом ── */}
            {templatesLoading ? (
                <LoadingSpinner text="Загрузка шаблонов..." />
            ) : savedTemplates.length > 0 && (
                <div className="template-load-row">
                    <label>Шаблон маппинга (необязательно):</label>
                    <select
                        value={selectedTemplateName}
                        onChange={e => {
                            setSelectedTemplateName(e.target.value);
                            // Сбрасываем конфиг чтобы не осталось старого шаблона
                            if (!e.target.value) setMappingConfig(null);
                        }}
                    >
                        <option value="">— без шаблона —</option>
                        {savedTemplates.map(t => (
                            <option key={t.id ?? t.name} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                    <button onClick={loadTemplate} disabled={!selectedTemplateName}>
                        Применить
                    </button>
                    {selectedTemplateName && (
                        <button
                            className="btn-delete"
                            onClick={(e) => {
                                const tmpl = savedTemplates.find(t => t.name === selectedTemplateName);
                                if (tmpl?.id) handleDeleteTemplate(tmpl.id, e);
                            }}
                        >
                            🗑 Удалить
                        </button>
                    )}
                </div>
            )}

            {/* Подсказка: шаблон выбран, но файл ещё не загружен */}
            {isTemplateActive && !selectedFile && (
                <div className="info-banner">
                    ✅ Шаблон «{selectedTemplateName}» применён. Теперь выберите Excel-файл.
                </div>
            )}

            {/* ── Файл ── */}
            <FlexRow>
                <LabelledBox label="Выбор файла">
                    <FileInput
                        id="excel-file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        disabled={uploading}
                        palette={ADMIN_PALETTE.GRAY}
                    />
                    {isTemplateActive && (
                        <span className="template-hint">
                            Будет использован шаблон «{selectedTemplateName}»
                        </span>
                    )}
                </LabelledBox>
            </FlexRow>

            {uploadResult && (
                <div className="success-banner">
                    ✅ Импорт завершён: создано {uploadResult.created}, обновлено {uploadResult.updated},
                    связей ФИО→ID: {uploadResult.mapped ?? 0}
                </div>
            )}
            {error && <div className="error-banner">{error}</div>}
        </div>
    );

    return (
        <div className="SuperUploadView">
            <SidebarLayout style={LAYOUT_STYLE.ADMIN}>
                <Header title="Суперадмин: Загрузка данных" name="СуперАдминистратор1" />
                <Sidebar linkTree={SUPER_LINK_TREE} />
                <Content>
                    <h2>Загрузка данных «Россия — страна возможностей»</h2>
                    {step === "upload" && renderUploadStep()}
                    {step === "mapping" && renderMappingEditor()}
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default SuperUploadView;