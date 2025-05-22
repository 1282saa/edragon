#!/bin/bash

# 스크립트 디렉토리로부터 프로젝트 루트로 이동
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "Puppeteer 서버 시작..."

# Node 모듈 설치
if [ ! -d "node_modules" ]; then
    echo "Node 모듈 설치 중..."
    npm install
fi

# Puppeteer 서버 실행
echo "Puppeteer 서버 실행 중..."
node puppeteer_server.js