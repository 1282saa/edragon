#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cloud Run 배포 설정
PROJECT_ID="godragon-460703"  # 실제 프로젝트 ID로 수정
SERVICE_NAME="edragon"
REGION="asia-northeast3"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# 스크립트 디렉토리로부터 프로젝트 루트로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}경제용 챗봇 Cloud Run 배포 스크립트${NC}"
echo "======================================="

# 1. 환경변수 확인
echo -e "\n${GREEN}1. 환경변수 확인 중...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}오류: .env 파일이 없습니다.${NC}"
    echo -e "${YELLOW}.env.example 파일을 참고하여 .env 파일을 생성하세요.${NC}"
    exit 1
fi

# 2. Docker 이미지 빌드
echo -e "\n${GREEN}2. Docker 이미지 빌드 중...${NC}"
docker build -t ${IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker 빌드 실패!${NC}"
    exit 1
fi

# 3. GCP 인증
echo -e "\n${GREEN}3. GCP 인증 중...${NC}"
gcloud auth configure-docker

# 4. 이미지 푸시
echo -e "\n${GREEN}4. 이미지 푸시 중...${NC}"
docker push ${IMAGE_NAME}

if [ $? -ne 0 ]; then
    echo -e "${RED}이미지 푸시 실패!${NC}"
    exit 1
fi

# 5. Cloud Run 배포
echo -e "\n${GREEN}5. Cloud Run 배포 중...${NC}"

# .env 파일에서 환경변수 읽기
export $(cat .env | grep -v '^#' | xargs)

gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --set-env-vars "OPENAI_API_KEY=${OPENAI_API_KEY}" \
    --set-env-vars "PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}" \
    --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" \
    --set-env-vars "PORT=8080"

if [ $? -ne 0 ]; then
    echo -e "${RED}Cloud Run 배포 실패!${NC}"
    exit 1
fi

# 6. 서비스 URL 가져오기
echo -e "\n${GREEN}6. 서비스 정보:${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}서비스 URL: ${SERVICE_URL}${NC}"

echo -e "\n${GREEN}배포 완료!${NC}"
echo "서비스 로그를 확인하려면:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit 50"