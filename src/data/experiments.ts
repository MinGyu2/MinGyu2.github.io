/**
 * Experiment Lab catalog.
 *
 * kind:
 *   'astro'      an interactive module rendered by an Astro page/component
 *   'standalone' a self-contained app in public/experiments/<id>/index.html
 *                (served as-is, relative assets keep working; heavy runtimes such as
 *                WebGL/WASM load only there, never on blog pages)
 * status:
 *   'available'  launchable — rendered as a link
 *   'planned'    idea only — rendered as a non-interactive card, never as a launcher
 */
export interface Experiment {
  id: string;
  code: string;
  title: string;
  summary: string;
  kind: 'astro' | 'standalone';
  tech: string[];
  status: 'available' | 'planned';
  href?: string;
  /** Standalone experiments that need COOP/COEP (SharedArrayBuffer) cannot run on GitHub Pages. */
  requiresCrossOriginIsolation?: boolean;
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'payload-inspector',
    code: 'LAB-01',
    title: 'Payload Inspector',
    summary: '문자열을 UTF-8 Base64, URL 인코딩, 16진수 바이트로 바꾸고 바이트·문자 수를 확인합니다.',
    kind: 'astro',
    tech: ['TextEncoder', 'Intl.Segmenter'],
    status: 'available',
    href: '/lab/#payload-inspector',
  },
  {
    id: 'packet-viz',
    code: 'LAB-02',
    title: 'Packet Viz',
    summary: '네트워크 패킷 흐름 시각화 실험 (계획).',
    kind: 'standalone',
    tech: ['Canvas'],
    status: 'planned',
  },
  {
    id: 'wasm-hash',
    code: 'LAB-03',
    title: 'WASM Hash',
    summary: 'WebAssembly 해시 함수 실험 (계획).',
    kind: 'standalone',
    tech: ['WebAssembly'],
    status: 'planned',
  },
];
