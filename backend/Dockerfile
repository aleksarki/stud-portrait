# backend/Dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    postgresql-client \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# copy of all code
COPY . .

WORKDIR /app/src

# dirs for static and media
RUN mkdir -p /app/staticfiles /app/media

EXPOSE 8000

CMD ["sh", "-c", "python manage.py collectstatic --noinput && gunicorn studportrait.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120"]
