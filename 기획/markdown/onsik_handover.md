# 📋 온식(Onsik) 개발자 인계 서류 — AI-Ready Version

> **이 문서는 AI 코딩 어시스턴트(예: Claude, Cursor, Gemini 등)에게 컨텍스트로 제공하기 위해 작성되었습니다.**  
> 이 문서를 AI에게 주면, 기존 온길(Ongil) 코드베이스와 충돌 없이 온식 파트를 즉시 개발할 수 있습니다.

---

## 1. 프로젝트 개요

**길이음(GilIEum)**은 순천 지역 맞춤형 AI 여행·맛집 추천 앱입니다.

> **논문**: "실시간 위치 기반 AI RAG 파이프라인을 활용한 지역 상생 관광 큐레이션 시스템"  
> 최성원, 배성찬, 임세현, 허경준, 심춘보 / 국립순천대학교 AI공학부  
> 2026 한국스마트미디어학회 & 한국디지털산업학회 춘계학술대회

### 핵심 기술 스택 (논문 확정)
| 구분 | 기술 |
|---|---|
| **앱** | React Native + Expo SDK 52 |
| **백엔드** | FastAPI (Python) |
| **DB** | Supabase (PostgreSQL + pgvector) |
| **AI 추천** | EXAONE 3.5 + KoSimCSE 임베딩 + LangChain RAG |
| **지오펜스** | Expo-Location (진입/이탈 이벤트) |
| **비동기** | Celery + Redis (매일 새벽 배치) |

### 시스템 가치 (논문 기준)
- 기존 플랫폼: 광고 기반 편중 노출  
- 우리 시스템: **소상공인 및 지역 상생** — 숨겨진 로컬 맛집 발굴

---

## 2. 온식 담당 범위 (명확한 경계)

### 온식이 새로 만들 파일 (백엔드)
```
ongil/app/api/endpoints/food.py           # 맛집 추천 라우터
ongil/app/schemas/food.py                 # 맛집 전용 Pydantic 스키마
ongil/app/services/food_recommendation.py # 맛집 추천 로직
```

### 온식이 새로 만들 파일 (프론트)
```
ongil_ui/screens/onsik/FoodHomeScreen.js    # 맛집 홈 화면
ongil_ui/screens/onsik/FoodFormScreen.js    # 조건 입력
ongil_ui/screens/onsik/FoodResultScreen.js  # 추천 결과
ongil_ui/screens/onsik/FoodDetailScreen.js  # 맛집 상세
```

### 온식이 절대 수정하면 안 되는 파일 (온길 관리)
```
ongil/app/main.py          # 라우터 등록은 온길에게 요청
ongil/app/services/storage.py  # DB 연결 공통 모듈
ongil/app/schemas/domain.py    # 공통 스키마 (Spot, UserInput 등)
ongil_ui/api.js             # API 클라이언트 (추가 함수는 온길에게 요청)
ongil_ui/App.js             # 메인 앱 (네비게이션 통합은 온길과 합의)
```

---

## 3. 기존 프로젝트 구조 (실제 현재 파일)

```
졸업작품/
├── ongil/                          # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py                 # FastAPI 앱 + 라우터 등록
│   │   ├── api/endpoints/
│   │   │   ├── course.py           # POST /api/course/generate (온길 전용)
│   │   │   ├── review.py           # POST /api/review
│   │   │   ├── tracking.py         # POST /api/tracking/visit_log
│   │   │   └── admin.py            # /api/admin/*
│   │   ├── schemas/
│   │   │   ├── domain.py           # Spot, UserInput, TravelCourse, AdminSettings
│   │   │   └── review.py           # ReviewInput
│   │   └── services/
│   │       ├── recommendation.py   # 가중치 기반 추천 (→ RAG로 교체 예정)
│   │       └── storage.py          # SQLite 연결 (→ Supabase로 교체 예정)
│   ├── data/
│   │   ├── spots.json              # 스팟 원본 데이터
│   │   └── settings.json           # 추천 가중치
│   └── requirements.txt
│
├── ongil_ui/                       # React Native Expo 앱
│   ├── App.js                      # 메인 앱 (home→form→result 화면 흐름)
│   ├── api.js                      # fetchCourse, submitReview, submitVisitLog
│   ├── components/ReviewModal.js   # 리뷰 모달
│   └── .env                        # EXPO_PUBLIC_API_BASE_URL
│
└── docs/
    ├── graduation_project_master_plan.md  # 온길 마스터 플랜
    ├── onsik_handover.md                  # 이 파일
    └── shared_schema.sql                  # 공통 DB 스키마
```

---

## 4. 공통 DB 스키마 (Supabase/PostgreSQL 기준)

```sql
-- spots 테이블 (공통 — 온길 관리)
-- kind = 'food'인 row가 온식 담당
CREATE TABLE spots (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    kind            TEXT CHECK(kind IN ('travel','food')) NOT NULL,
    category        TEXT,
    region          TEXT,
    address         TEXT,
    description     TEXT,
    lat             REAL NOT NULL,
    lng             REAL NOT NULL,
    base_stay_min   INTEGER DEFAULT 60,
    open_time       TEXT,       -- "HH:MM" 형식
    close_time      TEXT,       -- "HH:MM" 형식
    tags            JSONB,      -- ["한식", "로컬", "가성비"]
    rating          REAL DEFAULT 4.5,
    review_count    INTEGER DEFAULT 0,
    featured        BOOLEAN DEFAULT FALSE,
    embedding       vector(768)  -- KoSimCSE 임베딩 (pgvector)
);

-- 온식 전용 쿼리 예시
SELECT * FROM spots WHERE kind = 'food';

-- 벡터 유사도 검색 예시 (RAG)
SELECT id, name, 1 - (embedding <=> $query_vector) AS similarity
FROM spots
WHERE kind = 'food'
ORDER BY embedding <=> $query_vector
LIMIT 20;
```

---

## 5. 기존 코드 패턴 — 복붙해서 확장할 것

### 5-A. FastAPI 라우터 패턴 (course.py 기반)

```python
# ongil/app/api/endpoints/food.py — 온식이 새로 만들 파일
from fastapi import APIRouter, HTTPException
from app.schemas.food import FoodInput, FoodResult
from app.services.food_recommendation import recommend_food
from app.services.storage import load_spots

router = APIRouter()

@router.post("/food/recommend", response_model=FoodResult)
def recommend_food_course(food_input: FoodInput) -> FoodResult:
    spots = load_spots()
    food_spots = [s for s in spots if s.kind == "food"]
    if not food_spots:
        raise HTTPException(status_code=500, detail="맛집 데이터가 없습니다.")
    try:
        return recommend_food(food_input, food_spots)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
```

### 5-B. Pydantic 스키마 패턴 (domain.py 기반)

```python
# ongil/app/schemas/food.py — 온식이 새로 만들 파일
from typing import List, Optional
from pydantic import BaseModel

# 기존 온길 UserInput과 동일한 필드 + 온식 전용 필드 추가
class FoodInput(BaseModel):
    # 온길과 공통 (domain.py의 UserInput과 동일한 타입 사용)
    start_lat: float
    start_lng: float
    age_group: str           # "child","20s","30s","40s","50s","senior"
    gender: str              # "male","female","other"
    companion_type: str      # "family","friends","couple","solo"
    companion_count: int
    transport: str           # "public","car","walk"
    place_count: int = 3
    # 온식 전용 필드
    food_category: Optional[str] = None    # "한식","중식","일식","양식","카페"
    price_range: Optional[str] = "medium"  # "low","medium","high"
    mood: Optional[str] = "any"            # "cozy","trendy","local","any"

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
    open_time: str    # "HH:MM"
    close_time: str   # "HH:MM"
    price_range: str

class FoodResult(BaseModel):
    summary: str
    total_distance_km: float
    total_estimated_min: int
    warnings: List[str] = []
    spots: List[RecommendedFood]
```

### 5-C. 기존 Spot 모델 구조 (domain.py 실제 코드)

```python
# 온식이 쓸 Spot 객체 구조 (domain.py에 정의됨)
class Spot(BaseModel):
    id: str
    name: str
    kind: str           # "food"인 것만 필터해서 사용
    category: str
    region: str
    address: str
    description: str
    lat: float
    lng: float
    base_stay_min: int
    open_time: str
    close_time: str
    tags: List[str]
    rating: float
    review_count: int
    featured: bool
```

---

## 6. 프론트엔드 공통 리소스 — 반드시 이걸 사용

### 6-A. 컬러 시스템 (App.js 실제 정의값)

```javascript
// 온식도 이 값을 그대로 복사해서 사용할 것
const COLORS = {
  primary: "#0f766e",      // 메인 초록 (버튼, 선택된 칩)
  primarySoft: "#ccfbf1",  // 연한 초록 (배지 배경, 비활성 배경)
  accent: "#f59e0b",       // 앰버 (별점, 강조)
  ink: "#0f172a",          // 제목/강한 텍스트
  muted: "#475569",        // 보조 텍스트, 설명
  border: "#cbd5e1",       // 카드 테두리
  surface: "#ffffff",      // 카드 배경
  background: "#f8fafc",   // 전체 페이지 배경
  danger: "#dc2626",       // 에러 메시지
};
```

### 6-B. 공통 컴포넌트 (App.js에서 가져온 실제 코드)

**ChipGroup (선택지 칩):**
```javascript
function ChipGroup({ title, value, onChange, options }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
// 사용 예:
// const FOOD_CATEGORY_OPTIONS = [
//   { label: "한식", value: "한식" },
//   { label: "중식", value: "중식" },
//   { label: "카페", value: "카페" },
// ];
// <ChipGroup title="음식 종류" value={foodCategory} onChange={setFoodCategory} options={FOOD_CATEGORY_OPTIONS} />
```

**Counter (숫자 증감):**
```javascript
function Counter({ title, value, onChange, min = 1, max = 5 }) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.counterRow}>
        <Pressable style={styles.counterButton} onPress={() => onChange(String(Math.max(min, value - 1)))}>
          <Text style={styles.counterSymbol}>-</Text>
        </Pressable>
        <View style={styles.counterValue}>
          <Text style={styles.counterNumber}>{value}</Text>
        </View>
        <Pressable style={styles.counterButton} onPress={() => onChange(String(Math.min(max, value + 1)))}>
          <Text style={styles.counterSymbol}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

### 6-C. API 클라이언트 (api.js 실제 코드 기반)

```javascript
// ongil_ui/api.js — 실제 파일
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8001/api";

async function parseResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new Error(payload?.detail || fallbackMessage);
  return payload;
}

// 온식이 추가 요청할 함수 (온길에게 api.js에 추가해달라고 요청)
export async function fetchFoodRecommendation(foodData) {
  const response = await fetch(`${API_BASE_URL}/food/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(foodData),
  });
  return parseResponse(response, "맛집 추천을 가져오지 못했습니다.");
}
```

---

## 7. API 전체 명세

### 온길 기존 엔드포인트 (건드리지 마세요)
| Method | Path | 설명 |
|---|---|---|
| POST | `/api/course/generate` | 여행 코스 추천 |
| POST | `/api/review` | 리뷰 제출 |
| POST | `/api/tracking/visit_log` | GPS 방문로그 저장 |
| GET/PUT | `/api/admin/settings` | 추천 가중치 설정 |

### 온식 구현할 엔드포인트
| Method | Path | Request Body | 설명 |
|---|---|---|---|
| POST | `/api/food/recommend` | `FoodInput` | 맛집 추천 |
| POST | `/api/food/review` | `ReviewInput` | 맛집 리뷰 |
| GET | `/api/food/promotions` | — | 프로모션 맛집 목록 |

### `/api/food/recommend` 전체 예시

**Request:**
```json
{
  "start_lat": 34.9506,
  "start_lng": 127.4872,
  "age_group": "30s",
  "gender": "female",
  "companion_type": "couple",
  "companion_count": 2,
  "transport": "car",
  "place_count": 3,
  "food_category": "한식",
  "price_range": "medium",
  "mood": "cozy"
}
```

**Response:**
```json
{
  "summary": "순천 맛집 코스 3곳",
  "total_distance_km": 4.2,
  "total_estimated_min": 165,
  "warnings": [],
  "spots": [
    {
      "spot_id": "rest_001",
      "name": "순천만 전통 한정식",
      "category": "한식",
      "address": "전남 순천시 해룡면 ...",
      "description": "순천만 인근 신선한 식재료로 만든 한정식",
      "lat": 34.9123,
      "lng": 127.4811,
      "order": 1,
      "rating": 4.7,
      "estimated_arrival": "12:00",
      "estimated_stay_min": 60,
      "tags": ["한식", "로컬", "가성비"],
      "open_time": "11:00",
      "close_time": "21:00",
      "price_range": "medium"
    }
  ]
}
```

---

## 8. 온식 전용 데이터 수집 가이드

논문 기준으로 맛집 데이터 수집 방법:

```python
# 온식이 구현할 크롤러 예시 구조
# 참고: 온길은 공공데이터API + 네이버 블로그 여행지 크롤링

# 온식은 네이버 블로그 맛집 리뷰에 집중
# 수집 항목: 식당명, 카테고리, 주소, 별점, 방문 리뷰, 영업시간, 메뉴
# 정제 후 KoSimCSE로 768차원 임베딩 → Supabase spots 테이블에 저장

# 데이터 예시 (spots.json 포맷과 동일하게)
{
  "id": "rest_001",
  "name": "순천만 한정식",
  "kind": "food",           # 반드시 "food"
  "category": "한식",
  "region": "순천시 해룡면",
  "address": "전남 순천시 ...",
  "description": "...",
  "fallback_lat": 34.9123,  # domain.py의 Spot 모델 alias
  "fallback_lng": 127.4811,
  "base_stay_min": 60,
  "open_time": "11:00",
  "close_time": "21:00",
  "tags": ["한식", "로컬", "가성비"],
  "rating": 4.7,
  "review_count": 128,
  "featured": false
}
```

---

## 9. 개발 환경 세팅

```bash
# 백엔드 실행
cd ongil
python -m venv venv
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# API 문서 확인 (모든 엔드포인트, 스키마 확인 가능)
# http://localhost:8001/docs

# 프론트 실행
cd ongil_ui
npm install
npx expo start
```

---

## 10. Git 협업 규칙

```
main       ← 발표용 최종본 (직접 push 금지)
develop    ← 통합 테스트
feature/ongil-*   ← 온길 기능
feature/onsik-*   ← 온식 기능 (이 브랜치 사용)
```

**커밋 메시지:**
```
[onsik] feat: 맛집 조건 입력 화면 구현
[onsik] fix: 영업시간 필터 버그 수정
[common] chore: api.js fetchFoodRecommendation 추가
```

**공통 파일 변경 필요 시 → 성원(온길)에게 요청 후 PR**

---

## 11. 온식 시작 체크리스트

```
[ ] Git 클론 및 feature/onsik-init 브랜치 생성
[ ] 백엔드 실행 → http://localhost:8001/docs 확인
[ ] 프론트 실행 → Expo Go 또는 웹 브라우저 확인
[ ] ongil/app/schemas/food.py 생성 (FoodInput, FoodResult)
[ ] ongil/app/api/endpoints/food.py 생성 (라우터)
[ ] ongil/app/services/food_recommendation.py 생성
[ ] main.py에 food 라우터 등록 요청 → 온길(성원)에게
[ ] 맛집 데이터 수집 스크립트 작성 (kind='food')
[ ] ongil_ui/screens/onsik/ 폴더 생성 및 화면 작성
[ ] api.js에 fetchFoodRecommendation 추가 요청 → 온길(성원)에게
```

---

*문의 및 공통 파일 변경 요청: 온길 담당 성원*  
*API 문서: http://localhost:8001/docs*
