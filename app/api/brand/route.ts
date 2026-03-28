import { NextResponse } from 'next/server';

// Cache brand data in memory for the lifetime of the server instance
const cache = new Map<string, { iconUrl: string | null; color: string | null }>();

interface BrandfetchFormat {
  format: string;
  src: string;
  width?: number;
  height?: number;
}

interface BrandfetchLogo {
  type: string;
  theme: string;
  formats: BrandfetchFormat[];
}

interface BrandfetchBrand {
  logos?: BrandfetchLogo[];
  colors?: Array<{ hex: string; type: string }>;
}

function pickIcon(logos: BrandfetchLogo[]): string | null {
  // Prefer: light symbol SVG > light symbol PNG > light logo SVG > light logo PNG > any SVG
  const order = [
    (l: BrandfetchLogo) => l.type === 'symbol' && l.theme === 'light',
    (l: BrandfetchLogo) => l.type === 'symbol',
    (l: BrandfetchLogo) => l.theme === 'light',
    () => true,
  ];

  for (const pred of order) {
    const logo = logos.find(pred);
    if (!logo) continue;
    const svg = logo.formats.find(f => f.format === 'svg');
    if (svg) return svg.src;
    const png = logo.formats.find(f => f.format === 'png');
    if (png) return png.src;
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 });

  if (cache.has(domain)) {
    return NextResponse.json(cache.get(domain));
  }

  const apiKey = process.env.BRANDFETCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ iconUrl: null, color: null });
  }

  try {
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${encodeURIComponent(domain)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      // 5s timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      cache.set(domain, { iconUrl: null, color: null });
      return NextResponse.json({ iconUrl: null, color: null });
    }

    const data = await res.json() as BrandfetchBrand;
    const iconUrl = pickIcon(data.logos ?? []);
    const color = data.colors?.find(c => c.type === 'accent')?.hex
      ?? data.colors?.[0]?.hex
      ?? null;

    const result = { iconUrl, color };
    cache.set(domain, result);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=86400' }, // CDN cache 24h
    });
  } catch {
    cache.set(domain, { iconUrl: null, color: null });
    return NextResponse.json({ iconUrl: null, color: null });
  }
}
