# Azure DevOps Time Logger

A lightweight Azure DevOps extension for logging time against work items at a daily, granular level.

The product is intended to give teams a Jira/Ruddr-style work-log experience inside Azure DevOps while keeping Azure DevOps work items as the source of delivery context and the Time Logger service as the source of detailed time-entry history.

> Status: MVP implemented; Azure DevOps test-organization deployment remains
> Last updated: 2026-09-23

## Why this exists

Azure DevOps work items can hold aggregate values such as Original Estimate, Remaining Work, Completed Work, or custom "Actual Hours" fields, but those fields do not provide a convenient daily log of who spent time, when they spent it, what activity it was for, and what they worked on.

This project adds that missing layer.

Example:

| Date       | User        | Hours | Activity    | Note                                    |
| ---------- | ----------- | ----: | ----------- | --------------------------------------- |
| 2026-09-21 | Developer A |   2.0 | Development | Implemented booking API validation      |
| 2026-09-22 | Developer A |   1.5 | Code Review | Reviewed booking API PR                 |
| 2026-09-23 | QA A        |   2.0 | Testing     | Regression tested duplicate booking fix |

The work item can still show a summarized total, while the Time Logger retains the detailed history.

## Product shape

The primary user experience is a **Time Logs** tab on the Azure DevOps work item form.

Users can:

- log time against the currently opened work item;
- view existing time logs;
- see total logged hours;
- edit or delete their own entries, subject to permissions;
- capture a date, hours, activity, and note.

Future phases add weekly timesheets, reporting, optional synchronization to Azure DevOps aggregate fields, data-lake ingestion, Power BI reporting, Ruddr integration, and ML/AI-assisted delivery insights.

## Technology

### Extension

- React
- TypeScript
- Azure DevOps Extension SDK
- Azure DevOps Extension API
- Azure DevOps work-item-form page contribution

### Backend

- Node.js
- TypeScript
- Fastify REST API
- Prisma ORM
- PostgreSQL
- REST endpoints for time-log operations

Using TypeScript on both the extension and API allows shared request/response contracts and validation types where appropriate.

### Analytics, later phase

- Azure DevOps Analytics/OData for delivery metadata
- Service Hooks for selected near-real-time events where needed
- Scheduled export/ingestion of time logs
- Data lake / lakehouse
- Power BI
- Optional ML/AI layer

## Repository structure

```text
/
├── README.md
├── docs/                 # Product, requirements, architecture, decisions, roadmap
├── packages/contracts/   # Shared API-facing TypeScript contracts
├── src/
│   ├── extension/        # React Azure DevOps work-item page
│   └── api/              # Fastify API and Prisma migrations
├── docker-compose.yml    # Local PostgreSQL
└── .github/workflows/    # Build and test CI
```

## Core data model

A time log is a first-class record, not just a number copied into a work-item field.

```json
{
  "id": "uuid",
  "organizationId": "org-id",
  "projectId": "project-id",
  "workItemId": 160637,
  "userId": "user-id",
  "userDisplayName": "Developer A",
  "workDate": "2026-09-23",
  "hours": 2.5,
  "activity": "Development",
  "note": "Implemented API validation",
  "createdAt": "2026-09-23T09:10:00Z",
  "updatedAt": "2026-09-23T09:10:00Z"
}
```

## MVP user flow

```mermaid
flowchart LR
    A[Open Azure DevOps work item] --> B[Open Time Logs tab]
    B --> C[Enter date, hours, activity, note]
    C --> D[Validate]
    D --> E[Save through Time Logger API]
    E --> F[Persist time-log record]
    F --> G[Refresh log list and total]
```

## Important product rule

Do **not** treat an Azure DevOps aggregate field as the detailed time-log database.

For example:

```text
Original Estimate = 15h
Remaining Work    = 8.5h
Actual/Completed  = 6.5h
```

is useful summary information, but it does not explain the daily work behind the `6.5h`.

The detailed entries in the Time Logger remain the audit/history source.

## Local development

Prerequisites: Node.js 20 or newer and Docker.

```bash
npm install
npm run prisma:generate -w @time-logger/api

docker compose up -d postgres
cp src/api/.env.example src/api/.env
npm run prisma:migrate -w @time-logger/api

# Terminal 1: Fastify API on http://localhost:3000
npm run dev:api

# Terminal 2: extension UI with a clearly labelled mock context
npm run dev:extension
```

The local extension defaults to work item `160637`. Override the mock context with query parameters such as:

```text
http://localhost:5173/?organizationId=local-org&projectId=local-project&workItemId=42&workItemType=Task
```

`development-headers` authentication is accepted only when `NODE_ENV` is `development` or `test`. Production startup rejects that mode.

## Verify the repository

```bash
npm run typecheck
npm test
npm run build
npm run package:extension -w @time-logger/extension
```

The VSIX is written under `src/extension/` and ignored by Git.

## Azure DevOps pilot setup

### Deploy the API to Vercel

The API uses Vercel's native Fastify support. Create a Vercel project from this
repository with these settings:

1. Set **Root Directory** to `src/api`.
2. Keep **Include source files outside of the Root Directory in the Build Step**
   enabled so the API can use the `packages/contracts` workspace.
3. Keep the detected **Fastify** framework preset. Do not set an output directory.
4. Keep the function in the configured Singapore region (`sin1`) and provision
   the database in the same region.
5. Set the production branch to `main`. The checked-in ignored-build command
   cancels deployments from `dev` and every other non-`main` branch.
6. Add these production environment variables:

   | Variable               | Value                                                                  |
   | ---------------------- | ---------------------------------------------------------------------- |
   | `DATABASE_URL`         | A pooled PostgreSQL connection string suitable for serverless traffic  |
   | `AUTH_MODE`            | `entra`                                                                |
   | `ENTRA_TENANT_ID`      | Microsoft Entra tenant ID                                              |
   | `ENTRA_CLIENT_ID`      | Authorized SPA client application ID                                   |
   | `ENTRA_AUDIENCE`       | Separate protected API identifier, normally `api://<API_CLIENT_ID>`    |
   | `ENTRA_REQUIRED_SCOPE` | Delegated API scope; defaults to `access_as_user`                      |
   | `CORS_ALLOWED_ORIGINS` | The exact deployed extension origin; comma-separate additional origins |
   | `BUSINESS_TIME_ZONE`   | Business IANA time zone, for example `Asia/Colombo`                    |
   | `MAX_HOURS_PER_ENTRY`  | Optional; defaults to `24`                                             |

`NODE_ENV=production` is supplied by Vercel. `src/api/vercel.json` selects the
Fastify preset, while the API's `vercel-build` script builds the shared contracts
and generates Prisma Client.

Before the first deployment, and after every committed Prisma migration, apply
migrations explicitly from a trusted workstation or CI environment. Use the
database provider's direct/non-pooled connection when it provides one:

```bash
DATABASE_URL='postgresql://...' npm run prisma:migrate -w @time-logger/api
```

Do not run migrations automatically in every Vercel preview build. After deploy,
verify `https://<your-vercel-domain>/health` returns `{"status":"healthy"}`.

### Connect the extension

1. Deploy the API and PostgreSQL and apply the migration above.
2. Register separate single-tenant Microsoft Entra SPA client and protected API applications. Expose `access_as_user` on the API, authorize the SPA client for it, and add `https://dev.azure.com/_public/_MsalPopup` as the SPA redirect URI.
3. Set `AUTH_MODE=entra`, the `ENTRA_*` variables above, and `CORS_ALLOWED_ORIGINS` to the exact extension content origin.
4. Replace `replace-with-your-publisher-id` in `src/extension/vss-extension.json`.
5. Build with `VITE_API_BASE_URL`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, and the full `VITE_ENTRA_API_SCOPE` set for the target environment.
6. Upload the VSIX privately and install it in the test organization.

The manifest requests no Azure DevOps REST scopes. Work-item, project, and organization context come from the host SDK. Azure DevOps Nested App Authentication obtains an Entra access token for the extension API. The API validates its signature, tenant, audience, authorized client, and delegated scope, then derives ownership from the stable Entra `oid`. Client and tenant IDs are public configuration; never place client secrets in the frontend or manifest.

## API

Authenticated endpoints are scoped by organization and project as well as work-item ID:

```text
POST   /api/time-logs
GET    /api/time-logs?organizationId=...&projectId=...&workItemId=...
GET    /api/time-logs/:id?organizationId=...&projectId=...
PUT    /api/time-logs/:id
DELETE /api/time-logs/:id?organizationId=...&projectId=...&version=...
GET    /api/time-logs/summary?organizationId=...&projectId=...&workItemId=...
GET    /health
```

OpenAPI UI is available at `/docs` outside production. Create accepts an `Idempotency-Key`; update/delete require the current version and return `409` for stale writes. Delete is a soft delete.

## Documentation map

- [PRODUCT.md](./docs/PRODUCT.md) — product purpose, users, value, scope.
- [REQUIREMENTS.md](./docs/REQUIREMENTS.md) — functional and non-functional requirements.
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — system structure and data flows.
- [DECISIONS.md](./docs/DECISIONS.md) — important technical/product decisions.
- [ROADMAP.md](./docs/ROADMAP.md) — staged delivery plan.
- [AGENTS.md](./docs/AGENTS.md) — instructions for Codex and other coding agents.

## Definition of MVP success

The MVP is successful when a user can open a supported Azure DevOps work item, create a valid time entry, refresh/reopen the work item, and see the persisted entry and correct total without manually entering the work item ID.

## Reference material

The implementation follows Microsoft's current guidance for [work-item form page contributions](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-workitem-extension?view=azure-devops) and [authenticating requests to an extension-owned service](https://learn.microsoft.com/en-us/azure/devops/extend/develop/auth?view=azure-devops).
