import { describe, expect, it, vi } from 'vitest';

import { TimeLogApi } from './time-log-api';

describe('TimeLogApi', () => {
  it('sends authentication and idempotency headers', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '1',
          userId: 'user',
          userDisplayName: 'User',
          createdAt: '2026-09-23T00:00:00Z',
          updatedAt: '2026-09-23T00:00:00Z',
          version: 1,
          isOwner: true,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const api = new TimeLogApi(
      'https://api.example.test',
      { getHeaders: async () => ({ Authorization: 'Bearer token' }) },
      fetcher,
    );
    await api.create(
      {
        organizationId: 'org',
        projectId: 'project',
        workItemId: 42,
        workDate: '2026-09-23',
        hours: 1,
        activity: 'Development',
      },
      'request-key',
    );
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/api/time-logs',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Idempotency-Key': 'request-key',
        }),
      }),
    );
  });
});
