/**
 * Optional category descriptions, keyed by normalized category key.
 * Written only from the titles of the posts in each category; categories
 * without a reliable description simply show none.
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  dreamhack: '워게임 문제 풀이 기록 — wargame.kr 문제(PHP 비교 연산, type confusion, LFI, 세션 위조, SQL Injection 등)',
  ubuntu: 'Ubuntu · Debian 환경 기록 — Docker 설치와 명령어, Docker + QEMU, LXD, 한글 깨짐 해결',
  linux: 'Linux 환경 구성 기록 — LXD 설치·사용, Debian 계열 한글 깨짐 해결',
  모의해킹수업: '모의해킹 수업 정리 — 웹 서비스 구조, Blind SQL Injection 과정',
  windows: 'Windows 환경 기록 — WSL 저장 공간(VHDX) 위치 옮기기',
  ssh: 'SSH 연결 오류(Host key verification failed) 해결',
  error: '에러 해결 기록 — SSH 연결 오류',
  기술: '기술 활용 정보 — Selenium in Python',
  uncategorized: '카테고리 없이 작성된 글 — 웹 해킹 이론·실습(SQLi, XSS, CSRF, SSRF, File Upload 등)과 웹 서버 만들기 연재',
};
