# 경제용 AI 챗봇

경제 용어와 최신 경제 콘텐츠를 AI 기반으로 검색하고 학습할 수 있는 웹 애플리케이션입니다.

## 디렉토리 구조

```
.
├── configs/          # 설정 파일
│   ├── config.py
│   ├── nixpacks.toml
│   └── runtime.txt
├── data/            # 데이터 파일
│   ├── economy_terms/
│   └── recent_contents_final/
├── k8s/             # Kubernetes 배포 파일
│   ├── deployment.yaml
│   ├── service.yaml
│   └── k8s-secret.yaml
├── logs/            # 로그 파일
├── modules/         # 챗봇 모듈
├── scripts/         # 실행 스크립트
│   ├── build_and_deploy.sh
│   ├── run_local.sh
│   ├── run_puppeteer.sh
│   └── test_chatbot.py
├── static/          # 정적 파일
├── templates/       # HTML 템플릿
├── server.py        # 메인 서버
└── requirements.txt # Python 의존성
```

## 주요 기능

1. **AI 기반 경제 질문 답변**: 경제 용어와 콘텐츠를 기반으로 질문에 답변하는 AI 챗봇
   - 내부 문서 검색 + 실시간 웹 검색을 통한 종합적인 답변
   - 출처와 인용문 제공으로 신뢰성 있는 정보 전달
2. **경제 용어 사전**: 다양한 경제 용어에 대한 설명 제공
3. **최신 경제 콘텐츠**: 최신 경제 트렌드와 뉴스 제공
4. **서울경제 1면 언박싱**: 서울경제신문 1면 동영상 재생 (선택사항)

## 기술 스택

- **프론트엔드**: HTML, TailwindCSS, JavaScript
- **백엔드**: Python 3.11, Flask
- **AI 및 검색**:
  - **벡터 데이터베이스**: ChromaDB
  - **임베딩**: OpenAI (text-embedding-3-small)
  - **언어 모델**: OpenAI GPT-3.5-turbo / GPT-4
  - **실시간 웹 검색**: Perplexity API
  - **프레임워크**: LangChain
  - **검색 기법**: 하이브리드 검색 (Vector + Keyword)
- **비디오 자동재생**: Puppeteer (Node.js)

## 로컬 개발

### 사전 요구사항

- Python 3.11 이상
- Node.js 16 이상 (비디오 자동재생 기능용)
- OpenAI API 키
- Perplexity API 키

### 설치 및 실행

1. 저장소 클론

   ```bash
   git clone https://github.com/your-username/economy-chatbot.git
   cd economy-chatbot
   ```

2. Python 가상환경 생성 및 활성화

   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. 의존성 설치

   ```bash
   pip install -r requirements.txt
   ```

4. Node.js 패키지 설치 (비디오 자동재생용)

   ```bash
   npm install
   ```

5. 환경 변수 설정

   ```bash
   cp env.example .env
   # .env 파일을 열어 API 키 설정
   ```

6. 서버 실행

   ```bash
   # Python 서버
   python server.py
   
   # 별도 터미널에서 Puppeteer 서버 (선택사항)
   node puppeteer_server.js
   ```

7. 브라우저에서 http://localhost:5000 접속

## Docker 사용

### Docker 빌드

```bash
docker build -t economy-chatbot .
```

### Docker 실행

```bash
docker run -p 8080:8080 --env-file .env economy-chatbot
```

## 배포

### GCP Kubernetes Engine 배포

1. **사전 준비**
   - GCP 프로젝트 설정
   - gcloud CLI 설치 및 인증
   - kubectl 설치
   - Docker 설치

2. **API 키 Secret 생성**
   ```bash
   # API 키를 base64로 인코딩
   echo -n "your-openai-api-key" | base64
   echo -n "your-perplexity-api-key" | base64
   echo -n "your-flask-secret-key" | base64
   
   # k8s/k8s-secret.yaml 파일 수정 후 적용
   kubectl apply -f k8s/k8s-secret.yaml
   ```

3. **자동 배포 스크립트 실행**
   ```bash
   ./scripts/build_and_deploy.sh
   ```

4. **수동 배포**
   ```bash
   # Docker 이미지 빌드
   docker build -t chatbot:1.1 .
   
   # 이미지 태깅
   docker tag chatbot:1.1 asia-northeast3-docker.pkg.dev/economydragon-chatbot/chatbot-repo/chatbot:1.1
   
   # 이미지 푸시
   docker push asia-northeast3-docker.pkg.dev/economydragon-chatbot/chatbot-repo/chatbot:1.1
   
   # Kubernetes 배포
   kubectl apply -f k8s/deployment.yaml
   kubectl apply -f k8s/service.yaml
   ```

5. **배포 확인**
   ```bash
   # 포드 상태 확인
   kubectl get pods
   
   # 서비스 상태 확인
   kubectl get service
   
   # 로그 확인
   kubectl logs -f deployment/chatbot-deploy
   ```

6. **트러블슈팅**
   ```bash
   # 포드 재시작
   kubectl rollout restart deployment/chatbot-deploy
   
   # 포드 세부 정보
   kubectl describe pod <pod-name>
   
   # 이전 버전으로 롤백
   kubectl rollout undo deployment/chatbot-deploy
   ```


### Heroku 배포

```bash
# Heroku CLI 로그인
heroku login

# 새 앱 생성
heroku create your-app-name

# 환경 변수 설정
heroku config:set OPENAI_API_KEY=your-api-key
heroku config:set PERPLEXITY_API_KEY=your-api-key

# 배포
git push heroku main
```

## 환경 변수

- `OPENAI_API_KEY`: OpenAI API 키 (필수)
- `PERPLEXITY_API_KEY`: Perplexity API 키 (필수)
- `SECRET_KEY`: Flask 시크릿 키 (보안용)
- `USE_PUPPETEER`: 비디오 자동재생 사용 여부 (옵션)

## 프로젝트 구조

```
economy-chatbot/
├── server.py              # Flask 서버
├── config.py              # 설정 파일
├── requirements.txt       # Python 의존성
├── package.json          # Node.js 의존성
├── Dockerfile            # Docker 설정
├── .env.example          # 환경 변수 예시
├── modules/              # 백엔드 모듈
│   └── unified_chatbot.py # 통합 챗봇 로직
├── static/               # 정적 파일
│   ├── css/             # 스타일시트
│   └── js/              # JavaScript 파일
├── templates/            # HTML 템플릿
│   └── ui.html          # 메인 UI
└── data/                # 데이터 파일
    ├── economy_terms/   # 경제 용어
    └── recent_contents_final/ # 최신 콘텐츠
```

## 라이선스

MIT License

## 기여

기여를 환영합니다! Pull Request를 보내주세요.

## 문제 해결

- Python 패키지 충돌 시: `pip install --no-cache-dir -r requirements.txt`
- ChromaDB 관련 오류: `rm -rf data/chroma_db` 후 재시작
- 포트 충돌: 다른 포트 사용 (`PORT=8080 python server.py`)

## 지원

문의사항은 이슈 트래커를 이용해주세요.