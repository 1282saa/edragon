# Cloud Run 배포 가이드

## 배포 전 준비사항

### 1. 환경변수 설정
```bash
# .env.example을 복사하여 .env 파일 생성
cp .env.example .env

# .env 파일을 편집하여 실제 API 키 입력
nano .env
```

### 2. Google Cloud 프로젝트 설정
```bash
# 프로젝트 ID 설정
gcloud config set project igneous-primacy-460407-m7

# 리전 설정
gcloud config set run/region asia-northeast3
```

### 3. 필요한 API 활성화
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## 배포 방법

### 자동 배포 (권장)
```bash
# 배포 스크립트 실행
./scripts/deploy_to_cloudrun.sh
```

### 수동 배포
```bash
# 1. Docker 이미지 빌드
docker build -t gcr.io/igneous-primacy-460407-m7/edragon .

# 2. GCP 인증
gcloud auth configure-docker

# 3. 이미지 푸시
docker push gcr.io/igneous-primacy-460407-m7/edragon

# 4. Cloud Run 배포
gcloud run deploy edragon \
    --image gcr.io/igneous-primacy-460407-m7/edragon \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --port 8080
```

## 배포 후 확인

### 서비스 상태 확인
```bash
gcloud run services describe edragon --region asia-northeast3
```

### 로그 확인
```bash
# 실시간 로그
gcloud logs tail --project=igneous-primacy-460407-m7

# 최근 로그
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=edragon" --limit 50
```

### 서비스 URL 확인
```bash
gcloud run services describe edragon --region asia-northeast3 --format 'value(status.url)'
```

## 문제 해결

### 1. "Malformed response" 오류
- **원인**: Gunicorn worker가 제대로 시작되지 않음
- **해결**: 
  - 로그에서 상세한 오류 메시지 확인
  - 환경변수 설정 확인
  - 메모리 할당량 증가 (2Gi → 4Gi)

### 2. 503 Service Unavailable
- **원인**: 컨테이너가 준비되지 않음
- **해결**:
  - 헬스체크 엔드포인트 확인
  - 시작 시간 증가 (--timeout 300)

### 3. 환경변수 관련 오류
- **원인**: API 키가 설정되지 않음
- **해결**:
  ```bash
  # 환경변수 업데이트
  gcloud run services update edragon \
      --update-env-vars OPENAI_API_KEY=your-key
  ```

### 4. 메모리 부족
- **원인**: 벡터 DB 로딩 시 메모리 부족
- **해결**:
  ```bash
  gcloud run services update edragon --memory 4Gi
  ```

## 보안 고려사항

1. **API 키 관리**
   - 절대 코드에 하드코딩하지 않음
   - Cloud Run 환경변수 또는 Secret Manager 사용

2. **접근 제어**
   - 필요시 `--no-allow-unauthenticated` 옵션 사용
   - IAM 정책으로 접근 제어

3. **네트워크 보안**
   - HTTPS 자동 적용됨
   - 필요시 Cloud Armor 정책 적용

## 성능 최적화

1. **콜드 스타트 최소화**
   - 최소 인스턴스 설정: `--min-instances 1`
   - 메모리 할당 최적화

2. **동시성 설정**
   - `--concurrency` 옵션으로 동시 요청 수 제한
   - Gunicorn worker/thread 수 조정

3. **캐싱**
   - 벡터 DB는 읽기 전용으로 사용
   - 정적 파일 캐싱 헤더 설정

## 모니터링

1. **Cloud Monitoring**
   - CPU/메모리 사용률 모니터링
   - 요청 지연시간 추적

2. **알림 설정**
   ```bash
   # 에러율이 높을 때 알림
   gcloud alpha monitoring policies create \
       --notification-channels=CHANNEL_ID \
       --display-name="High Error Rate" \
       --condition-display-name="Error rate > 5%" \
       --condition-metric-type="run.googleapis.com/request_count" \
       --condition-filter='metric.label.response_code_class!="2xx"'
   ```

## 롤백 방법

```bash
# 이전 리비전으로 롤백
gcloud run services update-traffic edragon \
    --to-revisions=PREVIOUS_REVISION=100
```