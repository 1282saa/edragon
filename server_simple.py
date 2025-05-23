from flask import Flask, jsonify
import os
import logging

app = Flask(__name__)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/')
def index():
    return jsonify({
        "status": "running",
        "message": "Dragon Chatbot Server is running!",
        "port": os.environ.get('PORT', 8080)
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

@app.route('/test')
def test():
    env_vars = {
        'PORT': os.environ.get('PORT'),
        'OPENAI_API_KEY': bool(os.environ.get('OPENAI_API_KEY')),
        'PERPLEXITY_API_KEY': bool(os.environ.get('PERPLEXITY_API_KEY'))
    }
    return jsonify(env_vars)

if __name__ == '__main__':
    logger.info("Simple Dragon Server Starting...")
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False) 