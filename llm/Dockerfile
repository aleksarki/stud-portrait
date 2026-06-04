FROM python:3.11-slim

WORKDIR /app

# system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app

# model dir (to be mounted)
RUN mkdir -p /app/app/llm_model

ENV PYTHONPATH=/app
ENV TRANSFORMERS_CACHE=/app/cache

EXPOSE 8001

CMD ["python", "-m", "app.main"]
