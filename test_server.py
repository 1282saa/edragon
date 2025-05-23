from flask import Flask, jsonify
import os
import sys

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        "status": "ok",
        "message": "Test server is running",
        "python_version": sys.version,
        "env_vars": {
            "OPENAI_API_KEY": bool(os.getenv("OPENAI_API_KEY")),
            "PORT": os.getenv("PORT", "8080")
        }
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)