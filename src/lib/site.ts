/** Site-wide settings carried over from the legacy Jekyll `_config.yml`. */
export const SITE = {
  url: 'https://mingyu2.github.io',
  title: '기록하는 개발자',
  brand: 'ARC LAB',
  description: '기록소',
  locale: 'ko-KR',
  ogLocale: 'ko_KR',
  author: {
    name: 'Jung MinGyu',
    nickname: 'MinQ',
    bio: '개발자',
    location: 'Republic of Korea',
    github: 'https://github.com/MinGyu2/',
    email: 'mailto:sag02094@gmail.com',
  },
  repository: 'https://github.com/MinGyu2/MinGyu2.github.io',
  wordsPerMinute: 200,
  comments: {
    provider: 'utterances',
    repo: 'MinGyu2/comments',
    issueTerm: 'pathname',
  },
  analytics: {
    gtagId: 'G-GD1SR0ENMB',
  },
  feedEntries: 10,
  legacyPageSize: 5,
} as const;

export const NAV_ITEMS = [
  { id: 'command', href: '/', label: 'Command', ko: '홈 대시보드' },
  { id: 'logs', href: '/posts/', label: 'Dev Logs', ko: '기술 게시글' },
  { id: 'modules', href: '/categories/', label: 'Modules', ko: '카테고리 · 태그' },
  { id: 'projects', href: '/projects/', label: 'Projects', ko: '엔지니어링' },
  { id: 'lab', href: '/lab/', label: 'Exp Lab', ko: '실험실' },
  { id: 'profile', href: '/about/', label: 'Profile', ko: '소개' },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]['id'];

/** Absolute URL with percent-encoded path, matching the legacy canonical URLs. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).href;
}

/** Top-level paths owned by Astro pages; posts must never collide with these. */
export const RESERVED_PREFIXES = [
  '/posts/',
  '/categories/',
  '/tags/',
  '/projects/',
  '/lab/',
  '/about/',
  '/experiments/',
  '/pagefind/',
  '/_astro/',
  '/fonts/',
  '/feed.xml',
  '/sitemap.xml',
  '/robots.txt',
  '/404',
];
