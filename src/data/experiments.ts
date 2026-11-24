/**
 * Manually registered Experiment Lab entries — only what the filesystem cannot describe:
 *
 *   kind 'astro'  tools implemented as Astro pages (e.g. Payload Inspector)
 *   planned items that have no implementation yet
 *
 * Standalone HTML/Canvas/WebGL/WASM experiments are NOT listed here: they are discovered
 * automatically from public/experiments/ at build time (src/lib/experiment-discovery.ts).
 * If a discovered experiment has the same `path` as an entry below, the two are merged
 * (the registered `code` is kept and the filesystem implementation wins), so planned
 * items never appear twice once they are implemented.
 *
 * status:
 *   'available'       launchable
 *   'in-development'  shown, not launchable
 *   'planned'         idea only — never presented as a working application
 */
import type { ExperimentStatus } from '../lib/experiment-discovery.ts';

export type { ExperimentStatus };

export interface RegisteredExperiment {
  /** Catalog path / stable ID, relative to the catalog root (e.g. "payload-inspector", "network/packet-viz"). */
  path: string;
  code: string;
  title: string;
  description: string;
  kind: 'astro' | 'standalone';
  tags: string[];
  status: ExperimentStatus;
  /** Site URL for Astro tools. Standalone experiments get theirs from discovery. */
  href?: string;
  version?: string;
  order?: number;
  requiresCrossOriginIsolation?: boolean;
}

export const REGISTERED_EXPERIMENTS: RegisteredExperiment[] = [
  {
    path: 'payload-inspector',
    code: 'LAB-01',
    title: 'Payload Inspector',
    description: '문자열을 UTF-8 Base64, URL 인코딩, 16진수 바이트로 바꾸고 바이트·문자 수를 확인합니다.',
    kind: 'astro',
    tags: ['TextEncoder', 'Intl.Segmenter', 'Base64', 'URL', 'Hex'],
    status: 'available',
    href: '/lab/payload-inspector/',
    order: 10,
  },
  {
    path: 'packet-viz',
    code: 'LAB-02',
    title: 'Packet Viz',
    description: '네트워크 패킷 흐름 시각화 실험 (계획).',
    kind: 'standalone',
    tags: ['Canvas'],
    status: 'planned',
    order: 20,
  },
  {
    path: 'wasm-hash',
    code: 'LAB-03',
    title: 'WASM Hash',
    description: 'WebAssembly 해시 함수 실험 (계획).',
    kind: 'standalone',
    tags: ['WebAssembly'],
    status: 'planned',
    order: 30,
  },
];
