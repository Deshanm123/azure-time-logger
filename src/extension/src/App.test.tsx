import { cleanup, render, screen } from '@testing-library/react';
import { timeCodes } from '@time-logger/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';

vi.mock('./context/azure-devops-context', () => ({
  authHeadersProvider: { getHeaders: vi.fn(async () => ({})) },
  loadWorkItemContext: vi.fn(async () => ({
    organizationId: 'organization',
    projectId: 'project',
    workItemId: 132,
    workItemType: 'Product Backlog Item',
    timeCode: 'VH-DEV-LKA',
    userId: 'user',
    userDisplayName: 'Test User',
  })),
}));

afterEach(cleanup);

describe('App without a configured backend', () => {
  it('renders the work-item form and disables server actions', async () => {
    render(<App />);

    expect(await screen.findByText('Product Backlog Item #132')).toBeTruthy();
    expect(screen.getByLabelText('Work date')).toBeTruthy();
    expect(screen.getByLabelText('Hours')).toBeTruthy();
    expect(screen.getByLabelText('Activity')).toBeTruthy();
    expect(screen.getByLabelText('Time code')).toHaveProperty('value', 'VH-DEV-LKA');
    for (const timeCode of timeCodes) {
      expect(screen.getByRole('option', { name: timeCode })).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Backend unavailable' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('alert').textContent).toMatch(/backend is not configured/i);
  });
});
