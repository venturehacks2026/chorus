const INGESTION_BASE = process.env.INGESTION_API_URL || 'http://localhost:8100';

export async function proxyGet(path: string): Promise<Response> {
  const res = await fetch(`${INGESTION_BASE}${path}`);
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function proxyPost(path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${INGESTION_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}

export async function proxyFormData(path: string, formData: FormData): Promise<Response> {
  const res = await fetch(`${INGESTION_BASE}${path}`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return Response.json(data, { status: res.status });
}
