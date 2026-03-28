import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await params;
  const body = await req.json();
  return proxyPost(`/api/v1/contracts/${contractId}/dismiss`, body);
}
