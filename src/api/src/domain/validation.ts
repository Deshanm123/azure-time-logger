import { activities, type TimeLogInput } from '@time-logger/contracts';

import { ValidationError } from './errors.js';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function validateTimeLog(input: TimeLogInput, maxHours: number, today: string): void {
  const errors: Record<string, string[]> = {};
  if (!input.organizationId.trim()) errors.organizationId = ['Organization is required.'];
  else if (input.organizationId.length > 100)
    errors.organizationId = ['Organization cannot exceed 100 characters.'];
  if (!input.projectId.trim()) errors.projectId = ['Project is required.'];
  else if (input.projectId.length > 100)
    errors.projectId = ['Project cannot exceed 100 characters.'];
  if (!Number.isInteger(input.workItemId) || input.workItemId <= 0) {
    errors.workItemId = ['A saved work item is required.'];
  }
  if (!isCalendarDate(input.workDate)) {
    errors.workDate = ['A valid work date is required.'];
  } else if (input.workDate > today) {
    errors.workDate = ['Work date cannot be in the future.'];
  }
  if (!Number.isFinite(input.hours) || input.hours <= 0) {
    errors.hours = ['Hours must be greater than zero.'];
  } else if (input.hours > maxHours) {
    errors.hours = [`Hours cannot exceed ${maxHours}.`];
  }
  if (!activities.includes(input.activity)) errors.activity = ['Activity is not supported.'];
  if (input.note && input.note.length > 1000) errors.note = ['Note cannot exceed 1000 characters.'];
  if (Object.keys(errors).length) throw new ValidationError(errors);
}

export function validateScope(organizationId: string, projectId: string, workItemId: number): void {
  const errors: Record<string, string[]> = {};
  if (!organizationId.trim()) errors.organizationId = ['Organization is required.'];
  else if (organizationId.length > 100)
    errors.organizationId = ['Organization cannot exceed 100 characters.'];
  if (!projectId.trim()) errors.projectId = ['Project is required.'];
  else if (projectId.length > 100) errors.projectId = ['Project cannot exceed 100 characters.'];
  if (!Number.isInteger(workItemId) || workItemId <= 0) {
    errors.workItemId = ['A saved work item is required.'];
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
}

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
