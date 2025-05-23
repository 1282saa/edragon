# 경제용 AI 챗봇

경제 용어와 최신 경제 콘텐츠를 AI 기반으로 검색하고 학습할 수 있는 웹 애플리케이션입니다.

## 🎯 주요 기능

1. **AI 기반 경제 질문 답변**: 경제 용어와 콘텐츠를 기반으로 질문에 답변하는 AI 챗봇
   - 내부 문서 검색 + 실시간 웹 검색을 통한 종합적인 답변
   - **자동 각주 기능**: 출처와 인용문 제공으로 신뢰성 있는 정보 전달
   - **클릭 가능한 링크**: [1], [2] 형태의 각주를 클릭하면 원본 문서로 이동
2. **경제 용어 사전**: 다양한 경제 용어에 대한 설명 제공
3. **최신 경제 콘텐츠**: 최신 경제 트렌드와 뉴스 제공
4. **서울경제 1면 언박싱**: 서울경제신문 1면 동영상 재생 (선택사항)

## 📋 새로운 각주 기능

챗봇이 답변할 때 참고한 자료들을 자동으로 각주로 표시합니다:

- **자동 각주 삽입**: 답변 텍스트에 [1], [2] 형태로 자동 삽입
- **클릭 가능한 링크**: 각주를 클릭하면 GitHub의 원본 문서로 이동
- **출처 구분**: 내부 문서와 웹 검색 결과를 명확히 구분하여 표시
- **인용 텍스트 미리보기**: 각주에서 실제 인용된 텍스트 일부를 미리 확인 가능

### 각주 예시

```
기준금리는 중앙은행이 설정하는 정책금리[1]로, 주가에 직접적인 영향을 미칩니다[2].

**참고 자료:**
[1] [기준금리와 주가의 관계](https://github.com/your-username/economy-chatbot/blob/main/data/economy_terms/기준금리와%20주가의%20관계_37.md) - "기준금리는 한국은행이 설정하는 정책금리로..."
[2] [최신 금리 동향](https://example.com/news) (웹 검색 결과)
```

## 🛠 기술 스택

- **프론트엔드**: HTML, TailwindCSS, JavaScript
- **백엔드**: Python 3.11, Flask
- **AI 및 검색**:
  - **벡터 데이터베이스**: ChromaDB
  - **임베딩**: OpenAI (text-embedding-3-small)
  - **언어 모델**: OpenAI GPT-4o-mini
  - **실시간 웹 검색**: Perplexity API
  - **프레임워크**: LangChain
  - **검색 기법**: 하이브리드 검색 (Vector + BM25)
- **비디오 자동재생**: Puppeteer (Node.js)

## 📁 디렉토리 구조

```
.
├── configs/          # 설정 파일
│   ├── config.py
│   ├── github_config.py  # GitHub 배포 설정
│   ├── nixpacks.toml
│   └── runtime.txt
├── data/            # 데이터 파일
│   ├── economy_terms/      # 경제 용어 문서 (50개)
│   ├── recent_contents_final/  # 최신 경제 콘텐츠
│   └── vector_db/         # 벡터 데이터베이스
├── modules/         # 챗봇 모듈
│   └── unified_chatbot.py  # 통합 챗봇 (각주 기능 포함)
├── static/          # 정적 파일
├── templates/       # HTML 템플릿
├── logs/            # 로그 파일
├── scripts/         # 실행 스크립트
├── server.py        # 메인 서버
├── requirements.txt # Python 의존성
└── README.md
```

## 🚀 GitHub 배포 가이드

### 1. 저장소 설정

1. **GitHub 저장소 생성**

   ```bash
   # 새 저장소 생성 후 클론
   git clone https://github.com/your-username/economy-chatbot.git
   cd economy-chatbot
   ```

2. **GitHub 설정 수정**
   ```python
   # configs/github_config.py 파일 수정
   GITHUB_CONFIG = {
       "username": "your-github-username",  # 실제 GitHub 사용자명
       "repository": "economy-chatbot",     # 실제 저장소 이름
       "branch": "main",
       "base_url": "https://raw.githubusercontent.com"
   }
   ```

### 2. 환경 변수 설정

1. **환경 변수 파일 생성**

   ```bash
   # .env 파일 생성 (GitHub에는 업로드하지 마세요)
   cp .env.example .env
   ```

2. **API 키 설정**
   ```bash
   # .env 파일에 다음 내용 추가
   OPENAI_API_KEY=your_openai_api_key_here
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   FLASK_SECRET_KEY=your_flask_secret_key_here
   ```

### 3. 로컬 테스트

```bash
# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python server.py

# 브라우저에서 http://localhost:5000 접속
```

### 4. GitHub Pages 배포 (정적 호스팅)

GitHub Pages는 정적 파일만 호스팅하므로, Flask 앱의 경우 다른 플랫폼을 사용하세요.

### 5. Render.com 배포 (추천)

1. **Render.com 계정 생성**
2. **GitHub 저장소 연결**
3. **배포 설정**:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
   - **Environment**: Python 3.11

### 6. Railway 배포

1. **Railway 계정 생성**
2. **GitHub 저장소 연결**
3. **환경 변수 설정** (Railway 대시보드에서)

### 7. Heroku 배포

```bash
# Heroku CLI 설치 후
heroku login
heroku create your-app-name
git push heroku main
```

## 💡 각주 기능 사용법

### 개발자용 설정

각주 기능은 자동으로 작동하지만, 필요한 경우 다음과 같이 설정할 수 있습니다:

1. **GitHub 링크 확인**: `configs/github_config.py`에서 올바른 저장소 정보 설정
2. **각주 스타일 수정**: `modules/unified_chatbot.py`의 `generate_citation_html` 메서드 수정
3. **각주 삽입 로직 조정**: `format_answer_with_citations` 메서드에서 로직 수정

### 사용자 경험

- 챗봇 답변에서 [1], [2] 등의 각주 번호를 클릭하면 GitHub의 원본 문서로 이동
- 각주 목록에서 인용된 텍스트의 미리보기 제공
- 내부 문서와 웹 검색 결과를 명확히 구분

## 🔧 로컬 개발

### 사전 요구사항

- Python 3.11 이상
- Node.js 16 이상 (비디오 자동재생 기능용)
- OpenAI API 키
- Perplexity API 키

### 설치 및 실행

1. **저장소 클론**

   ```bash
   git clone https://github.com/your-username/economy-chatbot.git
   cd economy-chatbot
   ```

2. **Python 가상환경 생성 및 활성화**

   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **의존성 설치**

   ```bash
   pip install -r requirements.txt
   ```

4. **Node.js 패키지 설치** (비디오 자동재생용)

   ```bash
   npm install
   ```

5. **환경 변수 설정**

   ```bash
   cp .env.example .env
   # .env 파일을 열어 API 키 설정
   ```

6. **서버 실행**

   ```bash
   # Python 서버
   python server.py

   # 별도 터미널에서 Puppeteer 서버 (선택사항)
   node puppeteer_server.js
   ```

7. **브라우저에서 http://localhost:5000 접속**

## 📦 Docker 사용

### Docker 빌드

```bash
docker build -t economy-chatbot .
```

### Docker 실행

```bash
docker run -p 8080:8080 --env-file .env economy-chatbot
```

## 🔗 관련 링크

- [OpenAI API](https://openai.com/api/)
- [Perplexity AI](https://www.perplexity.ai/)
- [LangChain Documentation](https://langchain.readthedocs.io/)
- [ChromaDB](https://www.trychroma.com/)

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

프로젝트 관련 문의사항이 있으시면 Issues를 통해 연락주세요.

---

**⚠️ 주의사항**:

- API 키는 절대 GitHub에 업로드하지 마세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다
- 각주 링크가 정상 작동하려면 `configs/github_config.py`에서 올바른 GitHub 정보를 설정해야 합니다
