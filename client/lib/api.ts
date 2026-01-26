const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(getToken: () => string | null) {
    this.baseUrl = API_BASE_URL;
    this.getToken = getToken;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    return this.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, email: string, password: string) {
    return this.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async getMe() {
    return this.fetch('/api/auth/me');
  }

  // Integrations
  async getIntegrations() {
    return this.fetch('/api/integrations');
  }

  async getIntegration(id: string) {
    return this.fetch(`/api/integrations/${id}`);
  }

  async createIntegration(data: { name: string; adapterId: string; config: Record<string, unknown> }) {
    return this.fetch('/api/integrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIntegration(id: string, data: Partial<{ name: string; config: Record<string, unknown>; enabled: boolean }>) {
    return this.fetch(`/api/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIntegration(id: string) {
    return this.fetch(`/api/integrations/${id}`, {
      method: 'DELETE',
    });
  }

  async getIntegrationMetrics(id: string) {
    return this.fetch(`/api/integrations/${id}/metrics`);
  }

  async getAdapters() {
    return this.fetch('/api/integrations/adapters/list');
  }

  // Dashboard
  async getDashboard() {
    return this.fetch('/api/dashboard');
  }

  // Settings
  async getSettings() {
    return this.fetch('/api/settings');
  }

  async updateSettings(data: Partial<{ refreshRate: number; theme: string; layout: string }>) {
    return this.fetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}
