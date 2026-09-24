import { beforeEach, describe, expect, it, vi } from 'vitest';

const formService = vi.hoisted(() => ({
  getFieldValue: vi.fn<(fieldReferenceName: string) => Promise<unknown>>(),
  getFieldValues: vi.fn(async () => ({
    'System.Id': 132,
    'System.WorkItemType': 'Product Backlog Item',
  })),
  save: vi.fn(async () => undefined),
  setFieldValue: vi.fn(async () => true),
}));

vi.mock('azure-devops-extension-sdk', () => ({
  getAccessToken: vi.fn(async () => 'azure-devops-access-token'),
  getContributionId: vi.fn(() => 'time-logs-work-item-page'),
  getHost: vi.fn(() => ({ id: 'organization-id' })),
  getService: vi.fn(async () => formService),
  getUser: vi.fn(() => ({
    id: '8f1836ac-5b94-68c8-93fe-fff161218d6e',
    displayName: 'Deshan Maduranga',
  })),
  getWebContext: vi.fn(() => ({ project: { id: 'project-id' } })),
  init: vi.fn(async () => undefined),
  notifyLoadSucceeded: vi.fn(async () => undefined),
  ready: vi.fn(async () => undefined),
  register: vi.fn(),
}));

import * as SDK from 'azure-devops-extension-sdk';

import {
  authHeadersProvider,
  initializeAzureDevOpsContext,
  loadWorkItemContext,
  subtractLoggedTimeFromRemainingWork,
} from './azure-devops-context';

describe('Azure DevOps contribution initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formService.getFieldValue.mockImplementation(async (fieldReferenceName) => {
      if (fieldReferenceName === 'Time_Code') return 'VH-IT-LKA';
      if (fieldReferenceName === 'Microsoft.VSTS.Scheduling.RemainingWork') return 5;
      if (fieldReferenceName === 'Microsoft.VSTS.Scheduling.OriginalEstimate') return 8;
      return undefined;
    });
    formService.setFieldValue.mockResolvedValue(true);
    formService.save.mockResolvedValue(undefined);
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

  it('sends the SDK user context without requesting an access token', async () => {
    await expect(authHeadersProvider.getHeaders()).resolves.toEqual({
      'X-Azure-DevOps-User-Id': '8f1836ac-5b94-68c8-93fe-fff161218d6e',
      'X-Azure-DevOps-User-Display-Name': 'Deshan%20Maduranga',
    });
    expect(SDK.getUser).toHaveBeenCalledOnce();
    expect(SDK.getAccessToken).not.toHaveBeenCalled();
  });

  it('uses the work item Time_Code field as the default time code', async () => {
    await expect(loadWorkItemContext()).resolves.toMatchObject({
      organizationId: 'organization-id',
      projectId: 'project-id',
      workItemId: 132,
      timeCode: 'VH-IT-LKA',
      remainingWork: 5,
    });

    expect(formService.getFieldValue).toHaveBeenCalledWith('Time_Code');
  });

  it('uses Original Estimate for the initial summary when Remaining Work is blank', async () => {
    formService.getFieldValue.mockImplementation(async (fieldReferenceName) => {
      if (fieldReferenceName === 'Time_Code') return 'VH-IT-LKA';
      if (fieldReferenceName === 'Microsoft.VSTS.Scheduling.RemainingWork') return '';
      if (fieldReferenceName === 'Microsoft.VSTS.Scheduling.OriginalEstimate') return 7.5;
      return undefined;
    });

    await expect(loadWorkItemContext()).resolves.toMatchObject({ remainingWork: 7.5 });
  });

  it.each([
    { current: 5, original: 8, logged: 1.5, expected: 3.5 },
    { current: null, original: 4, logged: 6, expected: 0 },
    { current: '', original: 8, logged: 2, expected: 6 },
    { current: 0, original: 8, logged: 2, expected: 0 },
    { current: 1.1, original: 8, logged: 0.2, expected: 0.9 },
    { current: undefined, original: undefined, logged: 2, expected: 0 },
  ])(
    'calculates and saves Remaining Work from the correct baseline',
    async ({ current, original, logged, expected }) => {
      formService.getFieldValue.mockImplementation(async (fieldReferenceName) =>
        fieldReferenceName === 'Microsoft.VSTS.Scheduling.RemainingWork' ? current : original,
      );

      await expect(subtractLoggedTimeFromRemainingWork(logged)).resolves.toBe(expected);
      expect(formService.setFieldValue).toHaveBeenCalledWith(
        'Microsoft.VSTS.Scheduling.RemainingWork',
        expected,
      );
      expect(formService.save).toHaveBeenCalledOnce();
    },
  );

  it('does not save when Azure DevOps rejects the field update', async () => {
    formService.setFieldValue.mockResolvedValue(false);

    await expect(subtractLoggedTimeFromRemainingWork(1)).rejects.toThrow(
      'Azure DevOps did not accept the Remaining Work update.',
    );
    expect(formService.save).not.toHaveBeenCalled();
  });

  it('reports an Azure DevOps work-item save failure', async () => {
    formService.save.mockRejectedValue(new Error('save failed'));

    await expect(subtractLoggedTimeFromRemainingWork(1)).rejects.toThrow('save failed');
    expect(formService.setFieldValue).toHaveBeenCalledOnce();
  });
});
