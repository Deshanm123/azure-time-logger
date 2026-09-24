import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const tenantId = '615dff20-7b05-4048-a86d-57b25463b959';
const consumerTenantId = '9188040d-6c67-4c5b-b112-36a304b66dad';

function entraEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://example.test/time_logger',
    AUTH_MODE: 'entra',
    ENTRA_TENANT_ID: tenantId,
    ENTRA_CLIENT_ID: 'bf4cd5d2-9d3e-46eb-9c3a-f233fa7f8839',
    ...overrides,
  };
}

describe('Entra tenant configuration', () => {
  it('defaults the allowlist to the deployment tenant', () => {
    expect(loadConfig(entraEnvironment()).entraAllowedTenantIds).toEqual([tenantId]);
  });

  it('parses and deduplicates an explicit tenant allowlist', () => {
    const config = loadConfig(
      entraEnvironment({
        ENTRA_ALLOWED_TENANT_IDS: `${tenantId}, ${consumerTenantId},${tenantId}`,
      }),
    );

    expect(config.entraAllowedTenantIds).toEqual([tenantId, consumerTenantId]);
  });

  it('rejects malformed tenant IDs', () => {
    expect(() =>
      loadConfig(entraEnvironment({ ENTRA_ALLOWED_TENANT_IDS: `${tenantId},not-a-tenant` })),
    ).toThrow('ENTRA_ALLOWED_TENANT_IDS must contain comma-separated tenant UUIDs');
  });
});
