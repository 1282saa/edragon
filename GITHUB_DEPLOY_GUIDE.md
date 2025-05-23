# GitHub → Google Cloud Shell 배포 가이드

## 서울경제신문 경제용 챗봇

## 1. Google Cloud Shell에서 프로젝트 설정

```bash
# Google Cloud Shell 열기 (https://shell.cloud.google.com)

# 프로젝트 설정 (이미 설정되어 있어야 함)
gcloud config set project igneous-primacy-460407-m7

# 현재 프로젝트 확인
gcloud config get-value project
```

## 2. 필수 API 키 설정

배포 전에 반드시 API 키들을 환경변수로 설정해야 합니다:

```bash
# 필수: OpenAI API 키
export OPENAI_API_KEY="sk-your-openai-api-key"

# 선택사항: Perplexity API 키 (웹 검색 기능)
export PERPLEXITY_API_KEY="pplx-your-perplexity-api-key"

# 선택사항: Gemini API 키
export GEMINI_API_KEY="your-gemini-api-key"

# 환경변수 확인
echo $OPENAI_API_KEY
```

## 3. GitHub 리포지토리 클론

```bash
# 리포지토리 클론
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 실행 권한 부여
chmod +x deploy.sh
```

## 4. 배포 실행

```bash
# 배포 스크립트 실행 (API 키가 환경변수로 설정되어 있어야 함)
./deploy.sh
```

## 5. 배포 과정

스크립트가 자동으로 다음을 수행합니다:

1. **API 키 확인**: OPENAI_API_KEY 필수, 나머지 선택사항
2. **API 활성화**: Cloud Run, Container Registry API
3. **Docker 인증 설정**: gcloud auth configure-docker
4. **이미지 빌드**: `docker build -t sedaily-chatbot:1.0 .`
5. **이미지 태깅**: gcr.io/igneous-primacy-460407-m7/sedaily-chatbot:1.0
6. **이미지 푸시**: Container Registry에 업로드
7. **Cloud Run 배포**:
   - 서비스명: sedaily-chatbot
   - 메모리: 2Gi
   - CPU: 2개
   - 최대 인스턴스: 10개
   - 동시성: 100
   - 타임아웃: 300초
   - 리전: asia-northeast3 (서울)

## 6. 배포 후 확인

```bash
# 서비스 상태 확인
gcloud run services list

# 로그 확인
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=sedaily-chatbot" --limit 20

# 서비스 URL 확인
gcloud run services describe sedaily-chatbot --region=asia-northeast3 --format='value(status.url)'
```

## 7. 중요한 데이터 파일 확인

배포 시 다음 파일들이 포함됩니다:

✅ `data/economy_terms/` - 48개의 경제 용어 md 파일들
✅ `data/recent_contents_final/` - 44개의 최신 컨텐츠 md 파일들
✅ `data/vector_db/` - 벡터 데이터베이스 디렉토리 (런타임에 생성)

## 8. 환경 변수 배포 후 업데이트 (필요시)

```bash
# API 키 업데이트
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --set-env-vars "OPENAI_API_KEY=new-key,PERPLEXITY_API_KEY=new-key"
```

## 9. 문제 해결

### 메모리 부족 시

```bash
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --memory 4Gi
```

### 타임아웃 오류 시

```bash
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --timeout 600
```

### 콜드 스타트 줄이기

```bash
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --min-instances 1
```

### API 키 관련 오류

```bash
# 환경변수 확인
echo $OPENAI_API_KEY

# 다시 설정
export OPENAI_API_KEY="sk-your-actual-key"
```

## 10. 프로젝트 정보

- **프로젝트 ID**: igneous-primacy-460407-m7
- **서비스명**: sedaily-chatbot
- **리전**: asia-northeast3 (서울)
- **서비스 URL**: https://sedaily-chatbot-[hash]-an.a.run.app

## 11. 업데이트 배포

코드 변경 후 재배포:

```bash
# 최신 코드 가져오기
git pull origin main

# API 키 환경변수 재설정 (필요시)
export OPENAI_API_KEY="sk-your-openai-api-key"

# 재배포
./deploy.sh
```

## 12. Cloud Console 모니터링

- **Cloud Run 콘솔**: https://console.cloud.google.com/run
- **로그 뷰어**: https://console.cloud.google.com/logs
- **Container Registry**: https://console.cloud.google.com/gcr
