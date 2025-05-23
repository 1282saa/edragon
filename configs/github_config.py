# GitHub 저장소 설정
GITHUB_CONFIG = {
    "username": "your-username",  # GitHub 사용자명으로 변경하세요
    "repository": "economy-chatbot",  # 저장소 이름으로 변경하세요
    "branch": "main",  # 메인 브랜치명
    "base_url": "https://raw.githubusercontent.com"
}

def get_github_raw_url(file_path: str, source_type: str) -> str:
    """GitHub raw content URL 생성"""
    base_url = f"{GITHUB_CONFIG['base_url']}/{GITHUB_CONFIG['username']}/{GITHUB_CONFIG['repository']}/{GITHUB_CONFIG['branch']}"
    
    if source_type == "economy_terms":
        return f"{base_url}/data/economy_terms/{file_path}"
    elif source_type == "recent_contents_final":
        return f"{base_url}/data/recent_contents_final/{file_path}"
    else:
        return f"{base_url}/{file_path}"

def get_github_blob_url(file_path: str, source_type: str) -> str:
    """GitHub 파일 뷰어 URL 생성 (더 좋은 사용자 경험)"""
    base_url = f"https://github.com/{GITHUB_CONFIG['username']}/{GITHUB_CONFIG['repository']}/blob/{GITHUB_CONFIG['branch']}"
    
    if source_type == "economy_terms":
        return f"{base_url}/data/economy_terms/{file_path}"
    elif source_type == "recent_contents_final":
        return f"{base_url}/data/recent_contents_final/{file_path}"
    else:
        return f"{base_url}/{file_path}" 