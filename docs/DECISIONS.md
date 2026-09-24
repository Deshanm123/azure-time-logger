# Decisions

This file records important product and architecture decisions.

Use the format:

```text
ADR-XXX — Decision title
Status
Context
Decision
Consequences
```

Do not silently change an accepted decision in code. Update this file and explain the reason.

---

## ADR-001 — Use a dedicated Time Logs tab

**Status:** Accepted

### Context

A work-item form group is compact but log history, editing, filtering, totals, and future features need more space.

### Decision

Use an Azure DevOps work-item-form page/tab named **Time Logs** for the MVP.

### Consequences

- Clear, dedicated experience.
- Scales better as functionality grows.
- One additional tab is added to the work-item form.
- A compact summary group can still be added later if there is a proven need.

---

## ADR-002 — Store granular time entries as first-class records

**Status:** Accepted

### Context

Azure DevOps fields such as Completed Work or custom Actual Hours hold aggregate values and do not represent detailed daily history.

### Decision

Each time entry is stored as its own Time Logger record.

### Consequences

- Daily history is preserved.
- Entries can be edited, deleted, filtered, and audited.
- Reporting can calculate totals by date, user, activity, sprint, or work item.
- The product needs a backend and persistent data store.

---

## ADR-003 — Do not use browser storage as the authoritative store

**Status:** Accepted

### Context

Local storage would make entries device/browser specific and is unsuitable for shared reporting.

### Decision

Persist time logs server-side.

### Consequences

- Logs survive refresh/device changes.
- API availability becomes part of the product.
- Authentication and authorization are required.

---

## ADR-004 — React + TypeScript for the extension

**Status:** Accepted

### Context

The Azure DevOps extension is a browser UI and needs good component/test/tooling support.

### Decision

Use React and TypeScript with the modern Azure DevOps Extension SDK/API packages.

### Consequences

- Strong typing.
- Familiar component model.
- Current Azure DevOps extension APIs can be wrapped behind adapters for testing.
- Deprecated VSS SDK patterns must not be introduced.

---

## ADR-005 — Node.js + TypeScript for the API

**Status:** Accepted

### Context

The backend needs validation, authorization, REST endpoints, persistence, observability, and future Azure integration. The Azure DevOps extension is already implemented in TypeScript, so using TypeScript on the API reduces context switching and allows carefully scoped sharing of API contracts.

### Decision

Use a Node.js API written in TypeScript. Use Fastify as the initial HTTP framework.

### Consequences

- TypeScript is used across both extension and API.
- Request/response contracts can be shared where useful.
- Frontend and backend remain separate runtime boundaries despite using the same language.
- Azure DevOps SDK objects must not leak into backend domain contracts.
- Authentication must still be validated against the actual target Azure DevOps organization/deployment model before production.

---

## ADR-006 — PostgreSQL + Prisma for product persistence

**Status:** Accepted for initial implementation

### Context

Time logs are relational, require filtering/aggregation, and benefit from transactions and concurrency handling.

### Decision

Use PostgreSQL for persistence and Prisma as the initial TypeScript database access/migration layer.

### Consequences

- Good fit for relational queries and analytics extraction.
- Strong TypeScript integration for database access.
- Works locally through containers and in managed cloud offerings.
- Requires Prisma migrations and database operations.
- This decision can be revisited before production if organizational standards mandate Azure SQL or another approved store.

---

## ADR-007 — Do not automatically modify Azure DevOps work fields in MVP

**Status:** Accepted

### Context

Teams use Original Estimate, Remaining Work, Completed Work, and custom Actual Hours differently. Automatically changing them could create unexpected delivery changes.

### Decision

MVP time logging does not automatically update Azure DevOps aggregate work fields.

### Consequences

- Safer initial rollout.
- Time Logger totals may differ from manually maintained Azure DevOps aggregate fields.
- Synchronization can be introduced later behind explicit configuration and rules.

---

## ADR-008 — Current work-item ID comes from Azure DevOps context

**Status:** Accepted

### Context

Manual entry of work-item ID would be error-prone and unnecessary when the extension is loaded inside a work item.

### Decision

Resolve work-item identity from the Azure DevOps work-item form context.

### Consequences

- Faster user flow.
- Prevents common mis-linking errors.
- Extension code needs a testable Azure DevOps context adapter.

---

## ADR-009 — Backend enforces authorization

**Status:** Accepted

### Context

Browser code can be modified and cannot be trusted for access control.

### Decision

All create/update/delete authorization is enforced by the API.

### Consequences

- Frontend authorization is only a UX optimization.
- API must resolve authenticated identity.
- Tests must cover unauthorized operations.

---

## ADR-010 — Data lake is not part of the core MVP

**Status:** Accepted

### Context

The product goal is first to prove reliable time logging. A data lake introduces infrastructure and operating cost without being necessary for basic CRUD.

### Decision

Deliver the core extension/API/database first. Add analytics ingestion after product data is reliable.

### Consequences

- Lower MVP complexity and cost.
- Analytics architecture remains planned but decoupled.
- Export/ingestion contracts must be added before enterprise reporting.

---

## ADR-011 — Use scheduled ingestion by default for reporting

**Status:** Proposed

### Context

Azure DevOps reporting data generally does not need second-by-second ingestion.

### Decision

Prefer scheduled Azure DevOps Analytics/OData extraction for reporting history. Use Service Hooks only for use cases that need event-driven behavior.

### Consequences

- Simpler pipelines.
- Lower operational complexity.
- Some reports have a defined ingestion delay.
- Event processing can be added selectively.

---

## ADR-012 — AI/ML is advisory and out of MVP

**Status:** Accepted

### Context

AI/ML may help summarize delivery trends or estimation patterns, but it is not necessary to build the time logger and should not become an opaque employee-scoring mechanism.

### Decision

Do not add LLM/ML dependencies to MVP. Future AI/ML output must be evidence-backed, reviewable, and framed as suggested insights.

### Consequences

- MVP remains deterministic and easier to validate.
- The data model still preserves fields required for future analysis.

---

## ADR-013 — Authenticate API requests with Azure DevOps extension app tokens

**Status:** Superseded by ADR-015

### Context

The API must verify that requests came from the installed extension and must derive ownership from an authenticated identity. Secrets and PATs cannot be embedded in browser JavaScript. Microsoft documents `SDK.getAppToken()` for calls to an extension-owned service.

### Decision

The extension sends its signed app token as a bearer token. The API validates the JWT with the extension certificate key supplied through deployment secrets and uses the validated `user_id` claim as the owner identifier. A header-based identity provider is available only in development and test environments.

### Consequences

- User IDs and display names in normal request bodies are ignored.
- The extension certificate key must be rotated in the API when scope changes rotate the extension certificate.
- The published extension and token claims must be verified in the Vita-Rapidus test organization before production rollout.
- The current manifest needs no Azure DevOps REST scopes.

The pilot later demonstrated that Azure DevOps no longer guarantees a readable `user_id` claim. Microsoft also documents that authentication-token claims can change, disappear, or become encrypted. ADR-015 replaces claim-dependent app-token identity.

---

## ADR-014 — Deploy the MVP API on Vercel Functions

**Status:** Accepted for MVP pilot

### Context

The MVP needs a small managed deployment for its existing Fastify API. Vercel
supports Fastify as a single Node.js function and supports npm workspaces. Prisma
on a serverless platform also requires deliberate connection pooling and migration
handling.

### Decision

Deploy `src/api` as a Vercel project using the native Fastify preset. Include the
shared contracts workspace during builds, generate Prisma Client during the Vercel
build, and connect runtime traffic through a pooled PostgreSQL URL. Apply Prisma
migrations separately with `prisma migrate deploy`; do not run them in every
preview deployment.

### Consequences

- The existing Fastify entry point and local development workflow remain intact.
- The API scales as a single Vercel Function and must stay within Vercel Function
  runtime limits.
- Warm function instances reuse one Prisma client, while database-side pooling
  protects PostgreSQL from concurrent serverless instances.
- Deployment secrets and environment-specific URLs are managed in Vercel, not
  committed to the repository.
- Database schema rollout is an explicit release step before code that depends on
  a new migration is promoted.

---

## ADR-015 — Authenticate users with Microsoft Entra through Azure DevOps NAA

**Status:** Superseded by ADR-017

### Context

The published pilot's valid Azure DevOps app token did not contain the previously
observed `user_id` or `sub` claim. Token claims are not a supported identity data
contract and may be removed or encrypted. The API still needs a cryptographically
verified, stable owner identifier and must not trust a user ID supplied by browser
request data.

### Decision

Use Azure DevOps Nested App Authentication with separate single-tenant Microsoft
Entra SPA client and protected API registrations. The extension requests the
API's delegated `access_as_user` scope. The API validates the token against the
tenant's JWKS and requires the configured issuer, API audience, tenant,
authorized SPA client, and scope. It stores the validated `tid:oid` pair as the
stable owner identifier.

### Consequences

- No client secret is embedded in the extension.
- First use may require user or administrator consent according to tenant policy.
- The pilot grants tenant-wide admin consent only for the SPA client's delegated
  `access_as_user` permission to avoid an interactive consent round trip inside
  the Azure DevOps iframe.
- The deployment requires public tenant, client, audience, and scope settings.
- The manifest still requires no Azure DevOps REST scopes.
- Legacy app-token validation remains only as a migration option and must not be
  used to derive production identity from undocumented claims.

---

## ADR-017 — Resolve user identity with the Azure DevOps SDK access token

**Status:** Accepted for secure rollout; deferred for the MVP pilot by ADR-018

### Context

Nested App Authentication repeatedly timed out for the personal Microsoft
account used by the pilot Azure DevOps organization. `SDK.getUser()` exposes the
current user's UUID to the iframe, but a browser-supplied UUID is not sufficient
proof of identity. Azure DevOps already issues the extension a user access token
and provides an authenticated `profiles/me` endpoint.

### Decision

Request the minimal `vso.profile` manifest scope and use `SDK.getAccessToken()`
for API authentication. The API sends the token only to the fixed Azure DevOps
Profile API endpoint and uses the returned profile UUID and display name as the
authenticated user. The SDK user context remains display-only and is never used
as authoritative ownership data.

### Consequences

- The pilot no longer depends on Entra app registrations, NAA, or MSAL.
- The backend makes one Azure DevOps profile request for each authenticated API
  request; caching can be added later without changing the trust model.
- The extension requests `vso.profile`, so users must approve the updated scope
  when the new VSIX is installed.
- Access tokens are never logged or stored in the database.

---

## ADR-018 — Allow SDK context identity for the restricted MVP pilot

**Status:** Accepted for the restricted MVP pilot

### Context

The pilot needs to prove time-log fetching and persistence inside the private
Vita-Rapidus test organization. Azure DevOps access-token acquisition and
profile resolution are blocking that validation. `SDK.getUser()` provides the
current host user's stable UUID, but a browser request can copy or replace it.

### Decision

Add an explicit `sdk-context` API mode. The extension sends the UUID and encoded
display name returned by `SDK.getUser()` in dedicated headers and does not
request an access token. The API validates the UUID shape and continues to apply
its normal record ownership checks using that asserted UUID. The pilot manifest
requests no Azure DevOps REST scopes.

Keep the secure `azure-devops` token/profile mode in the codebase for later use.

### Consequences

- The private pilot can fetch and store time logs without token acquisition.
- Ownership still behaves per asserted SDK UUID, but it is not a security
  boundary because a caller can spoof the headers.
- The `sdk-context` deployment must remain private and contain no sensitive or
  regulated data.
- A wider or production rollout must switch back to verified authentication and
  restore the required manifest scope.

---

## ADR-019 — Store a controlled time code on every log entry

**Status:** Accepted

### Context

The Vita-Rapidus process exposes a `Time_Code` work-item field, while downstream
administration and reporting need the selected code preserved on each granular
time record. A work-item value can change after time is logged, so reading it
only during reporting would lose the historical selection.

### Decision

Add a required `timeCode` field to the time-log contract and database. Present a
fixed nine-value pick list in the entry form. For new entries, initialize the
selection from the current work item's `Time_Code` field when supported and use
`VH-SUP-LKA` otherwise. Persist the selected value and show it in history.

### Consequences

- Each time record retains the code selected when it was created or edited.
- Existing rows are migrated to `VH-SUP-LKA`.
- Adding or removing codes requires a coordinated contract/UI/API update.
