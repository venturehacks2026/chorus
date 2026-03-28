import { NextRequest } from 'next/server';
import { proxyFormData } from '@/lib/ingestion-proxy';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  return proxyFormData('/api/v1/sops/upload', formData);
}
