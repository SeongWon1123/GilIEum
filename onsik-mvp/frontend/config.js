/**
 * 앱 전역 설정
 * 배포 환경에 맞게 API_BASE_URL을 변경하세요.
 */

// 백엔드 API 기본 URL
// 로컬 개발: 'http://localhost:8002'
// Docker: EXPO_PUBLIC_API_BASE_URL 환경 변수로 설정 가능
// 실제 서버: 'https://api.gilieum.kr'
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8002';
