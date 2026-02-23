# 온길 MVP 좌표 파이프라인

## 목적
- 장소 데이터를 수동으로 좌표 입력하지 않고 자동 좌표화
- 한번 좌표화한 결과를 캐시/결과 파일로 저장해서 재사용

## 파일 구조
- `spots_raw.json`: 원본 장소 데이터(이름/주소힌트/기본정보)
- `geocode_batch.py`: 카카오 Local API 배치 좌표화 스크립트
- `geocoded_spots.json`: 좌표 확정 결과(추천 엔진이 우선 사용)
- `geocode_cache.json`: 검색 캐시

## 실행
```bash
cd ongil_mvp
set KAKAO_REST_API_KEY=여기에_REST_API_키
python geocode_batch.py
```

PowerShell:
```powershell
$env:KAKAO_REST_API_KEY="여기에_REST_API_키"
python .\geocode_batch.py
```

## 동작 방식
1. `spots_raw.json`의 장소명을 기준으로 `순천 {장소명}` 검색
2. 후보에 대해 이름 유사도/순천 주소 포함/기준좌표 거리로 점수화
3. 최고 점수 좌표를 채택하여 `geocoded_spots.json` 저장
4. 실패 시 fallback 좌표 사용

## 추천 엔진 연동
- `sample_data.py`는 `geocoded_spots.json`이 있으면 자동 사용
- 파일이 없거나 손상되면 fallback 데이터 자동 사용
