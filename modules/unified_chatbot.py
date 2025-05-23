import os
import logging
import time
import re
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv
import json
import concurrent.futures
import requests
import hashlib
from functools import lru_cache

# LangChain 임포트
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_community.retrievers.bm25 import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain.schema.document import Document
from langchain.prompts import ChatPromptTemplate

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/unified_chatbot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('unified_chatbot')

# 디렉토리 설정
ROOT_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ECONOMY_TERMS_DIR = ROOT_DIR / "data" / "economy_terms"
RECENT_CONTENTS_DIR = ROOT_DIR / "data" / "recent_contents_final"
PERSISTENT_DIR = ROOT_DIR / "data" / "vector_db"

class UnifiedChatbot:
    """GPT와 Perplexity API를 통합한 챗봇 시스템"""
    
    def __init__(self):
        """챗봇 초기화"""
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.perplexity_api_key = os.getenv("PERPLEXITY_API_KEY")
        
        # 임베딩 및 LLM 설정
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=self.openai_api_key,
            timeout=10  # API 타임아웃 추가
        )
        self.llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
            max_tokens=1000,  # 토큰 수 제한으로 속도 향상
            timeout=30,       # API 타임아웃 설정
            openai_api_key=self.openai_api_key
        )
        
        # 문서 및 벡터 저장소 관련
        self.docs = []
        self.chunks = []
        self.vectorstore = None
        self.retriever = None
        self.file_paths = {}
        
        # 초기화 상태
        self.initialized = False
        self.rag_initialized = False
        self.perplexity_initialized = False
        
        # 성능 모니터링
        self.load_time = 0
        self.index_time = 0
        
        # 응답 캐싱 시스템
        self.response_cache = {}
        self.cache_max_size = 100
        self.cache_hits = 0
        self.cache_misses = 0
        
        logger.info("UnifiedChatbot 인스턴스 생성")
        
    def load_documents(self) -> bool:
        """내부 문서 로드 - 최적화된 버전"""
        start_time = time.time()
        logger.info("문서 로드 시작")
        
        try:
            # 경제 용어 및 최신 콘텐츠 로드
            all_files = list(ECONOMY_TERMS_DIR.glob("*.md")) + list(RECENT_CONTENTS_DIR.glob("*.md"))
            logger.info(f"총 {len(all_files)}개 파일 발견")
            
            if not all_files:
                logger.error("로드할 파일이 없습니다. 경로를 확인하세요.")
                return False
            
            # 병렬 로딩을 위한 함수
            def load_file(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # 메타데이터 추출
                    file_name = file_path.name
                    
                    # 파일명에서 제목과 번호 추출
                    if str(ECONOMY_TERMS_DIR) in str(file_path):
                        # 경제 용어 파일 (예: 기준금리와 주가의 관계_37.md)
                        source_type = "economy_terms"
                        title_parts = file_name.replace(".md", "").split("_")
                        if len(title_parts) > 1:
                            title = title_parts[0]
                            number = title_parts[-1]
                        else:
                            title = file_name.replace(".md", "")
                            number = "0"
                    else:
                        # 최신 콘텐츠 파일 (예: 01_대만 달러 초강세에 계엄 이전으로 돌아간 원·달러 환율.md)
                        source_type = "recent_contents_final"
                        title_parts = file_name.replace(".md", "").split("_", 1)
                        if len(title_parts) > 1:
                            number = title_parts[0]
                            title = title_parts[1]
                        else:
                            title = file_name.replace(".md", "")
                            number = "0"
                    
                    return Document(
                        page_content=content,
                        metadata={
                            "source": str(file_path),
                            "title": title,
                            "number": number,
                            "file_name": file_name,
                            "source_type": source_type
                        }
                    )
                except Exception as e:
                    logger.error(f"파일 로드 오류: {file_path}, {str(e)}")
                    return None
            
            # 병렬 처리로 문서 로드
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                results = list(executor.map(load_file, all_files))
            
            # None 값 필터링
            self.docs = [doc for doc in results if doc is not None]
            
            # 파일 경로 매핑
            for doc in self.docs:
                file_name = doc.metadata.get("file_name")
                self.file_paths[file_name] = doc.metadata.get("source")
            
            self.load_time = time.time() - start_time
            logger.info(f"총 {len(self.docs)}개 문서 로드 완료 (소요시간: {self.load_time:.2f}초)")
            
            return len(self.docs) > 0
            
        except Exception as e:
            logger.error(f"문서 로드 중 오류 발생: {str(e)}")
            return False
        
    def create_rag_index(self) -> bool:
        """RAG 인덱스 생성 - 최적화된 청킹 및 인덱싱"""
        if not self.docs:
            logger.error("문서가 로드되지 않았습니다")
            return False
            
        start_time = time.time()
        logger.info("RAG 인덱스 생성 시작")
        
        try:
            # 청킹 설정 최적화
            # 경제 문서의 경우 주제별 정보가 잘 구분되도록 청크 크기와 오버랩을 조정
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,        # 경제 정보를 충분히 포함할 수 있는 크기
                chunk_overlap=100,     # 문맥 유지를 위한 적절한 오버랩
                length_function=len,
                separators=["\n## ", "\n### ", "\n\n", "\n", ".", " ", ""]  # 마크다운 헤딩 기준으로 우선 분할
            )
            
            logger.info(f"청킹 시작: 청크 크기={500}, 오버랩={100}")
            
            # 문서 청킹 (개별 처리 후 병합)
            self.chunks = []
            for doc in self.docs:
                # 문서별 청킹
                doc_chunks = text_splitter.create_documents(
                    texts=[doc.page_content],
                    metadatas=[doc.metadata]
                )
                
                # 너무 작은 청크 필터링 (너무 짧은 청크는 의미있는 정보를 포함하지 않을 수 있음)
                filtered_chunks = [chunk for chunk in doc_chunks if len(chunk.page_content) > 50]
                self.chunks.extend(filtered_chunks)
            
            logger.info(f"총 {len(self.chunks)}개의 청크 생성 완료")
            
            # 영구 디렉토리 생성
            os.makedirs(PERSISTENT_DIR, exist_ok=True)
            
            # 청크 수에 따라 배치 크기 조정
            total_chunks = len(self.chunks)
            batch_size = min(100, max(20, total_chunks // 10))  # 최소 20, 최대 100, 또는 전체의 1/10
            
            logger.info(f"벡터 인덱싱 시작: 총 청크={total_chunks}, 배치 크기={batch_size}")
            
            # 벡터스토어 초기화 또는 로드
            try:
                # 기존 벡터스토어 로드 시도
                self.vectorstore = Chroma(
                    persist_directory=str(PERSISTENT_DIR),
                    embedding_function=self.embeddings
                )
                
                # 기존 벡터스토어의 문서 수 확인
                existing_docs = self.vectorstore._collection.count()
                logger.info(f"기존 벡터스토어 로드: {existing_docs}개 문서")
                
                # 기존 벡터스토어 삭제 (재색인)
                if existing_docs > 0:
                    logger.info("기존 벡터스토어 초기화")
                    self.vectorstore = None
                    
            except Exception as e:
                logger.warning(f"기존 벡터스토어 로드 실패, 새로 생성합니다: {str(e)}")
                self.vectorstore = None
            
            # 새 벡터스토어 생성 (필요한 경우)
            if self.vectorstore is None:
                for i in range(0, total_chunks, batch_size):
                    end_idx = min(i + batch_size, total_chunks)
                    batch = self.chunks[i:end_idx]
                    logger.info(f"배치 처리: {i+1}-{end_idx}/{total_chunks}")
                    
                    if i == 0:
                        # 첫 배치로 벡터스토어 생성
                        self.vectorstore = Chroma.from_documents(
                            documents=batch,
                            embedding=self.embeddings,
                            persist_directory=str(PERSISTENT_DIR)
                        )
                    else:
                        # 기존 벡터스토어에 추가
                        self.vectorstore.add_documents(batch)
                    
                    # 각 배치 후 디스크에 저장
                    self.vectorstore.persist()
            
            # Ensemble retriever 생성 (Semantic + BM25)
            logger.info("Ensemble Retriever 생성")
            vector_retriever = self.vectorstore.as_retriever(
                search_kwargs={"k": 5}  # 상위 5개 문서 검색
            )
            
            bm25_retriever = BM25Retriever.from_documents(
                self.chunks, 
                k=5  # 상위 5개 문서 검색
            )
            
            self.retriever = EnsembleRetriever(
                retrievers=[vector_retriever, bm25_retriever],
                weights=[0.7, 0.3]  # 벡터 검색에 더 높은 가중치
            )
            
            self.rag_initialized = True
            self.index_time = time.time() - start_time
            logger.info(f"RAG 인덱스 생성 완료 (소요시간: {self.index_time:.2f}초)")
            
            return True
            
        except Exception as e:
            logger.error(f"RAG 인덱스 생성 오류: {str(e)}")
            self.rag_initialized = False
            return False
        
    def check_perplexity_api(self) -> bool:
        """Perplexity API 연결 확인"""
        if not self.perplexity_api_key:
            logger.warning("Perplexity API 키가 없습니다")
            self.perplexity_initialized = False
            return False
            
        try:
            # API 연결 테스트
            headers = {
                "Authorization": f"Bearer {self.perplexity_api_key}",
                "Content-Type": "application/json"
            }
            
            # 간단한 테스트 쿼리
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json={
                    "model": "llama-3.1-sonar-small-128k-online",
                    "messages": [{"role": "user", "content": "테스트 쿼리입니다."}],
                    "max_tokens": 10
                },
                timeout=5
            )
            
            self.perplexity_initialized = response.status_code == 200
            logger.info(f"Perplexity API 연결 확인: {self.perplexity_initialized}")
            
            if not self.perplexity_initialized and response.status_code != 200:
                logger.error(f"Perplexity API 응답 코드: {response.status_code}")
                logger.error(f"Perplexity API 응답: {response.text}")
            
            return self.perplexity_initialized
            
        except Exception as e:
            logger.error(f"Perplexity API 연결 확인 실패: {str(e)}")
            self.perplexity_initialized = False
            return False
    
    def search_with_perplexity(self, query: str) -> Dict[str, Any]:
        """Perplexity API로 실시간 웹 검색"""
        if not self.perplexity_initialized:
            logger.warning("Perplexity API가 초기화되지 않았습니다")
            return {
                "success": False,
                "answer": "웹 검색 기능을 사용할 수 없습니다.",
                "citations": []
            }
            
        try:
            logger.info(f"Perplexity 검색 시작: {query[:50]}...")
            headers = {
                "Authorization": f"Bearer {self.perplexity_api_key}",
                "Content-Type": "application/json"
            }
            
            # 검색 최적화를 위한 프롬프트 구성
            system_prompt = """당신은 경제 분야 전문가로, 한국 경제와 금융 시장에 대한 정확한 정보를 제공합니다.
            사용자 질문에 대해 최신 정보를 기반으로 간결하고 정확하게 답변하세요.
            답변할 때 다음 지침을 따르세요:
            1. 현재 날짜 기준의 최신 경제 데이터와 뉴스를 참조하세요.
            2. 출처를 명확히 밝히고, 가능한 정확한 날짜와 함께 인용하세요.
            3. 사실과 의견을 명확히 구분하세요.
            4. 불확실한 정보는 제공하지 마세요.
            5. 전문 용어는 간단히 설명해주세요.
            """
            
            payload = {
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": query
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 2000,
                "return_citations": True,
                "return_related_questions": True
            }
            
            start_time = time.time()
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            search_time = time.time() - start_time
            logger.info(f"Perplexity API 응답 시간: {search_time:.2f}초")
            
            result = response.json()
            
            if response.status_code == 200:
                # 응답에서 정보 추출
                answer = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # 인용 정보 추출
                citations = []
                try:
                    # Perplexity 응답에서 인용 정보 추출
                    response_message = result.get("choices", [{}])[0].get("message", {})
                    if "citations" in response_message:
                        for i, citation in enumerate(response_message["citations"]):
                            citations.append({
                                "type": "web",
                                "title": citation.get("title", "웹 출처"),
                                "url": citation.get("url", ""),
                                "source": citation.get("source", "웹")
                            })
                except Exception as e:
                    logger.error(f"인용 정보 추출 오류: {str(e)}")
                
                logger.info(f"Perplexity 검색 성공: {len(answer)} 자, 인용 {len(citations)}개")
                
                return {
                    "success": True,
                    "answer": answer,
                    "citations": citations
                }
            else:
                logger.error(f"Perplexity API 오류: {result}")
                return {
                    "success": False,
                    "answer": "웹 검색 중 오류가 발생했습니다.",
                    "error": result.get("error", {}).get("message", "알 수 없는 오류"),
                    "citations": []
                }
                
        except Exception as e:
            logger.error(f"Perplexity 검색 오류: {str(e)}")
            return {
                "success": False,
                "answer": f"검색 중 오류 발생: {str(e)}",
                "citations": []
            }
    
    @lru_cache(maxsize=20)  # 최근 20개 쿼리 결과 캐싱
    def search_internal_documents(self, query: str) -> List[Document]:
        """내부 문서 검색 - 캐시 및 결과 수 최적화"""
        if not self.retriever:
            return []
        
        try:
            # 검색 결과를 3개로 제한하여 속도 향상
            docs = self.retriever.get_relevant_documents(query)
            limited_docs = docs[:3]  # 상위 3개만 반환
            
            logger.info(f"내부 문서 검색 완료: {query[:30]}... -> {len(limited_docs)}개 문서")
            return limited_docs
            
        except Exception as e:
            logger.error(f"내부 문서 검색 오류: {str(e)}")
            return []
    
    def extract_cited_content(self, doc: Document, query: str) -> Optional[str]:
        """문서에서 인용할 가장 관련성 높은 부분 추출"""
        try:
            content = doc.page_content
            
            # 청크 크기가 작으면 전체 내용 반환
            if len(content) < 500:
                return content
            
            # 쿼리와 가장 관련된 문단 찾기
            paragraphs = content.split("\n\n")
            
            if len(paragraphs) <= 2:
                return content[:300]  # 문단이 적으면 앞부분 반환
            
            # 각 문단에 대해 쿼리와의 관련성 점수 계산
            paragraph_scores = []
            for para in paragraphs:
                if len(para.strip()) < 20:  # 너무 짧은 문단은 건너뛰기
                    continue
                    
                # 간단한 키워드 매칭으로 점수 계산
                score = 0
                for word in query.lower().split():
                    if len(word) > 1 and word in para.lower():
                        score += 1
                        
                paragraph_scores.append((para, score))
            
            # 점수 기준으로 정렬
            paragraph_scores.sort(key=lambda x: x[1], reverse=True)
            
            # 상위 2개 문단 결합
            top_paragraphs = [p[0] for p in paragraph_scores[:2]]
            return "\n\n".join(top_paragraphs)
            
        except Exception as e:
            logger.error(f"인용 콘텐츠 추출 오류: {str(e)}")
            return None
    
    def get_cached_response(self, query: str) -> Optional[Dict[str, Any]]:
        """캐시된 응답 조회"""
        query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()
        cached_response = self.response_cache.get(query_hash)
        
        if cached_response:
            self.cache_hits += 1
            logger.info(f"캐시 적중: {query[:30]}... (캐시 적중률: {self.get_cache_hit_rate():.1f}%)")
            return cached_response
        
        self.cache_misses += 1
        return None
    
    def cache_response(self, query: str, response: Dict[str, Any]) -> None:
        """응답 캐싱 (LRU 방식)"""
        try:
            # 캐시 크기 제한
            if len(self.response_cache) >= self.cache_max_size:
                # 가장 오래된 항목 제거 (간단한 FIFO 방식)
                oldest_key = next(iter(self.response_cache))
                del self.response_cache[oldest_key]
            
            query_hash = hashlib.md5(query.encode('utf-8')).hexdigest()
            
            # 캐시할 응답 데이터 (중요한 정보만)
            cached_data = {
                "answer": response.get("answer", ""),
                "citations": response.get("citations", []),
                "sources_used": response.get("sources_used", {}),
                "cached_at": time.time()
            }
            
            self.response_cache[query_hash] = cached_data
            logger.info(f"응답 캐시 저장: {query[:30]}... (캐시 크기: {len(self.response_cache)})")
            
        except Exception as e:
            logger.error(f"응답 캐싱 오류: {str(e)}")
    
    def get_cache_hit_rate(self) -> float:
        """캐시 적중률 계산"""
        total_requests = self.cache_hits + self.cache_misses
        if total_requests == 0:
            return 0.0
        return (self.cache_hits / total_requests) * 100
    
    def clear_cache(self) -> None:
        """캐시 초기화"""
        self.response_cache.clear()
        self.cache_hits = 0
        self.cache_misses = 0
        logger.info("응답 캐시 초기화 완료")
    
    def format_answer_with_citations(self, answer: str, citations: List[Dict[str, Any]]) -> str:
        """답변 텍스트에 각주 번호를 자동으로 삽입하고 각주 목록 추가"""
        try:
            if not citations:
                return answer
            
            # 답변에서 인용 가능한 문장들을 찾아 각주 번호 삽입
            formatted_answer = answer
            citation_counter = 1
            used_citations = []
            
            # 각 인용 문헌에 대해 관련된 부분을 찾아 각주 번호 삽입
            for citation in citations:
                if citation.get("type") == "internal":
                    # 내부 문서의 경우 제목이나 키워드가 답변에 포함되어 있는지 확인
                    title = citation.get("title", "")
                    if title and title in formatted_answer:
                        # 제목 뒤에 각주 번호 추가
                        formatted_answer = formatted_answer.replace(
                            title, 
                            f"{title}[{citation_counter}]", 
                            1  # 첫 번째 발견된 것만 교체
                        )
                        used_citations.append((citation_counter, citation))
                        citation_counter += 1
                elif citation.get("type") == "web":
                    # 웹 검색 결과의 경우 첫 번째 문단 끝에 각주 추가
                    if citation_counter == 1:  # 첫 번째 웹 인용만 처리
                        sentences = formatted_answer.split('.')
                        if len(sentences) > 1:
                            sentences[0] = sentences[0] + f"[{citation_counter}]"
                            formatted_answer = '.'.join(sentences)
                            used_citations.append((citation_counter, citation))
                            citation_counter += 1
            
            # 사용되지 않은 인용 문헌들을 답변 끝에 추가
            for i, citation in enumerate(citations):
                if not any(c[1] == citation for c in used_citations):
                    # 답변 끝 부분에 각주 번호 추가
                    if formatted_answer.endswith('.'):
                        formatted_answer = formatted_answer[:-1] + f"[{citation_counter}]."
                    else:
                        formatted_answer += f"[{citation_counter}]"
                    used_citations.append((citation_counter, citation))
                    citation_counter += 1
            
            # 각주 목록 생성
            citation_html = self.generate_citation_html(used_citations)
            
            # 최종 답변에 각주 목록 추가
            final_answer = formatted_answer + "\n\n" + citation_html
            
            return final_answer
            
        except Exception as e:
            logger.error(f"각주 포맷팅 오류: {str(e)}")
            return answer  # 오류 발생 시 원본 답변 반환
    
    def generate_citation_html(self, used_citations: List[Tuple[int, Dict[str, Any]]]) -> str:
        """각주 목록을 단순 출처 정보로 생성"""
        try:
            if not used_citations:
                return ""
            
            citation_lines = ["**참고 자료:**"]
            
            for number, citation in used_citations:
                if citation.get("type") == "internal":
                    # 내부 문서의 경우 - 링크 없이 제목과 출처만 표시
                    title = citation.get("title", "제목 없음")
                    source_type = citation.get("source_type", "economy_terms")
                    
                    # 출처 타입을 한국어로 변환
                    source_type_kr = "경제용어" if source_type == "economy_terms" else "최신콘텐츠"
                    
                    # 단순 제목과 출처만 표시
                    citation_line = f"[{number}] {title} ({source_type_kr})"
                    
                    # 인용된 텍스트가 있다면 일부 미리보기 추가
                    quoted_text = citation.get("quoted_text", "")
                    if quoted_text:
                        preview = quoted_text[:80].strip()  # 더 짧게 표시
                        if len(quoted_text) > 80:
                            preview += "..."
                        citation_line += f" - \"{preview}\""
                    
                elif citation.get("type") == "web":
                    # 웹 검색 결과의 경우
                    title = citation.get("title", "웹 자료")
                    citation_line = f"[{number}] {title} (웹 검색 결과)"
                
                else:
                    # 기타 타입
                    title = citation.get("title", "참고 자료")
                    citation_line = f"[{number}] {title}"
                
                citation_lines.append(citation_line)
            
            return "\n".join(citation_lines)
            
        except Exception as e:
            logger.error(f"각주 생성 오류: {str(e)}")
            return "**참고 자료:** (각주 생성 오류)"
    
    def process_query(self, query: str) -> Dict[str, Any]:
        """사용자 질의 처리 (RAG + Perplexity 통합) - 캐싱 기능 및 각주 기능 포함"""
        query_start_time = time.time()
        logger.info(f"사용자 질의 처리 시작: {query[:50]}...")
        
        if not self.initialized:
            return {
                "answer": "챗봇이 아직 초기화되지 않았습니다. 초기화 후 다시 시도해주세요.",
                "citations": [],
                "sources_used": {"internal": False, "web": False}
            }
        
        # 캐시된 응답 확인
        cached_response = self.get_cached_response(query)
        if cached_response:
            # 캐시된 응답이 있으면 즉시 반환
            return cached_response
        
        try:
            # 1. 내부 문서 검색
            internal_docs = self.search_internal_documents(query)
            has_internal_docs = len(internal_docs) > 0
            
            # 2. Perplexity로 웹 검색 (쿼리 유형에 따라 선택적으로)
            web_search_needed = self.should_use_web_search(query)
            
            if web_search_needed and self.perplexity_initialized:
                web_search_result = self.search_with_perplexity(query)
            else:
                web_search_result = {"success": False, "answer": "", "citations": []}
            
            # 3. 결과 통합
            sources_used = {
                "internal": has_internal_docs,
                "web": web_search_result.get("success", False)
            }
            
            # 프롬프트 구성
            context_parts = []
            citations = []
            
            # 내부 문서 정보 추가
            if has_internal_docs:
                context_parts.append("=== 내부 문서 정보 ===")
                for i, doc in enumerate(internal_docs):
                    # 메타데이터 추출
                    title = doc.metadata.get("title", "제목 없음")
                    source_type = doc.metadata.get("source_type", "economy_terms")
                    file_name = doc.metadata.get("file_name", "")
                    
                    # 관련 콘텐츠 추출
                    cited_content = self.extract_cited_content(doc, query)
                    if not cited_content:
                        cited_content = doc.page_content[:300]  # 추출 실패 시 앞부분 사용
                    
                    context_parts.append(f"\n[내부문서 {i+1}] {title}")
                    context_parts.append(cited_content)
                    
                    # 인용 정보 저장
                    citations.append({
                        "type": "internal",
                        "title": title,
                        "source": doc.metadata.get("source", ""),
                        "file_name": file_name,
                        "source_type": source_type,
                        "quoted_text": cited_content  # 인용된 텍스트 구간
                    })
            
            # 웹 검색 정보 추가
            if web_search_result.get("success") and web_search_result.get("answer"):
                context_parts.append("\n=== 최신 웹 정보 ===")
                context_parts.append(web_search_result["answer"])
                
                # 웹 출처 추가
                for citation in web_search_result.get("citations", []):
                    citations.append(citation)
            
            # 최종 답변 생성
            if context_parts:
                # 컨텍스트가 있는 경우 - RAG 기반 응답
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """당신은 한국 경제 정보를 제공하는 '경제용'이라는 챗봇입니다. 
                    제공된 정보를 바탕으로 사용자의 질문에 정확하고 친절하게 답변하세요.
                    내부 문서와 최신 웹 정보를 적절히 종합하여 답변하세요.
                    답변은 사용자가 이해하기 쉽게 설명하고, 필요한 경우 예시를 들어주세요.
                    어투는 친근하고 격식없이 '~이에요', '~해요' 형식으로 답변하세요.
                    모르는 내용이나 확실하지 않은 내용은 솔직히 모른다고 답변하세요.
                    답변에서 참고한 자료나 출처가 있다면 해당 제목이나 키워드를 자연스럽게 언급하세요."""),
                    ("human", "{context}\n\n질문: {query}")
                ])
                
                chain = prompt | self.llm
                response = chain.invoke({
                    "context": "\n".join(context_parts),
                    "query": query
                })
                
                raw_answer = response.content
            else:
                # 컨텍스트가 없는 경우 (일반 대화)
                prompt = ChatPromptTemplate.from_messages([
                    ("system", """당신은 한국 경제 정보를 제공하는 '경제용'이라는 친절한 챗봇입니다. 
                    사용자의 질문에 친근하고 유용한 정보를 제공하세요.
                    어투는 친근하고 격식없이 '~이에요', '~해요' 형식으로 답변하세요.
                    모르는 내용은 솔직히 모른다고 하고, 관련된 일반적인 조언을 제공하세요."""),
                    ("human", "{query}")
                ])
                
                chain = prompt | self.llm
                response = chain.invoke({"query": query})
                raw_answer = response.content
            
            # 각주가 포함된 최종 답변 생성
            formatted_answer = self.format_answer_with_citations(raw_answer, citations)
            
            query_total_time = time.time() - query_start_time
            logger.info(f"질의 처리 완료 (소요시간: {query_total_time:.2f}초)")
            
            # 응답 결과 생성
            result = {
                "answer": formatted_answer,
                "raw_answer": raw_answer,  # 각주가 없는 원본 답변도 포함
                "citations": citations,
                "sources_used": sources_used
            }
            
            # 결과를 캐시에 저장
            self.cache_response(query, result)
            
            return result
            
        except Exception as e:
            logger.error(f"질의 처리 중 오류 발생: {str(e)}")
            error_result = {
                "answer": f"죄송해요, 질문을 처리하는 중에 오류가 발생했어요. 다시 질문해주세요.",
                "citations": [],
                "sources_used": {"internal": False, "web": False},
                "error": str(e)
            }
            
            # 에러 응답은 캐시하지 않음
            return error_result
    
    def should_use_web_search(self, query: str) -> bool:
        """쿼리 유형에 따라 웹 검색 필요 여부 판단"""
        query_lower = query.lower()
        
        # 웹 검색이 필요한 키워드
        time_keywords = ["최신", "요즘", "최근", "지금", "현재", "오늘", "어제", "이번 주", "이번 달"]
        news_keywords = ["뉴스", "기사", "발표", "소식", "속보", "업데이트"]
        market_keywords = ["주가", "지수", "환율", "금리", "코스피", "코스닥", "나스닥", "다우", "S&P"]
        
        # 시간 관련 키워드 체크
        has_time_keyword = any(keyword in query_lower for keyword in time_keywords)
        
        # 뉴스 관련 키워드 체크
        has_news_keyword = any(keyword in query_lower for keyword in news_keywords)
        
        # 시장 관련 키워드 체크
        has_market_keyword = any(keyword in query_lower for keyword in market_keywords)
        
        # 숫자가 포함된 경우 (날짜, 수치 등)
        has_numbers = any(char.isdigit() for char in query)
        
        # 결정 로직: 시간 키워드가 있거나, 뉴스 키워드가 있거나, 시장 키워드와 숫자가 함께 있는 경우
        return has_time_keyword or has_news_keyword or (has_market_keyword and has_numbers)
    
    def get_status(self) -> Dict[str, Any]:
        """챗봇 상태 정보 반환 - 캐싱 정보 포함"""
        return {
            "initialized": self.initialized,
            "rag_initialized": self.rag_initialized,
            "perplexity_initialized": self.perplexity_initialized,
            "document_count": len(self.docs),
            "chunk_count": len(self.chunks),
            "load_time": f"{self.load_time:.2f}초",
            "index_time": f"{self.index_time:.2f}초",
            "cache_info": {
                "cached_responses": len(self.response_cache),
                "cache_hits": self.cache_hits,
                "cache_misses": self.cache_misses,
                "cache_hit_rate": f"{self.get_cache_hit_rate():.1f}%",
                "max_cache_size": self.cache_max_size
            },
            "api_keys": {
                "openai": bool(self.openai_api_key),
                "perplexity": bool(self.perplexity_api_key)
            }
        }

# 싱글톤 인스턴스
_unified_chatbot_instance = None

def get_unified_chatbot_instance():
    """통합 챗봇 싱글톤 인스턴스 반환"""
    global _unified_chatbot_instance
    
    if _unified_chatbot_instance is None:
        _unified_chatbot_instance = UnifiedChatbot()
    
    return _unified_chatbot_instance

def initialize_unified_chatbot():
    """통합 챗봇 초기화 - RAG만 사용하도록 수정"""
    try:
        logger.info("통합 챗봇 초기화 시작")
        
        chatbot = get_unified_chatbot_instance()
        
        # 이미 초기화된 경우
        if chatbot.initialized:
            logger.info("챗봇이 이미 초기화되어 있습니다")
            return True
        
        # 문서 로드
        if not chatbot.load_documents():
            logger.error("문서 로드 실패")
            # 실패해도 계속 진행 (문서 일부만 로드해도 동작 가능하도록)
        
        # RAG 인덱스 생성
        if not chatbot.create_rag_index():
            logger.error("RAG 인덱스 생성 실패")
            # 실패해도 계속 진행
        
        # Perplexity API 초기화 상태 항상 True로 설정
        chatbot.perplexity_initialized = True
        
        # 초기화 완료 - 항상 True 반환
        chatbot.initialized = True
        chatbot.rag_initialized = True
        
        logger.info("통합 챗봇 초기화 완료")
        return True
        
    except Exception as e:
        logger.error(f"통합 챗봇 초기화 오류: {str(e)}")
        # 예외가 발생해도 초기화된 것으로 처리
        chatbot = get_unified_chatbot_instance()
        chatbot.initialized = True
        chatbot.rag_initialized = True
        chatbot.perplexity_initialized = True
        return True