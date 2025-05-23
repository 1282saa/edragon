#!/bin/bash

# 현재 배포된 서비스 성능 최적화 스크립트
# 새로 빌드하지 않고 Cloud Run 설정만 변경

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 정보
PROJECT_ID="igneous-primacy-460407-m7"
REGION="asia-northeast3"
SERVICE_NAME="sedaily-chatbot"

echo -e "${YELLOW}🚀 챗봇 성능 최적화 스크립트${NC}"
echo "====================================="
echo -e "${YELLOW}프로젝트: ${PROJECT_ID}${NC}"
echo -e "${YELLOW}서비스: ${SERVICE_NAME}${NC}"
echo -e "${YELLOW}리전: ${REGION}${NC}"

echo -e "\n${GREEN}현재 설정 확인 중...${NC}"
gcloud run services describe ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID} --format="value(spec.template.spec.containers[0].resources.limits.memory,spec.template.spec.containers[0].resources.limits.cpu,spec.template.spec.containerConcurrency,spec.template.spec.timeoutSeconds)" 2>/dev/null

echo -e "\n${GREEN}성능 최적화 설정 적용 중...${NC}"
echo -e "${YELLOW}✓ 메모리: 2Gi → 4Gi${NC}"
echo -e "${YELLOW}✓ 최소 인스턴스: 0 → 1 (콜드 스타트 방지)${NC}"
echo -e "${YELLOW}✓ 동시성: 100 → 50 (품질 향상)${NC}"
echo -e "${YELLOW}✓ 타임아웃: 300초 → 60초${NC}"
echo -e "${YELLOW}✓ CPU 부스트 활성화${NC}"

gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --memory 4Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 50 \
  --max-instances 10 \
  --min-instances 1 \
  --cpu-boost \
  --project ${PROJECT_ID}

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ 성능 최적화 완료!${NC}"
    
    # 서비스 URL 확인
    SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)' --project=${PROJECT_ID})
    echo -e "${GREEN}서비스 URL: ${SERVICE_URL}${NC}"
    
    echo -e "\n${GREEN}📊 예상 성능 개선 효과:${NC}"
    echo -e "${YELLOW}- 콜드 스타트 제거: 3-5초 → 0초${NC}"
    echo -e "${YELLOW}- 평균 응답 시간: 8-12초 → 3-5초 (60% 단축)${NC}"
    echo -e "${YELLOW}- 메모리 안정성 향상${NC}"
    echo -e "${YELLOW}- 동시 처리 품질 향상${NC}"
    
    echo -e "\n${GREEN}모니터링:${NC}"
    echo -e "Cloud Run 콘솔: https://console.cloud.google.com/run"
    echo -e "로그 확인: gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=${SERVICE_NAME}\" --limit 20"
    
else
    echo -e "\n${RED}❌ 성능 최적화 실패!${NC}"
    exit 1
fi 