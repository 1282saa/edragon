# 베이스 이미지로 Python 3.11 slim 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 빌드 도구 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사 (캐시 최적화)
COPY requirements.txt .

# pip 업그레이드 및 의존성 설치
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 데이터 디렉토리 생성
RUN mkdir -p data/economy_terms data/recent_contents_final data/vector_db logs

# 애플리케이션 파일 복사
COPY . .

# 비특권 사용자 생성 및 소유권 변경
RUN useradd -m appuser && \
    chown -R appuser:appuser /app
USER appuser

# 환경 변수 설정
ENV ENVIRONMENT=production
ENV PUPPETEER_ENABLED=FALSE
ENV PORT=8080

# Cloud Run은 PORT 환경변수를 자동으로 설정하므로 이를 사용
ENV FLASK_APP=server.py
ENV FLASK_ENV=production

# 포트 노출 (Cloud Run에서 자동 할당)
EXPOSE $PORT

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Gunicorn으로 애플리케이션 실행
CMD exec gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 8 --timeout 0 --keep-alive 2 --max-requests 1000 --log-level info server:app
