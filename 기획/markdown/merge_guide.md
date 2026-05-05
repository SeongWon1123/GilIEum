# 🔗 길이음(GilIEum) 통합 가이드
## — 온길 + 온식 합치기 —

> **이 문서는 졸업작품이 끝난 후, 온길과 온식을 하나의 앱으로 합칠 때 사용합니다.**  
> 최소 약속 4가지를 지켰다면 **예상 소요: 1~2일**입니다.

---

## ⏱️ 왜 쉽게 합칠 수 있나?

두 팀이 개발 중에 지킨 약속 덕분입니다:

| 약속 | 효과 |
|------|------|
| 컬러 시스템 통일 | UI 합쳐도 같은 색 → 리디자인 불필요 |
| API 응답 포맷 통일 | 프론트가 두 API를 동일하게 처리 가능 |
| 테이블명 충돌 방지 | DB 마이그레이션 없이 그냥 연결 |
| 입력 필드 값 통일 | 공통 입력 폼 하나로 두 팀 API에 동시 전달 가능 |

---

## 📋 통합 전 체크리스트

통합 시작 전, 두 팀 모두 확인:

- [ ] 온길 백엔드 `http://localhost:8001/docs` 정상 동작
- [ ] 온식 백엔드 `http://localhost:8002/docs` 정상 동작
- [ ] 온길 Supabase에 `attractions` 데이터 존재 확인
- [ ] 온식 Supabase에 `restaurants` 데이터 존재 확인
- [ ] 두 팀 모두 COLORS 값이 동일한지 확인
- [ ] 두 팀 모두 age_group/gender/companion/transport 값이 동일한지 확인

---

## STEP 1: DB 통합 (30분)

온길과 온식이 각자 쓴 Supabase를 **하나로 합칩니다.**

### 방법 A: 한쪽 Supabase에 다른 쪽 테이블 추가 (권장)

```bash
# 1. 온길 Supabase를 메인으로 채택
# 2. 온식 Supabase에서 restaurants, blog_reviews, food_feedbacks 데이터 export
# 3. 온길 Supabase에 온식 테이블 생성 + 데이터 import

# Supabase CLI로 데이터 export (온식 측)
supabase db dump --data-only --table restaurants > restaurants_data.sql
supabase db dump --data-only --table blog_reviews > blog_reviews_data.sql
supabase db dump --data-only --table food_feedbacks > food_feedbacks_data.sql

# 온길 Supabase에 온식 테이블 스키마 추가 (온식 agent_plan의 SQL 그대로)
# → Supabase 대시보드 SQL Editor에서 실행
```

### 방법 B: DB 분리 유지하고 API만 통합 (더 쉬움)

```
온길 백엔드(8001) → 온길 Supabase 연결 유지
온식 백엔드(8002) → 온식 Supabase 연결 유지
통합 앱은 두 백엔드를 동시에 호출
```

> **발표용으로는 방법 B가 훨씬 빠릅니다.** 실서비스 전환 시 방법 A로 이전.

---

## STEP 2: 백엔드 통합 (1~2시간)

두 개의 독립 FastAPI 서버를 **하나로 합칩니다.**

### 통합 백엔드 구조

```
gileum-backend/          ← 새 통합 프로젝트 폴더 생성
├── main.py
├── routers/
│   ├── travel.py        ← 온길 routers/travel.py 그대로 복사
│   ├── feedback.py      ← 온길 routers/feedback.py 그대로 복사
│   ├── admin.py         ← 온길 routers/admin.py 그대로 복사
│   ├── restaurant.py    ← 온식 routers/restaurant.py 그대로 복사
│   └── review.py        ← 온식 routers/review.py 그대로 복사
├── ai/                  ← 온길 ai/ 폴더 그대로 복사 (온식도 동일 구조)
├── crawler/             ← 두 팀 크롤러 파일 모두 넣기
├── tasks/               ← celery_app.py 하나로 합치기 (아래 참조)
├── db/
│   └── supabase_client.py
└── schemas/
    ├── domain.py        ← 온길 스키마
    └── food.py          ← 온식 스키마 그대로
```

### 통합 main.py

```python
# gileum-backend/main.py
from fastapi import FastAPI
from routers import travel, feedback, admin, restaurant, review

app = FastAPI(
    title="길이음(GilIEum) API",
    description="순천 지역 AI 여행·맛집 추천 통합 서비스",
    version="2.0.0"
)

# 온길 라우터
app.include_router(travel.router, prefix="/api", tags=["여행 코스"])
app.include_router(feedback.router, prefix="/api", tags=["여행 피드백"])
app.include_router(admin.router, prefix="/api/admin", tags=["관리자"])

# 온식 라우터
app.include_router(restaurant.router, prefix="/api", tags=["맛집 추천"])
app.include_router(review.router, prefix="/api", tags=["맛집 리뷰"])
```

### 통합 Celery (tasks/celery_app.py)

```python
from celery import Celery
from celery.schedules import crontab

celery_app = Celery('gileum', broker='redis://localhost:6379/0')  # 포트 하나로 통일

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # 온길: 관광지 체류시간 학습
    sender.add_periodic_task(
        crontab(hour=2, minute=0),
        update_attraction_duration_stats.s(),
        name='관광지 체류시간 학습'
    )
    # 온식: 맛집 별점 + 체류시간 학습
    sender.add_periodic_task(
        crontab(hour=2, minute=30),
        update_restaurant_stats.s(),
        name='맛집 통계 갱신'
    )
```

---

## STEP 3: 프론트엔드 통합 (2~3시간)

두 개의 독립 앱을 **탭 기반 하나의 앱**으로 합칩니다.

### 통합 앱 구조

```
gileum-app/
├── App.js               ← 새로 작성 (탭 네비게이션)
├── screens/
│   ├── travel/          ← 온길 screens/ 폴더 그대로 이동
│   │   ├── InputScreen.js
│   │   ├── CourseScreen.js
│   │   └── DetailScreen.js
│   └── food/            ← 온식 screens/ 폴더 그대로 이동
│       ├── HomeScreen.js
│       ├── FormScreen.js
│       ├── ResultScreen.js
│       └── DetailScreen.js
├── components/          ← 두 팀 컴포넌트 합치기 (ChipGroup, Counter는 동일하므로 하나만 유지)
│   ├── ChipGroup.js     ← 온길/온식 중 하나만 (동일함)
│   ├── Counter.js       ← 온길/온식 중 하나만 (동일함)
│   ├── PlaceCard.js     ← 온길 (관광지 카드)
│   ├── FoodCard.js      ← 온식 (맛집 카드)
│   └── CourseMap.js     ← 온길 (지도)
└── services/
    ├── api.js           ← 두 팀 API 함수 합치기 (아래 참조)
    └── geofencing.js    ← 온길에서 그대로 복사
```

### 통합 App.js (탭 네비게이션)

```javascript
// gileum-app/App.js
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 온길 화면
import InputScreen from './screens/travel/InputScreen';
import CourseScreen from './screens/travel/CourseScreen';

// 온식 화면
import FoodHomeScreen from './screens/food/HomeScreen';
import FoodFormScreen from './screens/food/FormScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="여행코스"
          component={InputScreen}
          options={{ tabBarIcon: () => <Text>🗺️</Text> }}
        />
        <Tab.Screen
          name="맛집추천"
          component={FoodHomeScreen}
          options={{ tabBarIcon: () => <Text>🍽️</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

### 통합 api.js

```javascript
// gileum-app/services/api.js
// 온길 API (포트 8001 → 통합 후 8000 또는 배포 URL)
const ONGIL_API = process.env.EXPO_PUBLIC_ONGIL_API || "http://localhost:8001/api";
// 온식 API (포트 8002 → 통합 후 동일 서버)
const ONSIK_API = process.env.EXPO_PUBLIC_ONSIK_API || "http://localhost:8002/api";
// 통합 후: const API = "http://통합서버/api";

async function parseResponse(response, msg) {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.detail || msg);
  return payload;
}

// 온길: 여행 코스 추천
export async function fetchTravelCourse(data) {
  const res = await fetch(`${ONGIL_API}/recommend/course`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse(res, "여행 코스를 가져오지 못했습니다.");
}

// 온식: 맛집 추천
export async function fetchFoodRecommendation(data) {
  const res = await fetch(`${ONSIK_API}/food/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseResponse(res, "맛집 추천을 가져오지 못했습니다.");
}

// 온식: 프로모션
export async function fetchFoodPromotions() {
  const res = await fetch(`${ONSIK_API}/food/promotions`);
  return parseResponse(res, "프로모션 정보를 불러오지 못했습니다.");
}
```

---

## STEP 4: 통합 코스 화면 구현 (선택, 2~3시간)

온길+온식 결과를 **하나의 여정**으로 보여주는 통합 코스 화면입니다.  
*(발표에서 가장 임팩트 있는 기능)*

### 아이디어: 통합 여정 화면

```
[여행 출발] 09:00
  ↓
[🏞️ 순천만 국가정원] 09:00~11:30 (온길 추천)
  ↓
[🍽️ 순천만 한정식] 12:00~13:00 (온식 추천)
  ↓
[🏘️ 낙안읍성] 13:30~15:00 (온길 추천)
  ↓
[☕ 로컬 카페] 15:30~16:30 (온식 추천)
  ↓
[여행 종료]
```

```javascript
// screens/IntegratedCourseScreen.js
export default function IntegratedCourseScreen({ userInput }) {
  const [course, setCourse] = useState([]);

  useEffect(() => {
    async function loadCourse() {
      // 온길 + 온식 동시 호출
      const [travelResult, foodResult] = await Promise.all([
        fetchTravelCourse(userInput),
        fetchFoodRecommendation({ ...userInput, place_count: 2 }),
      ]);

      // 관광지와 맛집을 순서에 맞게 인터리빙
      const merged = mergeCourse(travelResult.spots, foodResult.spots);
      setCourse(merged);
    }
    loadCourse();
  }, []);

  return (
    <ScrollView>
      {course.map((item, idx) => (
        <PlaceCard key={idx} item={item} type={item.type} />
      ))}
    </ScrollView>
  );
}

function mergeCourse(attractions, restaurants) {
  /**
   * 관광지 2개당 맛집 1개 비율로 인터리빙
   * 예: [관광지1, 관광지2, 맛집1, 관광지3, 맛집2]
   * arrival_time 기준으로 재정렬
   */
  const result = [];
  let aIdx = 0, rIdx = 0;
  let currentTime = "09:00";

  while (aIdx < attractions.length || rIdx < restaurants.length) {
    if (aIdx < attractions.length) {
      result.push({ ...attractions[aIdx], type: 'attraction' });
      aIdx++;
    }
    if (aIdx < attractions.length) {
      result.push({ ...attractions[aIdx], type: 'attraction' });
      aIdx++;
    }
    if (rIdx < restaurants.length) {
      result.push({ ...restaurants[rIdx], type: 'restaurant' });
      rIdx++;
    }
  }
  return result;
}
```

---

## STEP 5: 배포 통합 (1시간)

```yaml
# docker-compose.yml (통합 배포)
services:
  api:
    build: ./gileum-backend
    ports: ["8000:8000"]        # 하나의 포트로 통합
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}

  celery:
    build: ./gileum-backend
    command: celery -A tasks.celery_app worker -B

  redis:
    image: redis:alpine
    ports: ["6379:6379"]        # 하나의 포트로 통합

  ollama:
    image: ollama/ollama
    volumes: ["ollama:/root/.ollama"]
```

### 프론트 .env 통합

```
# 통합 후: 하나의 API 서버 URL
EXPO_PUBLIC_ONGIL_API=https://gileum-api.run.app/api
EXPO_PUBLIC_ONSIK_API=https://gileum-api.run.app/api
```

---

## 📊 통합 작업 예상 시간표

| 단계 | 작업 | 예상 시간 |
|------|------|:--------:|
| STEP 1 | DB 통합 (방법 B: API 분리 유지) | **30분** |
| STEP 2 | 백엔드 통합 (main.py 작성) | **1~2시간** |
| STEP 3 | 프론트 통합 (탭 + api.js) | **2~3시간** |
| STEP 4 | 통합 코스 화면 (선택) | **2~3시간** |
| STEP 5 | 배포 통합 | **1시간** |
| **총합** | | **6~9시간 (약 1~2일)** |

---

## ⚠️ 통합 시 자주 발생하는 문제

### 문제 1: ChipGroup이 두 개 (온길/온식 각자 만듦)
```
해결: 온길 것 또는 온식 것 하나만 남기고 import 경로 수정
→ 어차피 같은 코드 (약속 1 COLORS 사용했으므로)
```

### 문제 2: 포트 충돌 (8001, 8002, 6379, 6380)
```
해결: 통합 후 main.py 하나에서 8000번 단일 포트로 실행
      Redis도 6379 하나로 통일
```

### 문제 3: DB 데이터 중복 (온길Supabase + 온식Supabase)
```
해결: 방법 B(API 분리 유지)로 통합하면 이 문제 없음
      실서비스 전환 시에만 방법 A(DB 하나로 합치기) 진행
```

### 문제 4: 공통 입력 폼 데이터가 두 API에 동시 필요
```
해결: 약속 4를 지켰으므로 UserInput 객체를 그대로
      fetchTravelCourse(userInput) + fetchFoodRecommendation(userInput) 동시 호출 가능
```

---

## ✅ 통합 완료 기준

- [ ] `http://통합서버/docs`에서 온길 + 온식 API 모두 표시
- [ ] 앱 탭에서 "여행코스" / "맛집추천" 각각 정상 동작
- [ ] 공통 입력 폼 데이터가 두 API에 동시 전달
- [ ] COLORS 통일 → UI 어색함 없음
- [ ] 통합 코스 화면에서 관광지 + 맛집 인터리빙 표시 (선택)

---

*온길 API 문서: http://localhost:8001/docs (개발 중)*  
*온식 API 문서: http://localhost:8002/docs (개발 중)*  
*통합 API 문서: http://localhost:8000/docs (통합 후)*
