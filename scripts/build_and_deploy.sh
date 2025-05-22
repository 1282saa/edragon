#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GCP 프로젝트 정보
PROJECT_ID="economydragon-chatbot"
REPOSITORY="chatbot-repo"
REGION="asia-northeast3"
IMAGE_NAME="chatbot"
VERSION="1.1"

# 스크립트 디렉토리로부터 프로젝트 루트로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}경제용 챗봇 빌드 및 배포 스크립트${NC}"
echo "======================================="

# 1. Docker 이미지 빌드
echo -e "\n${GREEN}1. Docker 이미지 빌드 중...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker 빌드 실패!${NC}"
    exit 1
fi

# 2. 이미지 태깅
echo -e "\n${GREEN}2. 이미지 태깅 중...${NC}"
docker tag ${IMAGE_NAME}:${VERSION} ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${VERSION}

# 3. Artifact Registry 인증
echo -e "\n${GREEN}3. GCP 인증 중...${NC}"
gcloud auth configure-docker ${REGION}-docker.pkg.dev

# 4. 이미지 푸시
echo -e "\n${GREEN}4. 이미지 푸시 중...${NC}"
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${VERSION}

if [ $? -ne 0 ]; then
    echo -e "${RED}이미지 푸시 실패!${NC}"
    exit 1
fi

# 5. deployment.yaml 업데이트
echo -e "\n${GREEN}5. deployment.yaml 업데이트 중...${NC}"
sed -i '' "s|image: .*|image: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}:${VERSION}|g" k8s/deployment.yaml

# 6. Kubernetes 배포
echo -e "\n${GREEN}6. Kubernetes 배포 중...${NC}"

# k8s-secret.yaml 파일이 존재하는지 확인
if [ ! -f "k8s/k8s-secret.yaml" ]; then
    echo -e "${RED}오류: k8s/k8s-secret.yaml 파일이 없습니다.${NC}"
    echo -e "${YELLOW}k8s/k8s-secret.yaml.example 파일을 복사하여 k8s/k8s-secret.yaml 파일을 생성하고 실제 API 키를 입력하세요.${NC}"
    echo "다음 명령으로 API 키를 base64로 인코딩하세요:"
    echo "echo -n 'your-api-key' | base64"
    exit 1
fi

# Secret 생성 (이미 있는 경우 스킵)
kubectl get secret chatbot-secrets > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${GREEN}Secret 생성 중...${NC}"
    kubectl apply -f k8s/k8s-secret.yaml
else
    echo -e "${YELLOW}Secret이 이미 존재합니다. 업데이트하려면 다음 명령을 수동으로 실행하세요:${NC}"
    echo "kubectl apply -f k8s/k8s-secret.yaml"
fi

# Deployment 적용
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# 7. 배포 상태 확인
echo -e "\n${GREEN}7. 배포 상태 확인 중...${NC}"
kubectl rollout status deployment/chatbot-deploy

# 8. 서비스 정보 출력
echo -e "\n${GREEN}8. 서비스 정보:${NC}"
kubectl get service chatbot-service

echo -e "\n${GREEN}배포 완료!${NC}"
echo "포드 상태를 확인하려면: kubectl get pods"
echo "로그를 확인하려면: kubectl logs -f deployment/chatbot-deploy"