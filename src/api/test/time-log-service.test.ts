import type { TimeLogInput } from '@time-logger/contracts';
import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, ValidationError } from '../src/domain/errors.js';
import { TimeLogService } from '../src/domain/time-log-service.js';
import type { CurrentUser } from '../src/domain/types.js';
import { MemoryRepository } from './memory-repository.js';

const owner: CurrentUser = { id: 'owner', displayName: 'Owner' };
const other: CurrentUser = { id: 'other', displayName: 'Other' };
const now = new Date('2026-09-23T10:00:00.000Z');

function input(overrides: Partial<TimeLogInput> = {}): TimeLogInput {
  return {
    organizationId: 'org',
    projectId: 'project',
    workItemId: 42,
    workDate: '2026-09-23',
    hours: 1.5,
    activity: 'Development',
    note: 'Built MVP',
    ...overrides,
  };
}

function setup() {
  const repository = new MemoryRepository();
  const service = new TimeLogService(repository, {
    maxHoursPerEntry: 24,
    businessTimeZone: 'UTC',
    now: () => now,
  });
  return { repository, service };
}

describe('TimeLogService', () => {
  it.each([0, -1, 24.01])('rejects invalid hours: %s', async (hours) => {
    const { service } = setup();
    await expect(service.create(input({ hours }), owner)).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects a future work date', async () => {
    const { service } = setup();
    await expect(service.create(input({ workDate: '2026-09-24' }), owner)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('rejects a nonexistent calendar date', async () => {
    const { service } = setup();
    await expect(service.create(input({ workDate: '2026-02-31' }), owner)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('allows an owner to update and soft-delete their log', async () => {
    const { service } = setup();
    const { log: created } = await service.create(input(), owner);
    const updated = await service.update(
      created.id,
      { ...input(), hours: 2.5, activity: 'Testing', version: created.version },
      owner,
    );
    expect(updated).toMatchObject({ hours: 2.5, version: 2 });
    await service.delete(updated.id, 'org', 'project', updated.version, owner);
    await expect(
      service.list({ organizationId: 'org', projectId: 'project', workItemId: 42 }, owner),
    ).resolves.toEqual([]);
  });

  it('rejects update and delete by another user', async () => {
    const { service } = setup();
    const { log } = await service.create(input(), owner);
    await expect(
      service.update(log.id, { ...input(), version: log.version }, other),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      service.delete(log.id, 'org', 'project', log.version, other),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('detects stale updates', async () => {
    const { service } = setup();
    const { log } = await service.create(input(), owner);
    await expect(service.update(log.id, { ...input(), version: 99 }, owner)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('calculates totals within the work-item scope', async () => {
    const { service } = setup();
    await service.create(input({ hours: 1.25 }), owner);
    await service.create(input({ hours: 2.5 }), owner);
    await service.create(input({ workItemId: 99, hours: 8 }), owner);
    await expect(
      service.summary({ organizationId: 'org', projectId: 'project', workItemId: 42 }),
    ).resolves.toEqual({
      workItemId: 42,
      totalHours: 3.75,
      entryCount: 2,
    });
  });

  it('returns the original log for a repeated idempotency key', async () => {
    const { service } = setup();
    const first = await service.create(input({ hours: 1 }), owner, 'same-request');
    const second = await service.create(input({ hours: 4 }), owner, 'same-request');
    expect(second).toMatchObject({ replayed: true, log: { id: first.log.id, hours: 1 } });
  });
});
