import type { TimeLogInput, UpdateTimeLogInput, WorkItemScope } from '@time-logger/contracts';
import { randomUUID } from 'node:crypto';

import type { CurrentUser, StoredTimeLog, TimeLogRepository } from '../src/domain/types.js';

export class MemoryRepository implements TimeLogRepository {
  readonly logs: StoredTimeLog[] = [];

  async list(scope: WorkItemScope): Promise<StoredTimeLog[]> {
    return this.logs
      .filter(
        (log) =>
          log.deletedAt === null &&
          log.organizationId === scope.organizationId &&
          log.projectId === scope.projectId &&
          log.workItemId === scope.workItemId,
      )
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
  }

  async findScoped(
    id: string,
    organizationId: string,
    projectId: string,
  ): Promise<StoredTimeLog | null> {
    return (
      this.logs.find(
        (log) =>
          log.id === id &&
          log.organizationId === organizationId &&
          log.projectId === projectId &&
          log.deletedAt === null,
      ) ?? null
    );
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<StoredTimeLog | null> {
    return this.logs.find((log) => log.userId === userId && log.idempotencyKey === key) ?? null;
  }

  async create(
    input: TimeLogInput,
    user: CurrentUser,
    idempotencyKey: string | null,
  ): Promise<StoredTimeLog> {
    const now = new Date('2026-09-23T10:00:00.000Z');
    const log: StoredTimeLog = {
      ...input,
      id: randomUUID(),
      userId: user.id,
      userDisplayName: user.displayName,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      idempotencyKey,
    };
    this.logs.push(log);
    return log;
  }

  async update(
    id: string,
    version: number,
    input: UpdateTimeLogInput,
  ): Promise<StoredTimeLog | null> {
    const log = this.logs.find((candidate) => candidate.id === id && candidate.version === version);
    if (!log) return null;
    Object.assign(log, input, {
      note: input.note ?? null,
      version: version + 1,
      updatedAt: new Date(),
    });
    return log;
  }

  async softDelete(id: string, version: number, deletedAt: Date): Promise<boolean> {
    const log = this.logs.find((candidate) => candidate.id === id && candidate.version === version);
    if (!log) return false;
    log.deletedAt = deletedAt;
    log.version += 1;
    return true;
  }

  async summary(scope: WorkItemScope): Promise<{ totalHours: number; entryCount: number }> {
    const logs = await this.list(scope);
    return { totalHours: logs.reduce((sum, log) => sum + log.hours, 0), entryCount: logs.length };
  }
}
