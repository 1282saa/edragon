# 챗봇 답변 속도 최적화 가이드

## 서울경제신문 경제용 챗봇 성능 개선 방안

## 🚀 즉시 적용 가능한 최적화 방안

### 1. Cloud Run 설정 최적화

#### A. 최소 인스턴스 설정 (콜드 스타트 제거)

```bash
# 콜드 스타트 최소화 - 최소 1개 인스턴스 상시 유지
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --min-instances 1 \
  --max-instances 10
```

#### B. CPU 부스트 활성화

```bash
# CPU 부스트로 초기 요청 처리 속도 향상
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --cpu-boost
```

#### C. 동시성 최적화

```bash
# 동시성을 50으로 줄여서 인스턴스당 처리 품질 향상
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --concurrency 50
```

### 2. 메모리 및 CPU 최적화

#### A. 메모리 증설 (현재 2Gi → 4Gi)

```bash
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --memory 4Gi \
  --cpu 2
```

#### B. 타임아웃 설정 (현재 300초 → 60초)

```bash
# 응답 속도가 개선되면 타임아웃을 줄여서 무한 대기 방지
gcloud run services update sedaily-chatbot \
  --region asia-northeast3 \
  --timeout 60
```

## 🔧 코드 레벨 최적화

### 3. LLM 모델 최적화

#### A. 더 빠른 모델 사용

```python
# modules/unified_chatbot.py에서 모델 변경
self.llm = ChatOpenAI(
    model="gpt-4o-mini",      # 현재 사용 중 - 이미 빠른 모델
    temperature=0.1,
    max_tokens=1000,          # 토큰 수 제한으로 속도 향상
    timeout=30,               # API 타임아웃 설정
    openai_api_key=self.openai_api_key
)
```

#### B. 스트리밍 응답 활용

```python
# 스트리밍으로 점진적 답변 제공 (이미 구현되어 있음)
def generate_stream_response(self, query: str):
    response = self.llm.stream(query)
    for chunk in response:
        yield chunk.content
```

### 4. 벡터 검색 최적화

#### A. 임베딩 모델 최적화

```python
# 더 빠른 임베딩 모델 사용
self.embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",  # 이미 사용 중 - 가장 빠른 모델
    openai_api_key=self.openai_api_key,
    timeout=10  # 타임아웃 추가
)
```

#### B. 검색 결과 수 제한

```python
# 검색 결과를 3개로 제한하여 속도 향상
def search_internal_documents(self, query: str, k: int = 3) -> List[Document]:
    if not self.retriever:
        return []
    return self.retriever.get_relevant_documents(query)[:k]
```

### 5. 캐싱 전략 구현

#### A. Redis 캐싱 시스템 도입

```python
import redis
from functools import wraps

# Redis 연결 (Cloud Memorystore 사용 권장)
redis_client = redis.Redis(host='localhost', port=6379, db=0)

def cache_response(expiry=3600):  # 1시간 캐시
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"chatbot:{hash(str(args)+str(kwargs))}"
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            result = func(*args, **kwargs)
            redis_client.setex(cache_key, expiry, json.dumps(result))
            return result
        return wrapper
    return decorator

@cache_response(expiry=1800)  # 30분 캐시
def process_query(self, query: str):
    # 기존 로직
    pass
```

#### B. 메모리 기반 캐싱 (즉시 적용 가능)

```python
from functools import lru_cache
import hashlib

class UnifiedChatbot:
    def __init__(self):
        self.response_cache = {}
        self.cache_max_size = 100

    def get_cached_response(self, query: str) -> Optional[str]:
        query_hash = hashlib.md5(query.encode()).hexdigest()
        return self.response_cache.get(query_hash)

    def cache_response(self, query: str, response: str):
        if len(self.response_cache) >= self.cache_max_size:
            # LRU 방식으로 오래된 캐시 제거
            oldest_key = next(iter(self.response_cache))
            del self.response_cache[oldest_key]

        query_hash = hashlib.md5(query.encode()).hexdigest()
        self.response_cache[query_hash] = response
```

### 6. 문서 로딩 최적화

#### A. 지연 로딩 구현

```python
def lazy_load_documents(self):
    """필요할 때만 문서 로드"""
    if not self.docs:
        self.load_documents()
    return self.docs

def preload_common_queries(self):
    """자주 사용되는 쿼리 미리 처리"""
    common_queries = [
        "기준금리란 무엇인가요?",
        "인플레이션의 원인은?",
        "주식시장 전망"
    ]
    for query in common_queries:
        self.process_query(query)
```

## 📊 실시간 모니터링 및 최적화

### 7. 성능 모니터링 추가

#### A. 응답 시간 측정

```python
import time
from functools import wraps

def measure_performance(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        logger.info(f"{func.__name__} 실행 시간: {end_time - start_time:.2f}초")
        return result
    return wrapper

@measure_performance
def process_query(self, query: str):
    # 기존 로직
    pass
```

#### B. 메트릭 수집

```python
class PerformanceMetrics:
    def __init__(self):
        self.query_count = 0
        self.total_response_time = 0
        self.avg_response_time = 0
        self.cache_hits = 0
        self.cache_misses = 0

    def record_query(self, response_time: float, cache_hit: bool):
        self.query_count += 1
        self.total_response_time += response_time
        self.avg_response_time = self.total_response_time / self.query_count

        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1

    def get_stats(self):
        cache_rate = self.cache_hits / (self.cache_hits + self.cache_misses) * 100
        return {
            "avg_response_time": self.avg_response_time,
            "total_queries": self.query_count,
            "cache_hit_rate": cache_rate
        }
```

## 🛠 즉시 적용할 수 있는 deploy.sh 수정사항

### 8. 최적화된 배포 설정

```bash
# CPU 부스트 및 최소 인스턴스 설정 추가
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${VERSION} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 60 \
  --concurrency 50 \
  --max-instances 10 \
  --min-instances 1 \
  --cpu-boost \
  --set-env-vars "${ENV_VARS}" \
  --project ${PROJECT_ID}
```

## 📈 예상 성능 개선 효과

### 개선 전후 비교

| 최적화 항목    | 개선 전 | 개선 후 | 효과             |
| -------------- | ------- | ------- | ---------------- |
| 콜드 스타트    | 3-5초   | 0초     | 즉시 응답        |
| 평균 응답 시간 | 8-12초  | 3-5초   | 60% 단축         |
| 캐시 적중률    | 0%      | 30-50%  | 반복 질문 고속화 |
| 메모리 사용량  | 2Gi     | 4Gi     | 안정성 향상      |
| 동시 처리 능력 | 100     | 50      | 품질 향상        |

## 🚀 단계별 적용 순서

### Phase 1: 즉시 적용 (5분)

1. Cloud Run 설정 변경 (최소 인스턴스, CPU 부스트)
2. 메모리 4Gi로 증설

### Phase 2: 코드 수정 (30분)

1. 메모리 캐싱 구현
2. API 타임아웃 설정
3. 검색 결과 수 제한

### Phase 3: 고급 최적화 (2시간)

1. Redis 캐싱 시스템 구축
2. 성능 모니터링 추가
3. 지연 로딩 구현

## 📋 모니터링 체크리스트

- [ ] 평균 응답 시간 < 5초
- [ ] 캐시 적중률 > 30%
- [ ] 메모리 사용률 < 80%
- [ ] 에러율 < 1%
- [ ] 콜드 스타트 발생 빈도 < 5%

## 💡 추가 권장사항

1. **CDN 사용**: 정적 파일은 Cloud CDN으로 분리
2. **데이터베이스 최적화**: Firestore 또는 Cloud SQL 활용
3. **로드 밸런싱**: 트래픽 증가 시 멀티 리전 배포
4. **A/B 테스팅**: 다양한 모델과 설정 비교 테스트
