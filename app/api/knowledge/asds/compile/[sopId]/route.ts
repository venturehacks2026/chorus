import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  let body = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }
  return proxyPost(`/api/v1/asds/compile/${sopId}`, body);
}
