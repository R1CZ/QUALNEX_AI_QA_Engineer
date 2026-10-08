/**
 * QUALNEX API Client
 * Handles all communication with the FastAPI backend
 */

// @ts-ignore - Vite env
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Restore token from sessionStorage
    this.token = sessionStorage.getItem('qualnex_token');
  }

  setToken(token: string) {
    this.token = token;
    sessionStorage.setItem('qualnex_token', token);
  }

  clearToken() {
    this.token = null;
    sessionStorage.removeItem('qualnex_token');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new ApiError(error.detail || 'Request failed', response.status);
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network error', 0);
    }
  }

  // ============ Auth ============

  async getGoogleAuthUrl(): Promise<{ url: string; state: string }> {
    return this.request('GET', '/v1/auth/google/url');
  }

  async getGitHubAuthUrl(): Promise<{ url: string; state: string }> {
    return this.request('GET', '/v1/auth/github/url');
  }

  async authCallback(code: string, provider: string, state: string) {
    const result = await this.request<{ access_token: string; user: any }>(
      'POST', '/v1/auth/callback', { code, provider, state }
    );
    this.setToken(result.access_token);
    return result;
  }

  // ============ User ============

  async getCurrentUser() {
    return this.request<any>('GET', '/v1/users/me');
  }

  // ============ Repositories ============

  async listRepositories() {
    return this.request<{ repositories: any[] }>('GET', '/v1/repositories');
  }

  async connectRepository(githubId: number) {
    return this.request<any>('POST', '/v1/repositories/connect', { github_id: githubId });
  }

  // ============ Projects ============

  async listProjects() {
    return this.request<{ projects: any[] }>('GET', '/v1/projects');
  }

  async createProject(data: {
    name: string;
    repository_id: string;
    branch?: string;
    build_command?: string;
    start_command?: string;
  }) {
    return this.request<any>('POST', '/v1/projects', data);
  }

  // ============ QA Runs ============

  async listRuns(projectId?: string) {
    const params = projectId ? `?project_id=${projectId}` : '';
    return this.request<{ runs: any[] }>('GET', `/v1/runs${params}`);
  }

  async createRun(projectId: string, qaConfig: Record<string, string[]>) {
    return this.request<any>('POST', '/v1/runs', {
      project_id: projectId,
      qa_config: qaConfig,
    });
  }

  async getRun(runId: string) {
    return this.request<any>('GET', `/v1/runs/${runId}`);
  }

  async cancelRun(runId: string) {
    return this.request<any>('POST', `/v1/runs/${runId}/cancel`);
  }

  // ============ Findings ============

  async listFindings(runId?: string, status?: string) {
    const params = new URLSearchParams();
    if (runId) params.set('run_id', runId);
    if (status) params.set('status', status);
    return this.request<{ findings: any[] }>('GET', `/v1/findings?${params}`);
  }

  // ============ QA Cases ============

  async listQACases() {
    return this.request<{ qa_cases: any[] }>('GET', '/v1/qa-cases');
  }

  // ============ Integrations ============

  async listIntegrations() {
    return this.request<{ integrations: any[] }>('GET', '/v1/integrations');
  }

  async connectIntegration(vendor: string, config: Record<string, any>, credentials: Record<string, string>) {
    return this.request<any>('POST', '/v1/integrations/connect', { vendor, config, credentials });
  }

  async testIntegration(integrationId: string) {
    return this.request<any>('POST', `/v1/integrations/${integrationId}/test`);
  }

  // ============ App Map ============

  async getAppMap(projectId: string) {
    return this.request<any>('GET', `/v1/projects/${projectId}/app-map`);
  }

  // ============ WebSocket for real-time updates ============

  connectRunUpdates(runId: string): WebSocket {
    // @ts-ignore - Vite env
    const wsUrl = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || 'ws://localhost:8000')
      .replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/v1/runs/${runId}/ws`);
    
    if (this.token) {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token: this.token }));
      };
    }
    
    return ws;
  }
}

export const apiClient = new ApiClient();
export { ApiError };
