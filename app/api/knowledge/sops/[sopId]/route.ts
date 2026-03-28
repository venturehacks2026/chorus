import { proxyGet, proxyDelete } from '@/lib/ingestion-proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  return proxyGet(`/api/v1/sops/${sopId}`);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ sopId: string }> },
) {
  const { sopId } = await params;
  return proxyDelete(`/api/v1/sops/${sopId}`);
}
