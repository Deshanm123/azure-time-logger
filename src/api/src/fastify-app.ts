import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import type { ApiError } from '@time-logger/contracts';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { createAuthenticator } from './auth/authenticate.js';
import type { AppConfig } from './config.js';
import { AppError } from './domain/errors.js';
import { TimeLogService } from './domain/time-log-service.js';
import { registerTimeLogRoutes } from './http/time-log-routes.js';
import { PrismaTimeLogRepository } from './repositories/prisma-time-log-repository.js';

export interface AppDependencies {
  service?: TimeLogService;
  prisma?: PrismaClient;
}

export async function buildApp(
  config: AppConfig,
  dependencies: AppDependencies = {},
  fastifyFactory: typeof Fastify = Fastify,
): Promise<FastifyInstance> {
  const app = fastifyFactory({
    logger: config.nodeEnv !== 'test',
    genReqId: (request) => {
      const supplied = request.headers['x-correlation-id'];
      return (Array.isArray(supplied) ? supplied[0] : supplied) ?? crypto.randomUUID();
    },
  });

  await app.register(cors, {
    origin: config.corsAllowedOrigins.length ? config.corsAllowedOrigins : false,
  });
  if (config.nodeEnv !== 'production') {
    await app.register(swagger, {
      openapi: { info: { title: 'Time Logger API', version: '0.1.0' } },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  app.addHook('onSend', async (request, reply) => {
    void reply.header('x-correlation-id', request.id);
  });
  app.setErrorHandler((error, request, reply) => {
    let apiError: ApiError;
    let statusCode: number;
    if (error instanceof AppError) {
      statusCode = error.statusCode;
      apiError = {
        code: error.code,
        message: error.message,
        ...(error.errors ? { errors: error.errors } : {}),
        correlationId: request.id,
      };
    } else if (error instanceof ZodError) {
      statusCode = 400;
      const errors = error.issues.reduce<Record<string, string[]>>((all, issue) => {
        const field = issue.path.join('.') || 'request';
        all[field] = [...(all[field] ?? []), issue.message];
        return all;
      }, {});
      apiError = {
        code: 'TIME_LOG_VALIDATION_FAILED',
        message: 'The request is invalid.',
        errors,
        correlationId: request.id,
      };
    } else {
      statusCode = 500;
      apiError = {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred.',
        correlationId: request.id,
      };
    }
    request.log.error({ err: error, code: apiError.code }, 'Request failed');
    void reply.code(statusCode).send(apiError);
  });

  app.get('/health', async () => ({ status: 'healthy' }));

  let service = dependencies.service;
  if (!service) {
    const prisma = dependencies.prisma ?? new PrismaClient({ datasourceUrl: config.databaseUrl });
    if (!dependencies.prisma) app.addHook('onClose', async () => prisma.$disconnect());
    service = new TimeLogService(new PrismaTimeLogRepository(prisma), {
      maxHoursPerEntry: config.maxHoursPerEntry,
      businessTimeZone: config.businessTimeZone,
    });
  }

  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', createAuthenticator(config));
    await registerTimeLogRoutes(protectedRoutes, service);
  });
  return app;
}
