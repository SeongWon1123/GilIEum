# 🍽️ 온식(Onsik) AI 에이전트 계획서
## — 완전 독립형 개발 버전 —

> **온식은 독립된 완전한 앱입니다.**  
> 온길과 코드를 공유하거나 협의할 필요 없이, 이 문서만 보고 처음부터 끝까지 개발할 수 있습니다.  
> 단, 나중에 합칠 때를 위해 **최소 약속 4가지**를 반드시 지키세요.

---

## 🤝 최소 약속 4가지 (온길과 공유 — 변경 금지)

> 이것만 지키면 나중에 합치는 게 하루 작업입니다.

### 약속 1: 컬러 시스템
```javascript
// 이 값 그대로 사용. 임의로 바꾸지 마세요.
const COLORS = {
  primary: "#0f766e",
  primarySoft: "#ccfbf1",
  accent: "#f59e0b",
  ink: "#0f172a",
  muted: "#475569",
  border: "#cbd5e1",
  surface: "#ffffff",
  background: "#f8fafc",
  danger: "#dc2626",
};
```

### 약속 2: API 응답 포맷
```json
// 추천 결과는 반드시 이 구조로
{
  "summary": "설명 문자열",
  "total_distance_km": 4.2,
  "total_estimated_min": 165,
  "warnings": [],
  "spots": [ { "spot_id": "...", "name": "...", "lat": 0.0, "lng": 0.0, "order": 1 } ]
}
```

### 약속 3: Supabase 테이블명 충돌 금지
```
온식 전용: restaurants, blog_reviews
온길 전용: attractions, user_sessions, recommendations, feedbacks
→ 나중에 같은 Supabase 프로젝트로 합쳐도 충돌 없음
```

### 약속 4: 공통 입력 필드 값 목록
```
age_group  : "child" | "20s" | "30s" | "40s" | "50s" | "senior"
gender     : "male" | "female" | "other"
companion  : "family" | "friends" | "couple" | "solo"
transport  : "car" | "public" | "walk"
```

---

## 📁 온식 독립 프로젝트 구조

```
onsik-app/                     ← 온식만의 독립 프로젝트 폴더
├── backend/                   ← FastAPI 백엔드 (온식 전용)
│   ├── main.py
│   ├── routers/
│   │   ├── restaurant.py      # 맛집 추천 API
│   │   └── review.py          # 별점 리뷰 저장
│   ├── ai/
│   │   ├── rag_pipeline.py    # LangChain RAG (맛집 특화)
│   │   ├── embeddings.py      # KoSimCSE 임베딩
│   │   └── llm_client.py      # EXAONE / Gemini 클라이언트
│   ├── crawler/
│   │   ├── naver_restaurant.py # 네이버 API 맛집 수집
│   │   └── naver_blog.py       # Scrapy 블로그 크롤러
│   ├── tasks/
│   │   └── celery_app.py       # Celery + Beat 배치
│   ├── db/
│   │   └── supabase_client.py
│   ├── schemas/
│   │   └── food.py             # Pydantic 스키마
│   ├── .env
│   └── requirements.txt
│
└── frontend/                  ← React Native 앱 (온식 전용)
    ├── App.js
    ├── screens/
    │   ├── HomeScreen.js       # 맛집 홈 (프로모션 배너)
    │   ├── FormScreen.js       # 맛집 조건 입력
    │   ├── ResultScreen.js     # 추천 결과 목록
    │   └── DetailScreen.js     # 맛집 상세 + 별점
    ├── components/
    │   ├── ChipGroup.js
    │   ├── Counter.js
    │   └── FoodCard.js
    ├── services/
    │   └── api.js
    ├── .env
    └── package.json
```

---

## 🛠️ 기술 스택

| 항목 | 기술 | 비고 |
|------|------|------|
| 앱 | React Native + Expo SDK 52 | 온식 단독 앱 |
| 백엔드 | FastAPI 0.115 | 온식 단독 서버 (포트 8002) |
| DB | Supabase (PostgreSQL 16 + pgvector 0.7) | 온식 전용 테이블만 사용 |
| LLM | EXAONE 3.5 7.8B (MVP: Gemini Flash) | 무료 오픈소스 |
| 임베딩 | KoSimCSE-roberta-multitask | **768차원 고정** |
| RAG | LangChain 0.3 | 블로그 리뷰 컨텍스트 추가 |
| 크롤러 | Scrapy + BeautifulSoup | 네이버 블로그 내돈내산 |
| 비동기 | Celery + Redis | |
| 배포 | Google Cloud Run + Docker | |

> **포트 주의**: 온길이 8001을 쓰므로 온식은 8002 사용

---

## 🗄️ DB 스키마 (온식 전용 테이블)

```sql
-- 맛집 테이블
CREATE TABLE restaurants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    cuisine     TEXT,           -- '한식'|'중식'|'일식'|'양식'|'카페'
    address     TEXT,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    radius_m    INTEGER DEFAULT 50,
    score       FLOAT,
    meta        JSONB,
    -- meta: {
    --   open_time, close_time, price_range("low"|"medium"|"high"),
    --   mood("cozy"|"trendy"|"local"), tags, review_count, featured,
    --   duration_by_condition: { "20대_커플_자차": 62 }
    -- }
    embedding   VECTOR(768),
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON restaurants USING hnsw (embedding vector_cosine_ops);

-- 블로그 리뷰 (내돈내산 크롤링)
CREATE TABLE blog_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id    UUID REFERENCES restaurants(id),
    source_url  TEXT,
    content     TEXT,
    is_organic  BOOLEAN DEFAULT true,   -- true = 광고 아님
    embedding   VECTOR(768),
    crawled_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON blog_reviews USING hnsw (embedding vector_cosine_ops);

-- 맛집 별점 피드백
CREATE TABLE food_feedbacks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id    UUID REFERENCES restaurants(id),
    rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 🐍 백엔드 구현

### schemas/food.py

```python
from typing import List, Optional
from pydantic import BaseModel

class FoodInput(BaseModel):
    start_lat: float
    start_lng: float
    # 약속 4: 아래 값 목록 반드시 준수
    age_group: str        # "child"|"20s"|"30s"|"40s"|"50s"|"senior"
    gender: str           # "male"|"female"|"other"
    companion_type: str   # "family"|"friends"|"couple"|"solo"
    companion_count: int
    transport: str        # "car"|"public"|"walk"
    place_count: int = 3
    # 온식 전용 필드
    food_category: Optional[str] = None   # "한식"|"중식"|"일식"|"양식"|"카페"
    price_range: Optional[str] = "medium" # "low"|"medium"|"high"
    mood: Optional[str] = "any"           # "cozy"|"trendy"|"local"|"any"

class RecommendedFood(BaseModel):
    spot_id: str
    name: str
    category: str
    address: str
    description: str
    lat: float
    lng: float
    order: int
    rating: float
    estimated_arrival: str
    estimated_stay_min: int
    tags: List[str]
    open_time: str
    close_time: str
    price_range: str

# 약속 2: 이 응답 구조 반드시 준수
class FoodResult(BaseModel):
    summary: str
    total_distance_km: float
    total_estimated_min: int
    warnings: List[str] = []
    spots: List[RecommendedFood]
```

### routers/restaurant.py

```python
from fastapi import APIRouter, HTTPException
from schemas.food import FoodInput, FoodResult
from services.food_recommendation import recommend_food

router = APIRouter()

@router.post("/food/recommend", response_model=FoodResult)
async def recommend_food_course(food_input: FoodInput) -> FoodResult:
    try:
        return await recommend_food(food_input)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="맛집 추천 중 오류 발생")

@router.get("/food/promotions")
async def get_promotions():
    """featured=true인 프로모션 맛집 목록"""
    pass
```

### routers/review.py

```python
from fastapi import APIRouter
from pydantic import BaseModel
from db.supabase_client import get_supabase

router = APIRouter()

class ReviewInput(BaseModel):
    place_id: str
    rating: int
    comment: str = ""

@router.post("/food/review")
async def submit_review(review: ReviewInput):
    supabase = get_supabase()
    supabase.table('food_feedbacks').insert(review.dict()).execute()
    return {"status": "ok"}
```

### main.py

```python
from fastapi import FastAPI
from routers import restaurant, review

app = FastAPI(title="온식(Onsik) API", version="1.0.0")

app.include_router(restaurant.router, prefix="/api", tags=["맛집 추천"])
app.include_router(review.router, prefix="/api", tags=["리뷰"])
```

### services/food_recommendation.py

```python
from schemas.food import FoodInput, FoodResult
from db.supabase_client import get_supabase
from ai.rag_pipeline import get_rag_pipeline

async def recommend_food(food_input: FoodInput) -> FoodResult:
    supabase = get_supabase()
    rag = get_rag_pipeline()

    # 1. 사용자 입력 → 자연어 텍스트
    context_text = build_food_context(food_input)

    # 2. KoSimCSE 768차원 임베딩
    query_vector = rag.embed(context_text)

    # 3. pgvector 유사 맛집 검색 (top 20)
    results = supabase.rpc('search_restaurants', {
        'query_vector': query_vector,
        'food_category': food_input.food_category,
        'limit': 20
    }).execute()

    # 4. 블로그 리뷰 RAG 컨텍스트 추가 (온식만의 차별점!)
    reviews = supabase.rpc('search_blog_reviews', {
        'query_vector': query_vector,
        'limit': 10
    }).execute()

    # 5. EXAONE으로 최적 맛집 코스 생성
    return await rag.generate_food_course(
        user_input=food_input,
        candidates=results.data,
        reviews=reviews.data
    )

def build_food_context(f: FoodInput) -> str:
    parts = [
        f"{f.age_group} {f.gender}",
        f"{f.companion_type} {f.companion_count}명",
        f"{f.transport} 이동",
    ]
    if f.food_category:
        parts.append(f"{f.food_category} 원함")
    if f.price_range:
        parts.append(f"가격대 {f.price_range}")
    if f.mood and f.mood != "any":
        parts.append(f"분위기 {f.mood}")
    return " ".join(parts)
```

### tasks/celery_app.py (체류시간 + 별점 학습)

```python
from celery import Celery
from celery.schedules import crontab

celery_app = Celery('onsik', broker='redis://localhost:6380/0')
# 온길(6379)과 포트 충돌 방지: 온식은 6380 사용

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=2, minute=30),  # 온길(2:00)과 겹치지 않게
        update_restaurant_stats.s(),
        name='매일 새벽 2:30 맛집 통계 갱신'
    )

@celery_app.task
def update_restaurant_stats():
    """
    food_feedbacks.rating 집계 →
    restaurants.score 업데이트 (평균 별점)
    restaurants.meta.duration_by_condition 갱신
    """
    from db.supabase_client import get_supabase
    supabase = get_supabase()
    pass
```

---

## 🕷️ 데이터 수집

### 목표: 맛집 317개소 + 블로그 리뷰 1,823건

### 네이버 Search API (기본 정보)
```python
# crawler/naver_restaurant.py
import requests

def search_restaurants(keyword: str):
    url = "https://openapi.naver.com/v1/search/local.json"
    params = {
        "query": f"순천 {keyword}",
        "display": 100,
        "sort": "random"
    }
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET
    }
    return requests.get(url, params=params, headers=headers).json()["items"]

KEYWORDS = ["한식", "중식", "일식", "양식", "카페", "디저트", "맛집"]
```

### Scrapy 블로그 크롤러 (내돈내산 리뷰)
```python
# crawler/naver_blog.py
import scrapy
from bs4 import BeautifulSoup

class NaverBlogSpider(scrapy.Spider):
    name = "onsik_blog"
    start_urls = [
        "https://search.naver.com/search.naver?where=blog&query=순천+맛집+내돈내산",
        "https://search.naver.com/search.naver?where=blog&query=순천+한식+내돈내산",
        "https://search.naver.com/search.naver?where=blog&query=순천+카페+내돈내산",
    ]

    def parse(self, response):
        for link in response.css('.total_wrap a::attr(href)').getall():
            yield scrapy.Request(link, callback=self.parse_blog)

    def parse_blog(self, response):
        soup = BeautifulSoup(response.text, 'html.parser')
        content = soup.find('div', {'class': 'se-main-container'})
        if content:
            text = content.get_text(separator=' ', strip=True)
            if '내돈내산' in text:  # 광고 필터
                yield {
                    'source_url': response.url,
                    'content': text,
                    'is_organic': True,
                }
```

### KoSimCSE 임베딩 → Supabase 저장
```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('BM-K/KoSimCSE-roberta-multitask')  # 768차원

def embed_and_store_restaurant(data: dict):
    text = f"{data['name']} {data['cuisine']} {data['address']} {' '.join(data.get('tags', []))}"
    embedding = model.encode(text).tolist()

    supabase.table('restaurants').upsert({
        'name': data['name'],
        'cuisine': data['cuisine'],
        'address': data['address'],
        'lat': data['lat'],
        'lng': data['lng'],
        'radius_m': 50,
        'embedding': embedding,
        'meta': {
            'open_time': data.get('open_time', ''),
            'close_time': data.get('close_time', ''),
            'price_range': data.get('price_range', 'medium'),
            'tags': data.get('tags', []),
            'featured': False,
            'duration_by_condition': {}
        }
    }).execute()

def embed_and_store_review(place_id: str, content: str, source_url: str):
    embedding = model.encode(content[:512]).tolist()  # 최대 512자
    supabase.table('blog_reviews').insert({
        'place_id': place_id,
        'source_url': source_url,
        'content': content,
        'is_organic': True,
        'embedding': embedding,
    }).execute()
```

---

## 📱 프론트엔드 화면 구조

### screens/HomeScreen.js
```
- 앱 타이틀 + 슬로건
- 프로모션 맛집 배너 카드 (GET /api/food/promotions)
- "맛집 추천 받기" CTA 버튼 → FormScreen
```

### screens/FormScreen.js
```
- [ChipGroup] 음식 카테고리: 🍚한식 / 🍜중식 / 🍣일식 / 🍕양식 / ☕카페
- [ChipGroup] 가격대: 💚저렴 / 💛보통 / 🔴고급
- [ChipGroup] 분위기: 🪑아늑한 / ✨트렌디 / 🏘️로컬 / 🎲상관없음
- [ChipGroup] 연령대 (약속 4 값 목록 준수)
- [ChipGroup] 동행 유형 (약속 4 값 목록 준수)
- [Counter] 추천 장소 수 (1~5)
- "맛집 추천 받기" 버튼 → POST /api/food/recommend
```

### screens/ResultScreen.js
```
- 요약 정보 (총 거리, 예상 시간)
- 맛집 카드 목록: 순서 / 이름 / 카테고리 / 예상 도착 시각 / 별점 / 태그
- 각 카드 탭 → DetailScreen
- 경고 메시지 표시
```

### screens/DetailScreen.js
```
- 맛집 이름, 카테고리, 주소, 영업시간
- 별점 표시 (COLORS.accent 색상)
- 블로그 리뷰 요약 표시 (RAG 기반)
- 태그 목록
- 카카오 지도 딥링크 버튼
- 별점 입력 → POST /api/food/review
```

---

## 🚀 개발 환경 세팅

```bash
# 백엔드
cd onsik-app/backend
python -m venv venv && venv\Scripts\activate
pip install fastapi uvicorn langchain sentence-transformers supabase celery redis scrapy beautifulsoup4
uvicorn main:app --reload --port 8002
# → http://localhost:8002/docs 에서 테스트

# Celery Worker (별도 터미널)
celery -A tasks.celery_app worker -B --loglevel=info

# 프론트
cd onsik-app/frontend
npm install
npx expo start
```

### .env (백엔드)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
```

### .env (프론트)
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8002/api
```

---

## ✅ 개발 순서 체크리스트

### Phase 1: 기반 세팅
- [ ] Supabase 프로젝트 생성 → pgvector 확장 활성화
- [ ] DB 테이블 3개 생성 (restaurants, blog_reviews, food_feedbacks)
- [ ] FastAPI 기본 구조 + `/api/food/recommend` 빈 엔드포인트
- [ ] Expo 앱 초기화 + HomeScreen UI 뼈대

### Phase 2: 데이터 수집
- [ ] 네이버 Search API 키 발급
- [ ] naver_restaurant.py 작성 → 맛집 317개소 수집
- [ ] naver_blog.py (Scrapy) 작성 → 블로그 리뷰 1,823건 크롤링
- [ ] KoSimCSE 768차원 임베딩 생성 → restaurants, blog_reviews 저장

### Phase 3: RAG 파이프라인
- [ ] KoSimCSE 임베딩 모듈 (ai/embeddings.py)
- [ ] EXAONE 3.5 클라이언트 또는 Gemini Flash (MVP)
- [ ] LangChain RAG 파이프라인 — 맛집 + 블로그 리뷰 컨텍스트 통합
- [ ] Supabase RPC 함수: `search_restaurants`, `search_blog_reviews`
- [ ] Jupyter로 RAG end-to-end 테스트

### Phase 4: 백엔드 완성
- [ ] `/api/food/recommend` 실제 RAG 연동
- [ ] `/api/food/review` 구현
- [ ] `/api/food/promotions` 구현
- [ ] Swagger UI에서 전체 테스트

### Phase 5: Celery 배치
- [ ] Redis 설치 (포트 6380) + Celery 연동
- [ ] `update_restaurant_stats` 태스크 구현
- [ ] 별점 Insert 후 score 갱신 확인

### Phase 6: 프론트엔드
- [ ] ChipGroup, Counter (COLORS 적용)
- [ ] HomeScreen + GET /api/food/promotions 연동
- [ ] FormScreen → API 호출 → ResultScreen 이동
- [ ] DetailScreen + 별점 제출

---

## ⚠️ 핵심 규칙 요약

| 규칙 | 내용 |
|------|------|
| 약속 1 | COLORS 값 변경 금지 |
| 약속 2 | 응답 포맷 `{summary, spots:[...]}` 구조 유지 |
| 약속 3 | 테이블명 `restaurants`, `blog_reviews`, `food_feedbacks` 사용 |
| 약속 4 | age_group / gender / companion_type / transport 값 목록 준수 |
| 포트 | 백엔드 **8002** (온길이 8001 사용) |
| Redis | 포트 **6380** (온길이 6379 사용) |
| 임베딩 | KoSimCSE **768차원** 고정 |
| LLM | MVP: Gemini Flash → 최종: EXAONE 3.5 |

---

*API 문서: http://localhost:8002/docs*
