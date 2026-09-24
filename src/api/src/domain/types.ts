import type {
  Activity,
  TimeCode,
  TimeLogInput,
  UpdateTimeLogInput,
  WorkItemScope,
} from '@time-logger/contracts';

export interface CurrentUser {
  id: string;
  displayName: string;
}

export interface StoredTimeLog extends WorkItemScope {
  id: string;
  userId: string;
  userDisplayName: string;
  workDate: string;
  hours: number;
  activity: Activity;
  timeCode: TimeCode;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
  idempotencyKey: string | null;
}

export interface TimeLogRepository {
  list(scope: WorkItemScope): Promise<StoredTimeLog[]>;
  findScoped(id: string, organizationId: string, projectId: string): Promise<StoredTimeLog | null>;
  findByIdempotencyKey(userId: string, key: string): Promise<StoredTimeLog | null>;
  create(
    input: TimeLogInput,
    user: CurrentUser,
    idempotencyKey: string | null,
  ): Promise<StoredTimeLog>;
  update(id: string, version: number, input: UpdateTimeLogInput): Promise<StoredTimeLog | null>;
  softDelete(id: string, version: number, deletedAt: Date): Promise<boolean>;
  summary(scope: WorkItemScope): Promise<{ totalHours: number; entryCount: number }>;
}
