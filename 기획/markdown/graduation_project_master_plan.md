# 🎓 길이음 (GilIEum) 졸업작품 마스터 플랜 — 온길(Ongil) 파트

> **논문 제목**: 실시간 위치 기반 AI RAG 파이프라인을 활용한 지역 상생 관광 큐레이션 시스템  
> **저자**: 최성원, 배성찬, 임세현, 허경준, 심춘보 (국립순천대학교 AI공학부)  
> **대상 학술대회**: 2026 한국스마트미디어학회 & 한국디지털산업학회 춘계학술대회  
> **우리 담당**: 온길 (여행 코스) — 성원 & AI 어시스턴트  
> **작성일**: 2026-04-06

---

## 📌 논문이 제시하는 시스템 핵심 차별점

| 구분 | 기존 관광 플랫폼 | 우리 시스템 (길이음) |
|---|---|---|
| 추천 엔진 | 단순 키워드 매칭 + 광고 기반 | **EXAONE 3.5 + RAG 지능형 문맥 추론** |
| 데이터 구조 | 정적 DB (RDBMS) | **Vector DB (pgvector) + 실시간 피드백** |
| 실시간성 | 고정 코스 제공 | **지오펜스 실시간 피드백 루프** |
| 주요 가치 | 상업적 수익 | **소상공인 및 지역 상생** |

---

## 🏗️ 시스템 전체 아키텍처 (논문 기준)

```
[사용자 앱 - React Native Expo SDK 52]
        ↓ 개인화 파라미터 (연령, 동행, 이동수단 등)
[FastAPI 백엔드]
        ↓ LangChain 프롬프트 템플릿
[EXAONE 3.5 LLM]  ←→  [KoSimCSE 768차원 벡터 임베딩]
                              ↕
                   [Supabase - PostgreSQL + pgvector]
                   (공공데이터 API + 네이버 블로그 크롤링)
        ↓ 추천 결과 (JSON: 이동 순서 + 추천 사유)
[지오펜스 모듈 - Expo-Location]
        ↓ 체류 시간 측정 (30m~200m 반경)
[Celery + Redis 비동기 파이프라인]
        ↓ 매일 새벽 배치 업데이트
[추천 알고리즘 재학습 → MAE 감소]
```

---

## 👤 온길 vs 온식 역할 분담 (명확한 경계)

### 온길 전담 (성원)
- ✅ 전체 기반 인프라 (FastAPI, Supabase, Docker)
- ✅ **AI/RAG 파이프라인** — EXAONE 3.5 연동, KoSimCSE 임베딩
- ✅ **여행지 데이터 수집** — 공공데이터 API + 네이버 블로그 크롤링
- ✅ **지오펜스 + Celery 비동기 파이프라인**
- ✅ 공통 UI 컴포넌트 & 디자인 시스템 (온식이 재사용)
- ✅ 온길 전용 화면: 여행 코스 입력 → 결과 → 지도 시각화

### 온식 전담 (파트너)
- 맛집 전용 데이터 수집 (네이버 블로그 맛집 리뷰, 별점)
- 맛집 추천 로직 (영업시간 필터, 가격대 필터, 프로모션)
- 온식 화면: 맛집 입력 → 결과 → 상세 페이지

### 공통 공유 (온길이 설계, 온식이 따름)
- Supabase DB 스키마 (spots, users, reviews, visit_logs)
- API 응답 포맷 표준
- React Native 공통 컴포넌트 (ChipGroup, Counter, Button 등)
- 디자인 토큰 (COLORS, TYPOGRAPHY)

---

## 📅 단계별 개발 계획 (Step by Step)

### ✅ Phase 0: 기반 정비 (완료 — 현재)
- [x] 논문 분석 및 역할 분담 확정
- [x] 공통 DB 스키마(`shared_schema.sql`) 설계
- [x] 온식 개발자 인계 서류(`onsik_handover.md`) 작성

---

### 🔄 Phase 1: 인프라 전환 (1~2주)
> MVP의 SQLite → 논문 스펙(Supabase + pgvector)으로 업그레이드

**백엔드:**
- [ ] **Supabase 프로젝트 생성** 및 PostgreSQL 연결
- [ ] **pgvector 익스텐션 활성화** (`CREATE EXTENSION vector;`)
- [ ] 기존 SQLite `storage.py` → `Supabase SDK` 기반으로 교체
- [ ] `spots` 테이블에 `embedding vector(768)` 컬럼 추가
- [ ] **Celery + Redis 세팅** (비동기 파이프라인용)
- [ ] Docker Compose 구성 (`api`, `celery`, `redis` 서비스)

**프론트엔드:**
- [ ] React Navigation v6 설치 (`BottomTab + Stack` 구조)
- [ ] 공통 디자인 시스템 파일 분리:
  - `constants/colors.js` (기존 COLORS 토큰)
  - `constants/typography.js`
- [ ] 공통 컴포넌트를 `components/common/`으로 분리:
  - `Button.js`, `ChipGroup.js`, `Counter.js`, `MetaBadge.js`, `LoadingOverlay.js`
- [ ] 화면 구조 분리: `screens/ongil/`, `screens/onsik/`, `screens/common/`

---

### 🤖 Phase 2: AI/RAG 파이프라인 구축 (2~3주)
> 논문의 핵심: EXAONE 3.5 + KoSimCSE 임베딩 + pgvector 벡터 검색

**데이터 수집:**
- [ ] **공공데이터포털 API** 연동 — 관광지 기본 정보(명칭, 주소, 카테고리, 개장시간)
- [ ] **네이버 블로그 크롤러** 작성 — 방문 리뷰, 별점, 감성 키워드
- [ ] 데이터 정제 파이프라인:
  - 광고성 문구 제거 + 텍스트 정규화
  - 장소 특성 + 사용자 경험 통합 컨텍스트 생성
- [ ] **KoSimCSE 모델** 로드 및 768차원 벡터 임베딩 저장

**RAG 추천 엔진:**
- [ ] **LangChain 프롬프트 템플릿** 설계
  - 입력: 연령대, 동행유형, 이동수단, 테마, 위치
  - 출력: JSON (방문 순서 + 추천 사유 + 이동 동선)
- [ ] **EXAONE 3.5** API 연동 (또는 로컬 모델 서빙)
- [ ] 벡터 검색 쿼리: `SELECT ... ORDER BY embedding <-> $query_vec LIMIT 20`
- [ ] 기존 가중치 스코어링 → RAG 기반으로 교체

---

### 📡 Phase 3: 지오펜스 + 피드백 루프 (1~2주)
> 논문의 차별점: 실시간 체류시간 측정 → 알고리즘 재학습

**지오펜스 모듈:**
- [ ] `Expo-Location` 기반 위치 추적 (기존 MVP 코드 있음, 고도화)
- [ ] 반경 설정: 음식점 **30~90m**, 관광지 **100~200m**
- [ ] 진입/이탈 이벤트 → `visit_logs` 테이블 저장

**비동기 파이프라인 (Celery + Redis):**
- [ ] **Celery Beat** 스케줄러 설정 — 매일 새벽 2시 배치 실행
- [ ] 배치 작업: `visit_logs` 분석 → 예측 소요시간 오차(MAE) 계산
- [ ] 계산된 파라미터 → 추천 알고리즘 가중치 자동 업데이트

---

### 🎨 Phase 4: 온길 화면 완성 (1주)
> 논문 그림 2 기준: 파라미터 입력 → 지도 시각화 → 추천 코스

- [ ] **온길 홈 화면** (`screens/ongil/OngilHomeScreen.js`)
- [ ] **조건 입력 화면** (`screens/ongil/CourseFormScreen.js`)
  - 연령대, 동행 유형, 이동 수단, 테마, 장소 수 입력
- [ ] **결과 화면** (`screens/ongil/CourseResultScreen.js`)
  - 추천 사유 포함 코스 카드
  - **지도 위에 경유지 마커 + 경로선 시각화** (논문 핵심)
- [ ] **방문 추적 UI** — 실시간 진행 상태 (현재 위치, 다음 목적지)
- [ ] **리뷰 화면** 개선 — 체류 시간 자동 기록 + 별점 제출

---

### 🔗 Phase 5: 온식 통합 + 최종 완성 (1~2주)
- [ ] 온식 파트 코드와 탭 통합
- [ ] 통합 E2E 테스트 (추천 → 이동 → 체류 → 리뷰 → 재학습 전체 루프)
- [ ] 클라우드 배포 (Supabase 호스팅 + 앱 서버)
- [ ] 향후 연구 방향 반영: EXAONE Fine-tuning 구조 준비

---

## ⚙️ 기술 스택 확정 (논문 기준)

| 분류 | 기술 | 비고 |
|---|---|---|
| **앱** | React Native + Expo SDK 52 | iOS/Android 동시 지원 |
| **네비게이션** | React Navigation v6 | BottomTab + Stack |
| **백엔드** | FastAPI (Python 3.11+) | 기존 구조 유지 + 확장 |
| **DB** | Supabase (PostgreSQL + pgvector) | SQLite에서 완전 마이그레이션 |
| **AI 모델** | EXAONE 3.5 (LG AI Research) | 오픈소스 LLM |
| **임베딩** | KoSimCSE (768차원) | 한국어 특화 문장 임베딩 |
| **RAG 프레임워크** | LangChain | 프롬프트 템플릿 + 체인 관리 |
| **지오펜스** | Expo-Location | 30~200m 반경 감지 |
| **비동기 파이프라인** | Celery + Redis | 매일 새벽 배치 처리 |
| **컨테이너** | Docker Compose | api + celery + redis |

---

## 🚨 통합 시 반드시 지켜야 할 규칙

1. **공통 컴포넌트** (`components/common/`) 수정 시 온식에게 반드시 공유
2. **Supabase 스키마 변경** 시 마이그레이션 SQL 파일 작성 필수
3. **API 응답 포맷** 절대 임의 변경 금지 — 온식과 합의 후 변경
4. **커밋 메시지** 규칙: `[ongil] feat: RAG 파이프라인 구축`
5. **환경변수**: `ONGIL_*` 접두어 사용, `.env.example` 유지
6. **브랜치 전략**: `feature/ongil-rag-pipeline` 형태로 생성 후 `develop`에 PR

---

## 📊 논문 향후 연구 방향 (졸업작품 후)
- EXAONE 3.5 **Fine-tuning** — 순천 지역 도메인 특화
- **카드 결제 데이터** 연동 → 실제 소비 패턴 분석
- 지역 소상공인 기여도 정밀 측정 시스템
