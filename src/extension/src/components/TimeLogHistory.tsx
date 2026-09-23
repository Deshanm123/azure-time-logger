import type { TimeLog } from '@time-logger/contracts';

interface Props {
  logs: TimeLog[];
  busyId?: string;
  onEdit(log: TimeLog): void;
  onDelete(log: TimeLog): void;
}

export function TimeLogHistory({ logs, busyId, onEdit, onDelete }: Props) {
  if (!logs.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">
          00:00
        </div>
        <h3>No time logged yet</h3>
        <p>Add the first entry for this work item using the form above.</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      {logs.map((log) => (
        <article className="history-card" key={log.id}>
          <div className="date-tile">
            <strong>
              {new Date(`${log.workDate}T00:00:00`).toLocaleDateString(undefined, {
                day: '2-digit',
              })}
            </strong>
            <span>
              {new Date(`${log.workDate}T00:00:00`).toLocaleDateString(undefined, {
                month: 'short',
              })}
            </span>
          </div>
          <div className="history-content">
            <div className="history-meta">
              <span className="activity-tag">{log.activity}</span>
              <span>{log.userDisplayName}</span>
              {log.updatedAt !== log.createdAt && <span>Edited</span>}
            </div>
            <p>{log.note || <span className="muted">No note provided</span>}</p>
          </div>
          <strong className="hours-value">{formatHours(log.hours)}h</strong>
          {log.isOwner && (
            <div className="row-actions" aria-label={`Actions for ${log.workDate} time log`}>
              <button type="button" onClick={() => onEdit(log)} disabled={Boolean(busyId)}>
                Edit
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() => onDelete(log)}
                disabled={Boolean(busyId)}
              >
                {busyId === log.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

export function formatHours(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
