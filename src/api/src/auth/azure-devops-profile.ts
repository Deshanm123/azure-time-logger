import { AppError } from '../domain/errors.js';
import type { CurrentUser } from '../domain/types.js';

const profileUrl =
  'https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.1';

interface AzureDevOpsProfile {
  id?: unknown;
  displayName?: unknown;
}

export async function resolveAzureDevOpsUser(
  accessToken: string,
  fetcher: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<CurrentUser> {
  let response: Response;
  try {
    response = await fetcher(profileUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw authenticationUnavailable();
  }

  if (!response.ok) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Azure DevOps could not authenticate this session.',
    );
  }

  let profile: AzureDevOpsProfile;
  try {
    profile = (await response.json()) as AzureDevOpsProfile;
  } catch {
    throw authenticationUnavailable();
  }

  const id = stringValue(profile.id);
  if (!id) {
    throw new AppError(
      401,
      'AUTHENTICATION_REQUIRED',
      'Azure DevOps returned no stable user identifier.',
    );
  }

  return {
    id,
    displayName: stringValue(profile.displayName) ?? id,
  };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function authenticationUnavailable(): AppError {
  return new AppError(
    503,
    'AUTHENTICATION_UNAVAILABLE',
    'Azure DevOps authentication is temporarily unavailable.',
  );
}
