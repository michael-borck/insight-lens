import { useEffect, useState } from 'react';

// GitHub release source. The desktop app publishes via electron-builder to
// this repo (see ../.github/workflows/build.yml), so the latest release's
// assets are the canonical, always-current download target.
const REPO = 'michael-borck/insight-lens';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export type Platform = 'mac' | 'windows' | 'linux';

export const PLATFORM_LABELS: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export interface ReleaseAsset {
  name: string;
  url: string; // browser_download_url — direct file download, not a releases page
}

export interface ReleaseInfo {
  assets: ReleaseAsset[];
  version: string; // tag_name, e.g. "v1.9.1"
}

/** Narrow any unknown value to a string-keyed record (object, not null). */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Validate the GitHub releases/latest JSON shape at the boundary. */
function parseRelease(data: unknown): ReleaseInfo {
  if (!isRecord(data)) return { assets: [], version: '' };
  const version = typeof data.tag_name === 'string' ? data.tag_name : '';
  const rawAssets = Array.isArray(data.assets) ? data.assets : [];
  const assets: ReleaseAsset[] = [];
  for (const a of rawAssets) {
    if (!isRecord(a)) continue;
    const name = a.name;
    const url = a.browser_download_url;
    if (typeof name === 'string' && typeof url === 'string') {
      assets.push({ name, url });
    }
  }
  return { assets, version };
}

/** Pick the right installer for a platform from a release's asset list. */
export function matchAsset(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  for (const asset of assets) {
    const name = asset.name.toLowerCase();
    // macOS: first .dmg (electron-builder names per-arch; arm64 sorts first).
    if (platform === 'mac' && name.endsWith('.dmg')) return asset;
    if (platform === 'windows' && name.endsWith('.exe')) return asset;
    if (platform === 'linux' && name.endsWith('.appimage')) return asset;
  }
  return null;
}

/** Detect the visitor's OS from the browser. Defaults to macOS on miss. */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform ?? '').toLowerCase();
  if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) return 'mac';
  if (platform.includes('win') || ua.includes('windows')) return 'windows';
  if (ua.includes('linux') || platform.includes('linux')) return 'linux';
  return 'mac';
}

/**
 * Fetch the latest published release from the GitHub API. Fails silently —
 * callers fall back to a sensible default rather than showing a broken button.
 */
export function useLatestRelease(): { release: ReleaseInfo | null; loading: boolean } {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((raw: unknown) => {
        if (!cancelled) setRelease(parseRelease(raw));
      })
      .catch(() => { /* leave release null; UI falls back */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { release, loading };
}
