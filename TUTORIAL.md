## Как запустить приложение (How to get the app up and running)

1. Создать файл окружения `stud-portrait/backend/.env.docker` (***prod***):

```ini
DB_HOST=database
DB_PORT=5432
DB_NAME=studportrait
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# LLM
LLM_SERVICE_URL=http://llm:8001

# Django
SECRET_KEY="<ключ Django>"
DEBUG=False
LOCAL_DEV=false
```

и/или файл `stud-portrait/backend/.env.local` (***dev***):

```ini
DB_HOST=localhost
DB_PORT=5433
DB_NAME=<имя БД>
DB_USER=<пользователь БД>
DB_PASSWORD=<пароль БД>

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379/1

# LLM
LLM_SERVICE_URL=http://localhost:8001

# Django
SECRET_KEY="<ключ Django>"
DEBUG=True
LOCAL_DEV=true
```

2. Развернуть все контейнеры через Docker (***prod***):

```cmd
docker-compose up
```

или же запустить все контейнеры по разным терминалам (***dev***, команды для запуска представлены в `README.md`).

3. Провести миграции в бэке:

```cmd
python manage.py makemigrations accounts
python manage.py migrate accounts
python manage.py migrate
```

4. Создать суперадмина в бэке (запомнить логин и пароль!):

```cmd
python manage.py createsuperuser
python manage.py assign_roles
```

5. Создать админа в бэке:

```cmd
python manage.py shell
```

```python
user = User.objects.create_user(
    username='admin1',
    email='admin@example.com',
    password='P@ssw0rd'
)
user.is_staff = True
user.is_superuser = False
user.save()
user = User.objects.get(username='admin1')
UserProfile.objects.filter(user=user).update(role='admin')
```

6. Зайти под суперадмином в веб-приложении;

7. Загрузить данные на странице загрузки данных;

8. Создать аккаунт студента:

```cmd
python manage.py shell
```

```python
from django.contrib.auth.models import User
from accounts.models import UserProfile
from portrait.models import Participants, Studentmapping

username = 'student1'
email = 'stud0000000001@study.utmn.ru'
password = 'Student123!'

user = User.objects.create_user(
	username=username,
	email=email,
	password=password
)

user, created = User.objects.get_or_create(
    username=username,
    defaults={
        'email': email,
        'password': password
    }
)

if created:
    user.set_password(password)
    user.save()
    print(f"User {username} created")
else:
    print(f"User {username} already exists")

profile, created = UserProfile.objects.update_or_create(
    user=user,
    defaults={'role': 'student'}
)

student_mapping = Studentmapping.objects.filter(
    mapping_email=email
).first()

if student_mapping:
    print(f"Found StudentMapping: {student_mapping.mapping_rsv}")

    participant = Participants.objects.filter(
        part_rsv=student_mapping.mapping_rsv
    ).first()
    
    if participant:
        profile.participant = participant
        profile.save()
        print(f"Linked to participant ID: {participant.part_id}")
    else:
        print("Participant not found")
else:
    print(f"StudentMapping not found for email: {email}")
    print("Creating StudentMapping...")

    new_mapping = Studentmapping.objects.create(
        mapping_rsv=username,
        mapping_stud_name='Student Name',
        mapping_stud_gender=1,
        mapping_email=email
    )
    print(f"StudentMapping created with RSV: {new_mapping.mapping_rsv}")
```

9. Радоваться жизни.
