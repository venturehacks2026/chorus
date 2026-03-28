import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(req: NextRequest) {
  const body = await req.json();
  return proxyPost('/api/v1/sops/text', body);
}
