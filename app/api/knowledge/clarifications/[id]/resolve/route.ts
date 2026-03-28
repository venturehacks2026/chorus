import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  return proxyPost(`/api/v1/clarifications/${id}/resolve`, body);
}
