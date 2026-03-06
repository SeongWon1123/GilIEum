# 온길팀 MVP UI (임시 시안)

## 실행

```bash
cd ongil_mvp_ui
npm install
npm run start
```

## 카카오맵 연동 (웹)

1. `ongil_mvp_ui` 폴더에 `.env` 파일 생성
2. 아래 값 추가

```bash
EXPO_PUBLIC_KAKAO_JS_KEY=여기에_JavaScript_키
```

3. 재실행

```bash
npm run start -- --clear
```

- 추천 결과 화면에서 카카오맵 마커를 확인할 수 있습니다.
- 키가 없으면 지도 영역에 안내 문구만 표시됩니다.

- `w`: 웹으로 보기
- `a`: 안드로이드 에뮬레이터
- `i`: iOS 시뮬레이터(Mac)

## 화면 구성

1. 입력 폼 (연령대/성별/동행유형/인원/이동수단/장소 수)
2. 추천 코스 결과 카드
3. 총 거리/총 시간 요약

현재는 시연용 더미 추천 로직이 포함되어 있습니다.
