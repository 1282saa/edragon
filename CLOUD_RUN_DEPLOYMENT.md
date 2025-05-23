# Google Cloud Run 배포 가이드

## 사전 준비사항

1. **Google Cloud SDK 설치**

   ```bash
   # macOS
   brew install google-cloud-sdk

   # 또는 공식 웹사이트에서 다운로드
   # https://cloud.google.com/sdk/docs/install
   ```

2. **Google Cloud 프로젝트 설정**

   ```bash
   # Google Cloud 로그인
   gcloud auth login

   # 프로젝트 설정
   gcloud config set project YOUR_PROJECT_ID

   # Docker 인증 설정
   gcloud auth configure-docker
   ```

3. **필요한 API 활성화**

   ```bash
   # Cloud Run API 활성화
   gcloud services enable run.googleapis.com

   # Container Registry API 활성화
   gcloud services enable containerregistry.googleapis.com

   # Cloud Build API 활성화 (자동 배포 시)
   gcloud services enable cloudbuild.googleapis.com
   ```

## 배포 방법

### 방법 1: 수동 배포 스크립트 사용

```bash
# 배포 스크립트 실행
./deploy.sh YOUR_PROJECT_ID
```

### 방법 2: 수동 명령어 실행

```bash
# 1. Docker 이미지 빌드
docker build -t gcr.io/YOUR_PROJECT_ID/economy-chatbot:latest .

# 2. Container Registry에 푸시
docker push gcr.io/YOUR_PROJECT_ID/economy-chatbot:latest

# 3. Cloud Run에 배포
gcloud run deploy economy-chatbot \
  --image gcr.io/YOUR_PROJECT_ID/economy-chatbot:latest \
  --region asia-northeast3 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars "ENVIRONMENT=production,PUPPETEER_ENABLED=FALSE"
```

### 방법 3: Cloud Build를 통한 자동 배포

1. **GitHub 리포지토리와 연결**

   - Google Cloud Console에서 Cloud Build 트리거 설정
   - GitHub 리포지토리 연결
   - `cloudbuild.yaml` 파일 기반 자동 배포

2. **트리거 설정**
   ```bash
   gcloud builds triggers create github \
     --repo-name=YOUR_REPO_NAME \
     --repo-owner=YOUR_GITHUB_USERNAME \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

## 환경 변수 설정

Cloud Run 서비스에서 환경 변수를 설정해야 하는 경우:

```bash
gcloud run services update economy-chatbot \
  --region asia-northeast3 \
  --set-env-vars "OPENAI_API_KEY=your-openai-key,PERPLEXITY_API_KEY=your-perplexity-key"
```

## 서비스 관리

### 서비스 상태 확인

```bash
gcloud run services describe economy-chatbot --region asia-northeast3
```

### 로그 확인

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=economy-chatbot" --limit 50
```

### 트래픽 관리

```bash
# 새 버전으로 100% 트래픽 전환
gcloud run services update-traffic economy-chatbot \
  --to-latest \
  --region asia-northeast3
```

### 서비스 삭제

```bash
gcloud run services delete economy-chatbot --region asia-northeast3
```

## 주요 설정

- **메모리**: 2Gi (AI 모델 로딩에 필요)
- **CPU**: 1 (단일 코어)
- **최대 인스턴스**: 10개
- **동시성**: 80 (인스턴스당 최대 요청 수)
- **타임아웃**: 300초 (5분)
- **리전**: asia-northeast3 (서울)

## 비용 최적화

1. **자동 스케일링**: 요청이 없을 때 0까지 스케일 다운
2. **최소 인스턴스**: 기본값 0 (콜드 스타트 허용)
3. **CPU 할당**: 요청 처리 중에만 CPU 사용

## 문제 해결

### 일반적인 문제

1. **메모리 부족**

   - `--memory 4Gi`로 메모리 증가

2. **타임아웃 오류**

   - `--timeout 600`으로 타임아웃 증가

3. **콜드 스타트 지연**
   - `--min-instances 1`로 최소 인스턴스 설정

### 디버깅

```bash
# 최근 로그 확인
gcloud logging read "resource.type=cloud_run_revision" --limit 100

# 서비스 상세 정보
gcloud run services describe economy-chatbot --region asia-northeast3 --format=yaml
```

## 보안 설정

- 비인증 액세스 허용 (`--allow-unauthenticated`)
- 환경 변수로 API 키 관리
- 비특권 사용자로 컨테이너 실행

## 모니터링

Google Cloud Console에서 다음을 모니터링할 수 있습니다:

- 요청 수 및 응답 시간
- 오류율
- 메모리 및 CPU 사용량
- 인스턴스 수
