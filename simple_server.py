from flask import Flask, send_from_directory, jsonify, render_template, request, Response
import os
import logging
from pathlib import Path
import mimetypes
import json
import sys

# 기본 Flask 앱
app = Flask(__name__)

# stdout으로 로깅
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# MIME 타입 설정
mimetypes.add_type('text/markdown', '.md')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# 디렉토리 설정
ROOT_DIR = Path(__file__).parent
ECONOMY_TERMS_DIR = ROOT_DIR / "data" / "economy_terms"
RECENT_CONTENTS_DIR = ROOT_DIR / "data" / "recent_contents_final"

logger.info(f"ROOT_DIR: {ROOT_DIR}")
logger.info(f"ECONOMY_TERMS_DIR: {ECONOMY_TERMS_DIR}")
logger.info(f"RECENT_CONTENTS_DIR: {RECENT_CONTENTS_DIR}")

# 간단한 챗봇 응답 (테스트용)
def get_simple_response(question):
    return {
        "answer": f"테스트 응답입니다. 질문: {question}",
        "source_documents": [],
        "answer_type": "test"
    }

@app.route('/')
def serve_ui():
    """메인 UI 페이지 제공"""
    logger.info("메인 페이지 요청")
    return render_template('ui.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """챗봇 API 엔드포인트"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({"error": "질문이 필요합니다"}), 400
        
        question = data['question']
        logger.info(f"질문 수신: {question}")
        
        # 간단한 응답 반환
        response = get_simple_response(question)
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"채팅 처리 중 오류: {str(e)}")
        return jsonify({"error": f"서버 오류: {str(e)}"}), 500

@app.route('/health')
def health():
    """헬스체크 엔드포인트"""
    return jsonify({"status": "healthy"})

@app.route('/api/contents/economy-terms')
def get_economy_terms():
    """경제 용어 목록 반환"""
    try:
        terms = []
        if ECONOMY_TERMS_DIR.exists():
            for file_path in sorted(ECONOMY_TERMS_DIR.glob("*.md")):
                title = file_path.stem
                terms.append({
                    "id": file_path.stem,
                    "title": title,
                    "filename": file_path.name
                })
        return jsonify(terms)
    except Exception as e:
        logger.error(f"경제 용어 목록 로드 중 오류: {str(e)}")
        return jsonify([])

@app.route('/api/contents/recent-contents')
def get_recent_contents():
    """최근 콘텐츠 목록 반환"""
    try:
        contents = []
        if RECENT_CONTENTS_DIR.exists():
            for file_path in sorted(RECENT_CONTENTS_DIR.glob("*.md")):
                title = file_path.stem
                contents.append({
                    "id": file_path.stem,
                    "title": title,
                    "filename": file_path.name
                })
        return jsonify(contents)
    except Exception as e:
        logger.error(f"최근 콘텐츠 목록 로드 중 오류: {str(e)}")
        return jsonify([])

# 정적 파일 제공
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    logger.info("간단한 챗봇 서버 시작")
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)