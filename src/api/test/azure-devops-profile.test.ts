import { describe, expect, it, vi } from 'vitest';

import { resolveAzureDevOpsUser } from '../src/auth/azure-devops-profile.js';

describe('resolveAzureDevOpsUser', () => {
  it('resolves the current profile using the SDK access token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: '8f1836ac-5b94-68c8-93fe-fff161218d6e',
          displayName: 'Deshan Maduranga',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(resolveAzureDevOpsUser('azure-devops-token', fetcher)).resolves.toEqual({
      id: '8f1836ac-5b94-68c8-93fe-fff161218d6e',
      displayName: 'Deshan Maduranga',
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer azure-devops-token' }),
        redirect: 'manual',
      }),
    );
  });

  it('rejects a token refused by Azure DevOps', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));

    await expect(resolveAzureDevOpsUser('invalid-token', fetcher)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('does not follow an authentication redirect to an HTML sign-in page', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: 'https://example.test/sign-in' },
      }),
    );

    await expect(resolveAzureDevOpsUser('expired-token', fetcher)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('rejects a profile without a stable ID', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ displayName: 'Missing ID' }), { status: 200 }));

    await expect(resolveAzureDevOpsUser('token', fetcher)).rejects.toMatchObject({
      statusCode: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('reports Azure DevOps network failures without exposing the token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('network unavailable'));

    await expect(resolveAzureDevOpsUser('sensitive-token', fetcher)).rejects.toMatchObject({
      statusCode: 503,
      code: 'AUTHENTICATION_UNAVAILABLE',
    });
  });
});
