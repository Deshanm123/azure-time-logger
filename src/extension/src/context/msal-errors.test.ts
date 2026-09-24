import {
  BrowserAuthError,
  BrowserAuthErrorCodes,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';
import { describe, expect, it } from 'vitest';

import { isAuthenticationTimeout, requiresInteractiveAuthentication } from './msal-errors';

describe('MSAL error handling', () => {
  it('uses interactive authentication when silent authentication times out', () => {
    const error = new BrowserAuthError(BrowserAuthErrorCodes.timedOut, 'correlation-id');

    expect(requiresInteractiveAuthentication(error)).toBe(true);
    expect(isAuthenticationTimeout(error)).toBe(true);
  });

  it('uses interactive authentication for an interaction-required response', () => {
    const error = new InteractionRequiredAuthError('interaction_required', 'correlation-id');

    expect(requiresInteractiveAuthentication(error)).toBe(true);
    expect(isAuthenticationTimeout(error)).toBe(false);
  });

  it('does not retry unrelated authentication errors interactively', () => {
    const error = new BrowserAuthError(BrowserAuthErrorCodes.userCancelled, 'correlation-id');

    expect(requiresInteractiveAuthentication(error)).toBe(false);
    expect(isAuthenticationTimeout(error)).toBe(false);
  });
});
