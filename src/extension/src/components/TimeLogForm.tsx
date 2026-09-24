import { activities, timeCodes, type TimeCode, type TimeLogInput } from '@time-logger/contracts';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import type { WorkItemContext } from '../context/azure-devops-context';
import { todayLocal, validateForm, type FormValues } from '../domain/validation';

interface Props {
  context: WorkItemContext;
  initial?: FormValues;
  editing: boolean;
  busy: boolean;
  available: boolean;
  onCancel(): void;
  onSubmit(input: TimeLogInput): Promise<void>;
}

const emptyValues = (timeCode: TimeCode): FormValues => ({
  workDate: todayLocal(),
  hours: '',
  activity: 'Development',
  timeCode,
  note: '',
});

export function TimeLogForm({
  context,
  initial,
  editing,
  busy,
  available,
  onCancel,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<FormValues>(initial ?? emptyValues(context.timeCode));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(
    () => setValues(initial ?? emptyValues(context.timeCode)),
    [context.timeCode, initial],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await onSubmit({
      organizationId: context.organizationId,
      projectId: context.projectId,
      workItemId: context.workItemId,
      workDate: values.workDate,
      hours: Number(values.hours),
      activity: values.activity,
      timeCode: values.timeCode,
      note: values.note.trim() || null,
    });
    if (!editing) setValues(emptyValues(context.timeCode));
  }

  return (
    <form className="log-form" onSubmit={submit} noValidate>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{editing ? 'Correct entry' : 'New entry'}</p>
          <h2>{editing ? 'Edit time log' : 'Log time'}</h2>
        </div>
        <span className="work-item-pill">Work item #{context.workItemId}</span>
      </div>
      <div className="form-grid">
        <Field label="Work date" error={errors.workDate}>
          <input
            type="date"
            value={values.workDate}
            max={todayLocal()}
            onChange={(event) => setValues({ ...values, workDate: event.target.value })}
            aria-invalid={Boolean(errors.workDate)}
          />
        </Field>
        <Field label="Hours" error={errors.hours}>
          <input
            type="number"
            value={values.hours}
            min="0.01"
            max="24"
            step="0.25"
            inputMode="decimal"
            placeholder="1.5"
            onChange={(event) => setValues({ ...values, hours: event.target.value })}
            aria-invalid={Boolean(errors.hours)}
          />
        </Field>
        <Field label="Activity" error={errors.activity}>
          <select
            value={values.activity}
            onChange={(event) =>
              setValues({ ...values, activity: event.target.value as FormValues['activity'] })
            }
          >
            {activities.map((activity) => (
              <option key={activity}>{activity}</option>
            ))}
          </select>
        </Field>
        <Field label="Time code" error={errors.timeCode}>
          <select
            value={values.timeCode}
            onChange={(event) =>
              setValues({ ...values, timeCode: event.target.value as FormValues['timeCode'] })
            }
            aria-invalid={Boolean(errors.timeCode)}
          >
            {timeCodes.map((timeCode) => (
              <option key={timeCode} value={timeCode}>
                {timeCode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)" error={errors.note} wide>
          <textarea
            value={values.note}
            maxLength={1000}
            rows={3}
            placeholder="Briefly describe the work completed"
            onChange={(event) => setValues({ ...values, note: event.target.value })}
            aria-invalid={Boolean(errors.note)}
          />
        </Field>
      </div>
      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={busy || !available}>
          {!available
            ? 'Backend unavailable'
            : busy
              ? 'Saving…'
              : editing
                ? 'Save changes'
                : 'Log time'}
        </button>
        {editing && (
          <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={wide ? 'field field-wide' : 'field'}>
      <span>{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
