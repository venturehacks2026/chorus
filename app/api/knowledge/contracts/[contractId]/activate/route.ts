import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await params;
  return proxyPost(`/api/v1/contracts/${contractId}/activate`, {});
}
