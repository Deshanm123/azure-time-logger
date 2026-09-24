import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  createAuthenticator,
  currentUser,
  userFromEntraToken,
} from '../src/auth/authenticate.js';
import { loadConfig } from '../src/config.js';

const tenantId = '615dff20-7b05-4048-a86d-57b25463b959';
const clientId = 'bf4cd5d2-9d3e-46eb-9c3a-f233fa7f8839';

describe('userFromEntraToken', () => {
  it('derives a tenant-scoped stable user from a validated delegated token', () => {
    expect(
      userFromEntraToken(
        {
          tid: tenantId,
          azp: clientId,
          oid: 'b7578466-1f4d-4f5a-9c09-6ca1f75cbe89',
          scp: 'access_as_user openid profile',
          name: 'Test User',
        },
        tenantId,
        clientId,
        'access_as_user',
      ),
    ).toEqual({
      id: `${tenantId}:b7578466-1f4d-4f5a-9c09-6ca1f75cbe89`,
      displayName: 'Test User',
    });
  });

  it.each([
    {
      name: 'tenant',
      payload: { tid: 'different', azp: clientId, oid: 'user', scp: 'access_as_user' },
    },
    {
      name: 'client',
      payload: { tid: tenantId, azp: 'different', oid: 'user', scp: 'access_as_user' },
    },
    { name: 'user', payload: { tid: tenantId, azp: clientId, scp: 'access_as_user' } },
    {
      name: 'scope',
      payload: { tid: tenantId, azp: clientId, oid: 'user', scp: 'openid profile' },
    },
  ])('rejects a token with an invalid $name claim', ({ payload }) => {
    expect(() => userFromEntraToken(payload, tenantId, clientId, 'access_as_user')).toThrow(
      'A valid authenticated user is required.',
    );
  });
});

describe('Azure DevOps SDK token authentication', () => {
  it('uses the server-resolved Azure DevOps profile as the current user', async () => {
    const resolver = vi.fn(async () => ({
      id: '8f1836ac-5b94-68c8-93fe-fff161218d6e',
      displayName: 'Deshan Maduranga',
    }));
    const authenticate = createAuthenticator(
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://example.test/time_logger',
        AUTH_MODE: 'azure-devops',
      }),
      resolver,
    );
    const request = {
      headers: { authorization: 'Bearer sdk-access-token' },
    } as FastifyRequest;

    await authenticate(request, {} as FastifyReply);

    expect(resolver).toHaveBeenCalledWith('sdk-access-token');
    expect(currentUser(request)).toEqual({
      id: '8f1836ac-5b94-68c8-93fe-fff161218d6e',
      displayName: 'Deshan Maduranga',
    });
  });
});
