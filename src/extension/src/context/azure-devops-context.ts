import type {
  IWorkItemFormService,
  IWorkItemNotificationListener,
} from 'azure-devops-extension-api/WorkItemTracking/WorkItemTrackingServices';
import * as SDK from 'azure-devops-extension-sdk';
import { timeCodes, type TimeCode } from '@time-logger/contracts';

const workItemFormServiceId = 'ms.vss-work-web.work-item-form';
const timeCodeField = import.meta.env.VITE_TIME_CODE_FIELD?.trim() || 'Time_Code';
const originalEstimateField = 'Microsoft.VSTS.Scheduling.OriginalEstimate';
const remainingWorkField = 'Microsoft.VSTS.Scheduling.RemainingWork';

export interface WorkItemContext {
  organizationId: string;
  projectId: string;
  workItemId: number;
  workItemType: string;
  timeCode: TimeCode;
  remainingWork: number;
  userId: string;
  userDisplayName: string;
}

export interface AuthHeadersProvider {
  getHeaders(): Promise<Record<string, string>>;
}

const mockEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_CONTEXT === 'true';
let initialized: Promise<void> | undefined;

const workItemPageProvider: IWorkItemNotificationListener = {
  onLoaded: () => undefined,
  onFieldChanged: () => undefined,
  onSaved: () => undefined,
  onRefreshed: () => undefined,
  onReset: () => undefined,
  onUnloaded: () => undefined,
};

export async function initializeAzureDevOpsContext(): Promise<void> {
  if (mockEnabled) return;
  initialized ??= initializeSdk();
  await initialized;
}

export async function loadWorkItemContext(): Promise<WorkItemContext> {
  if (mockEnabled) return mockContext();
  await initializeAzureDevOpsContext();

  const service = await SDK.getService<IWorkItemFormService>(workItemFormServiceId);
  const fields = await service.getFieldValues(['System.Id', 'System.WorkItemType']);
  const workItemId = Number(fields['System.Id']);
  if (!Number.isInteger(workItemId) || workItemId <= 0) {
    throw new Error('Save this work item before logging time.');
  }
  const webContext = SDK.getWebContext();
  const host = SDK.getHost();
  const user = SDK.getUser();
  const timeCode = await loadDefaultTimeCode(service);
  const remainingWork = await loadRemainingWork(service);
  if (!webContext.project?.id) throw new Error('Azure DevOps project context is unavailable.');

  return {
    organizationId: host.id,
    projectId: webContext.project.id,
    workItemId,
    workItemType: String(fields['System.WorkItemType'] ?? ''),
    timeCode,
    remainingWork,
    userId: user.id,
    userDisplayName: user.displayName,
  };
}

export const authHeadersProvider: AuthHeadersProvider = {
  async getHeaders(): Promise<Record<string, string>> {
    if (mockEnabled) {
      return { 'X-Dev-User-Id': 'local-user', 'X-Dev-User-Display-Name': 'Local Developer' };
    }
    await initializeAzureDevOpsContext();
    const user = SDK.getUser();
    if (!user.id) throw new Error('Azure DevOps user context is unavailable.');
    return {
      'X-Azure-DevOps-User-Id': user.id,
      'X-Azure-DevOps-User-Display-Name': encodeURIComponent(user.displayName || user.id),
    };
  },
};

export async function subtractLoggedTimeFromRemainingWork(loggedHours: number): Promise<number> {
  await initializeAzureDevOpsContext();
  const service = await SDK.getService<IWorkItemFormService>(workItemFormServiceId);
  const currentRemainingWork = asHours(await getFieldValue(service, remainingWorkField));
  const originalEstimate = asHours(await getFieldValue(service, originalEstimateField));
  const baseline = currentRemainingWork ?? originalEstimate ?? 0;
  const finalRemainingWork = Math.max(0, Number((baseline - loggedHours).toFixed(2)));
  if (!(await service.setFieldValue(remainingWorkField, finalRemainingWork))) {
    throw new Error('Azure DevOps did not accept the Remaining Work update.');
  }
  await service.save();
  return finalRemainingWork;
}

async function initializeSdk(): Promise<void> {
  await SDK.init({ applyTheme: true, loaded: false });
  await SDK.ready();
  SDK.register(SDK.getContributionId(), () => workItemPageProvider);
  await SDK.notifyLoadSucceeded();
}

function mockContext(): WorkItemContext {
  const query = new URLSearchParams(window.location.search);
  return {
    organizationId: query.get('organizationId') ?? 'local-organization',
    projectId: query.get('projectId') ?? 'local-project',
    workItemId: Number(query.get('workItemId') ?? 160637),
    workItemType: query.get('workItemType') ?? 'Task',
    timeCode: asTimeCode(query.get('timeCode')) ?? timeCodes[0],
    remainingWork: Number(query.get('remainingWork') ?? 0),
    userId: 'local-user',
    userDisplayName: 'Local Developer',
  };
}

async function loadDefaultTimeCode(service: IWorkItemFormService): Promise<TimeCode> {
  try {
    return asTimeCode(await service.getFieldValue(timeCodeField)) ?? timeCodes[0];
  } catch {
    return timeCodes[0];
  }
}

async function loadRemainingWork(service: IWorkItemFormService): Promise<number> {
  const remainingWork = asHours(await getFieldValue(service, remainingWorkField));
  if (remainingWork !== undefined) return remainingWork;
  return asHours(await getFieldValue(service, originalEstimateField)) ?? 0;
}

async function getFieldValue(
  service: IWorkItemFormService,
  fieldReferenceName: string,
): Promise<unknown> {
  try {
    return await service.getFieldValue(fieldReferenceName);
  } catch {
    return undefined;
  }
}

function asHours(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function asTimeCode(value: unknown): TimeCode | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return timeCodes.find((timeCode) => timeCode === normalized);
}
