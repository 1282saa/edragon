#!/bin/bash

# Google Cloud Run 배포 스크립트 (서울경제신문 경제용 챗봇)

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 에러 발생 시 스크립트 중단
set -e

# GCP 프로젝트 정보
PROJECT_ID="igneous-primacy-460407-m7"
REGION="asia-northeast3"
SERVICE_NAME="sedaily-chatbot"
IMAGE_NAME="sedaily-chatbot"
VERSION="1.0"

echo -e "${YELLOW}경제용 챗봇 Cloud Run 배포 스크립트${NC}"
echo "======================================="
echo -e "${YELLOW}프로젝트 ID: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}서비스 이름: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}리전: ${REGION}${NC}"

# API 키 확인 (OPENAI_API_KEY는 필수, 나머지는 선택사항)
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}오류: 필수 API 키가 설정되지 않았습니다.${NC}"
    echo "다음 환경 변수를 설정하세요:"
    echo "OPENAI_API_KEY=sk-..."
    echo "예시: export OPENAI_API_KEY=sk-..."
    exit 1
fi

# 선택적 API 키 확인
if [ -z "$PERPLEXITY_API_KEY" ]; then
    echo -e "${YELLOW}주의: PERPLEXITY_API_KEY가 설정되지 않았습니다. 웹 검색 기능이 제한될 수 있습니다.${NC}"
fi

if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${YELLOW}주의: GEMINI_API_KEY가 설정되지 않았습니다. Gemini 모델 사용이 제한될 수 있습니다.${NC}"
fi

# 필요한 API가 활성화되어 있는지 확인
echo -e "\n${GREEN}필요한 API 활성화 확인 중...${NC}"
gcloud services enable run.googleapis.com containerregistry.googleapis.com --project=${PROJECT_ID}

# Docker 인증 설정
echo -e "\n${GREEN}Docker 인증 설정 중...${NC}"
gcloud auth configure-docker --quiet

# 1. Docker 이미지 빌드
echo -e "\n${GREEN}1. Docker 이미지 빌드 중...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} .

if [ $? -ne 0 ]; then
    echo -e "${RED}Docker 빌드 실패!${NC}"
    exit 1
fi

# 2. 이미지 태깅
echo -e "\n${GREEN}2. 이미지 태깅 중...${NC}"
docker tag ${IMAGE_NAME}:${VERSION} gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION}

# 3. 이미지 푸시
echo -e "\n${GREEN}3. Container Registry에 이미지 푸시 중...${NC}"
docker push gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION}

if [ $? -ne 0 ]; then
    echo -e "${RED}이미지 푸시 실패!${NC}"
    exit 1
fi

# 4. Cloud Run 배포
echo -e "\n${GREEN}4. Cloud Run 배포 중...${NC}"

# 환경 변수 문자열 구성
ENV_VARS="OPENAI_API_KEY=${OPENAI_API_KEY},ENVIRONMENT=cloud_run,USE_PUPPETEER=false,PUPPETEER_ENABLED=FALSE"

# 선택적 환경 변수 추가
if [ ! -z "$PERPLEXITY_API_KEY" ]; then
    ENV_VARS="${ENV_VARS},PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}"
fi

if [ ! -z "$GEMINI_API_KEY" ]; then
    ENV_VARS="${ENV_VARS},GEMINI_API_KEY=${GEMINI_API_KEY}"
fi

# 성능 최적화 설정 적용
echo -e "${YELLOW}성능 최적화 설정 적용:${NC}"
echo -e "${YELLOW}- 메모리: 4Gi (기존 2Gi에서 증설)${NC}"
echo -e "${YELLOW}- 최소 인스턴스: 1개 (콜드 스타트 방지)${NC}"
echo -e "${YELLOW}- 동시성: 50 (기존 100에서 품질 향상)${NC}"
echo -e "${YELLOW}- 타임아웃: 60초 (기존 300초에서 단축)${NC}"
echo -e "${YELLOW}- CPU 부스트: 활성화${NC}"

gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 50 \
  --max-instances 10 \
  --min-instances 1 \
  --cpu-boost \
  --set-env-vars "${ENV_VARS}" \
  --project ${PROJECT_ID}

if [ $? -ne 0 ]; then
    echo -e "${RED}Cloud Run 배포 실패!${NC}"
    exit 1
fi

# 5. 배포 상태 확인
echo -e "\n${GREEN}5. 배포 완료!${NC}"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format='value(status.url)' --project=${PROJECT_ID})
echo -e "${GREEN}서비스 URL: ${SERVICE_URL}${NC}"

# 건강 상태 확인
echo -e "\n${GREEN}서비스 건강 상태 확인 중...${NC}"
sleep 5
curl -f ${SERVICE_URL}/health || echo -e "${YELLOW}건강 상태 확인 실패. 서비스가 시작 중일 수 있습니다.${NC}"

echo -e "\n${GREEN}배포 완료!${NC}"
echo "Cloud Run 서비스를 확인하려면: https://console.cloud.google.com/run" 