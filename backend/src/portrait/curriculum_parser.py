"""
portrait/services/curriculum_parser.py

Сервис парсинга учебного плана ТюмГУ и сопоставления дисциплин
с РСВ-компетенциями через семантические эмбеддинги.

Логика перенесена из ноутбука parcer_embeddings.ipynb.

Зависимости (добавить в requirements.txt):
    beautifulsoup4>=4.12
    pdfplumber>=0.10
    sentence-transformers>=2.7
"""

from __future__ import annotations

import io
import logging
import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
import pandas as pd
import pdfplumber
import requests
from bs4 import BeautifulSoup
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Константы
# ──────────────────────────────────────────────────────────────────────────────

UTMN_BASE_URL = "https://sveden.utmn.ru"
UTMN_EDU_PAGE = UTMN_BASE_URL + "/sveden/education/eduop/"

# Направление подготовки, для которого ищем план.
# Можно передавать как параметр в parse_curriculum(), здесь — дефолт.
TARGET_SPECIALTY = "Математическое обеспечение и администрирование информационных систем"
EXCLUDE_LEVEL    = "магистратура"
EXCLUDE_PLAN_YEAR = "2021"   # устаревший план, пропускаем

RESULT_COLUMNS = [
    "Дисциплина",
    "Семестр 1", "Семестр 2", "Семестр 3", "Семестр 4",
    "Семестр 5", "Семестр 6", "Семестр 7", "Семестр 8",
    "Компетенции",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# Стандартные ФГОС-компетенции и их описания (для эмбеддингов)
STANDARD_COMPETENCIES: dict[str, str] = {
    "УК-1":  "Способен осуществлять поиск, критический анализ и синтез информации, применять системный подход для решения поставленных задач",
    "УК-2":  "Способен определять круг задач в рамках поставленной цели и выбирать оптимальные способы их решения, исходя из действующих правовых норм, имеющихся ресурсов и ограничений",
    "УК-3":  "Способен осуществлять социальное взаимодействие и реализовывать свою роль в команде",
    "УК-4":  "Способен осуществлять деловую коммуникацию в устной и письменной формах на государственном языке Российской Федерации и иностранных языках",
    "УК-5":  "Способен воспринимать межкультурное разнообразие общества в социально-историческом, этическом и философском контекстах",
    "УК-7":  "Способен поддерживать должный уровень физической подготовленности для обеспечения полноценной социальной и профессиональной деятельности",
    "УК-8":  "Способен создавать и поддерживать безопасные условия жизнедеятельности для сохранения природной среды, обеспечения устойчивого развития общества",
    "УК-9":  "Способен принимать обоснованные экономические решения в различных областях жизнедеятельности",
    "УК-10": "Способен формировать нетерпимое отношение к коррупционному поведению",
    "ОПК-1": "Способен применять фундаментальные знания, полученные в области математических и (или) естественных наук, и использовать их в профессиональной деятельности",
    "ОПК-2": "Способен применять современный математический аппарат, связанный с проектированием, разработкой, реализацией и оценкой качества программных продуктов",
    "ОПК-3": "Способен применять современные информационные технологии при создании программных продуктов и программных комплексов различного назначения",
    "ОПК-4": "Способен участвовать в разработке технической документации программных продуктов",
    "ОПК-5": "Способен инсталлировать и сопровождать программное обеспечение для информационных систем и баз данных",
    "ОПК-6": "Способен использовать в педагогической деятельности научные основы знаний в сфере информационно-коммуникационных технологий",
    "ПК-1":  "Способен использовать методы системного моделирования при исследовании и проектировании программных систем",
    "ПК-2":  "Способен использовать основные модели информационных технологий и способов их применения для решения задач в предметных областях",
    "ПК-3":  "Способен проектировать и конструировать программные средства, а также архитектуры программных средств",
}

# РСВ-компетенции: отображаемое название → ключ res_comp_* из Testresults
RSV_DISPLAY_TO_KEY: dict[str, str] = {
    "Анализ информации":                "res_comp_info_analysis",
    "Ориентация на результат":          "res_comp_result_orientation",
    "Планирование":                     "res_comp_planning",
    "Стрессоустойчивость":              "res_comp_stress_resistance",
    "Партнерство/Сотрудничество":       "res_comp_partnership",
    "Следование правилам и процедурам": "res_comp_rules_compliance",
    "Саморазвитие":                     "res_comp_self_development",
    "Клиентоориентированность":         "res_comp_client_focus",
    "Коммуникативная грамотность":      "res_comp_communication",
    "Лидерство (Контроль)":             "res_comp_leadership",
    "Эмоциональный интеллект":          "res_comp_emotional_intel",
    "Пассивный словарный запас":        "res_comp_passive_vocab",
}

# Описания РСВ-компетенций для построения эмбеддингов
RSV_DESCRIPTIONS: dict[str, str] = {
    "Анализ информации":                "Анализирует и корректно работает с различного рода информацией, устанавливает взаимосвязи между разрозненными данными.",
    "Ориентация на результат":          "Берет на себя ответственность за достижение поставленной цели. Ставит перед собой амбициозные задачи.",
    "Планирование":                     "Составляет комплексный план действий для реализации задач.",
    "Стрессоустойчивость":              "Сохраняет продуктивность в сложных ситуациях.",
    "Партнерство/Сотрудничество":       "Выстраивает отношения сотрудничества, выявляет и учитывает потребности и интересы других.",
    "Следование правилам и процедурам": "Действует в соответствии с существующими нормами, регламентами, процедурами и политиками.",
    "Саморазвитие":                     "Стремится к постоянному повышению своего профессионализма, активно работает над развитием своих навыков.",
    "Клиентоориентированность":         "Выявляет потребности клиента, действует исходя из его ожиданий, сохраняет баланс между интересами компании и потребностями заказчиков.",
    "Коммуникативная грамотность":      "Владеет культурными нормами общения, четко и структурировано формулирует свои мысли, учитывает особенности собеседников.",
    "Лидерство (Контроль)":             "Разделяет ответственность и полномочия в команде. Берет на себя ответственность за деятельность группы и контролирует ход событий.",
    "Эмоциональный интеллект":          "Анализирует собственные эмоции и эмоции других людей, действует с учетом индивидуальных особенностей других.",
    "Пассивный словарный запас":        "Слова, которые человек понимает, узнаёт при чтении или на слух, но активно не использует в спонтанной речи.",
}

SIMILARITY_THRESHOLD = 0.50
TOP_N_MATCHES        = 3


# ──────────────────────────────────────────────────────────────────────────────
# Вспомогательные функции
# ──────────────────────────────────────────────────────────────────────────────

def _extract_year(text: str) -> Optional[str]:
    years = re.findall(r'(?:19|20)\d{2}', text)
    return years[0] if years else None


def _parse_competency_codes(comp_str: str) -> list[str]:
    """
    'УК-1,3, ОПК-2,4' → ['УК-1','УК-3','ОПК-2','ОПК-4']
    """
    if not comp_str or (isinstance(comp_str, float) and pd.isna(comp_str)):
        return []
    result: list[str] = []
    current_prefix: Optional[str] = None
    for part in str(comp_str).split(','):
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            prefix, number = part.split('-', 1)
            current_prefix = prefix.strip()
            result.append(f"{current_prefix}-{number.strip()}")
        elif current_prefix:
            result.append(f"{current_prefix}-{part}")
        else:
            result.append(part)
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Парсинг PDF
# ──────────────────────────────────────────────────────────────────────────────

def _fetch_bytes(url: str) -> Optional[bytes]:
    try:
        r = requests.get(url, headers=HEADERS, stream=True, timeout=30)
        r.raise_for_status()
        return r.content
    except requests.RequestException as exc:
        logger.warning("Не удалось скачать %s: %s", url, exc)
        return None


def _extract_curriculum_table(pdf_bytes: bytes) -> Optional[pd.DataFrame]:
    """Извлекает таблицу дисциплин из PDF учебного плана."""
    all_rows: list[list] = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                for table in (page.extract_tables() or []):
                    if table:
                        all_rows.extend(table)
    except Exception as exc:
        logger.error("Ошибка чтения PDF: %s", exc)
        return None

    if not all_rows:
        return None

    df = pd.DataFrame(all_rows).fillna("")

    # Ищем строку-заголовок: первая колонка содержит слово «дисциплин»
    col0 = df.iloc[:, 0].astype(str).str.lower()
    header_matches = col0[col0.str.contains('дисциплин', na=False)].index.tolist()
    if not header_matches:
        logger.warning("Заголовочная строка не найдена в PDF")
        return None
    header_idx = header_matches[0]

    # Границы данных: строки после заголовка до первой «пустой» строки
    start = header_idx + 1
    end = start
    for i in range(start, len(df)):
        val = str(df.iloc[i, 0]).strip()
        if val == "" or val.replace('.', '', 1).isdigit():
            end = i
        else:
            break

    n_cols = min(len(df.columns), len(RESULT_COLUMNS))
    data_cols = list(range(1, n_cols))
    result = df.iloc[start:end + 1, data_cols].copy()
    result.columns = RESULT_COLUMNS[: len(data_cols)]
    return result.reset_index(drop=True)


def _extract_rows_by_name(df: pd.DataFrame, names: list[str]) -> pd.DataFrame:
    """Достаёт конкретные строки (практики) по точному названию дисциплины."""
    if df is None or df.empty:
        return pd.DataFrame(columns=RESULT_COLUMNS)
    col = df.iloc[:, 0].astype(str).str.strip().str.lower()
    mask = col.isin({n.strip().lower() for n in names})
    n_cols = min(len(df.columns), len(RESULT_COLUMNS))
    result = df.loc[mask].iloc[:, list(range(1, n_cols))].copy()
    result.columns = RESULT_COLUMNS[: n_cols - 1]
    return result.reset_index(drop=True)


# ──────────────────────────────────────────────────────────────────────────────
# Компетенциональный матчер (эмбеддинги)
# ──────────────────────────────────────────────────────────────────────────────

class _CompetencyMatcher:
    """
    Singleton. Сопоставляет ФГОС-компетенции с РСВ-компетенциями через
    семантическую близость.  Модель скачивается при первом вызове (~120 МБ).
    """
    _instance: Optional["_CompetencyMatcher"] = None

    def __init__(self, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2"):
        logger.info("Загрузка модели эмбеддингов: %s", model_name)
        self._model = SentenceTransformer(model_name)
        self._build_index()

    @classmethod
    def get(cls) -> "_CompetencyMatcher":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _build_index(self) -> None:
        texts, types, codes = [], [], []
        for code, desc in STANDARD_COMPETENCIES.items():
            texts.append(desc); types.append("std"); codes.append(code)
        for name, desc in RSV_DESCRIPTIONS.items():
            texts.append(desc); types.append("rsv"); codes.append(name)
        self._types = types
        self._codes = codes
        self._embeddings: np.ndarray = self._model.encode(
            texts, normalize_embeddings=True, show_progress_bar=False, batch_size=32
        )

    def std_to_rsv(
        self,
        std_code: str,
        top_n: int = TOP_N_MATCHES,
        threshold: float = SIMILARITY_THRESHOLD,
    ) -> list[tuple[str, float]]:
        """Для кода ФГОС-компетенции возвращает список (display_name_rsv, score)."""
        if std_code not in STANDARD_COMPETENCIES:
            return []
        idx = self._codes.index(std_code)
        vec = self._embeddings[idx]
        scores = [
            (self._codes[i], float(np.dot(vec, self._embeddings[i])))
            for i, t in enumerate(self._types)
            if t == "rsv"
        ]
        scores.sort(key=lambda x: x[1], reverse=True)
        return [(name, round(s, 3)) for name, s in scores if s >= threshold][:top_n]

    def build_full_mapping(self) -> dict[str, list[tuple[str, float]]]:
        return {
            code: matches
            for code in STANDARD_COMPETENCIES
            if (matches := self.std_to_rsv(code))
        }


# ──────────────────────────────────────────────────────────────────────────────
# Публичный результирующий тип
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class DisciplineMapping:
    name: str
    semester: Optional[int]
    standard_competencies: list[str]   # ['УК-1', 'УК-3', …]
    rsv_competencies: list[str]        # ['res_comp_info_analysis', …]


@dataclass
class ParseResult:
    disciplines: list[DisciplineMapping] = field(default_factory=list)
    source_url: str = ""
    warnings: list[str] = field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────────
# Главная точка входа
# ──────────────────────────────────────────────────────────────────────────────

def parse_curriculum(
    specialty_name: str = TARGET_SPECIALTY,
    similarity_threshold: float = SIMILARITY_THRESHOLD,
    top_n: int = TOP_N_MATCHES,
    progress_callback=None,
) -> ParseResult:
    """
    Парсит актуальный учебный план ТюмГУ для указанного направления
    и возвращает список дисциплин с привязанными РСВ-компетенциями.

    progress_callback(step: str, current: int, total: int) — опциональный
    колбэк для обновления прогресс-бара.
    """
    result = ParseResult()
    warnings = result.warnings

    def _log(step: str, cur: int = 0, total: int = 0) -> None:
        logger.info("[парсер] %s (%d/%d)", step, cur, total)
        if progress_callback:
            progress_callback(step, cur, total)

    # ── 1. Загружаем страницу ТюмГУ ──────────────────────────────────────────
    _log("Загрузка страницы ТюмГУ")
    try:
        page = requests.get(UTMN_EDU_PAGE, headers=HEADERS, timeout=30)
        page.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Не удалось загрузить страницу ТюмГУ: {exc}") from exc

    soup = BeautifulSoup(page.text, "html.parser")
    tbody = soup.find("tbody")
    if not tbody:
        raise RuntimeError("Таблица учебных планов не найдена на странице ТюмГУ")

    # ── 2. Ищем ссылки на PDF учебных планов нужного направления ─────────────
    plan_links: list[str] = []
    for row in tbody.find_all("tr"):
        name_cell = row.find("td", {"itemprop": "eduName"})
        if not name_cell or specialty_name not in name_cell.text:
            continue
        level_cell = row.find("td", {"itemprop": "eduLevel"})
        if level_cell and EXCLUDE_LEVEL in level_cell.text.lower():
            continue
        plan_cell = row.find("td", {"itemprop": "educationPlan"})
        if not plan_cell:
            continue
        for a in plan_cell.find_all("a", class_="word-break-all"):
            if _extract_year(a.text.lower()) == EXCLUDE_PLAN_YEAR:
                continue  # пропускаем устаревший план
            plan_links.append(UTMN_BASE_URL + a["href"])

    if not plan_links:
        raise RuntimeError(
            f"Учебные планы для «{specialty_name}» не найдены. "
            "Проверьте название специальности или структуру сайта ТюмГУ."
        )

    # Берём самый свежий план (последний в списке = максимальный год)
    plan_url = plan_links[-1]
    result.source_url = plan_url
    _log("Скачивание PDF учебного плана")

    # ── 3. Скачиваем и парсим PDF ─────────────────────────────────────────────
    pdf_bytes = _fetch_bytes(plan_url)
    if not pdf_bytes:
        raise RuntimeError(f"Не удалось скачать PDF учебного плана: {plan_url}")

    df = _extract_curriculum_table(pdf_bytes)
    if df is None or df.empty:
        raise RuntimeError("Не удалось извлечь таблицу дисциплин из PDF")

    # Если практики не попали в основную таблицу — дополняем
    practice_names = [
        "Проектно-исследовательская работа",
        "Управление проектами",
        "Эксплуатационная практика",
        "Преддипломная практика",
    ]
    existing = set(df["Дисциплина"].str.lower().tolist())
    missing = [n for n in practice_names if n.lower() not in existing]
    if missing:
        extra = _extract_rows_by_name(df, missing)
        if not extra.empty:
            df = pd.concat([df, extra], ignore_index=True)
            warnings.append(f"Практики добавлены отдельно: {missing}")

    _log("Инициализация модели эмбеддингов")

    # ── 4. Сопоставляем ФГОС-компетенции с РСВ ───────────────────────────────
    matcher = _CompetencyMatcher.get()
    std_to_rsv_map = matcher.build_full_mapping()  # {УК-1: [('Анализ информации', 0.69), …]}

    total = len(df)
    _log("Обработка дисциплин", 0, total)

    for i, row in df.iterrows():
        disc_name = str(row.get("Дисциплина", "")).strip()
        if not disc_name:
            continue

        # Семестр — первая непустая семестровая ячейка
        semester: Optional[int] = None
        for s in range(1, 9):
            val = str(row.get(f"Семестр {s}", "")).strip()
            if val and val not in ("", "0", "nan"):
                semester = s
                break

        std_codes = _parse_competency_codes(str(row.get("Компетенции", "")))

        rsv_display: set[str] = set()
        for code in std_codes:
            for display_name, _score in std_to_rsv_map.get(code, []):
                rsv_display.add(display_name)

        rsv_keys = sorted(
            RSV_DISPLAY_TO_KEY[n] for n in rsv_display if n in RSV_DISPLAY_TO_KEY
        )

        result.disciplines.append(DisciplineMapping(
            name=disc_name,
            semester=semester,
            standard_competencies=std_codes,
            rsv_competencies=rsv_keys,
        ))

        _log("Обработка дисциплин", i + 1, total)

    if not result.disciplines:
        raise RuntimeError("Парсер не нашёл ни одной дисциплины в учебном плане")

    return result