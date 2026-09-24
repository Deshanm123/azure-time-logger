import {
  activities,
  timeCodes,
  type TimeLogInput,
  type UpdateTimeLogInput,
} from '@time-logger/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { currentUser } from '../auth/authenticate.js';
import type { TimeLogService } from '../domain/time-log-service.js';

const scopeSchema = z.object({
  organizationId: z.string(),
  projectId: z.string(),
  workItemId: z.coerce.number().int(),
});
const idSchema = z.object({ id: z.string().uuid() });
const inputSchema = scopeSchema.extend({
  workDate: z.string(),
  hours: z.coerce.number(),
  activity: z.enum(activities),
  timeCode: z.enum(timeCodes),
  note: z.string().nullable().optional(),
});
const updateSchema = inputSchema.extend({ version: z.coerce.number().int() });

export async function registerTimeLogRoutes(
  app: FastifyInstance,
  service: TimeLogService,
): Promise<void> {
  app.get('/api/time-logs', async (request) => {
    const scope = scopeSchema.parse(request.query);
    return service.list(scope, currentUser(request));
  });

  app.get('/api/time-logs/summary', async (request) => {
    return service.summary(scopeSchema.parse(request.query));
  });

  app.get('/api/time-logs/:id', async (request) => {
    const { id } = idSchema.parse(request.params);
    const query = z
      .object({ organizationId: z.string(), projectId: z.string() })
      .parse(request.query);
    return service.get(id, query.organizationId, query.projectId, currentUser(request));
  });

  app.post('/api/time-logs', async (request, reply) => {
    const input = inputSchema.parse(request.body) as TimeLogInput;
    const idempotencyHeader = request.headers['idempotency-key'];
    const idempotencyKey = Array.isArray(idempotencyHeader)
      ? idempotencyHeader[0]
      : idempotencyHeader;
    const result = await service.create(input, currentUser(request), idempotencyKey);
    return reply.code(result.replayed ? 200 : 201).send(result.log);
  });

  app.put('/api/time-logs/:id', async (request) => {
    const { id } = idSchema.parse(request.params);
    return service.update(
      id,
      updateSchema.parse(request.body) as UpdateTimeLogInput,
      currentUser(request),
    );
  });

  app.delete('/api/time-logs/:id', async (request, reply) => {
    const { id } = idSchema.parse(request.params);
    const query = z
      .object({
        organizationId: z.string(),
        projectId: z.string(),
        version: z.coerce.number().int(),
      })
      .parse(request.query);
    await service.delete(
      id,
      query.organizationId,
      query.projectId,
      query.version,
      currentUser(request),
    );
    return reply.code(204).send();
  });
}
