import {
  BrowserAuthError,
  BrowserAuthErrorCodes,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';

export function requiresInteractiveAuthentication(error: unknown): boolean {
  return (
    error instanceof InteractionRequiredAuthError ||
    (error instanceof BrowserAuthError && error.errorCode === BrowserAuthErrorCodes.timedOut)
  );
}

export function isAuthenticationTimeout(error: unknown): boolean {
  return error instanceof BrowserAuthError && error.errorCode === BrowserAuthErrorCodes.timedOut;
}
