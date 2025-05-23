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

# 애플리케이션 파일 복사 - 먼저 모든 파일을 복사합니다
COPY . .

# 명시적인 절대 경로로 ROOT_DIR 환경 변수 설정
ENV ROOT_DIR=/app
ENV ENVIRONMENT=production
ENV PUPPETEER_ENABLED=FALSE
ENV PORT=8080
ENV FLASK_APP=server.py
ENV FLASK_ENV=production

# 디버깅을 위한 디렉토리 내용 확인 명령
RUN ls -la /app/data
RUN ls -la /app/data/economy_terms || echo "경제 용어 디렉토리가 없습니다"
RUN ls -la /app/data/recent_contents_final || echo "최신 콘텐츠 디렉토리가 없습니다"

# 비특권 사용자 생성 및 소유권 변경
RUN useradd -m appuser && \
    chown -R appuser:appuser /app
USER appuser

# 포트 노출 (Cloud Run에서 자동 할당)
EXPOSE $PORT

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Gunicorn으로 애플리케이션 실행 (JSON 배열 형식)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--threads", "8", "--timeout", "0", "--keep-alive", "2", "--max-requests", "1000", "--log-level", "debug", "server:app"]