# 경제용 챗봇 프로젝트 구조

```
경제용챗봇/
├── .env.example             # 환경변수 예시 파일
├── .dockerignore           # Docker 빌드 시 제외 파일 목록
├── .gitignore              # Git 제외 파일 목록  
├── Dockerfile              # Docker 이미지 빌드 설정
├── Procfile                # Heroku 배포 설정 (선택적)
├── package.json            # Node.js 의존성 (Puppeteer용)
├── puppeteer_server.js     # 비디오 자동재생 서버
├── requirements.txt        # Python 의존성 목록
├── server.py               # 메인 Flask 서버
├── README.md               # 프로젝트 문서
│
├── configs/                # 설정 파일들
│   └── config.py          # 애플리케이션 설정
│
├── data/                   # 데이터 파일들
│   ├── economy_terms/     # 경제 용어 마크다운 파일들 (52개)
│   ├── recent_contents_final/ # 최신 콘텐츠 마크다운 파일들 (44개)
│   └── chroma_db/         # ChromaDB 벡터 데이터베이스
│
├── k8s/                    # Kubernetes 배포 설정
│   ├── deployment.yaml    # K8s 배포 설정
│   ├── service.yaml       # K8s 서비스 설정
│   └── k8s-secret.yaml    # K8s 시크릿 설정
│
├── logs/                   # 로그 파일들
│   └── server.log         # 서버 실행 로그
│
├── modules/                # 백엔드 모듈
│   └── unified_chatbot.py # 통합 챗봇 핵심 로직
│
├── scripts/                # 유틸리티 스크립트
│   ├── build_and_deploy.sh # K8s 빌드 및 배포 스크립트
│   ├── run_local.sh       # 로컬 실행 스크립트
│   ├── run_puppeteer.sh   # Puppeteer 서버 실행
│   └── test_chatbot.py    # 챗봇 테스트 스크립트
│
├── static/                 # 정적 파일들
│   ├── css/               
│   │   └── styles.css     # 스타일시트
│   ├── js/                
│   │   ├── app.js         # 메인 JavaScript
│   │   ├── chatbot.js     # 챗봇 UI 로직
│   │   ├── content-data.js # 콘텐츠 데이터 모듈
│   │   └── content-manager.js # 콘텐츠 관리자
│   └── img/               
│       └── README.md      # 이미지 디렉토리 설명
│
└── templates/              # HTML 템플릿
    └── ui.html            # 메인 UI 템플릿
```

## 주요 디렉토리 설명

### 1. `configs/`
- 애플리케이션 설정 및 배포 설정 파일들
- 환경별 설정 관리

### 2. `data/`
- 경제 용어 및 최신 콘텐츠 마크다운 파일들
- ChromaDB 벡터 데이터베이스 저장소

### 3. `k8s/`
- Kubernetes 배포를 위한 YAML 설정 파일들
- Secret, Deployment, Service 설정

### 4. `modules/`
- 핵심 비즈니스 로직 모듈
- 통합 챗봇 기능 구현

### 5. `scripts/`
- 개발 및 배포를 위한 유틸리티 스크립트
- 테스트 및 자동화 도구

## 파일 설명

### 핵심 파일
- `server.py`: Flask 웹 서버 및 API 엔드포인트
- `unified_chatbot.py`: AI 챗봇 핵심 로직 (RAG + Perplexity)
- `ui.html`: 사용자 인터페이스

### 설정 파일
- `.env`: 환경 변수 (API 키 등)
- `config.py`: 애플리케이션 설정
- `requirements.txt`: Python 의존성 목록

### 배포 파일
- `Dockerfile`: Docker 컨테이너 빌드 설정
- `deployment.yaml`: K8s 배포 설정
- `build_and_deploy.sh`: 자동 배포 스크립트