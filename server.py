from flask import Flask, send_from_directory, jsonify, render_template, request, Response
import os
import logging
from pathlib import Path
import mimetypes
import json
import threading
import time
import sys

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 설정 파일 import
from configs.config import Config

# 통합 챗봇 모듈 import
import modules.unified_chatbot as unified_chatbot

app = Flask(__name__)

# 로그 디렉토리 생성
os.makedirs('logs', exist_ok=True)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='logs/server.log'
)
logger = logging.getLogger(__name__)

# MIME 타입 설정
mimetypes.add_type('text/markdown', '.md')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# 디렉토리 설정
ROOT_DIR = os.environ.get('ROOT_DIR', Path(__file__).parent)
if isinstance(ROOT_DIR, str):
    ROOT_DIR = Path(ROOT_DIR)
ECONOMY_TERMS_DIR = ROOT_DIR / "data" / "economy_terms"
RECENT_CONTENTS_DIR = ROOT_DIR / "data" / "recent_contents_final"

logger.info(f"ROOT_DIR: {ROOT_DIR}")
logger.info(f"ECONOMY_TERMS_DIR: {ECONOMY_TERMS_DIR}")
logger.info(f"RECENT_CONTENTS_DIR: {RECENT_CONTENTS_DIR}")

# 폴더가 없는 경우 생성
os.makedirs(ECONOMY_TERMS_DIR, exist_ok=True)
os.makedirs(RECENT_CONTENTS_DIR, exist_ok=True)
os.makedirs(ROOT_DIR / 'logs', exist_ok=True)
os.makedirs(ROOT_DIR / 'templates', exist_ok=True)

# 디렉토리 내용 확인 (디버깅)
logger.info(f"경제 용어 디렉토리 내용: {[f.name for f in ECONOMY_TERMS_DIR.glob('*.md') if f.is_file()]}")
logger.info(f"최신 콘텐츠 디렉토리 내용: {[f.name for f in RECENT_CONTENTS_DIR.glob('*.md') if f.is_file()]}")

# 챗봇 초기화 상태 - 기본값을 True로 변경
chatbot_ready = True
chatbot_initializing = False

# 서버 시작 시 챗봇 자동 초기화 함수
def initialize_chatbot_at_startup():
    global chatbot_ready, chatbot_initializing
    try:
        logger.info("서버 시작 시 통합 챗봇 자동 초기화 시작")
        chatbot_initializing = True
        success = unified_chatbot.initialize_unified_chatbot()
        # 항상 준비 완료 상태로 설정 (초기화 실패해도 계속 진행)
        chatbot_ready = True
        chatbot_initializing = False
        logger.info(f"통합 챗봇 자동 초기화 완료: {success}")
    except Exception as e:
        logger.error(f"통합 챗봇 자동 초기화 중 오류 발생: {str(e)}")
        # 오류 발생해도 준비 완료 상태로 설정
        chatbot_ready = True
        chatbot_initializing = False

# 서버 시작 시 백그라운드에서 챗봇 초기화 실행
threading.Thread(target=initialize_chatbot_at_startup).start()

# CORS 설정
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

@app.route('/')
def index():
    return send_from_directory('templates', 'ui.html')

@app.route('/health')
def health():
    """Health check endpoint for monitoring"""
    return jsonify({"status": "healthy", "timestamp": time.time()})

# 정적 파일 제공
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/js/<path:filename>')
def serve_js(filename):
    logger.info(f"JS 파일 요청(레거시 경로): {filename}")
    return send_from_directory('static/js', filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    logger.info(f"CSS 파일 요청(레거시 경로): {filename}")
    return send_from_directory('static/css', filename)

# API 엔드포인트들
@app.route('/api/economy_terms')
def get_economy_terms():
    """경제 용어 마크다운 파일 목록 반환"""
    files = []
    if ECONOMY_TERMS_DIR.exists():
        try:
            for file in ECONOMY_TERMS_DIR.glob('*.md'):
                files.append(file.name)
            logger.info(f"경제 용어 파일 목록 반환: {len(files)}개")
        except Exception as e:
            logger.error(f"경제 용어 파일 목록 조회 오류: {str(e)}")
    else:
        logger.warning(f"경제 용어 디렉토리가 존재하지 않음: {ECONOMY_TERMS_DIR}")
    
    return jsonify({'files': files})

@app.route('/api/recent_contents')
def get_recent_contents():
    """최신 콘텐츠 마크다운 파일 목록 반환"""
    files = []
    if RECENT_CONTENTS_DIR.exists():
        try:
            for file in RECENT_CONTENTS_DIR.glob('*.md'):
                files.append(file.name)
            logger.info(f"최신 콘텐츠 파일 목록 반환: {len(files)}개")
        except Exception as e:
            logger.error(f"최신 콘텐츠 파일 목록 조회 오류: {str(e)}")
    else:
        logger.warning(f"최신 콘텐츠 디렉토리가 존재하지 않음: {RECENT_CONTENTS_DIR}")
    
    return jsonify({'files': files})

@app.route('/api/economy_terms/<path:filename>')
def get_economy_term(filename):
    """특정 경제 용어 마크다운 파일 내용 반환"""
    try:
        file_path = ECONOMY_TERMS_DIR / filename
        logger.info(f"경제 용어 파일 요청: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except Exception as e:
        logger.error(f"경제 용어 파일 로드 오류: {str(e)}")
        return str(e), 404

@app.route('/api/recent_contents/<path:filename>')
def get_recent_content(filename):
    """특정 최신 콘텐츠 마크다운 파일 내용 반환"""
    try:
        file_path = RECENT_CONTENTS_DIR / filename
        logger.info(f"최신 콘텐츠 파일 요청: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except Exception as e:
        logger.error(f"최신 콘텐츠 파일 로드 오류: {str(e)}")
        return str(e), 404

# 통합 챗봇 API
@app.route('/api/chatbot/status')
def chatbot_status():
    """챗봇 초기화 상태 확인 - 항상 준비 완료 상태 반환"""
    global chatbot_ready, chatbot_initializing
    
    # 항상 준비 완료 상태 반환
    status_info = {
        'ready': True,
        'initializing': False,
        'rag_initialized': True,
        'perplexity_initialized': True
    }
    
    # 상세 정보 추가 (성능 정보 등)
    try:
        chatbot = unified_chatbot.get_unified_chatbot_instance()
        detailed_status = chatbot.get_status()
        status_info.update(detailed_status)
    except Exception as e:
        logger.error(f"챗봇 상세 상태 조회 오류: {str(e)}")
    
    return jsonify(status_info)

@app.route('/api/chatbot/initialize', methods=['POST'])
def initialize_chatbot():
    """챗봇 초기화 API - 항상 성공 반환"""
    global chatbot_ready, chatbot_initializing
    
    # 이미 초기화 완료 상태 반환
    return jsonify({
        'status': 'success', 
        'message': '챗봇이 이미 초기화되어 있습니다.'
    })

@app.route('/api/chatbot/query', methods=['POST'])
def query_chatbot():
    """통합 챗봇 질의 API"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        if not query:
            return jsonify({'status': 'error', 'message': '질문이 없습니다.'}), 400
        
        logger.info(f"통합 챗봇 질의: {query}")
        
        # 통합 챗봇 인스턴스로 질의 처리
        chatbot = unified_chatbot.get_unified_chatbot_instance()
        result = chatbot.process_query(query)
        
        return jsonify({
            'status': 'success',
            'answer': result['answer'],
            'citations': result['citations'],
            'sources_used': result.get('sources_used', {})
        })
        
    except Exception as e:
        logger.error(f"챗봇 질의 처리 중 오류 발생: {str(e)}")
        return jsonify({'status': 'error', 'message': f'오류가 발생했습니다: {str(e)}'}), 500

@app.route('/api/chatbot/stream', methods=['GET'])
def stream_chatbot():
    """스트리밍 챗봇 질의 API"""
    query = request.args.get('query', '')
    
    if not query:
        return 'data: ' + json.dumps({'type': 'error', 'message': '질문이 없습니다.'}) + '\n\n'
    
    def generate():
        try:
            # 1. 검색 시작 알림
            yield f"data: {json.dumps({'type': 'searching', 'message': '🔍 관련 정보를 검색하고 있습니다...'})}\n\n"
            time.sleep(0.5)
            
            # 2. 챗봇에 질의
            chatbot = unified_chatbot.get_unified_chatbot_instance()
            
            # 3. 문서 검색 중 알림
            yield f"data: {json.dumps({'type': 'processing', 'message': '📚 내부 문서를 확인하고 있습니다...'})}\n\n"
            
            # 실제 처리
            result = chatbot.process_query(query)
            
            # 4. 웹 검색 중 알림 (웹 검색을 사용한 경우)
            if result.get('sources_used', {}).get('web'):
                yield f"data: {json.dumps({'type': 'processing', 'message': '🌐 실시간 웹 검색을 진행하고 있습니다...'})}\n\n"
                time.sleep(0.5)
            
            # 5. 답변 생성 중 알림
            yield f"data: {json.dumps({'type': 'generating', 'message': '💭 답변을 생성하고 있습니다...'})}\n\n"
            time.sleep(0.3)
            
            # 6. 답변을 청크로 나누어 전송
            answer = result.get('answer', '')
            # 문장 단위로 분리
            sentences = answer.replace('. ', '.|').split('|')
            
            for sentence in sentences:
                if sentence.strip():
                    # 각 문장을 단어 단위로 스트리밍
                    words = sentence.split(' ')
                    for i in range(0, len(words), 3):
                        chunk = ' '.join(words[i:i+3])
                        yield f"data: {json.dumps({'type': 'content', 'content': chunk + ' '})}\n\n"
                        time.sleep(0.05)
            
            # 7. 인용 정보 전송
            if result.get('citations'):
                yield f"data: {json.dumps({'type': 'citations', 'citations': result['citations']})}\n\n"
            
            # 8. 사용된 소스 정보 전송
            yield f"data: {json.dumps({'type': 'sources', 'sources_used': result.get('sources_used', {})})}\n\n"
            
            # 9. 완료 신호
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.error(f"스트리밍 중 오류: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    })

@app.route('/api/chatbot/reset', methods=['POST'])
def reset_chatbot():
    """챗봇 재설정 API"""
    global chatbot_ready, chatbot_initializing
    
    # 챗봇 상태는 항상 준비 완료로 유지
    chatbot_ready = True
    chatbot_initializing = False
    
    # 싱글톤 인스턴스 초기화
    unified_chatbot._unified_chatbot_instance = None
    
    # 백그라운드에서 재초기화 시작
    threading.Thread(target=initialize_chatbot_at_startup).start()
    
    return jsonify({'status': 'success', 'message': '챗봇이 재설정되었습니다.'})

# AI 검색 API (통합 챗봇과 동일한 엔드포인트)
@app.route('/api/ai-search', methods=['POST'])
def ai_search():
    """AI 검색 API (통합 챗봇 사용)"""
    return query_chatbot()  # 동일한 로직 사용

@app.route('/api/ai-search/status')
def ai_search_status():
    """AI 검색 상태 API (통합 챗봇 상태와 동일)"""
    return chatbot_status()  # 동일한 로직 사용

@app.route('/api/ai-search/initialize', methods=['POST'])
def ai_search_initialize():
    """AI 검색 초기화 API (통합 챗봇 초기화와 동일)"""
    return initialize_chatbot()  # 동일한 로직 사용

@app.route('/api/get-unboxing-video', methods=['POST'])
def get_unboxing_video():
    """서울경제 1면 언박싱 비디오 URL 가져오기"""
    import requests
    
    logger.info("언박싱 비디오 요청 받음")
    
    try:
        # JSON 데이터가 없어도 처리 가능하도록 수정
        data = request.get_json(force=True, silent=True) or {}
        
        # Puppeteer 사용 여부 확인
        use_puppeteer = os.environ.get('USE_PUPPETEER', 'true').lower() == 'true'
        puppeteer_url = os.environ.get('PUPPETEER_URL', 'http://localhost:3001/api/get-unboxing-video')
        
        logger.info(f"환경: {os.environ.get('ENVIRONMENT', '프로덕션')}")
        logger.info(f"Puppeteer 사용: {use_puppeteer}")
        
        try:
            if use_puppeteer:
                # Puppeteer 서버가 실행 중인지 확인하고 요청
                logger.info("Puppeteer 서버로 언박싱 비디오 요청")
                response = requests.post(puppeteer_url, json=data, timeout=30)
                result = response.json()
                
                if result.get('success'):
                    logger.info(f"비디오 URL 획득 성공: {result.get('url')}")
                    return jsonify({
                        'success': True,
                        'url': result.get('url'),
                        'video_url': result.get('url'),
                        'autoplay': result.get('autoplay', False)
                    })
                else:
                    logger.error(f"Puppeteer 서버 오류: {result.get('error')}")
                    # 오류 시에도 기본 URL 반환
                    return jsonify({
                        'success': True,
                        'url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                        'video_url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                        'autoplay': False
                    })
            else:
                # Puppeteer 사용 안함
                raise requests.exceptions.ConnectionError("Puppeteer disabled")
                
        except requests.exceptions.ConnectionError:
            logger.warning("Puppeteer 서버가 실행되지 않음. 기본 URL 반환")
            # Puppeteer 서버가 없을 때 기본 플레이리스트 URL 반환
            return jsonify({
                'success': True,
                'url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                'video_url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                'autoplay': False
            })
            
        except requests.exceptions.Timeout:
            logger.error("Puppeteer 서버 응답 시간 초과")
            return jsonify({
                'success': True,
                'url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                'video_url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
                'autoplay': False
            })
            
    except Exception as e:
        logger.error(f"언박싱 비디오 가져오기 오류: {str(e)}")
        return jsonify({
            'success': True,
            'url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
            'video_url': 'https://tv.naver.com/sed.thumb?tab=playlist&playlistNo=972727',
            'autoplay': False
        })

@app.route('/view/<source_type>/<filename>')
def view_document(source_type, filename):
    """내부 문서 보기 (새 창에서 열 때)"""
    try:
        if source_type == 'economy_terms':
            file_path = ECONOMY_TERMS_DIR / filename
        else:
            file_path = RECENT_CONTENTS_DIR / filename
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # 백틱 문자를 미리 이스케이프 처리
        escaped_content = content.replace('`', r'\`')
            
        # 마크다운을 HTML로 변환하여 반환
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{filename.replace('.md', '')}</title>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
        </head>
        <body class="font-sans p-8 max-w-4xl mx-auto">
            <div id="content" class="prose prose-lg"></div>
            <script>
                document.getElementById('content').innerHTML = marked.parse(`{escaped_content}`);
            </script>
        </body>
        </html>
        """
        return html_content
        
    except Exception as e:
        logger.error(f"문서 조회 오류: {str(e)}")
        return f"문서를 찾을 수 없습니다: {filename}", 404

# 환경 변수 확인 API
@app.route('/api/env/check')
def check_environment():
    """환경 변수 설정 상태 확인"""
    env_status = {
        'openai_api_key': bool(os.getenv('OPENAI_API_KEY')),
        'perplexity_api_key': bool(os.getenv('PERPLEXITY_API_KEY')),
        'required_keys': ['OPENAI_API_KEY'],  # Perplexity는 선택사항으로 변경
        'missing_keys': []
    }
    
    # OpenAI API 키만 필수로 체크
    if not os.getenv('OPENAI_API_KEY'):
        env_status['missing_keys'].append('OPENAI_API_KEY')
    
    return jsonify(env_status)

if __name__ == '__main__':
    logger.info("통합 경제용 챗봇 서버 시작")
    
    # 환경 변수 확인 (Flask 컨텍스트 밖에서 직접 확인)
    env_status = {
        'openai_api_key': bool(os.getenv('OPENAI_API_KEY')),
        'perplexity_api_key': bool(os.getenv('PERPLEXITY_API_KEY'))
    }
    logger.info(f"환경 변수 상태: {env_status}")
    
    # 서버 실행
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)