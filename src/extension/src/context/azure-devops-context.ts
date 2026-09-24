import type { IWorkItemFormService } from 'azure-devops-extension-api/WorkItemTracking/WorkItemTrackingServices';
import * as SDK from 'azure-devops-extension-sdk';
import {
  createNestablePublicClientApplication,
  InteractionRequiredAuthError,
  type IPublicClientApplication,
} from '@azure/msal-browser';

const workItemFormServiceId = 'ms.vss-work-web.work-item-form';

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
const entraClientId = import.meta.env.VITE_ENTRA_CLIENT_ID;
const entraTenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const entraApiScope = import.meta.env.VITE_ENTRA_API_SCOPE;
let initialized: Promise<void> | undefined;
let entraClient: Promise<IPublicClientApplication> | undefined;
let tokenRequest: Promise<string> | undefined;

export async function loadWorkItemContext(): Promise<WorkItemContext> {
  if (mockEnabled) return mockContext();
  initialized ??= initializeSdk();
  await initialized;

  const service = await SDK.getService<IWorkItemFormService>(workItemFormServiceId);
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
    tokenRequest ??= acquireApiToken();
    try {
      return { Authorization: `Bearer ${await tokenRequest}` };
    } finally {
      tokenRequest = undefined;
    }
  },
};

async function acquireApiToken(): Promise<string> {
  if (!entraClientId || !entraTenantId || !entraApiScope) {
    throw new Error('Microsoft Entra authentication is not configured for this extension build.');
  }
  entraClient ??= createEntraClient(entraClientId, entraTenantId);
  const client = await entraClient;
  const scopes = [entraApiScope];
  const account = client.getActiveAccount() ?? client.getAllAccounts()[0];
  try {
    const result = await client.acquireTokenSilent({ scopes, ...(account ? { account } : {}) });
    if (result.account) client.setActiveAccount(result.account);
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    const result = await client.acquireTokenPopup({ scopes });
    if (result.account) client.setActiveAccount(result.account);
    return result.accessToken;
  }
}

async function createEntraClient(
  clientId: string,
  tenantId: string,
): Promise<IPublicClientApplication> {
  await SDK.enableNestedAppAuth();
  return createNestablePublicClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

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
