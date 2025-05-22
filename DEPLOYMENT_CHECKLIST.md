# 경제용 챗봇 배포 체크리스트

## 보안 주의사항 ⚠️
- [ ] **중요**: `k8s-secret.yaml` 파일이 `.gitignore`에 추가되었는지 확인
- [ ] API 키나 비밀값이 GitHub에 절대 커밋되지 않도록 주의
- [ ] 모든 시크릿은 `k8s-secret.yaml.example` 파일을 참고하여 로컬에서만 설정

## 1. 프로젝트 구조 ✅
- [x] 설정 파일들을 `configs/` 디렉토리로 정리
- [x] 쿠버네티스 파일들을 `k8s/` 디렉토리로 정리
- [x] 스크립트 파일들을 `scripts/` 디렉토리로 정리
- [x] 불필요한 파일 제거
- [x] 프로젝트 구조 문서 생성 (`PROJECT_STRUCTURE.md`)

## 2. 로컬 테스트 ✅
- [x] API 키 설정 확인
- [x] 서버 동작 테스트
- [x] 챗봇 기능 테스트
- [x] 질의 응답 테스트

## 3. 쿠버네티스 배포 준비
- [ ] `k8s-secret.yaml.example`을 복사하여 `k8s-secret.yaml` 생성
- [ ] `k8s-secret.yaml` 파일에 base64 인코딩된 API 키 추가
- [x] `deployment.yaml` 환경 변수 설정
- [x] Docker 이미지 버전 관리 (1.0 → 1.1)

## 4. 배포 스크립트
- [x] `build_and_deploy.sh` 실행 권한 설정
- [x] 스크립트 내용 확인 및 수정

## 5. 쿠버네티스 배포 단계

### 5.1 Docker 이미지 빌드
```bash
cd /path/to/경제용챗봇
docker build -t chatbot:1.1 .
```

### 5.2 이미지 태깅 및 푸시
```bash
# GCP Artifact Registry 태깅
docker tag chatbot:1.1 asia-northeast3-docker.pkg.dev/economydragon-chatbot/chatbot-repo/chatbot:1.1

# 인증
gcloud auth configure-docker asia-northeast3-docker.pkg.dev

# 푸시
docker push asia-northeast3-docker.pkg.dev/economydragon-chatbot/chatbot-repo/chatbot:1.1
```

### 5.3 쿠버네티스 배포
```bash
# Secret 생성
kubectl apply -f k8s/k8s-secret.yaml

# Deployment 배포
kubectl apply -f k8s/deployment.yaml

# Service 생성
kubectl apply -f k8s/service.yaml
```

### 5.4 배포 확인
```bash
# 포드 상태 확인
kubectl get pods

# 배포 상태 확인
kubectl rollout status deployment/chatbot-deploy

# 서비스 정보 확인
kubectl get service chatbot-service

# 로그 확인
kubectl logs -f deployment/chatbot-deploy
```

## 6. 운영 및 모니터링

### 6.1 헬스체크
```bash
# 포드 내부에서 헬스체크
kubectl exec -it <pod-name> -- curl http://localhost:8080/health
```

### 6.2 로그 모니터링
```bash
# 실시간 로그 확인
kubectl logs -f deployment/chatbot-deploy

# 특정 포드 로그
kubectl logs <pod-name>
```

### 6.3 트러블슈팅
```bash
# 포드 재시작
kubectl rollout restart deployment/chatbot-deploy

# 포드 세부 정보 확인
kubectl describe pod <pod-name>

# 이전 버전으로 롤백
kubectl rollout undo deployment/chatbot-deploy
```

## 7. 주의사항

1. **API 키 보안**: Secret에 저장된 API 키가 유출되지 않도록 주의
2. **리소스 모니터링**: CPU/메모리 사용량 주기적으로 확인
3. **백업**: 데이터 디렉토리 정기적 백업
4. **버전 관리**: Docker 이미지 태그 버전 관리

## 8. 문제 해결

### 포드가 시작되지 않는 경우
```bash
# 이벤트 확인
kubectl get events --sort-by=.metadata.creationTimestamp

# 포드 상태 상세 확인
kubectl describe pod <pod-name>
```

### 챗봇이 응답하지 않는 경우
1. API 키 설정 확인
2. 로그에서 오류 메시지 확인
3. 데이터 파일 존재 여부 확인

### 네트워크 문제
```bash
# 서비스 엔드포인트 확인
kubectl get endpoints

# 포드 간 통신 테스트
kubectl exec -it <pod-name> -- ping <other-pod-ip>
```