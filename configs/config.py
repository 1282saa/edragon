import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev'
    DEBUG = os.environ.get('FLASK_ENV') == 'development'
    
    # API Keys
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    PERPLEXITY_API_KEY = os.environ.get('PERPLEXITY_API_KEY')
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    
    # Paths
    ECONOMY_TERMS_DIR = os.environ.get('ECONOMY_TERMS_DIR', './economy_terms')
    RECENT_CONTENTS_DIR = os.environ.get('RECENT_CONTENTS_DIR', './recent_contents_final')
    
    # Puppeteer Server (개발환경에서만)
    PUPPETEER_SERVER_URL = os.environ.get('PUPPETEER_SERVER_URL', 'http://localhost:3001')
    USE_PUPPETEER = os.environ.get('USE_PUPPETEER', 'false').lower() == 'true'