/**
 * 길이음 온식 디자인 규격 색상 (최소 약속 1)
 */
const COLORS = {
  primary: "#0f766e",        // 에메랄드 계열 메인
  primarySoft: "#ccfbf1",
  accent: "#f59e0b",         // 오렌지/옐로우 포인트
  ink: "#0f172a",            // 텍스트 다크
  muted: "#475569",          // 텍스트 그레이
  border: "#cbd5e1",         // 보더라인
  surface: "#ffffff",
  background: "#f8fafc",
  danger: "#dc2626",
  
  // 기존 코드 호환을 위한 매핑 (아래는 내부적으로 추가)
  textDark: "#0f172a",       // ink
  textGray: "#475569",       // muted
  coral: "#0f766e",          // 기존 coral 썼던 강조 버튼도 primary로 통일 (또는 accent)
  primaryLight: "#ccfbf1",   // primarySoft
};

export default COLORS;
