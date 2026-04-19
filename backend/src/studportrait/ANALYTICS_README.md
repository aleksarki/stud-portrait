Аналитический модуль Django ORM
=================================

Исполнитель
-----------
Шляхтин Даниил Константинович

Описание
--------
Модуль для аналитики данных системы мониторинга компетенций студентов. 
Все запросы реализованы средствами Django ORM без использования raw SQL.

Структура проекта
-----------------
backend/src/
  studportrait/
    analytics.py              - 7 аналитических функций
    analytics_examples.json   - Примеры вывода
    tests/
      test_analytics.py       - 9 тестов
    settings.py
  portrait/
    models.py                 - Модели данных
    migrations/
    management/
      commands/
        import_excel.py       - Импорт данных из Excel
  manage.py

Установка
---------
1. Создать виртуальное окружение:

   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt

2. Настроить базу данных:
   
   Создать файл backend/src/studportrait/env.py:
   
   env = {
       'NAME': 'studportrait',
       'USER': 'postgres',
       'PASSWORD': 'ваш_пароль',
       'HOST': 'localhost',
       'PORT': '5432'
   }

3. Применить миграции:

   cd backend/src
   python manage.py migrate

4. Импортировать данные из Excel:

   python manage.py import_excel

Функции
-------
1. get_competency_distribution
   Распределение средних баллов по 12 компетенциям за учебный год.
   
   Параметры:
   - academic_year (str) - учебный год, например "2024/2025"
   - institution_id (int, опционально) - ID учебного заведения
   
   Возвращает: List[Dict{"competency": str, "avg_score": float}]

2. get_university_rating
   Рейтинг вузов по среднему баллу.
   
   Параметры:
   - academic_year (str) - учебный год
   - top_n (int) - количество вузов в топе (по умолчанию 5)
   
   Возвращает: List[Dict{"university": str, "avg_score": float, "count": int}]

3. get_participant_dynamics
   Динамика баллов участника по годам.
   
   Параметры:
   - participant_id (int) - ID участника
   - metric (str) - поле компетенции
   
   Возвращает: List[Dict{"year": str, "score": int}]

4. get_top_participants
   Топ-N участников по сумме баллов компетенций.
   
   Параметры:
   - academic_year (str) - учебный год
   - top_n (int) - количество участников (по умолчанию 10)
   
   Возвращает: List[Dict{"participant_id": int, "total_score": float, "year": str}]

5. get_gender_stats_by_specialty
   Гендерная статистика по специальностям.
   
   Параметры:
   - academic_year (str, опционально) - учебный год
   
   Возвращает: List[Dict{"specialty": str, "male_count": int, "female_count": int, "avg_score": float}]

6. get_talent_category_stats
   Статистика по категориям высокопотенциальных участников.
   
   Параметры:
   - academic_year (str, опционально) - учебный год
   
   Возвращает: List[Dict{"category": str, "count": int, "avg_score": float}]

7. get_course_completion_stats
   Статистика прохождения курсов.
   
   Параметры:
   - academic_year (str, опционально) - учебный год
   
   Возвращает: List[Dict{"course_name": str, "avg_score": float, "completed_count": int}]

Запуск тестов
-------------
cd backend/src
python manage.py test studportrait.tests.test_analytics --verbosity=2

Ожидаемый результат: 9 тестов пройдено

Примеры использования
---------------------
from studportrait.analytics import (
    get_competency_distribution,
    get_university_rating,
    get_top_participants,
)

# Распределение компетенций
result = get_competency_distribution("2024/2025")

# Рейтинг вузов
result = get_university_rating("2024/2025", top_n=5)

# Топ участников
result = get_top_participants("2024/2025", top_n=10)


Критерии выполнения
-------------------
- Все запросы реализованы средствами Django ORM
- Код оптимизирован (select_related, annotate, aggregate)
- Написаны тесты для ключевых функций
- Обработка NULL значений и группировка по периодам реализованы

