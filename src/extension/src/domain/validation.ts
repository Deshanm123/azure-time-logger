import { activities, type Activity } from '@time-logger/contracts';

export interface FormValues {
  workDate: string;
  hours: string;
  activity: Activity;
  note: string;
}

export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function validateForm(values: FormValues, today = todayLocal()): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.workDate) errors.workDate = 'Work date is required.';
  else if (values.workDate > today) errors.workDate = 'Work date cannot be in the future.';
  const hours = Number(values.hours);
  if (!values.hours || !Number.isFinite(hours) || hours <= 0)
    errors.hours = 'Hours must be greater than zero.';
  else if (hours > 24) errors.hours = 'Hours cannot exceed 24.';
  if (!activities.includes(values.activity)) errors.activity = 'Select a supported activity.';
  if (values.note.length > 1000) errors.note = 'Note cannot exceed 1000 characters.';
  return errors;
}
