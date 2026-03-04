# 길이음 백엔드 - Django 컨테이너
FROM python:3.11-slim

WORKDIR /app

# SQLite 데이터 디렉토리 생성 (볼륨 마운트 포인트)
RUN mkdir -p /app/data

# 의존성 먼저 설치 (레이어 캐싱 최적화)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# Windows 환경에서 CRLF로 체크아웃된 경우 LF로 변환
RUN find . -name "*.sh" -exec sed -i 's/\r$//' {} + && chmod +x entrypoint.sh

EXPOSE 8000

# 초기화 스크립트 실행 (마이그레이션 + 조건부 초기 데이터 로드 + 서버 시작)
CMD ["sh", "entrypoint.sh"]
