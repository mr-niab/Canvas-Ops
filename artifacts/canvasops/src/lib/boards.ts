import { BoardProvider } from '../types';

export type BoardDetection = {
  provider: BoardProvider;
  embedUrl: string;
  title: string;
};

export function detectBoardProvider(rawUrl: string): BoardDetection | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'miro.com' || host.endsWith('.miro.com')) {
    const m = parsed.pathname.match(/^\/app\/(?:board|live-embed)\/([^/]+)/);
    if (!m) return null;
    const id = m[1];
    // Miro share URLs don't expose a human-readable title in the path, so fall
    // back to the raw URL — per task spec "board title (or the URL if no title
    // is available)".
    return {
      provider: 'miro',
      embedUrl: `https://miro.com/app/live-embed/${id}/?embedAutoplay=true`,
      title: trimmed,
    };
  }

  if (host === 'figma.com' || host.endsWith('.figma.com')) {
    const m = parsed.pathname.match(/^\/(board|file|design|proto)\/([^/]+)(?:\/([^/?#]+))?/);
    if (!m || m[1] !== 'board') return null;
    const slug = m[3] ? decodeURIComponent(m[3]).replace(/[-_]+/g, ' ').trim() : '';
    return {
      provider: 'figjam',
      embedUrl: `https://www.figma.com/embed?embed_host=projectcanvas&url=${encodeURIComponent(trimmed)}`,
      title: slug || trimmed,
    };
  }

  return null;
}

export const PROVIDER_LABEL: Record<BoardProvider, string> = {
  miro: 'Miro',
  figjam: 'FigJam',
};

export const PROVIDER_BADGE_CLASS: Record<BoardProvider, string> = {
  miro: 'badge-miro',
  figjam: 'badge-figjam',
};
