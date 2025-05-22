#!/bin/bash

# 스크립트 디렉토리로부터 프로젝트 루트로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "경제용 챗봇 로컬 서버 시작..."

# .env 파일 확인
if [ ! -f .env ]; then
    echo "경고: .env 파일이 없습니다. .env.example을 복사하여 만들어주세요."
    exit 1
fi

# 환경 변수 로드
export $(cat .env | grep -v '^#' | xargs)

# 필수 환경 변수 확인
if [ -z "$OPENAI_API_KEY" ]; then
    echo "오류: OPENAI_API_KEY가 설정되지 않았습니다."
    exit 1
fi

if [ -z "$PERPLEXITY_API_KEY" ]; then
    echo "경고: PERPLEXITY_API_KEY가 설정되지 않았습니다. (선택사항)"
fi

# 필요한 디렉토리 생성
mkdir -p logs
mkdir -p data/economy_terms
mkdir -p data/recent_contents_final

# 기존 프로세스 종료
echo "기존 서버 프로세스 종료 중..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# 서버 시작
echo "서버 시작 중..."
python server.py