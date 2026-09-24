import type { TimeLog, TimeLogInput, WorkItemScope } from '@time-logger/contracts';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError, TimeLogApi } from './api/time-log-api';
import { TimeLogForm } from './components/TimeLogForm';
import { formatHours, TimeLogHistory } from './components/TimeLogHistory';
import {
  authHeadersProvider,
  loadWorkItemContext,
  type WorkItemContext,
} from './context/azure-devops-context';
import type { FormValues } from './domain/validation';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
const backendAvailable = Boolean(apiBaseUrl);
const supportedTypes = new Set(
  (import.meta.env.VITE_SUPPORTED_WORK_ITEM_TYPES ?? 'Task,Product Backlog Item,Bug')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

export default function App() {
  const api = useMemo(() => new TimeLogApi(apiBaseUrl, authHeadersProvider), []);
  const [context, setContext] = useState<WorkItemContext>();
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<TimeLog>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const refresh = useCallback(
    async (current: WorkItemContext) => {
      const scope = toScope(current);
      const [nextLogs, summary] = await Promise.all([api.list(scope), api.summary(scope)]);
      setLogs(nextLogs);
      setTotal(summary.totalHours);
    },
    [api],
  );

  useEffect(() => {
    void (async () => {
      let current: WorkItemContext;
      try {
        current = await loadWorkItemContext();
        if (!supportedTypes.has(current.workItemType)) {
          throw new Error(
            `Time logging is not enabled for ${current.workItemType || 'this work-item type'}.`,
          );
        }
        setContext(current);
        setLoading(false);
      } catch (caught) {
        setError(messageFor(caught));
        setLoading(false);
        return;
      }

      if (!backendAvailable) {
        setError(
          'The Time Logger backend is not configured. You can view the form, but saving and history are unavailable.',
        );
        return;
      }

      try {
        await refresh(current);
      } catch (caught) {
        setError(messageFor(caught));
      }
    })();
  }, [refresh]);

  async function save(input: TimeLogInput) {
    if (!context) return;
    if (!backendAvailable) {
      setError('The Time Logger backend must be configured before entries can be saved.');
      return;
    }
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    try {
      if (editing) {
        await api.update(editing.id, { ...input, version: editing.version });
        setNotice('Time log updated.');
        setEditing(undefined);
      } else {
        await api.create(input, crypto.randomUUID());
        setNotice('Time logged successfully.');
      }
      await refresh(context);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setSaving(false);
    }
  }

  async function remove(log: TimeLog) {
    if (
      !context ||
      !window.confirm('Delete this time log? This action removes it from the work-item history.')
    )
      return;
    setDeletingId(log.id);
    setError(undefined);
    setNotice(undefined);
    try {
      await api.delete(log.id, toScope(context), log.version);
      if (editing?.id === log.id) setEditing(undefined);
      setNotice('Time log deleted.');
      await refresh(context);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setDeletingId(undefined);
    }
  }

  if (loading) {
    return (
      <main className="app-shell loading-state" aria-busy="true">
        Loading time logs…
      </main>
    );
  }

  if (!context) {
    return (
      <main className="app-shell">
        <div className="message error-message" role="alert">
          {error ?? 'Work-item context is unavailable.'}
        </div>
      </main>
    );
  }

  const editValues: FormValues | undefined = editing
    ? {
        workDate: editing.workDate,
        hours: String(editing.hours),
        activity: editing.activity,
        note: editing.note ?? '',
      }
    : undefined;

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {context.workItemType} #{context.workItemId}
          </p>
          <h1>Time Logs</h1>
          <p>Capture the work behind this item while the context is fresh.</p>
        </div>
        <div className="total-card" aria-label={`${formatHours(total)} total hours logged`}>
          <span>Total logged</span>
          <strong>{formatHours(total)}h</strong>
          <small>
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </small>
        </div>
      </header>

      {error && (
        <div className="message error-message" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="message success-message" role="status">
          {notice}
        </div>
      )}

      <TimeLogForm
        context={context}
        initial={editValues}
        editing={Boolean(editing)}
        busy={saving}
        available={backendAvailable}
        onCancel={() => setEditing(undefined)}
        onSubmit={save}
      />

      <section className="history-section" aria-labelledby="history-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Persisted history</p>
            <h2 id="history-heading">Work log</h2>
          </div>
          <button
            className="secondary-button"
            type="button"
            disabled={!backendAvailable}
            onClick={() => void refresh(context).catch((caught) => setError(messageFor(caught)))}
          >
            Refresh
          </button>
        </div>
        <TimeLogHistory logs={logs} busyId={deletingId} onEdit={setEditing} onDelete={remove} />
      </section>
    </main>
  );
}

function toScope(context: WorkItemContext): WorkItemScope {
  return {
    organizationId: context.organizationId,
    projectId: context.projectId,
    workItemId: context.workItemId,
  };
}

function messageFor(error: unknown): string {
  if (error instanceof ApiClientError && error.errors) {
    const detail = Object.values(error.errors).flat()[0];
    if (detail) return detail;
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
