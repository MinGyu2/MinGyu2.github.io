/**
 * Engineering projects. Every statement here must be traceable to the blog's own
 * posts or to this repository — no invented history, metrics or completion status.
 * `evidence` lists the legacy source files a node/claim is based on.
 */
export interface ArchNode {
  id: string;
  code: string;
  title: string;
  sub: string;
  color: string;
  detail: string;
  stack: string[];
  /** legacySource paths of posts documenting this stage */
  evidence: string[];
}

export interface Project {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  /** Article series documenting the project (src/data/taxonomy.ts) */
  seriesId?: string;
  /** Documented security exercises/findings — each must link to the post that records it. */
  findings?: { label: string; href: string }[];
  summary: string;
  status: string;
  verification: 'verified';
  verificationNote: string;
  stack: string[];
  links: { label: string; href: string }[];
  architecture?: ArchNode[];
}

const WS = '_posts/웹_서버_개발/';

export const PROJECTS: Project[] = [
  {
    id: 'jsp-web-server',
    code: 'PRJ-01',
    title: 'Web Server Security Lab',
    subtitle: 'JSP · Servlet 기반 보안 실습용 웹 서버',
    summary:
      '웹 취약점을 학습·재현·검증하기 위한 통제된 실습 환경으로 직접 구축한 웹 서버입니다. Nginx 리버스 프록시, Apache Tomcat(Servlet/JSP), Oracle DB를 연동해 로그인·회원가입·게시판·파일 업로드/다운로드·마이페이지·비회원 문의 게시판을 구현했고, 이 기능들을 대상으로 공격을 시도하고 발견한 취약점을 보완했습니다.',
    status: '연재 기록 19편 · 2023-04-02 ~ 2023-06-22',
    verification: 'verified',
    verificationNote: '구성·기능·취약점 사례는 모두 「웹서버 만들기」 연재와 관련 실습 글에 기록된 내용만 반영했습니다.',
    seriesId: 'web-server-lab',
    findings: [
      { label: '파일 업로드 저장 경로 조작(Traversal) 취약점을 발견하고 특정 문자 차단으로 제거', href: '/웹서버FileUpload취약점제거/' },
      { label: '직접 만든 로그인 페이지에서 Reflected XSS 취약점 확인', href: '/웹서버XSS취약점/' },
      { label: '직접 만든 웹 페이지의 업로드 기능을 대상으로 웹 쉘 업로드 실습', href: '/FileUpload실습1/' },
      { label: 'File Upload 취약점 제거를 위해 업로드 파일을 웹 서버가 아닌 DB 테이블에 저장하도록 변경', href: '/웹서버개발18DB테이블파일저장/' },
    ],
    stack: ['Ubuntu 22.04.2 LTS', 'Nginx', 'Apache Tomcat 10.1.7', 'Java Servlet · JSP', 'JDBC', 'Oracle Database XE 21c', 'Rocky Linux (VM)'],
    links: [
      { label: '연재 1편 읽기', href: '/웹서버개발1/' },
      { label: '최신 편(19) 읽기', href: '/웹서버개발19비회원게시판/' },
    ],
    architecture: [
      {
        id: 'client',
        code: 'STAGE 01',
        title: 'CLIENT',
        sub: 'Browser · GET / POST',
        color: 'var(--accent-primary)',
        detail:
          '브라우저에서 GET/POST 요청으로 로그인·회원가입·게시판 화면을 사용합니다. 회원가입 화면에서 아이디 중복, 이메일 형식, 비밀번호 일치를 확인하고, 우편번호 데이터 기반 주소 검색 기능을 제공합니다.',
        stack: ['HTML Form', 'GET / POST', 'JavaScript'],
        evidence: [`${WS}2023-04-09-웹서버개발5.md`, `${WS}2023-04-20-웹서버개발8.md`, `${WS}2023-04-26-웹서버개발9주소검색.md`],
      },
      {
        id: 'nginx',
        code: 'STAGE 02',
        title: 'NGINX',
        sub: 'Reverse Proxy · Ubuntu',
        color: 'var(--accent-secondary)',
        detail:
          'Ubuntu 22.04.2 LTS의 Nginx가 요청을 받아 location / 의 proxy_pass로 Tomcat에 전달합니다. 연동 중 try_files 설정으로 JSP가 동작하지 않던 오류를 해결했고, 파일 업로드를 위해 client_max_body_size로 요청 본문 크기를 설정했습니다.',
        stack: ['proxy_pass', 'sites-enabled/default', 'client_max_body_size'],
        evidence: [`${WS}2023-04-02-웹서버개발1.md`, `${WS}2023-05-25-웹서버개발13.md`, `${WS}2023-06-04-웹서버개발15.md`],
      },
      {
        id: 'tomcat',
        code: 'STAGE 03',
        title: 'TOMCAT',
        sub: 'Servlet · JSP (WAS)',
        color: 'var(--accent-mint)',
        detail:
          'Tomcat 10.1.7 위에서 Servlet(doGet/doPost)이 요청을 처리하고 JSP로 화면을 응답합니다. <jsp:include>로 페이지를 모듈화했고, 게시글 작성·수정·삭제, 페이징, 검색(날짜 지정 포함), 조회수, 좋아요·정렬, 마이페이지, 비회원 문의 게시판을 구현했습니다. 파일 업로드 경로 조작(traversal) 취약점도 직접 점검해 막았습니다.',
        stack: ['Tomcat 10.1.7', 'Servlet', 'JSP', 'File Upload / Download'],
        evidence: [
          `${WS}2023-04-03-웹서버개발2.md`,
          `${WS}2023-04-04-웹서버개발3.md`,
          `${WS}2023-04-14-웹서버개발7.md`,
          `${WS}2023-05-04-웹서버개발10메뉴버튼및게시판.md`,
          `${WS}2023-05-10-웹서버개발11게시글.md`,
          `${WS}2023-05-16-웹서버개발12페이징.md`,
          `${WS}2023-06-02-웹서버개발14.md`,
          `${WS}2023-06-07-웹서버FileUpload취약점제거.md`,
          `${WS}2023-06-08-웹서버개발17마이페이지.md`,
        ],
      },
      {
        id: 'oracle',
        code: 'STAGE 04',
        title: 'ORACLE DB',
        sub: 'XE 21c · Rocky Linux',
        color: 'var(--accent-amber)',
        detail:
          '가상머신의 Rocky Linux에 Oracle Database XE 21c를 설치하고 JDBC(oracle.jdbc.driver.OracleDriver)로 연동했습니다. 비밀번호는 평문이 아닌 HASH(SALT + 비밀번호) 값으로 저장하고, 업로드 파일을 DB 테이블에 저장하는 방식도 구현했습니다.',
        stack: ['Oracle XE 21c', 'JDBC', 'Salted Hash', 'SQL Developer'],
        evidence: [
          `${WS}2023-04-06-웹서버개발4.md`,
          `${WS}2023-04-10-웹서버개발6.md`,
          `${WS}2023-04-14-웹서버개발7.md`,
          `${WS}2023-06-11-웹서버개발18DB테이블파일저장.md`,
        ],
      },
    ],
  },
  {
    id: 'arc-lab-blog',
    code: 'PRJ-02',
    title: 'ARC LAB Engineering Blog',
    summary:
      '이 블로그입니다. Jekyll(Minimal Mistakes)에서 Astro 정적 사이트로 옮기면서 기존 글·주소·댓글을 그대로 유지하고, 전문 검색과 실험실을 추가했습니다.',
    status: '운영 중 · GitHub Pages',
    verification: 'verified',
    verificationNote: '이 저장소의 소스 코드가 근거입니다.',
    stack: ['Astro', 'TypeScript', 'Tailwind CSS', 'Shiki', 'Pagefind', 'GitHub Pages'],
    links: [{ label: 'GitHub 저장소', href: 'https://github.com/MinGyu2/MinGyu2.github.io' }],
  },
];
