# Requirements

## Status

Draft requirements for the Azure DevOps Time Logger.

Requirements use the identifiers `FR-*` for functional requirements and `NFR-*` for non-functional requirements.

## Functional requirements

### FR-001 — Work-item integration

The product shall expose a Time Logs experience from an Azure DevOps work item.

The MVP target is a work-item-form page/tab named **Time Logs**.

### FR-002 — Current work-item context

The extension shall obtain the current Azure DevOps work-item ID from the work-item form context.

The user shall not be required to type the work-item ID.

### FR-003 — Current user context

The extension shall identify the signed-in user using supported Azure DevOps identity/context APIs and send a stable user identifier to the backend.

Display names may be stored for convenience, but authorization shall not rely on display name.

### FR-004 — Create time log

A user shall be able to create a time log containing:

- work date;
- hours;
- activity;
- note;
- current work-item ID;
- project/organization context;
- current user identity.

### FR-005 — Work date

The work date shall be required.

The MVP shall allow today and past dates.

Future-date behavior shall be configurable later; the default MVP behavior is to reject future dates.

### FR-006 — Hours

Hours shall:

- be required;
- be greater than `0`;
- support decimal values;
- use a configurable upper limit per entry;
- initially use `24` hours as the maximum allowed value.

The UI should support quarter-hour and half-hour values without requiring a fixed increment.

### FR-007 — Activity

Activity shall be required.

Initial supported activities:

- Development
- Testing
- Code Review
- Analysis
- Design
- Documentation
- Meeting
- Support
- Other

The activity model should be designed so organization-specific values can be added later.

### FR-008 — Note

A note shall be optional in the data model but the UI should encourage a concise description.

An organization may later choose to make notes mandatory through configuration.

### FR-009 — Persist time log

A successful submission shall persist the entry outside the browser so it remains available after refresh, another session, or another device.

### FR-010 — View logs

The Time Logs tab shall display entries associated with the current work item.

At minimum show:

- date;
- user;
- hours;
- activity;
- note;
- created/updated indicator where useful.

### FR-011 — Total logged hours

The tab shall display the total hours recorded for the current work item.

The total shall be calculated from persisted time-log records.

### FR-012 — Edit own entry

A user shall be able to edit an entry they created.

The system shall retain `updatedAt`.

Audit history for edits is not required for the first MVP, but the data model and API must not prevent it from being added later.

### FR-013 — Delete own entry

A user shall be able to delete an entry they created.

The preferred backend implementation is soft-delete or auditable deletion if organizational compliance requirements demand it. For MVP, the implementation choice must be explicit.

### FR-014 — Authorization

The backend shall enforce authorization.

The frontend shall not be trusted to determine whether an entry can be read, edited, or deleted.

### FR-015 — Supported work-item types

The extension shall be able to operate on configured work-item types.

Initial expected types:

- Task
- Product Backlog Item
- Bug

Support for Feature/Epic can be enabled if required, but is not necessary for the first MVP.

### FR-016 — Loading and error states

The UI shall provide clear states for:

- loading;
- empty log history;
- validation error;
- API failure;
- permission failure;
- successful create/update/delete.

### FR-017 — Duplicate submission protection

The UI shall prevent accidental repeated submissions while a request is in progress.

The API should support idempotency or equivalent duplicate-protection if repeated network requests are possible.

### FR-018 — Concurrency

Update and delete operations shall detect stale updates using a version, timestamp, row version, or equivalent concurrency mechanism.

### FR-019 — Azure DevOps aggregate-field synchronization

Automatic synchronization of logged totals into Azure DevOps `Completed Work`, `Remaining Work`, or custom `Actual Hours` is **not required for MVP**.

If added later, it shall be configurable and shall not silently overwrite user-managed values.

### FR-020 — Data export

A later phase shall provide a supported mechanism to extract time logs for analytics/data-lake ingestion.

Direct database access by reporting clients should not be the default integration contract.

## API requirements

A minimal REST API should provide:

```text
POST   /api/time-logs
GET    /api/time-logs?workItemId={id}
GET    /api/time-logs/{id}
PUT    /api/time-logs/{id}
DELETE /api/time-logs/{id}
GET    /api/time-logs/summary?workItemId={id}
```

Exact endpoint naming may change during implementation.

### Create request example

```json
{
  "organizationId": "org-id",
  "projectId": "project-id",
  "workItemId": 160637,
  "workDate": "2026-09-23",
  "hours": 2.5,
  "activity": "Development",
  "note": "Implemented API validation"
}
```

User identity must come from authenticated context, not from a user-controlled `userId` field in the body.

## Data requirements

A time-log record shall contain at least:

```text
Id
OrganizationId
ProjectId
WorkItemId
UserId
UserDisplayName
WorkDate
Hours
Activity
Note
CreatedAt
UpdatedAt
```

Recommended additional fields:

```text
RowVersion / concurrency token
DeletedAt
CreatedBy
UpdatedBy
Source
```

## Non-functional requirements

### NFR-001 — Security

- No secrets in frontend source or extension manifest.
- Backend endpoints require authentication.
- Authorization is enforced server-side.
- Input is validated server-side.
- Logs must not expose access tokens or sensitive headers.

### NFR-002 — Privacy

Only information necessary for time logging and delivery analytics should be stored.

Avoid collecting unrelated employee profile information.

### NFR-003 — Performance

For normal usage, the Time Logs tab should become usable quickly after the work-item form loads.

Initial target:

- log list API p95 under 1 second under expected MVP load;
- create/update/delete p95 under 1 second excluding external Azure DevOps calls.

These are design targets, not contractual SLAs.

### NFR-004 — Reliability

Time logs must not disappear because a browser is refreshed or changed.

API retries must not create duplicate entries.

### NFR-005 — Observability

The API shall emit structured application logs and basic metrics for:

- request failures;
- validation failures;
- latency;
- database errors;
- authorization failures.

Do not log full access tokens or sensitive request headers.

### NFR-006 — Maintainability

- TypeScript strict mode for extension and API code.
- Shared API contracts should be explicit and small.
- Business rules covered by tests.
- API contracts documented.
- Prisma schema and migration history source controlled.
- Database types must not be exposed directly as public API contracts.

### NFR-007 — Accessibility

The extension UI shall:

- support keyboard navigation;
- use associated labels;
- expose validation errors accessibly;
- avoid color-only status communication;
- use semantic controls.

### NFR-008 — Compatibility

Implementation shall use current supported Azure DevOps Extension SDK/API patterns.

Deprecated VSS SDK patterns shall not be introduced.

### NFR-009 — Analytics readiness

The data model shall preserve the dimensions required for later analysis:

- work item;
- project;
- user;
- work date;
- activity;
- hours.

### NFR-010 — Cost awareness

MVP infrastructure should be small and independently scalable.

Do not introduce a data lake, event bus, ML service, or LLM service merely to support basic time logging.

## Acceptance criteria for MVP

The MVP is complete when:

1. Extension can be installed in a test Azure DevOps organization.
2. A Time Logs tab is visible on a configured work-item type.
3. Opening a saved work item automatically establishes its ID/context.
4. User can save a valid time log.
5. Invalid hours/date are rejected.
6. Saved log remains after refresh.
7. User can edit their own log.
8. User can delete their own log.
9. Correct total hours are shown.
10. Another supported work item shows only its own logs.
11. Unauthorized update/delete requests are rejected by the API.
12. Automated tests cover core time-log validation and ownership rules.
