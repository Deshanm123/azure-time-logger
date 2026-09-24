import { describe, expect, it } from 'vitest';

import { userFromEntraToken } from '../src/auth/authenticate.js';

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
