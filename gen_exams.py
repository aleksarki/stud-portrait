from openpyxl import Workbook
import random

# --- Настройки ---
ROWS = 10  # сколько строк случайных данных

# Возможные учебные годы
years = [
    "2021/2022",
    "2022/2023",
    "2023/2024",
    "2024/2025",
    "2025/2026"
]


def clamp(value, min_val, max_val):
    return max(min_val, min(value, max_val))


def grade_from_culture(score):
    """Конвертация баллов цифровой культуры в оценку."""
    if score <= 60:
        return "неудовл."
    elif score <= 75:
        return "удовл."
    elif score <= 90:
        return "хор."
    else:
        return "отл."


# --- Создаём Excel ---
wb = Workbook()
ws = wb.active
ws.title = "Итоги успеваемости участников"   # <<< НАЗВАНИЕ ЛИСТА

headers = [
    "Учебный год",
    "ФИО студента",
    "Итог текущей успеваемости",
    "Цифровая культура",
    "Основная аттестация",
    "Первая повторная аттестация",
    "Вторая повторная аттестация",
    "Пересдача на повышенную оценку",
    "Итоговая оценка"
]
ws.append(headers)

# --- Генерация данных ---
for _ in range(ROWS):

    year = random.choice(years)
    fio = ""

    итог = round(clamp(random.gauss(7.5, 3), 0, 15), 1)
    культура = round(clamp(random.gauss(70, 15), 0, 100), 2)

    # критическое условие
    if итог == 0 and культура < 20:
        main = "не явился"
        rep1 = "не явился"
        rep2 = ""
        higher = ""
        final_grade = "не явился"

    else:
        main = grade_from_culture(культура)

        if main in ("удовл.", "хор."):
            rep1 = ""
            rep2 = ""
            higher = ""
            final_grade = main

        elif main == "неудовл.":
            rep1 = "удовл."
            rep2 = ""
            higher = ""
            final_grade = "удовл."

        elif main == "отл.":
            rep1 = ""
            rep2 = ""
            higher = ""
            final_grade = "отл."

    ws.append([
        year,
        fio,
        итог,
        культура,
        main,
        rep1,
        rep2,
        higher,
        final_grade
    ])

# --- Сохранение ---
wb.save("успеваемость_логика.xlsx")
print("Файл успешно создан: успеваемость_логика.xlsx")