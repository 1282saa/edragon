FROM python:3.11-slim
WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 필요한 디렉토리 생성 및 권한 설정
RUN mkdir -p data/economy_terms data/recent_contents_final logs data/vector_db \
  && chmod -R 755 data logs

# Cloud Run은 PORT 환경변수를 설정하므로 기본값 설정
ENV PORT=8080

# 포트 노출
EXPOSE 8080

# Gunicorn 실행 (Cloud Run용 설정)
CMD exec gunicorn \
     --bind 0.0.0.0:$PORT \
     --workers 1 \
     --threads 8 \
     --timeout 0 \
     --log-level info \
     --access-logfile - \
     --error-logfile - \
     server:app
