import { proxyGet } from '@/lib/ingestion-proxy';

export async function GET() {
  return proxyGet('/api/v1/asds');
}
