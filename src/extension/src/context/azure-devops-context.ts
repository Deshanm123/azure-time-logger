import {
  type IWorkItemFormService,
  WorkItemTrackingServiceIds,
} from 'azure-devops-extension-api/WorkItemTracking';
import * as SDK from 'azure-devops-extension-sdk';

export interface WorkItemContext {
  organizationId: string;
  projectId: string;
  workItemId: number;
  workItemType: string;
  userId: string;
  userDisplayName: string;
}

export interface AuthHeadersProvider {
  getHeaders(): Promise<Record<string, string>>;
}

const mockEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_CONTEXT === 'true';
let initialized: Promise<void> | undefined;

export async function loadWorkItemContext(): Promise<WorkItemContext> {
  if (mockEnabled) return mockContext();
  initialized ??= initializeSdk();
  await initialized;

  const service = await SDK.getService<IWorkItemFormService>(
    WorkItemTrackingServiceIds.WorkItemFormService,
  );
  const fields = await service.getFieldValues(['System.Id', 'System.WorkItemType']);
  const workItemId = Number(fields['System.Id']);
  if (!Number.isInteger(workItemId) || workItemId <= 0) {
    throw new Error('Save this work item before logging time.');
  }
  const webContext = SDK.getWebContext();
  const host = SDK.getHost();
  const user = SDK.getUser();
  if (!webContext.project?.id) throw new Error('Azure DevOps project context is unavailable.');

  return {
    organizationId: host.id,
    projectId: webContext.project.id,
    workItemId,
    workItemType: String(fields['System.WorkItemType'] ?? ''),
    userId: user.id,
    userDisplayName: user.displayName,
  };
}

export const authHeadersProvider: AuthHeadersProvider = {
  async getHeaders(): Promise<Record<string, string>> {
    if (mockEnabled) {
      return { 'X-Dev-User-Id': 'local-user', 'X-Dev-User-Display-Name': 'Local Developer' };
    }
    initialized ??= initializeSdk();
    await initialized;
    return { Authorization: `Bearer ${await SDK.getAppToken()}` };
  },
};

async function initializeSdk(): Promise<void> {
  await SDK.init({ applyTheme: true });
  await SDK.ready();
}

function mockContext(): WorkItemContext {
  const query = new URLSearchParams(window.location.search);
  return {
    organizationId: query.get('organizationId') ?? 'local-organization',
    projectId: query.get('projectId') ?? 'local-project',
    workItemId: Number(query.get('workItemId') ?? 160637),
    workItemType: query.get('workItemType') ?? 'Task',
    userId: 'local-user',
    userDisplayName: 'Local Developer',
  };
}
