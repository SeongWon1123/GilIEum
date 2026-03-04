# 온식(OnsIK) MVP — 순천 맛집 탐방

> **길이음(GilIEum)** 프로젝트 | 온식팀 MVP 모델  
> 기획서 `기획_통합정리_v3.md` 기반으로 구현

---

## 📌 개요

순천 지역의 **맛집 추천 + 별점 피드백 수집** MVP 모델입니다.

- 로그인/회원가입 없이 즉시 사용 가능 (MVP 원칙)
- 사용자 특성(연령대, 성별, 동행유형, 이동수단) 기반 맛집 추천
- 맛집 기본 정보 표시: 별점, 영업시간, 위치, 태그
- 별점 + 후기 제출 → AI 학습 데이터 축적 기반

---

## 🗂️ 프로젝트 구조

```
onsik-mvp/
├── backend/                    # Django 백엔드
│   ├── manage.py
│   ├── requirements.txt
│   ├── gilieum/                # Django 프로젝트 설정
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── onsik/                  # 온식 앱
│       ├── models.py           # Restaurant, UserRating 모델
│       ├── serializers.py      # DRF 직렬화
│       ├── views.py            # API 뷰
│       ├── urls.py             # URL 라우팅
│       ├── admin.py            # Django Admin 설정
│       └── fixtures/
│           └── suncheon_restaurants.json   # 순천 맛집 샘플 데이터 12곳
└── frontend/                   # React Native (Expo) 프론트엔드
    ├── App.js                  # 네비게이션 설정
    ├── config.js               # API URL 설정
    ├── package.json
    ├── babel.config.js
    └── screens/
        ├── UserInputScreen.js       # 사용자 정보 입력 화면
        ├── RestaurantListScreen.js  # 맛집 목록 화면
        └── RestaurantDetailScreen.js # 맛집 상세 + 평가 화면
```

---

## 🚀 실행 방법

### Docker 실행 (권장)

프로젝트 루트(`onsik-mvp/`)에서 실행:

```bash
# 1) .env 파일 생성 (Windows는 ipconfig로 IPv4 확인)
copy .env.example .env
# 2) .env의 HOST_IP를 내 PC IPv4로 수정
# 3) .env의 EXPO_PUBLIC_KAKAO_JS_KEY에 Kakao Developers JavaScript 키 입력
```

```bash
# 백엔드만 실행 (기본)
docker compose up --build
```

- 백엔드 API: `http://localhost:8000`
- 최초 실행 시 마이그레이션 + 샘플 데이터(12개)가 자동 반영됩니다.

프론트(Expo)까지 Docker로 함께 실행하려면:

```bash
docker compose --profile frontend up --build
```

- Expo Dev Server: `http://localhost:8081`
- `HOST_IP` 기반으로 Expo 번들 주소/백엔드 API 주소가 주입됩니다.
- 브라우저에서 `http://localhost:8081`를 열면 JSON 매니페스트가 보이는 것이 정상입니다.
- 실제 앱 화면은 Expo Go에서 `exp://<HOST_IP>:8081`로 접속해 확인하세요.

브라우저 화면(Web)으로 바로 확인하려면:

```bash
docker compose --profile web up --build
```

- 웹 앱 주소: `http://localhost:19006`

중지:

```bash
docker compose down
```

### 백엔드 (Django)

```bash
cd onsik-mvp/backend

# 의존성 설치
pip install -r requirements.txt

# DB 마이그레이션
python manage.py migrate

# 샘플 데이터 로드 (순천 맛집 12곳)
python manage.py loaddata onsik/fixtures/suncheon_restaurants.json

# 서버 실행
python manage.py runserver
```

> 서버 실행 후 http://localhost:8000 에서 접근 가능

### 프론트엔드 (React Native + Expo)

```bash
cd onsik-mvp/frontend

# 의존성 설치
npm install

# Expo 개발 서버 실행
npx expo start
```

> QR 코드로 Expo Go 앱에서 실행하거나, 에뮬레이터에서 확인 가능

---

## 🔌 API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| `GET` | `/api/restaurants/` | 맛집 목록 조회 |
| `GET` | `/api/restaurants/?category=한식` | 카테고리 필터 |
| `GET` | `/api/restaurants/?recommended_for=가족` | 동행유형 필터 |
| `GET` | `/api/restaurants/<id>/` | 맛집 상세 조회 (최근 평가 포함) |
| `POST` | `/api/restaurants/<id>/rate/` | 평가 등록 |
| `GET` | `/api/restaurants/categories/` | 카테고리 목록 조회 |

### 평가 등록 예시 (POST `/api/restaurants/1/rate/`)

```json
{
  "score": 5,
  "comment": "정말 맛있었어요!",
  "age_group": "20대",
  "gender": "여",
  "companion_type": "친구",
  "companion_count": 3
}
```

---

## 📱 화면 구성

### 1. 사용자 입력 화면 (`UserInputScreen`)
- 연령대 선택 (10대 ~ 50대이상)
- 성별 선택 (남성/여성/미선택)
- 동행 유형 선택 (단독/커플/친구/가족/단체)
- 동행자 수 (증감 버튼)
- 이동수단 선택 (도보/자차/대중교통)
- 음식 카테고리 다중 선택 (전체/한식/중식/일식/카페/분식)

### 2. 맛집 목록 화면 (`RestaurantListScreen`)
- 카테고리 필터 칩
- 맛집 카드: 이름, 카테고리, 주소, 평점, 영업시간, 태그

### 3. 맛집 상세 화면 (`RestaurantDetailScreen`)
- 상세 정보: 이름, 카테고리, 주소, 전화번호, 설명
- 별점 및 리뷰 목록
- 평가 등록 폼 (별점 + 후기 텍스트)

---

## 🛠️ 기술 스택

| 계층 | 기술 |
|------|------|
| 프론트엔드 | React Native + Expo |
| 백엔드 API | Django 4.2 + Django REST Framework |
| 데이터베이스 | SQLite (MVP) → MongoDB 교체 예정 |
| 인증 | 없음 (MVP 원칙) |
| CORS | django-cors-headers (개발 중 전체 허용) |

---

## 📋 MVP 포함 기능

| 기능 | 상태 | 설명 |
|------|------|------|
| 맛집 추천 목록 | ✅ | 카테고리·동행유형 필터 |
| 맛집 기본 정보 | ✅ | 별점, 영업시간, 위치, 태그 |
| 별점 피드백 수집 | ✅ | 연령대·성별 메타데이터 포함 |
| 로그인/회원가입 | ❌ | MVP 제외 (2차 버전) |
| 블로그 크롤링 | ❌ | 2차 버전 |
| AI 리뷰 분석 | ❌ | 2차 버전 |
| 소상공인 템플릿 | ❌ | 2차 버전 |

---

## ⚠️ 프로덕션 배포 전 필수 변경사항

- `settings.py`의 `SECRET_KEY`를 환경변수로 교체
- `DEBUG = False` 설정
- `CORS_ALLOW_ALL_ORIGINS = False` 및 특정 도메인 허용
- SQLite → MongoDB 교체
- HTTPS 적용
