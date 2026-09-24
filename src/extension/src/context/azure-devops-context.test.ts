import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('azure-devops-extension-sdk', () => ({
  getContributionId: vi.fn(() => 'time-logs-work-item-page'),
  init: vi.fn(async () => undefined),
  notifyLoadSucceeded: vi.fn(async () => undefined),
  ready: vi.fn(async () => undefined),
  register: vi.fn(),
}));

import * as SDK from 'azure-devops-extension-sdk';

import { initializeAzureDevOpsContext } from './azure-devops-context';

describe('Azure DevOps contribution initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers the work-item page provider before reporting that it loaded', async () => {
    await initializeAzureDevOpsContext();

    expect(SDK.init).toHaveBeenCalledWith({ applyTheme: true, loaded: false });
    expect(SDK.ready).toHaveBeenCalledOnce();
    expect(SDK.register).toHaveBeenCalledWith(
      'time-logs-work-item-page',
      expect.any(Function),
    );
    expect(SDK.notifyLoadSucceeded).toHaveBeenCalledOnce();

    const providerFactory = vi.mocked(SDK.register).mock.calls[0]?.[1] as () => Record<
      string,
      unknown
    >;
    const provider = providerFactory();
    expect(provider).toEqual(
      expect.objectContaining({
        onLoaded: expect.any(Function),
        onFieldChanged: expect.any(Function),
        onSaved: expect.any(Function),
        onRefreshed: expect.any(Function),
        onReset: expect.any(Function),
        onUnloaded: expect.any(Function),
      }),
    );
    expect(vi.mocked(SDK.register).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(SDK.notifyLoadSucceeded).mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });
});
