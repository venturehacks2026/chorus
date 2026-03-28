import { proxyGet } from '@/lib/ingestion-proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asdId: string }> },
) {
  const { asdId } = await params;
  return proxyGet(`/api/v1/asds/${asdId}/versions`);
}
