import type { FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type { CurrentUser } from '../domain/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export function createAuthenticator(config: AppConfig) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (config.authMode === 'development-headers') {
      const id = headerValue(request.headers['x-dev-user-id']);
      if (!id) throw unauthorized('X-Dev-User-Id is required in development.');
      request.currentUser = {
        id,
        displayName: headerValue(request.headers['x-dev-user-display-name']) ?? id,
      };
      return;
    }

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw unauthorized();
    try {
      const secret = new TextEncoder().encode(config.extensionSecret as string);
      const { payload } = await jwtVerify(authorization.slice(7), secret, {
        algorithms: ['HS256'],
      });
      const id = stringClaim(payload.user_id) ?? stringClaim(payload.sub);
      if (!id) throw unauthorized('The authenticated token has no stable user identifier.');
      request.currentUser = {
        id,
        displayName:
          stringClaim(payload.name) ??
          stringClaim(payload.display_name) ??
          stringClaim(payload.user_name) ??
          id,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw unauthorized();
    }
  };
}

export function currentUser(request: FastifyRequest): CurrentUser {
  if (!request.currentUser) throw unauthorized();
  return request.currentUser;
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function unauthorized(message = 'A valid authenticated user is required.'): AppError {
  return new AppError(401, 'AUTHENTICATION_REQUIRED', message);
}
