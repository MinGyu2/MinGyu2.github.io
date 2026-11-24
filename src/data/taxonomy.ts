/**
 * ARC LAB knowledge taxonomy — the single source of truth for primary modules,
 * submodules and article series.
 *
 * - IDs are stable, URL-safe and never derived from article counts.
 * - Order and colors are fixed here; empty modules/submodules are simply hidden
 *   from public listings.
 * - To add a submodule or series, edit only this file.
 *
 * This file intentionally has no imports and uses only erasable TypeScript syntax so
 * that Node scripts (scripts/verify-site.mjs) can import it directly.
 */

export interface Submodule {
  id: string;
  name: string;
  ko: string;
  description: string;
}

export interface KnowledgeModule {
  id: string;
  code: string;
  name: string;
  ko: string;
  short: string;
  description: string;
  /** CSS color token (defined per theme in src/styles/tokens.css) */
  color: string;
  submodules: Submodule[];
}

export interface Series {
  id: string;
  title: string;
  ko: string;
  description: string;
  module: string;
  submodule: string;
  /** Optional related page, e.g. the project blueprint */
  href?: string;
}

export const MODULES: KnowledgeModule[] = [
  {
    id: 'security',
    code: 'MOD-01',
    name: 'Cyber Security',
    ko: '정보보안',
    short: 'SECURITY',
    description: '웹 취약점 분석과 실습, 워게임 풀이, 보안 실습 환경 구축, 시스템·네트워크 보안',
    color: 'var(--mod-security)',
    submodules: [
      { id: 'web-security', name: 'Web Security', ko: '웹 보안', description: '웹 취약점과 보안 분석' },
      { id: 'wargame', name: 'Wargame', ko: '워게임', description: 'Dreamhack, Wargame.kr 등 보안 문제 풀이' },
      { id: 'security-lab', name: 'Security Lab', ko: '보안 실습 환경', description: '통제된 보안 테스트 환경 구축' },
      { id: 'system-security', name: 'System Security', ko: '시스템 보안', description: '메모리와 시스템 취약점' },
      { id: 'network-security', name: 'Network Security', ko: '네트워크 보안', description: '네트워크 보안과 공격 분석' },
    ],
  },
  {
    id: 'infrastructure',
    code: 'MOD-02',
    name: 'Systems & Infrastructure',
    ko: '시스템 · 인프라',
    short: 'INFRA',
    description: 'Linux · Windows 환경 구성, 컨테이너, 가상화, 네트워크와 시스템 관리',
    color: 'var(--mod-infrastructure)',
    submodules: [
      { id: 'linux', name: 'Linux', ko: '리눅스', description: 'Linux 환경 구성과 문제 해결' },
      { id: 'windows-wsl', name: 'Windows & WSL', ko: '윈도우 · WSL', description: 'Windows와 WSL 환경' },
      { id: 'containers', name: 'Containers', ko: '컨테이너', description: 'Docker, LXD 등 컨테이너' },
      { id: 'virtualization', name: 'Virtualization', ko: '가상화', description: '가상 머신과 하이퍼바이저' },
      { id: 'networking', name: 'Networking', ko: '네트워킹', description: '네트워크 기초와 구성' },
      { id: 'system-administration', name: 'System Administration', ko: '시스템 관리', description: '서버·서비스 관리와 운영 문제 해결' },
    ],
  },
  {
    id: 'development',
    code: 'MOD-03',
    name: 'Software Development',
    ko: '소프트웨어 개발',
    short: 'DEV',
    description: '웹·백엔드, 데스크톱 애플리케이션, 개발 도구와 프로그래밍 언어',
    color: 'var(--mod-development)',
    submodules: [
      { id: 'web-backend', name: 'Web & Backend', ko: '웹 · 백엔드', description: '웹 기술과 서버 측 개발' },
      { id: 'desktop-apps', name: 'Desktop Applications', ko: '데스크톱 앱', description: '데스크톱 애플리케이션 개발' },
      { id: 'developer-tools', name: 'Developer Tools', ko: '개발 도구', description: '라이브러리, 자동화, 개발 도구 활용' },
      { id: 'programming-languages', name: 'Programming Languages', ko: '프로그래밍 언어', description: '언어 문법과 특성' },
    ],
  },
  {
    id: 'ai',
    code: 'MOD-04',
    name: 'AI & Machine Learning',
    ko: '인공지능',
    short: 'AI',
    description: 'LLM과 AI 에이전트, 로컬 AI, GPU·NPU, 머신러닝',
    color: 'var(--mod-ai)',
    submodules: [
      { id: 'llm-agents', name: 'LLM & AI Agents', ko: 'LLM · AI 에이전트', description: '대규모 언어 모델과 에이전트' },
      { id: 'local-ai', name: 'Local AI', ko: '로컬 AI', description: '로컬 환경의 AI 실행' },
      { id: 'gpu-npu', name: 'GPU & NPU', ko: 'GPU · NPU', description: '가속기 하드웨어와 활용' },
      { id: 'machine-learning', name: 'Machine Learning', ko: '머신러닝', description: '머신러닝 이론과 실습' },
    ],
  },
  {
    id: 'computer-science',
    code: 'MOD-05',
    name: 'Computer Science',
    ko: '컴퓨터 과학',
    short: 'CS',
    description: '알고리즘과 자료구조, 컴퓨터 구조, 운영체제, 수학과 이론',
    color: 'var(--mod-computer-science)',
    submodules: [
      { id: 'algorithms', name: 'Algorithms & Data Structures', ko: '알고리즘 · 자료구조', description: '알고리즘과 자료구조' },
      { id: 'computer-architecture', name: 'Computer Architecture', ko: '컴퓨터 구조', description: '컴퓨터 구조' },
      { id: 'operating-systems', name: 'Operating Systems', ko: '운영체제', description: '운영체제 이론' },
      { id: 'math-theory', name: 'Mathematics & Theory', ko: '수학 · 이론', description: '수학과 계산 이론' },
    ],
  },
  {
    id: 'notes',
    code: 'MOD-06',
    name: 'Dev Notes',
    ko: '개발 기록',
    short: 'NOTES',
    description: '블로그 운영, 학습 노트, 회고, 기술 문서 작성',
    color: 'var(--mod-notes)',
    submodules: [
      { id: 'blog', name: 'Blog', ko: '블로그', description: '블로그 운영 기록' },
      { id: 'learning-notes', name: 'Learning Notes', ko: '학습 노트', description: '학습 기록' },
      { id: 'retrospectives', name: 'Development Retrospectives', ko: '개발 회고', description: '개발 회고' },
      { id: 'technical-documentation', name: 'Technical Documentation', ko: '기술 문서', description: '문서·보고서 작성' },
    ],
  },
];

export const SERIES: Series[] = [
  {
    id: 'web-server-lab',
    title: 'Web Server Security Lab',
    ko: '웹 서버 보안 실습 환경',
    description:
      '웹 취약점을 학습·재현·검증하기 위한 통제된 실습 환경으로, Nginx · Tomcat(Servlet/JSP) · Oracle DB 기반 웹 서버를 직접 구축한 연재입니다.',
    module: 'security',
    submodule: 'security-lab',
    href: '/projects/',
  },
];

export function getModule(id: string): KnowledgeModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getSubmodule(moduleId: string, submoduleId: string): Submodule | undefined {
  return getModule(moduleId)?.submodules.find((s) => s.id === submoduleId);
}

/** Submodule IDs are globally unique, so ?submodule= alone identifies its module. */
export function moduleOfSubmodule(submoduleId: string): KnowledgeModule | undefined {
  return MODULES.find((m) => m.submodules.some((s) => s.id === submoduleId));
}

export function getSeries(id: string): Series | undefined {
  return SERIES.find((s) => s.id === id);
}

export function submoduleCode(moduleId: string, submoduleId: string): string {
  const i = getModule(moduleId)?.submodules.findIndex((s) => s.id === submoduleId) ?? -1;
  return `SUB-${String(i + 1).padStart(2, '0')}`;
}

/**
 * Validate a post's classification. Returns human-readable errors (empty = valid).
 * Used by the content schema (build) and by scripts/verify-site.mjs.
 */
export function validateClassification(data: {
  module?: unknown;
  submodule?: unknown;
  series?: { id?: unknown; order?: unknown } | null;
}): string[] {
  const errors: string[] = [];
  const mod = typeof data.module === 'string' ? getModule(data.module) : undefined;
  if (!mod) {
    errors.push(`module "${String(data.module)}" is not valid. Use one of: ${MODULES.map((m) => m.id).join(', ')}`);
  } else if (typeof data.submodule !== 'string' || !mod.submodules.some((s) => s.id === data.submodule)) {
    errors.push(
      `submodule "${String(data.submodule)}" does not belong to module "${mod.id}". Use one of: ${mod.submodules.map((s) => s.id).join(', ')}`,
    );
  }
  if (data.series != null) {
    const s = typeof data.series.id === 'string' ? getSeries(data.series.id) : undefined;
    if (!s) errors.push(`series.id "${String(data.series.id)}" is not defined. Defined series: ${SERIES.map((x) => x.id).join(', ')}`);
    else if (s.module !== data.module || s.submodule !== data.submodule)
      errors.push(`series "${s.id}" belongs to ${s.module}/${s.submodule}, but the post is classified as ${String(data.module)}/${String(data.submodule)}`);
    const order = data.series.order;
    if (typeof order !== 'number' || !Number.isInteger(order) || order < 1) errors.push(`series.order must be a positive integer (got ${String(order)})`);
  }
  // Consistency guard: taxonomy definitions themselves must be well-formed.
  return errors;
}

/** Throws if the taxonomy definition itself is inconsistent (duplicate IDs, unknown series targets). */
export function assertTaxonomy(): void {
  const ids = new Set<string>();
  for (const m of MODULES) {
    if (ids.has(m.id)) throw new Error(`Duplicate module id ${m.id}`);
    ids.add(m.id);
  }
  const subs = new Set<string>();
  for (const m of MODULES)
    for (const s of m.submodules) {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id)) throw new Error(`Submodule id "${s.id}" is not URL-safe`);
      if (subs.has(s.id)) throw new Error(`Submodule id "${s.id}" must be globally unique`);
      subs.add(s.id);
    }
  for (const s of SERIES) if (!getSubmodule(s.module, s.submodule)) throw new Error(`Series ${s.id} targets unknown ${s.module}/${s.submodule}`);
}
