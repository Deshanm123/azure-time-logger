import { describe, expect, it } from 'vitest';

import { userFromEntraToken } from '../src/auth/authenticate.js';

const tenantId = '615dff20-7b05-4048-a86d-57b25463b959';
const consumerTenantId = '9188040d-6c67-4c5b-b112-36a304b66dad';
const clientId = 'bf4cd5d2-9d3e-46eb-9c3a-f233fa7f8839';
const allowedTenantIds = [tenantId, consumerTenantId];

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
        allowedTenantIds,
        clientId,
        'access_as_user',
      ),
    ).toEqual({
      id: `${tenantId}:b7578466-1f4d-4f5a-9c09-6ca1f75cbe89`,
      displayName: 'Test User',
    });
  });

  it('accepts a personal Microsoft account from the allowed consumer tenant', () => {
    expect(
      userFromEntraToken(
        {
          tid: consumerTenantId,
          azp: clientId,
          oid: 'df659327-181f-46ac-bceb-66f3437c878c',
          scp: 'access_as_user',
          name: 'Personal Account',
        },
        allowedTenantIds,
        clientId,
        'access_as_user',
      ),
    ).toEqual({
      id: `${consumerTenantId}:df659327-181f-46ac-bceb-66f3437c878c`,
      displayName: 'Personal Account',
    });
  });

  it('uses the pairwise subject when a personal account token omits oid', () => {
    expect(
      userFromEntraToken(
        {
          tid: consumerTenantId,
          azp: clientId,
          sub: 'pairwise-personal-subject',
          scp: 'access_as_user',
        },
        allowedTenantIds,
        clientId,
        'access_as_user',
      ),
    ).toEqual({
      id: `${consumerTenantId}:sub:pairwise-personal-subject`,
      displayName: 'pairwise-personal-subject',
    });
  });

  it.each([
    {
      name: 'tenant',
      payload: {
        tid: '00000000-0000-0000-0000-000000000000',
        azp: clientId,
        oid: 'user',
        scp: 'access_as_user',
      },
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
    expect(() => userFromEntraToken(payload, allowedTenantIds, clientId, 'access_as_user')).toThrow(
      'A valid authenticated user is required.',
    );
  });
});
