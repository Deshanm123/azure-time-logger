import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, decodeJwt, jwtVerify, type JWTPayload } from 'jose';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type { CurrentUser } from '../domain/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export function createAuthenticator(config: AppConfig) {
  const verifyEntraToken =
    config.authMode === 'entra'
      ? createEntraTokenVerifier(config.entraAllowedTenantIds, config.entraAudience as string)
      : undefined;

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
      if (config.authMode === 'entra') {
        const payload = await (verifyEntraToken as EntraTokenVerifier)(authorization.slice(7));
        request.currentUser = userFromEntraToken(
          payload,
          config.entraAllowedTenantIds,
          config.entraClientId as string,
          config.entraRequiredScope,
        );
        return;
      }

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

type EntraTokenVerifier = (token: string) => Promise<JWTPayload>;

function createEntraTokenVerifier(allowedTenantIds: string[], audience: string): EntraTokenVerifier {
  const allowedTenants = new Set(allowedTenantIds);
  const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
  return async (token) => {
    const tenantId = stringClaim(decodeJwt(token).tid);
    if (!tenantId || !allowedTenants.has(tenantId)) throw unauthorized();
    let keys = keySets.get(tenantId);
    if (!keys) {
      keys = createRemoteJWKSet(
        new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
      );
      keySets.set(tenantId, keys);
    }
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      audience,
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    });
    return payload;
  };
}

export function userFromEntraToken(
  payload: JWTPayload,
  allowedTenantIds: string[],
  clientId: string,
  requiredScope: string,
): CurrentUser {
  const tokenTenant = stringClaim(payload.tid);
  const authorizedClient = stringClaim(payload.azp) ?? stringClaim(payload.appid);
  const objectId = stringClaim(payload.oid);
  const subject = objectId ?? stringClaim(payload.sub);
  const scopes = stringClaim(payload.scp)?.split(/\s+/) ?? [];
  if (
    !tokenTenant ||
    !allowedTenantIds.includes(tokenTenant) ||
    authorizedClient !== clientId ||
    !subject ||
    !scopes.includes(requiredScope)
  ) {
    throw unauthorized();
  }
  const id = objectId ? `${tokenTenant}:${objectId}` : `${tokenTenant}:sub:${subject}`;
  return {
    id,
    displayName: stringClaim(payload.name) ?? stringClaim(payload.preferred_username) ?? subject,
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
