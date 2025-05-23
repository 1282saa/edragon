FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p data/economy_terms data/recent_contents_final logs

# (선택) 비특권 사용자로 실행
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# (선택) 가독성용
EXPOSE 8080

# (선택) 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# 프로덕션용 Gunicorn 실행
CMD ["gunicorn", \
     "server:app", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "4", \
     "--log-level", "info"]
