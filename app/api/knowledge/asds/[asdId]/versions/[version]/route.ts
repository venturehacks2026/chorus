import { proxyGet } from '@/lib/ingestion-proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ asdId: string; version: string }> },
) {
  const { asdId, version } = await params;
  return proxyGet(`/api/v1/asds/${asdId}/versions/${version}`);
}
