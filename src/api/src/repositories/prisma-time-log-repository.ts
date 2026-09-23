import { Prisma, PrismaClient, type TimeLog as PrismaTimeLog } from '@prisma/client';
import type {
  Activity,
  TimeLogInput,
  UpdateTimeLogInput,
  WorkItemScope,
} from '@time-logger/contracts';

import type { CurrentUser, StoredTimeLog, TimeLogRepository } from '../domain/types.js';

export class PrismaTimeLogRepository implements TimeLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(scope: WorkItemScope): Promise<StoredTimeLog[]> {
    const logs = await this.prisma.timeLog.findMany({
      where: { ...scope, deletedAt: null },
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return logs.map(toStored);
  }

  async findScoped(
    id: string,
    organizationId: string,
    projectId: string,
  ): Promise<StoredTimeLog | null> {
    const log = await this.prisma.timeLog.findFirst({
      where: { id, organizationId, projectId, deletedAt: null },
    });
    return log ? toStored(log) : null;
  }

  async findByIdempotencyKey(userId: string, key: string): Promise<StoredTimeLog | null> {
    const log = await this.prisma.timeLog.findFirst({
      where: { userId, idempotencyKey: key, deletedAt: null },
    });
    return log ? toStored(log) : null;
  }

  async create(
    input: TimeLogInput,
    user: CurrentUser,
    idempotencyKey: string | null,
  ): Promise<StoredTimeLog> {
    try {
      return toStored(
        await this.prisma.timeLog.create({
          data: {
            ...input,
            workDate: asDatabaseDate(input.workDate),
            userId: user.id,
            userDisplayName: user.displayName,
            idempotencyKey,
          },
        }),
      );
    } catch (error) {
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(user.id, idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async update(
    id: string,
    version: number,
    input: UpdateTimeLogInput,
  ): Promise<StoredTimeLog | null> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.timeLog.updateMany({
        where: { id, version, deletedAt: null },
        data: {
          workDate: asDatabaseDate(input.workDate),
          hours: input.hours,
          activity: input.activity,
          note: input.note ?? null,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) return null;
      return toStored(await transaction.timeLog.findUniqueOrThrow({ where: { id } }));
    });
  }

  async softDelete(id: string, version: number, deletedAt: Date): Promise<boolean> {
    const result = await this.prisma.timeLog.updateMany({
      where: { id, version, deletedAt: null },
      data: { deletedAt, version: { increment: 1 } },
    });
    return result.count === 1;
  }

  async summary(scope: WorkItemScope): Promise<{ totalHours: number; entryCount: number }> {
    const result = await this.prisma.timeLog.aggregate({
      where: { ...scope, deletedAt: null },
      _sum: { hours: true },
      _count: { _all: true },
    });
    return { totalHours: result._sum.hours?.toNumber() ?? 0, entryCount: result._count._all };
  }
}

function asDatabaseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toStored(log: PrismaTimeLog): StoredTimeLog {
  return {
    ...log,
    workDate: log.workDate.toISOString().slice(0, 10),
    hours: log.hours.toNumber(),
    activity: log.activity as Activity,
  };
}
