import { NextRequest } from 'next/server';
import { proxyPatch } from '@/lib/ingestion-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await params;
  const body = await req.json();
  return proxyPatch(`/api/v1/contracts/${contractId}`, body);
}
