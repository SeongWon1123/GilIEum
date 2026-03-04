#!/bin/sh
# 길이음 백엔드 초기화 스크립트
set -e

# 마이그레이션 실행
python manage.py migrate

# 초기 데이터 로드 (데이터가 없을 때만)
python manage.py shell -c "
from onsik.models import Restaurant
if not Restaurant.objects.exists():
    import subprocess
    subprocess.run(['python', 'manage.py', 'loaddata', 'onsik/fixtures/suncheon_restaurants.json'], check=True)
    print('초기 데이터 로드 완료')
else:
    print('데이터가 이미 존재합니다. 초기 데이터 로드 건너뜀')
"

# 서버 시작
exec python manage.py runserver 0.0.0.0:8000
