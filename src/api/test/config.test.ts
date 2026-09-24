import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

describe('authentication configuration', () => {
  it('allows Azure DevOps authentication in production without Entra configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://example.test/time_logger',
      AUTH_MODE: 'azure-devops',
    });

    expect(config.authMode).toBe('azure-devops');
    expect(config.entraClientId).toBeUndefined();
    expect(config.entraTenantId).toBeUndefined();
  });

  it('still requires tenant and client IDs when legacy Entra authentication is selected', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://example.test/time_logger',
        AUTH_MODE: 'entra',
      }),
    ).toThrow('ENTRA_TENANT_ID and ENTRA_CLIENT_ID are required for Entra authentication');
  });
});
