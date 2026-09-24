export const activities = [
  'Development',
  'Testing',
  'Code Review',
  'Analysis',
  'Design',
  'Documentation',
  'Meeting',
  'Support',
  'Other',
] as const;

export type Activity = (typeof activities)[number];

export const timeCodes = [
  'VH-SUP-LKA',
  'VH-PS-LKA',
  'VH-DEV-LKA',
  'VH-IT-LKA',
  'VH-ADM-LKA',
  'VH-ADM-Administration',
  'VH-ADM-Business Systems',
  'VH-ADM-HR',
  'VH-ADM-Finance',
] as const;

export type TimeCode = (typeof timeCodes)[number];

export interface WorkItemScope {
  organizationId: string;
  projectId: string;
  workItemId: number;
}

export interface TimeLogInput extends WorkItemScope {
  workDate: string;
  hours: number;
  activity: Activity;
  timeCode: TimeCode;
  note?: string | null;
}

export interface UpdateTimeLogInput extends TimeLogInput {
  version: number;
}

export interface TimeLog extends TimeLogInput {
  id: string;
  userId: string;
  userDisplayName: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isOwner: boolean;
}

export interface TimeLogSummary {
  workItemId: number;
  totalHours: number;
  entryCount: number;
}

export interface ApiError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
  correlationId: string;
}
