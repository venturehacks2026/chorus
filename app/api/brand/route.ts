import { NextResponse } from 'next/server';

// In-memory cache: domain → upstream CDN URL + content-type
const cache = new Map<string, { cdnUrl: string | null; contentType: string }>();

interface BrandfetchFormat { format: string; src: string }
interface BrandfetchLogo  { type: string; theme: string; formats: BrandfetchFormat[] }
interface BrandfetchBrand { logos?: BrandfetchLogo[] }

function pickIcon(logos: BrandfetchLogo[]): { url: string; contentType: string } | null {
  // Priority order: icon dark (solid, always visible) → symbol dark → logo dark → symbol light PNG → anything
  // Avoid "light" SVGs — they often have white fills that are invisible on white cards.
  const candidates: Array<(l: BrandfetchLogo) => { fmt: BrandfetchFormat | undefined; ct: string } | null> = [
    // Prefer icon dark JPEG/PNG — solid background, always visible
    l => {
      if (l.type !== 'icon' || l.theme !== 'dark') return null;
      const jpg = l.formats.find(f => f.format === 'jpeg' || f.format === 'jpg');
      if (jpg) return { fmt: jpg, ct: 'image/jpeg' };
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      return null;
    },
    // symbol dark SVG (dark colors visible on white)
    l => {
      if (l.type !== 'symbol' || l.theme !== 'dark') return null;
      const svg = l.formats.find(f => f.format === 'svg');
      if (svg) return { fmt: svg, ct: 'image/svg+xml' };
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      return null;
    },
    // logo dark PNG
    l => {
      if (l.type !== 'logo' || l.theme !== 'dark') return null;
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      return null;
    },
    // symbol light PNG (not SVG, which may have white fills)
    l => {
      if (l.type !== 'symbol' || l.theme !== 'light') return null;
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      return null;
    },
    // logo light PNG fallback
    l => {
      if (l.type !== 'logo') return null;
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      return null;
    },
    // absolute last resort: any format
    l => {
      const jpg = l.formats.find(f => f.format === 'jpeg' || f.format === 'jpg');
      if (jpg) return { fmt: jpg, ct: 'image/jpeg' };
      const png = l.formats.find(f => f.format === 'png');
      if (png) return { fmt: png, ct: 'image/png' };
      const svg = l.formats.find(f => f.format === 'svg');
      if (svg) return { fmt: svg, ct: 'image/svg+xml' };
      return null;
    },
  ];

  for (const pick of candidates) {
    for (const logo of logos) {
      const result = pick(logo);
      if (result?.fmt) return { url: result.fmt.src, contentType: result.ct };
    }
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return new Response('domain required', { status: 400 });

  // Serve from cache — proxy the image bytes so it's same-origin
  const cached = cache.get(domain);
  if (cached) {
    if (!cached.cdnUrl) return new Response(null, { status: 204 });
    return fetchAndProxy(cached.cdnUrl, cached.contentType);
  }

  const apiKey = process.env.BRANDFETCH_API_KEY;
  if (!apiKey) return new Response(null, { status: 204 });

  try {
    const res = await fetch(
      `https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) {
      cache.set(domain, { cdnUrl: null, contentType: '' });
      return new Response(null, { status: 204 });
    }

    const data = await res.json() as BrandfetchBrand;
    const picked = pickIcon(data.logos ?? []);

    if (!picked) {
      cache.set(domain, { cdnUrl: null, contentType: '' });
      return new Response(null, { status: 204 });
    }

    cache.set(domain, { cdnUrl: picked.url, contentType: picked.contentType });
    return fetchAndProxy(picked.url, picked.contentType);
  } catch {
    cache.set(domain, { cdnUrl: null, contentType: '' });
    return new Response(null, { status: 204 });
  }
}

async function fetchAndProxy(url: string, contentType: string): Promise<Response> {
  try {
    const img = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!img.ok) return new Response(null, { status: 204 });
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // 7 days
      },
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
