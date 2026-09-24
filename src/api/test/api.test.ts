import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/fastify-app.js';
import { TimeLogService } from '../src/domain/time-log-service.js';
import { MemoryRepository } from './memory-repository.js';

function config() {
  return {
    nodeEnv: 'test' as const,
    port: 3000,
    host: '127.0.0.1',
    databaseUrl: 'postgresql://unused',
    authMode: 'development-headers' as const,
    extensionSecret: undefined,
    entraTenantId: undefined,
    entraClientId: undefined,
    entraAudience: undefined,
    entraRequiredScope: 'access_as_user',
    corsAllowedOrigins: [],
    maxHoursPerEntry: 24,
    businessTimeZone: 'UTC',
  };
}

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe('time-log API', () => {
  it('requires authentication', async () => {
    const service = new TimeLogService(new MemoryRepository(), {
      maxHoursPerEntry: 24,
      businessTimeZone: 'UTC',
      now: () => new Date('2026-09-23T10:00:00Z'),
    });
    const app = await buildApp(config(), { service });
    apps.push(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/time-logs?organizationId=org&projectId=project&workItemId=42',
    });
    expect(response.statusCode).toBe(401);
  });

  it('derives ownership from authenticated identity, not request body', async () => {
    const service = new TimeLogService(new MemoryRepository(), {
      maxHoursPerEntry: 24,
      businessTimeZone: 'UTC',
      now: () => new Date('2026-09-23T10:00:00Z'),
    });
    const app = await buildApp(config(), { service });
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/time-logs',
      headers: { 'x-dev-user-id': 'trusted-user', 'x-dev-user-display-name': 'Trusted User' },
      payload: {
        organizationId: 'org',
        projectId: 'project',
        workItemId: 42,
        workDate: '2026-09-23',
        hours: 1,
        activity: 'Development',
        timeCode: 'VH-DEV-LKA',
        userId: 'attacker-controlled',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      userId: 'trusted-user',
      userDisplayName: 'Trusted User',
      timeCode: 'VH-DEV-LKA',
    });
  });
});
