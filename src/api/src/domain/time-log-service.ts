import type {
  TimeLog,
  TimeLogInput,
  TimeLogSummary,
  UpdateTimeLogInput,
  WorkItemScope,
} from '@time-logger/contracts';

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors.js';
import type { CurrentUser, StoredTimeLog, TimeLogRepository } from './types.js';
import { todayInTimeZone, validateScope, validateTimeLog } from './validation.js';

export interface TimeLogServiceOptions {
  maxHoursPerEntry: number;
  businessTimeZone: string;
  now?: () => Date;
}

export class TimeLogService {
  private readonly now: () => Date;

  constructor(
    private readonly repository: TimeLogRepository,
    private readonly options: TimeLogServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async list(scope: WorkItemScope, user: CurrentUser): Promise<TimeLog[]> {
    validateScope(scope.organizationId, scope.projectId, scope.workItemId);
    return (await this.repository.list(scope)).map((log) => this.toResponse(log, user));
  }

  async get(
    id: string,
    organizationId: string,
    projectId: string,
    user: CurrentUser,
  ): Promise<TimeLog> {
    const log = await this.findScoped(id, organizationId, projectId);
    return this.toResponse(log, user);
  }

  async create(
    input: TimeLogInput,
    user: CurrentUser,
    idempotencyKey?: string,
  ): Promise<{ log: TimeLog; replayed: boolean }> {
    this.validate(input);
    const key = idempotencyKey?.trim() || null;
    if (key && key.length > 100) {
      throw new ValidationError({
        idempotencyKey: ['Idempotency key cannot exceed 100 characters.'],
      });
    }
    if (key) {
      const existing = await this.repository.findByIdempotencyKey(user.id, key);
      if (existing) return { log: this.toResponse(existing, user), replayed: true };
    }
    const created = await this.repository.create(this.normalize(input), user, key);
    return { log: this.toResponse(created, user), replayed: false };
  }

  async update(id: string, input: UpdateTimeLogInput, user: CurrentUser): Promise<TimeLog> {
    this.validate(input);
    if (!Number.isInteger(input.version) || input.version <= 0) throw new ConflictError();
    const existing = await this.findScoped(id, input.organizationId, input.projectId);
    if (existing.userId !== user.id) throw new ForbiddenError();
    if (existing.workItemId !== input.workItemId) throw new NotFoundError();
    if (existing.version !== input.version) throw new ConflictError();
    const updated = await this.repository.update(id, input.version, {
      ...this.normalize(input),
      version: input.version,
    });
    if (!updated) throw new ConflictError();
    return this.toResponse(updated, user);
  }

  async delete(
    id: string,
    organizationId: string,
    projectId: string,
    version: number,
    user: CurrentUser,
  ): Promise<void> {
    const existing = await this.findScoped(id, organizationId, projectId);
    if (existing.userId !== user.id) throw new ForbiddenError();
    if (existing.version !== version) throw new ConflictError();
    if (!(await this.repository.softDelete(id, version, this.now()))) throw new ConflictError();
  }

  async summary(scope: WorkItemScope): Promise<TimeLogSummary> {
    validateScope(scope.organizationId, scope.projectId, scope.workItemId);
    return { workItemId: scope.workItemId, ...(await this.repository.summary(scope)) };
  }

  private validate(input: TimeLogInput): void {
    validateTimeLog(
      input,
      this.options.maxHoursPerEntry,
      todayInTimeZone(this.options.businessTimeZone, this.now()),
    );
  }

  private normalize<T extends TimeLogInput>(input: T): T {
    return {
      ...input,
      organizationId: input.organizationId.trim(),
      projectId: input.projectId.trim(),
      note: input.note?.trim() || null,
    };
  }

  private async findScoped(
    id: string,
    organizationId: string,
    projectId: string,
  ): Promise<StoredTimeLog> {
    if (!organizationId.trim() || !projectId.trim()) {
      throw new ValidationError({ scope: ['Organization and project are required.'] });
    }
    const log = await this.repository.findScoped(id, organizationId, projectId);
    if (!log) throw new NotFoundError();
    return log;
  }

  private toResponse(log: StoredTimeLog, user: CurrentUser): TimeLog {
    return {
      id: log.id,
      organizationId: log.organizationId,
      projectId: log.projectId,
      workItemId: log.workItemId,
      userId: log.userId,
      userDisplayName: log.userDisplayName,
      workDate: log.workDate,
      hours: log.hours,
      activity: log.activity,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
      version: log.version,
      isOwner: log.userId === user.id,
    };
  }
}
