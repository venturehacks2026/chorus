import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/ingestion-proxy';

export async function GET(req: NextRequest) {
  const asdId = req.nextUrl.searchParams.get('asd_id');
  return proxyGet(`/api/v1/contracts?asd_id=${asdId}`);
}
