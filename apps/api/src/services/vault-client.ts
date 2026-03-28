export class VaultClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  async getSecret(path: string): Promise<Record<string, string>> {
    if (!this.token) {
      console.warn(`[Vault] No token set — returning empty secrets for path: ${path}`);
      return {};
    }

    const res = await fetch(`${this.baseUrl}/v1/secret/data/${path}`, {
      headers: { 'X-Vault-Token': this.token },
    });

    if (res.status === 404) return {};
    if (!res.ok) {
      throw new Error(`Vault request failed: ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as { data: { data: Record<string, string> } };
    return body.data.data ?? {};
  }

  async getConnectorSecrets(connectorSlug: string): Promise<Record<string, string>> {
    return this.getSecret(`chorus/connectors/${connectorSlug}`);
  }
}
