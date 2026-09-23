import type {
  ApiError,
  TimeLog,
  TimeLogInput,
  TimeLogSummary,
  UpdateTimeLogInput,
  WorkItemScope,
} from '@time-logger/contracts';

import type { AuthHeadersProvider } from '../context/azure-devops-context';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export class TimeLogApi {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: AuthHeadersProvider,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async list(scope: WorkItemScope): Promise<TimeLog[]> {
    return this.request<TimeLog[]>(`/api/time-logs?${scopeQuery(scope)}`);
  }

  async summary(scope: WorkItemScope): Promise<TimeLogSummary> {
    return this.request<TimeLogSummary>(`/api/time-logs/summary?${scopeQuery(scope)}`);
  }

  async create(input: TimeLogInput, idempotencyKey: string): Promise<TimeLog> {
    return this.request<TimeLog>('/api/time-logs', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    });
  }

  async update(id: string, input: UpdateTimeLogInput): Promise<TimeLog> {
    return this.request<TimeLog>(`/api/time-logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  async delete(id: string, scope: WorkItemScope, version: number): Promise<void> {
    const query = new URLSearchParams({
      organizationId: scope.organizationId,
      projectId: scope.projectId,
      version: String(version),
    });
    await this.request<void>(`/api/time-logs/${id}?${query}`, { method: 'DELETE' });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const authHeaders = await this.auth.getHeaders();
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders,
        ...init.headers,
      },
    });
    if (!response.ok) {
      let error: Partial<ApiError> = {};
      try {
        error = (await response.json()) as ApiError;
      } catch {
        // The status-specific fallback below remains user friendly.
      }
      const fallback =
        response.status === 401
          ? 'Your session could not be authenticated. Refresh Azure DevOps and try again.'
          : response.status === 403
            ? 'You do not have permission to change this time log.'
            : response.status === 409
              ? 'This entry changed. Refresh and try again.'
              : 'The Time Logger service could not complete the request.';
      throw new ApiClientError(
        error.message ?? fallback,
        response.status,
        error.code,
        error.errors,
      );
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}

function scopeQuery(scope: WorkItemScope): string {
  return new URLSearchParams({
    organizationId: scope.organizationId,
    projectId: scope.projectId,
    workItemId: String(scope.workItemId),
  }).toString();
}
