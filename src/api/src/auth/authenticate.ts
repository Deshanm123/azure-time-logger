import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type { CurrentUser } from '../domain/types.js';
import { resolveAzureDevOpsUser } from './azure-devops-profile.js';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: CurrentUser;
  }
}

export function createAuthenticator(
  config: AppConfig,
  azureDevOpsUserResolver: (accessToken: string) => Promise<CurrentUser> = resolveAzureDevOpsUser,
) {
  const verifyEntraToken =
    config.authMode === 'entra'
      ? createEntraTokenVerifier(config.entraTenantId as string, config.entraAudience as string)
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
      if (config.authMode === 'azure-devops') {
        request.currentUser = await azureDevOpsUserResolver(authorization.slice(7));
        return;
      }

      if (config.authMode === 'entra') {
        const payload = await (verifyEntraToken as EntraTokenVerifier)(authorization.slice(7));
        request.currentUser = userFromEntraToken(
          payload,
          config.entraTenantId as string,
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

function createEntraTokenVerifier(tenantId: string, audience: string): EntraTokenVerifier {
  const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
  const keys = createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`),
  );
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      audience,
      issuer,
    });
    return payload;
  };
}

export function userFromEntraToken(
  payload: JWTPayload,
  tenantId: string,
  clientId: string,
  requiredScope: string,
): CurrentUser {
  const tokenTenant = stringClaim(payload.tid);
  const authorizedClient = stringClaim(payload.azp) ?? stringClaim(payload.appid);
  const objectId = stringClaim(payload.oid);
  const scopes = stringClaim(payload.scp)?.split(/\s+/) ?? [];
  if (
    tokenTenant !== tenantId ||
    authorizedClient !== clientId ||
    !objectId ||
    !scopes.includes(requiredScope)
  ) {
    throw unauthorized();
  }
  const id = `${tokenTenant}:${objectId}`;
  return {
    id,
    displayName: stringClaim(payload.name) ?? stringClaim(payload.preferred_username) ?? objectId,
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
