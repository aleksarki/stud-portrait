import { useState, useEffect, useRef } from "react";
import { postAiAnalyticsSummary } from "../api";

/**
 * AiInsightPanel — переиспользуемая AI-панель для аналитических страниц.
 *
 * Props:
 *   contextType  — тип анализа: 'general' | 'institution_comparison' | 'discipline_impact' | 'vam_trend'
 *   filters      — { institutions, directions, courses, competency }
 *   label        — подпись кнопки/заголовок (например, "LGM Когорта" или "Влияние дисциплин")
 *   autoRun      — если true, запускается сам когда изменяется contextType (по умолчанию false)
 *   disabled     — блокировка кнопки пока страница грузится
 */
function AiInsightPanel({ contextType, filters = {}, label = "", autoRun = false, disabled = false }) {
    const [summary, setSummary]       = useState("");
    const [generating, setGenerating] = useState(false);
    const [error, setError]           = useState(null);
    const [visible, setVisible]       = useState(false);
    const prevContext = useRef(null);

    // Сбрасываем текст при смене контекста
    useEffect(() => {
        if (prevContext.current !== contextType) {
            setSummary("");
            setError(null);
            prevContext.current = contextType;
        }
    }, [contextType]);

    const generate = () => {
        setGenerating(true);
        setError(null);
        setSummary("");
        setVisible(true);

        postAiAnalyticsSummary(contextType, filters)
            .onSuccess(async res => {
                const data = await res.json();
                if (data.status === 'success') {
                    setSummary(data.summary || "Нет данных.");
                } else {
                    setError(data.message || "Неизвестная ошибка.");
                }
            })
            .onError(err => {
                setError("Ошибка соединения с сервером.");
                console.error(err);
            })
            .finally(() => setGenerating(false));
    };

    const copy = () => {
        if (summary) navigator.clipboard.writeText(summary);
    };

    const contextLabel = {
        general:                "Общая сводка",
        institution_comparison: "Сравнение вузов",
        discipline_impact:      "Влияние дисциплин",
        vam_trend:              "Динамика по курсам",
    }[contextType] || "Аналитика";

    return (
        <div className="ai-insight-panel">
            {/* ── Кнопка-триггер ── */}
            <button
                className="ai-insight-trigger"
                onClick={generate}
                disabled={disabled || generating}
                title={`Сгенерировать AI-сводку: ${contextLabel}`}
            >
                <span className="ai-icon">✦</span>
                <span>{generating ? "Генерация..." : `AI: ${label || contextLabel}`}</span>
                {generating && <span className="ai-spinner" />}
            </button>

            {/* ── Результат ── */}
            {visible && (summary || generating || error) && (
                <div className={`ai-insight-result ${generating ? 'ai-loading' : ''}`}>
                    <div className="ai-insight-header">
                        <span className="ai-badge">✦ AI</span>
                        <span className="ai-context-label">{contextLabel}</span>
                        <div className="ai-insight-actions">
                            {summary && (
                                <button className="ai-action-btn" onClick={copy} title="Копировать">
                                    ⎘
                                </button>
                            )}
                            <button className="ai-action-btn" onClick={() => setVisible(false)} title="Закрыть">
                                ✕
                            </button>
                        </div>
                    </div>

                    <div className="ai-insight-body">
                        {generating && (
                            <div className="ai-skeleton">
                                <div className="ai-skeleton-line" style={{ width: '92%' }} />
                                <div className="ai-skeleton-line" style={{ width: '78%' }} />
                                <div className="ai-skeleton-line" style={{ width: '85%' }} />
                                <div className="ai-skeleton-line" style={{ width: '60%' }} />
                            </div>
                        )}
                        {error && <div className="ai-error">⚠ {error}</div>}
                        {summary && !generating && (
                            <p className="ai-text">{summary}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AiInsightPanel;