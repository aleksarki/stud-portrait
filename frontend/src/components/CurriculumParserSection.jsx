// components/CurriculumParserSection.jsx
//
// Секция для суперадмина: запуск парсера учебного плана ТюмГУ.
// Вставьте этот компонент в SuperUploadView.jsx внутри SidebarLayout/Content.
//
// Необходимые API-функции в api.js (см. api_additions.js):
//   postParseCurriculum()
//   getParseCurriculumLog()
//   getParseCurriculumMappings()

import { useCallback, useEffect, useRef, useState } from "react";
import {
    getParseCurriculumLog,
    getParseCurriculumMappings,
    postParseCurriculum,
} from "../api";

import Button from "./ui/Button";
import LoadingSpinner from "./ui/LoadingSpinner";
import { ADMIN_PALETTE } from "./ui/palette";
import TitledCard from "./cards/TitledCard";
import Table, { TableHeader, TableItem, TableRow } from "./tables/Table";

import "./CurriculumParserSection.scss";

// Имена РСВ-компетенций для читаемого отображения в таблице маппингов
const RSV_NAMES = {
    res_comp_info_analysis:    "Анализ информации",
    res_comp_result_orientation: "Ориентация на результат",
    res_comp_planning:         "Планирование",
    res_comp_stress_resistance: "Стрессоустойчивость",
    res_comp_partnership:      "Партнёрство",
    res_comp_rules_compliance: "Соблюдение правил",
    res_comp_self_development: "Саморазвитие",
    res_comp_client_focus:     "Клиентоориентированность",
    res_comp_communication:    "Коммуникация",
    res_comp_leadership:       "Лидерство",
    res_comp_emotional_intel:  "Эм. интеллект",
    res_comp_passive_vocab:    "Пассивный словарный запас",
};

const STATUS_LABEL = {
    running: "Выполняется…",
    success: "Успешно",
    error:   "Ошибка",
};

const STATUS_CLASS = {
    running: "status-running",
    success: "status-success",
    error:   "status-error",
};

function formatDatetime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CurriculumParserSection() {
    const [launching, setLaunching]     = useState(false);
    const [logs, setLogs]               = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [mappings, setMappings]       = useState([]);
    const [mappingsOpen, setMappingsOpen] = useState(false);
    const [mappingsLoading, setMappingsLoading] = useState(false);
    const [launchMsg, setLaunchMsg]     = useState(null);  // { type: 'info'|'error', text }
    const pollRef = useRef(null);

    // ── Загрузка журнала ─────────────────────────────────────────────────────
    const fetchLogs = useCallback(() => {
        setLogsLoading(true);
        getParseCurriculumLog()
            .onSuccess(async r => {
                const data = await r.json();
                if (data.status === "success") setLogs(data.logs || []);
            })
            .onError(console.error)
            .finally(() => setLogsLoading(false));
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // ── Авто-опрос пока идёт running ────────────────────────────────────────
    useEffect(() => {
        const hasRunning = logs.some(l => l.status === "running");
        if (hasRunning && !pollRef.current) {
            pollRef.current = setInterval(fetchLogs, 3000);
        } else if (!hasRunning && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [logs, fetchLogs]);

    // ── Запуск парсера ───────────────────────────────────────────────────────
    const handleLaunch = () => {
        setLaunching(true);
        setLaunchMsg(null);
        postParseCurriculum()
            .onSuccess(async r => {
                const data = await r.json();
                if (data.status === "started") {
                    setLaunchMsg({ type: "info", text: "Парсер запущен. Прогресс обновляется каждые 3 секунды." });
                    fetchLogs();
                } else if (data.status === "already_running") {
                    setLaunchMsg({ type: "info", text: data.message });
                } else {
                    setLaunchMsg({ type: "error", text: data.message || "Неизвестный ответ сервера" });
                }
            })
            .onError(err => {
                setLaunchMsg({ type: "error", text: `Ошибка запроса: ${err}` });
            })
            .finally(() => setLaunching(false));
    };

    // ── Загрузка маппингов ───────────────────────────────────────────────────
    const handleShowMappings = () => {
        if (mappingsOpen) {
            setMappingsOpen(false);
            return;
        }
        setMappingsLoading(true);
        getParseCurriculumMappings()
            .onSuccess(async r => {
                const data = await r.json();
                if (data.status === "success") setMappings(data.mappings || []);
            })
            .onError(console.error)
            .finally(() => {
                setMappingsLoading(false);
                setMappingsOpen(true);
            });
    };

    const latestLog = logs[0] || null;
    const isRunning = latestLog?.status === "running";

    // ────────────────────────────────────────────────────────────────────────
    return (
        <div className="CurriculumParserSection">
            <TitledCard title="Парсер учебного плана ТюмГУ">
                <div className="parser-description">
                    Автоматически загружает актуальный учебный план с сайта ТюмГУ,
                    извлекает дисциплины и через семантические эмбеддинги сопоставляет
                    стандартные компетенции ФГОС с компетенциями РСВ. Результат
                    сохраняется в базу и используется в аналитике дисциплин.
                </div>

                {/* Кнопка запуска */}
                <div className="parser-actions">
                    <Button
                        onClick={handleLaunch}
                        disabled={launching || isRunning}
                        palette={ADMIN_PALETTE.BLUE}
                        text={launching || isRunning ? "Парсер запущен…" : "🔄 Запустить парсинг учебного плана"}
                    />

                    <Button
                        onClick={fetchLogs}
                        disabled={logsLoading}
                        palette={ADMIN_PALETTE.GRAY}
                        text="Обновить журнал"
                    />
                </div>

                {/* Сообщение о результате запуска */}
                {launchMsg && (
                    <div className={`launch-msg launch-msg--${launchMsg.type}`}>
                        {launchMsg.text}
                    </div>
                )}

                {/* Статус последнего запуска */}
                {latestLog && (
                    <div className={`last-run-banner ${STATUS_CLASS[latestLog.status]}`}>
                        <span className="run-label">Последний запуск:</span>
                        <span className="run-status">{STATUS_LABEL[latestLog.status] ?? latestLog.status}</span>
                        <span className="run-time">{formatDatetime(latestLog.started_at)}</span>
                        {latestLog.status !== "error" && (
                            <span className="run-count">
                                {latestLog.disciplines_saved} / {latestLog.disciplines_found} дисциплин
                            </span>
                        )}
                        {latestLog.source_url && (
                            <a
                                className="run-source"
                                href={latestLog.source_url}
                                target="_blank"
                                rel="noreferrer"
                            >
                                PDF ↗
                            </a>
                        )}
                        {latestLog.status === "running" && (
                            <LoadingSpinner size={14} />
                        )}
                    </div>
                )}

                {/* Ошибка последнего запуска */}
                {latestLog?.status === "error" && (
                    <div className="error-details">
                        <strong>Ошибка:</strong>
                        <pre>{latestLog.error_message}</pre>
                    </div>
                )}
            </TitledCard>

            {/* Журнал запусков */}
            {logs.length > 0 && (
                <TitledCard title="Журнал запусков парсера">
                    {logsLoading
                        ? <LoadingSpinner />
                        : (
                            <Table>
                                <TableRow header>
                                    <TableHeader>Статус</TableHeader>
                                    <TableHeader>Начало</TableHeader>
                                    <TableHeader>Конец</TableHeader>
                                    <TableHeader>Найдено</TableHeader>
                                    <TableHeader>Сохранено</TableHeader>
                                    <TableHeader>Источник</TableHeader>
                                </TableRow>
                                {logs.map(lg => (
                                    <TableRow key={lg.id}>
                                        <TableItem>
                                            <span className={`badge ${STATUS_CLASS[lg.status]}`}>
                                                {STATUS_LABEL[lg.status] ?? lg.status}
                                                {lg.status === "running" && <LoadingSpinner size={12} />}
                                            </span>
                                        </TableItem>
                                        <TableItem>{formatDatetime(lg.started_at)}</TableItem>
                                        <TableItem>{formatDatetime(lg.finished_at)}</TableItem>
                                        <TableItem>{lg.disciplines_found}</TableItem>
                                        <TableItem>{lg.disciplines_saved}</TableItem>
                                        <TableItem>
                                            {lg.source_url
                                                ? <a href={lg.source_url} target="_blank" rel="noreferrer">PDF ↗</a>
                                                : "—"}
                                        </TableItem>
                                    </TableRow>
                                ))}
                            </Table>
                        )
                    }
                </TitledCard>
            )}

            {/* Сохранённые маппинги */}
            <TitledCard title="Сохранённые маппинги дисциплин">
                <Button
                    onClick={handleShowMappings}
                    disabled={mappingsLoading}
                    palette={ADMIN_PALETTE.GRAY}
                    text={mappingsOpen ? "Скрыть" : "Показать маппинги"}
                />

                {mappingsOpen && mappings.length === 0 && (
                    <div className="no-mappings">
                        Нет сохранённых маппингов. Запустите парсер.
                    </div>
                )}

                {mappingsOpen && mappings.length > 0 && (
                    <Table className="mappings-table">
                        <TableRow header>
                            <TableHeader>Дисциплина</TableHeader>
                            <TableHeader>Сем.</TableHeader>
                            <TableHeader>Компетенции ФГОС</TableHeader>
                            <TableHeader>Компетенции РСВ</TableHeader>
                            <TableHeader>Обновлено</TableHeader>
                        </TableRow>
                        {mappings.map((m, i) => (
                            <TableRow key={i}>
                                <TableItem>{m.discipline}</TableItem>
                                <TableItem>{m.semester ?? "—"}</TableItem>
                                <TableItem>
                                    <div className="tags">
                                        {m.standard_competencies.map(c => (
                                            <span key={c} className="tag tag--std">{c}</span>
                                        ))}
                                    </div>
                                </TableItem>
                                <TableItem>
                                    <div className="tags">
                                        {m.rsv_competencies.map(c => (
                                            <span key={c} className="tag tag--rsv">
                                                {RSV_NAMES[c] ?? c}
                                            </span>
                                        ))}
                                    </div>
                                </TableItem>
                                <TableItem>
                                    {m.parsed_at
                                        ? new Date(m.parsed_at).toLocaleDateString("ru-RU")
                                        : "—"}
                                </TableItem>
                            </TableRow>
                        ))}
                    </Table>
                )}
            </TitledCard>
        </div>
    );
}