#!/usr/bin/env python3
"""
경제용 챗봇 RAG 검색 데모
"""

import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.retrievers.bm25 import BM25Retriever
from langchain.schema.document import Document

# 디렉토리 설정
ROOT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
ECONOMY_TERMS_DIR = ROOT_DIR / "data" / "economy_terms"
RECENT_CONTENTS_DIR = ROOT_DIR / "data" / "recent_contents_final"

class EconomyRAGDemo:
    def __init__(self):
        self.docs = []
        self.retriever = None
        self.load_and_index()
    
    def load_and_index(self):
        """문서 로드 및 인덱싱"""
        print("📚 경제용 RAG 시스템 초기화 중...")
        
        # 문서 로드
        all_files = list(ECONOMY_TERMS_DIR.glob("*.md")) + list(RECENT_CONTENTS_DIR.glob("*.md"))
        
        for file_path in all_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                file_name = file_path.name
                title = file_name.replace(".md", "")
                source_type = "economy_terms" if str(ECONOMY_TERMS_DIR) in str(file_path) else "recent_contents"
                
                doc = Document(
                    page_content=content,
                    metadata={
                        "source": str(file_path),
                        "title": title,
                        "file_name": file_name,
                        "source_type": source_type
                    }
                )
                
                self.docs.append(doc)
                
            except Exception as e:
                print(f"⚠️ 파일 로드 오류: {file_path}")
        
        # 문서 분할
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=400,
            chunk_overlap=50,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        
        chunks = []
        for doc in self.docs:
            doc_chunks = text_splitter.create_documents(
                texts=[doc.page_content],
                metadatas=[doc.metadata]
            )
            chunks.extend(doc_chunks)
        
        # BM25 인덱스 생성
        self.retriever = BM25Retriever.from_documents(chunks, k=5)
        
        print(f"✅ 초기화 완료! 문서 {len(self.docs)}개, 청크 {len(chunks)}개")
    
    def search(self, query):
        """검색 실행"""
        if not self.retriever:
            return []
        
        try:
            docs = self.retriever.invoke(query)
            return docs
        except Exception as e:
            print(f"검색 오류: {str(e)}")
            return []
    
    def format_result(self, doc, rank):
        """검색 결과 포맷팅"""
        title = doc.metadata.get('title', 'N/A')
        source_type = doc.metadata.get('source_type', 'N/A')
        content = doc.page_content.strip().replace('\n', ' ')
        
        # 내용 미리보기 (200자 제한)
        if len(content) > 200:
            content = content[:200] + "..."
        
        type_emoji = "📊" if source_type == "economy_terms" else "📰"
        
        return f"""
{rank}. {type_emoji} {title}
   💭 {content}
   📁 출처: {source_type}
   ─────────────────────────────────────────────────"""

def interactive_demo():
    """대화형 검색 데모"""
    print("🤖 경제용 챗봇 RAG 검색 데모")
    print("=" * 60)
    
    # RAG 시스템 초기화
    rag = EconomyRAGDemo()
    
    print("\n💡 사용법:")
    print("- 경제 관련 질문을 입력하세요")
    print("- 'quit', 'exit', '종료'를 입력하면 종료됩니다")
    print("- 'help'를 입력하면 예시 질문을 볼 수 있습니다")
    
    # 예시 질문들
    example_queries = [
        "ETF가 뭐예요?",
        "금리와 주가의 관계",
        "비트코인 최근 동향",
        "투자 초보자를 위한 조언",
        "환율 변동이 투자에 미치는 영향",
        "배당주 투자 장점",
        "CMA 계좌란?",
        "국민연금 개혁 내용",
        "경기 순환과 투자 전략",
        "청년도약계좌 혜택"
    ]
    
    while True:
        print("\n" + "=" * 60)
        query = input("🔍 질문을 입력하세요: ").strip()
        
        if not query:
            continue
            
        if query.lower() in ['quit', 'exit', '종료']:
            print("👋 데모를 종료합니다.")
            break
            
        if query.lower() == 'help':
            print("\n💡 예시 질문들:")
            for i, example in enumerate(example_queries, 1):
                print(f"   {i}. {example}")
            continue
        
        print(f"\n🔍 '{query}' 검색 중...")
        
        # 검색 실행
        results = rag.search(query)
        
        if not results:
            print("❌ 검색 결과가 없습니다.")
            continue
        
        print(f"\n📋 검색 결과 ({len(results)}개):")
        print("=" * 60)
        
        # 결과 출력
        for i, doc in enumerate(results, 1):
            print(rag.format_result(doc, i))
        
        # 추가 정보
        economy_count = sum(1 for doc in results if doc.metadata.get('source_type') == 'economy_terms')
        recent_count = sum(1 for doc in results if doc.metadata.get('source_type') == 'recent_contents')
        
        print(f"\n📊 결과 분석:")
        print(f"   📊 경제 용어: {economy_count}개")
        print(f"   📰 최신 콘텐츠: {recent_count}개")

def main():
    """메인 함수"""
    try:
        interactive_demo()
    except KeyboardInterrupt:
        print("\n\n👋 사용자가 종료했습니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    main()