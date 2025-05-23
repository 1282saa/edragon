# Cloud Run 배포 문제 해결 가이드

## 현재 발생한 문제
- Gunicorn worker가 WSGI 앱을 로드하지 못함
- `self.wsgi = self.app.wsgi()` 단계에서 실패

## 가능한 원인들

### 1. ChromaDB 초기화 문제
- ChromaDB는 SQLite를 사용하는데, Cloud Run의 읽기 전용 파일 시스템에서 문제 발생 가능
- 해결책: 
  - `/tmp` 디렉토리 사용
  - 또는 ChromaDB 없이 단순한 검색 방식 사용

### 2. 모듈 import 문제
- 복잡한 의존성이 제대로 설치되지 않음
- 해결책: requirements.txt 단순화

### 3. 메모리 부족
- LangChain과 ChromaDB 로딩 시 메모리 부족
- 해결책: 메모리 할당량 증가 (4Gi 이상)

## 단계별 해결 방법

### 1단계: 간단한 버전으로 테스트
```bash
# 간단한 서버로 테스트
docker build -f Dockerfile.simple -t test-simple .
docker run -p 8080:8080 test-simple
```

### 2단계: 로그 상세 확인
```bash
# Cloud Run 로그 확인
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=edragon" \
    --limit 100 \
    --format "value(textPayload)"
```

### 3단계: 메모리 증가
```bash
gcloud run services update edragon \
    --memory 4Gi \
    --cpu 2 \
    --region asia-northeast3
```

### 4단계: ChromaDB 디렉토리 수정
unified_chatbot.py에서 PERSISTENT_DIR을 `/tmp/vector_db`로 변경

### 5단계: 의존성 최소화
필수 패키지만 남기고 나머지는 제거

## 권장 접근 방법

### 옵션 1: ChromaDB 제거
- BM25 검색만 사용하는 간단한 버전으로 시작
- Cloud Run에 배포 후 점진적으로 기능 추가

### 옵션 2: Cloud Storage 사용
- 벡터 DB를 Cloud Storage에 저장
- 시작 시 다운로드하여 사용

### 옵션 3: 다른 벡터 DB 사용
- Pinecone, Weaviate 등 클라우드 기반 벡터 DB 사용

## 즉시 시도할 수 있는 해결책

1. **환경변수 확인**
```bash
# .env 파일이 있는지 확인
ls -la .env

# 환경변수가 제대로 설정되었는지 확인
cat .env | grep OPENAI_API_KEY
```

2. **로컬 테스트**
```bash
# 로컬에서 먼저 테스트
python simple_server.py
```

3. **도커 빌드 및 실행**
```bash
# 간단한 버전으로 빌드
docker build -f Dockerfile.simple -t edragon-simple .

# 로컬에서 실행
docker run -p 8080:8080 \
    -e OPENAI_API_KEY=$OPENAI_API_KEY \
    edragon-simple
```

4. **Cloud Run 배포**
```bash
# 간단한 버전 배포
gcloud run deploy edragon \
    --image gcr.io/godragon-460703/edragon-simple \
    --memory 2Gi \
    --region asia-northeast3 \
    --allow-unauthenticated
```