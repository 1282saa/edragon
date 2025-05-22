# 쿠버네티스 배포 가이드

## 사전 준비 사항

1. 쿠버네티스 클러스터 접근 권한
2. GCP Artifact Registry 접근 권한
3. API 키 (OpenAI, Perplexity)

## 배포 절차

### 1. 시크릿 설정

배포 전에 API 키를 포함한 시크릿을 설정해야 합니다:

```bash
# API 키를 base64로 인코딩
echo -n 'your-openai-api-key' | base64
echo -n 'your-perplexity-api-key' | base64
echo -n 'your-flask-secret-key' | base64

# k8s-secret.yaml.example을 k8s-secret.yaml로 복사하고 실제 값으로 수정
cp k8s/k8s-secret.yaml.example k8s/k8s-secret.yaml
# 편집기로 k8s-secret.yaml 열어서 실제 base64 인코딩된 API 키 입력
```

⚠️ **주의: k8s-secret.yaml 파일은 절대 GitHub에 커밋하지 마세요!**

### 2. 배포 스크립트 실행

```bash
# 프로젝트 루트 디렉토리에서 실행
./scripts/build_and_deploy.sh
```

이 스크립트는:
- Docker 이미지 빌드
- GCP Artifact Registry에 이미지 푸시
- 쿠버네티스에 배포 (Deployment 및 Service 적용)

### 3. 배포 확인

```bash
# 파드 상태 확인
kubectl get pods

# 서비스 확인 (외부 IP 확인)
kubectl get service chatbot-svc

# 로그 확인
kubectl logs -f deployment/chatbot-deploy
```

## 트러블슈팅

- **Secret 관련 오류**: `chatbot-secrets` 시크릿이 올바르게 생성되었는지 확인
- **이미지 푸시 실패**: GCP 인증이 제대로 설정되었는지 확인
- **파드 시작 실패**: `kubectl describe pod [pod-name]`으로 상세 오류 확인