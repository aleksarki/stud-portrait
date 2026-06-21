# StudPortrait

**StudPortrait** - web app for building digital student portrait and analysing the tendance of student skills.


## Installation & launch

### Frontend

**Installation**

```cmd
cd frontend
npm i
```

**Launch**

```cmd
cd frontend
npm run start
```


---

### Backend

**Installation**

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Launch**

```cmd
cd backend
.venv\Scripts\activate
cd src
python manage.py runserver
```

**Test**

```cmd
cd backend
.venv\Scripts\activate
cd src
python manage.py test
```


---

### LLM service

**Installation**

```cmd
cd llm
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

**Launch**

```cmd
cd llm
python -m venv .venv
.venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```


---

### Redis

**Installation**

```bash
sudo apt-get update
sudo apt-get install redis-server
```

**Launch**

```bash
sudo service redis-server start
```

**Stop**

```bash
sudo service redis-server stop
```

---

### Database

**Setup**

1. Create PostgresQL database.

2. Excecute SQL code from 'backend\create_database.sql' in your database query tool.

3. Create file 'backend\src\studportrait\env.py':

```python
env = {
    'NAME': '<DB name>',
    'USER': '<DB user>',
    'PASSWORD': '<DB password>',
    'HOST': 'localhost',
    'PORT': '5432'
}
```

**Filling with data**

1. Get database & backend running.

2. Perform request '...'
