import { proxyGet } from '@/lib/ingestion-proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  return proxyGet(`/api/v1/sops/${sopId}`);
}
