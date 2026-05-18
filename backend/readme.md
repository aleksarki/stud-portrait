# Логические модули бэкенда

## `auth` - модуль авторизации

## `audit` - модуль аудита данных

- **GET** `audit/schema/` - Получение схемы базы данных: список таблиц, колонок, количества строк.

- **GET** `audit/table-data/` - Получение выборочных данных из таблицы.

- **POST** `audit/execute-sql/` - Выполнение произвольного SQL запроса.

- **GET** `audit/stats/` - Получение общей статистики базы данных.


## `dataload` - модуль загрузки данных

- **POST** `dataload/import-excel/` - Импорт данных из Excel-файлов.

- **GET** `dataload/expected-fields/` - Ожидаемые поля для каждого листа.

- **GET** `dataload/templates/` - Список всех шаблонов загрузки.

- **POST** `dataload/template-save/` - Сохранить шаблон (создать или обновить по имени).

- **DELETE** `dataload/template-delete/<id>/` - Удалить шаблон загрузки.

## `datasesh` - модуль выборки и выгрузки данных

- **POST** `datasesh/new/` - Инициировать новую сессию просмотра и выборки данных.

- **POST** `datasesh/extract-data/` - Получить данные из сессии.

- **POST** `datasesh/update-filters/` - Обновить применяемые в сессии фильтры.

- **POST** `datasesh/update-columns/` - Обновить видимые в сессии колонки.

- **POST** `datasesh/update-window/` - Обновить границы окна просмотра результатов.

- **POST** `datasesh/export-selected/` - Выгрузить выбранные данные в формате Excel.

- **POST** `datasesh/group-selected/` - Сгруппировать данные по определённому столбцу.

- **POST** `datasesh/count-stats/` - Выполнить подсчёт статистики данных.

## *`datanal` - модуль анализа данных

## *`statsresult` - модуль подсчёта статистики

## `ainterp` - модуль ИИ-интерпретирования

*методов нет*

## `gendox` - модуль генерации документов

- **GET** `gendox/generate-resume-docx/` - Генерация профессионального резюме в формате DOCX.

- **GET** `gendox/student-resume-data/` - Получить данные для резюме студента?

- **GET** `gendox/geography-report/` - Генерация DOCX отчёта о географии тестирования.
