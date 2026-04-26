# 📊 Аналитический модуль: CompetencyAnalytics

## 🔧 Что можно получить

### 1. Прирост компетенций (`get_competency_growth`)

**Входные данные:**

- `rsv_id`: str — ID студента в РСВ
- `period_before`: str — начальный период (год)
- `period_after`: str — конечный период
- `competencies`: list[str] — опционально, список полей компетенций

**Выходные данные:**

```json
{
  "rsv_id": "RSV001",
  "periods": "2023 → 2024",
  "competencies": {
    "Анализ информации": {
      "before": 70,
      "after": 85,
      "growth": 15,
      "growth_percent": 21.43
    }
  },
  "summary": {
    "avg_growth": 5.0,
    "positive_changes": 8,
    "negative_changes": 2
  }
}
```

"""
Примеры использования аналитического модуля
"""

from portrait.analytics import CompetencyAnalytics

# Пример 1: Прирост компетенций студента

growth = CompetencyAnalytics.get_competency_growth(
rsv_id="RSV123",
period_before="2023",
period_after="2024"
)
print(f"Средний прирост: {growth['summary']['avg_growth']} баллов")

# Вывод: {"rsv_id": "RSV123", "periods": "2023 → 2024",

# "competencies": {...}, "summary": {"avg_growth": 5.2, ...}}

# Пример 2: Демография по вузам

stats = CompetencyAnalytics.get_demographic_stats(group_by="institution")
print(f"Всего вузов: {len(stats['data'])}")

# Вывод: {"group_by": "institution", "data": [

# {"res_institution\_\_inst_name": "ВУЗ №1", "total_students": 15, ...}

# ]}

# Пример 3: Сравнение вузов

comparison = CompetencyAnalytics.compare_institutions(
institution_ids=[1, 2, 3]
)
print("Рейтинг:", comparison['ranking'])

# Вывод: {"ranking": [

# {"rank": 1, "institution": "ВУЗ №1", "score": 78.5},

# {"rank": 2, "institution": "ВУЗ №2", "score": 72.1}

# ]}
