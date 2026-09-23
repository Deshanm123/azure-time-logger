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

## ADR-005 — ASP.NET Core for the API

**Status:** Accepted

### Context

The backend needs validation, authorization, REST endpoints, persistence, observability, and future Azure integration.

### Decision

Use ASP.NET Core 8 Web API.

### Consequences

- Clear API/domain separation.
- Strong testing/tooling.
- Compatible with Azure hosting options.
- Authentication must still be validated against the actual target Azure DevOps organization/deployment model before production.

---

## ADR-006 — PostgreSQL for product persistence

**Status:** Accepted for initial implementation

### Context

Time logs are relational, require filtering/aggregation, and benefit from transactions and concurrency handling.

### Decision

Use PostgreSQL through Entity Framework Core.

### Consequences

- Good fit for relational queries and analytics extraction.
- Works locally through containers and in managed cloud offerings.
- Requires migrations and database operations.
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
