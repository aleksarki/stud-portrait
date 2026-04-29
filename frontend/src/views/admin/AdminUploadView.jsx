import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Content, Header, LAYOUT_STYLE, Sidebar, SidebarLayout } from "../../components/SidebarLayout";
import { LINK_TREE } from "../../utilities";
import { getExpectedFields, getTemplates, saveTemplate, deleteTemplate, importExcel } from "../../api";
import "./AdminUploadView.scss";

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

function AdminUploadView() {
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
        getExpectedFields()
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
        getTemplates()
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setError(null);
        setUploadResult(null);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const headers = {};
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                if (rows.length > 0) {
                    headers[sheetName] = rows[0].map(cell => (cell || "").toString().trim());
                } else {
                    headers[sheetName] = [];
                }
            });
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
        saveTemplate(newTemplateName.trim(), mappingConfig)
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
        deleteTemplate(templateId)
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
        importExcel(selectedFile, mappingConfig)
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

        return (
            <div className="mapping-editor">
                <h3>Сопоставление колонок (можно изменить вручную)</h3>

                {/* ── Смена файла или шаблона не уходя со страницы маппинга ── */}
                <div className="mapping-top-controls">
                    <div className="file-input-row">
                        <label>{selectedFile ? `📄 ${selectedFile.name}` : "Файл не выбран"}</label>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>
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
                </div>

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
                    <div key={sheet.name} className="mapping-sheet">
                        <h4>Лист: {sheet.name}</h4>
                        <table className="mapping-table">
                            <thead>
                                <tr>
                                    <th>Ожидаемое поле</th>
                                    <th>Колонка в Excel</th>
                                    <th>Предпросмотр заголовка</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(sheet.columns).map(([field, colLetter]) => {
                                    const colIdx = colLetter ? colLetterToIndex(colLetter) : -1;
                                    const headerPreview = colIdx >= 0
                                        ? fileHeaders[sheet.name]?.[colIdx] || ""
                                        : "—";
                                    const isMissing = !colLetter;

                                    return (
                                        <tr key={field} className={isMissing ? "row-unmapped" : ""}>
                                            <td>{field}</td>
                                            <td>
                                                <select
                                                    value={colLetter}
                                                    onChange={(e) => {
                                                        const newCols = { ...sheet.columns, [field]: e.target.value };
                                                        updateSheetMapping(idx, newCols);
                                                    }}
                                                >
                                                    <option value="">— не выбрано —</option>
                                                    {fileHeaders[sheet.name]?.map((header, colIdx) => (
                                                        <option key={colIdx} value={colIndexToLetter(colIdx)}>
                                                            {colIndexToLetter(colIdx)}: {header}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="header-preview">{headerPreview}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="start-row-control">
                            <label>Начальная строка данных:</label>
                            <input
                                type="number"
                                min={2}
                                value={sheet.start_row}
                                onChange={(e) => updateStartRow(idx, parseInt(e.target.value) || 2)}
                            />
                        </div>
                    </div>
                ))}

                <div className="template-save-row">
                    <input
                        type="text"
                        placeholder="Имя шаблона"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()}
                    />
                    <button onClick={handleSaveTemplate}>💾 Сохранить шаблон</button>
                </div>

                <div className="import-row">
                    <button onClick={handleImport} disabled={uploading || !allFieldsMapped}>
                        {uploading ? "⏳ Импорт..." : "📤 Импортировать данные"}
                    </button>
                    {!allFieldsMapped && (
                        <span className="hint">Заполните хотя бы одно поле в каждом листе</span>
                    )}
                </div>

                {error && <div className="error-banner">{error}</div>}
            </div>
        );
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
                <div>Загрузка шаблонов...</div>
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
            <div className="file-input-row">
                <label>Выберите Excel файл</label>
                <input
                    id="excel-file"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                {isTemplateActive && (
                    <span className="template-hint">
                        Будет использован шаблон «{selectedTemplateName}»
                    </span>
                )}
            </div>

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
        <div className="AdminUploadView">
            <SidebarLayout style={LAYOUT_STYLE.MODEUS}>
                <Header title="Админ: Загрузка данных" name="Администратор1" />
                <Sidebar linkTree={LINK_TREE} />
                <Content>
                    <div className="upload-form-container">
                        <h2>Загрузка данных "Россия — страна возможностей"</h2>

                        {step === "mapping" && (
                            <button
                                className="btn-back"
                                onClick={() => setStep("upload")}
                            >
                                ← Назад
                            </button>
                        )}

                        {step === "upload" && renderUploadStep()}
                        {step === "mapping" && renderMappingEditor()}
                    </div>
                </Content>
            </SidebarLayout>
        </div>
    );
}

export default AdminUploadView;