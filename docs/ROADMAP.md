# Roadmap

The roadmap is ordered to prove the smallest useful product first and delay expensive or high-complexity integrations until the core data is trustworthy.

## Implementation status — 2026-09-23

Phases 0–4 are implemented in the repository: buildable extension/API scaffolds, the Time Logs page, PostgreSQL persistence, CRUD, totals, validation, ownership, idempotency, soft delete, concurrency, accessible states, responsive layout, tests, and CI. The extension package builds successfully.

Remaining pilot acceptance work depends on deployment-specific values: publish under the real Azure DevOps publisher, configure the API URL, deploy the API/database, approve the extension's `vso.profile` scope, and exercise the VSIX in the Vita-Rapidus test organization. These external integrations are not claimed as tested by the repository build.

## Phase 0 — Repository and development foundation

**Goal:** create a buildable, testable repository.

Deliverables:

- repository structure agreed;
- extension scaffold;
- Node.js + TypeScript API scaffold;
- Fastify API setup;
- Prisma + PostgreSQL development setup;
- formatting/linting;
- unit-test projects;
- environment configuration pattern;
- extension manifest for test organization;
- basic CI.

Exit criteria:

- extension builds;
- API builds;
- tests run;
- local developer setup is documented;
- no secrets committed.

## Phase 1 — Read-only Azure DevOps extension shell

**Goal:** prove the extension can run in a real work item.

Deliverables:

- `Time Logs` work-item tab;
- Azure DevOps SDK initialization;
- current organization/project context;
- current work-item ID;
- current user context;
- loading/error states;
- API health/status integration.

Exit criteria:

- open a test Task/PBI/Bug;
- Time Logs tab loads;
- UI displays correct work-item ID without manual entry.

## Phase 2 — Create and view time logs

**Goal:** deliver the first useful end-to-end workflow.

Deliverables:

- TimeLog database migration;
- create API;
- list-by-work-item API;
- summary API;
- form fields:
  - date;
  - hours;
  - activity;
  - note;
- validation;
- persistence;
- history list;
- total logged hours;
- duplicate-submit protection.

Exit criteria:

- create an entry;
- refresh/reopen work item;
- entry is still present;
- total is correct.

## Phase 3 — Edit, delete, ownership, concurrency

**Goal:** make the product safe for repeated use.

Deliverables:

- edit own entry;
- delete own entry;
- server-side ownership checks;
- concurrency token/version;
- clear permission errors;
- audit-friendly timestamps;
- API integration tests.

Exit criteria:

- owner can modify their log;
- non-owner cannot modify it without an explicit admin rule;
- conflicting stale updates are detected.

## Phase 4 — UX hardening

**Goal:** make the extension usable by a pilot team.

Deliverables:

- accessibility pass;
- empty states;
- error recovery;
- pagination or sensible history limit;
- responsive layout;
- activity configuration;
- configurable supported work-item types;
- telemetry and correlation IDs;
- installation/deployment guide.

Exit criteria:

- pilot team can use it without developer intervention for normal flows.

## Phase 5 — My Timesheet

**Goal:** move beyond a single-work-item view.

Deliverables:

- user-centric weekly view;
- daily totals;
- week navigation;
- filter by project/activity;
- edit entries from timesheet;
- weekly total.

Potential Azure DevOps surface:

- separate extension hub/page, or
- supported menu/navigation contribution.

Exit criteria:

- user can review a week of work without opening each work item.

## Phase 6 — Azure DevOps aggregate-field integration

**Goal:** optionally connect granular logs with existing Azure DevOps work fields.

Possible features:

- calculated Time Logger total;
- optional sync to custom `Actual Hours`;
- optional sync to `Completed Work`;
- rules for `Remaining Work`;
- preview before update;
- organization/project-level configuration.

Important:

Synchronization must be opt-in and documented. It must not silently overwrite manually managed work fields.

## Phase 7 — Reporting and data-lake ingestion

**Goal:** make the data available for engineering/delivery analytics.

Deliverables:

- export API or ingestion contract;
- scheduled time-log extraction;
- Azure DevOps Analytics/OData ingestion;
- selected Service Hooks if genuinely required;
- raw/bronze storage;
- clean/silver time-log and work-item datasets;
- gold analytics tables.

Initial reporting questions:

- estimate vs logged hours;
- hours by work-item type;
- hours by activity;
- sprint effort;
- defect effort;
- work carried between sprints;
- time distribution across delivery activities.

## Phase 8 — Power BI

**Goal:** deliver stakeholder-ready reporting.

Deliverables:

- semantic model;
- work-item/time-log relationship model;
- sprint dashboard;
- estimate-versus-actual dashboard;
- delivery trend reporting;
- data-quality indicators.

Avoid employee ranking dashboards unless there is a separately reviewed, legitimate requirement and appropriate governance.

## Phase 9 — Ruddr integration

**Goal:** reduce duplicate entry where Ruddr remains required.

Possible patterns to evaluate:

- Time Logger -> Ruddr;
- Ruddr -> Time Logger;
- shared integration service;
- reconciliation report.

Before implementation:

- verify Ruddr API capabilities;
- verify permissions;
- identify source of truth;
- define conflict/retry behavior;
- obtain a sandbox or safe test strategy.

## Phase 10 — ML/AI-assisted insights

**Goal:** use accumulated structured data to improve planning and reporting.

Potential ML use cases:

- estimation-error patterns;
- outlier detection;
- predicted effort ranges;
- likely carry-over risk.

Potential LLM use cases:

- narrative sprint summaries;
- explain a metric change using cited underlying records;
- generate suggested delivery observations.

Rules:

- AI/ML is not required for core time tracking.
- Insights must be presented as suggestions.
- Do not infer employee quality from hours alone.
- Preserve traceability back to source data.

## Suggested MVP cut

For a demo/pilot, stop after **Phase 4**.

That gives:

```text
Azure DevOps Work Item
        ↓
Time Logs tab
        ↓
Create / View / Edit / Delete
        ↓
Persistent database
        ↓
Correct total + usable pilot experience
```

Everything after that can be justified from actual user feedback and data.
