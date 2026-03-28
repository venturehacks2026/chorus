import { proxyPost } from '@/lib/ingestion-proxy';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ asdId: string }> },
) {
  const { asdId } = await params;
  return proxyPost(`/api/v1/contracts/generate/${asdId}`, {});
}
