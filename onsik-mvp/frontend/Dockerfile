# 길이음 프론트엔드 - Expo 웹 컨테이너
FROM node:20-slim

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐싱 최적화)
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

EXPOSE 8081

# Expo 웹 모드로 실행 (CI=1 은 --non-interactive 대체)
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
