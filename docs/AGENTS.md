# AGENTS.md

Instructions for Codex and other coding agents working in this repository.

These instructions apply to the entire repository unless a more specific `AGENTS.md` exists in a subdirectory.

## 1. Read before coding

Before making changes:

1. Inspect the repository structure.
2. Read:
   - `README.md`
   - `PRODUCT.md`
   - `REQUIREMENTS.md`
   - `ARCHITECTURE.md`
   - `DECISIONS.md`
   - `ROADMAP.md`
3. Inspect existing implementation, tests, package files, project files, extension manifest, migrations, and CI.
4. Do not assume the repository matches the proposed structure in `README.md`.
5. Prefer existing project conventions when they do not conflict with an explicit requirement or accepted decision.

Do not create a parallel architecture because it is easier than understanding the existing one.

## 2. Product objective

The product is an Azure DevOps extension for granular time logging against work items.

The core domain is:

```text
User
  + Work Item
  + Work Date
  + Hours
  + Activity
  + Note
  = Time Log
```

The product must preserve detailed time-log records. An Azure DevOps aggregate field is not a substitute for the detailed data model.

## 3. Current MVP boundary

Focus on:

- Time Logs work-item page/tab;
- current work-item context;
- current user context;
- create/view/edit/delete time logs;
- total logged hours;
- backend validation;
- persistence;
- ownership/authorization;
- tests.

Do not introduce these unless the task explicitly requires them:

- data lake;
- Service Bus/Event Grid;
- ML;
- LLM;
- Ruddr synchronization;
- organization-wide reporting;
- automatic Remaining Work updates;
- automatic Completed Work updates.

## 4. Repository inspection rule

For every non-trivial task, first inspect the relevant files.

Examples:

- extension change -> inspect manifest, package.json, src, SDK wrapper, existing components/tests;
- API change -> inspect Program/startup, controllers/endpoints, services, domain models, EF configuration, migrations, tests;
- schema change -> inspect current migrations and production compatibility;
- CI change -> inspect all existing pipeline/workflow files.

Never overwrite an existing file based only on documentation examples.

## 5. Azure DevOps extension rules

Use the current supported Azure DevOps Extension SDK/API packages already present in the repository.

Do not introduce deprecated VSS SDK patterns.

Keep Azure DevOps-specific calls behind small adapters/services where practical so UI code can be tested without a live Azure DevOps organization.

Do not:

- hard-code organization URLs;
- hard-code project IDs;
- hard-code work-item IDs;
- embed PATs;
- embed client secrets;
- log access tokens.

Before changing extension manifest scopes or contribution types:

1. inspect the existing manifest;
2. verify the minimum required scope;
3. explain the reason in the change summary;
4. update architecture/decisions documentation if the change is significant.

## 6. Backend rules

The API is the authority for business rules.

Frontend validation improves UX but never replaces server validation.

Server must validate:

- authenticated user;
- organization/project/work-item context;
- work date;
- hours;
- activity;
- ownership for edit/delete;
- concurrency where applicable.

Do not trust `userId`, `userDisplayName`, ownership flags, or admin flags supplied by a normal request body.

## 7. Data rules

A time log is a first-class record.

Do not implement time logging by only updating:

```text
Completed Work
Remaining Work
Actual Hours
```

Those may be synchronized in a later phase, but detailed time-log rows remain the source for daily history.

Use migrations for schema changes.

Do not delete or rewrite migration history without an explicit reason and user approval.

## 8. Security rules

Never commit:

- passwords;
- PATs;
- database passwords;
- connection strings containing secrets;
- client secrets;
- private keys.

Use environment variables, local secret stores, or the repository's established secret mechanism.

Avoid logging sensitive request headers or tokens.

If authentication requirements are unclear, stop and identify the missing decision instead of inventing an insecure mechanism.

## 9. Minimal-diff rule

Prefer the smallest coherent change that satisfies the requirement.

Avoid unrelated:

- formatting churn;
- renaming;
- dependency upgrades;
- architecture rewrites;
- cleanup.

If unrelated issues are discovered, report them separately.

## 10. Testing rule

For implementation changes:

1. add or update tests;
2. run the smallest relevant test set first;
3. run broader tests when practical;
4. report exactly what was run and whether it passed.

Do not claim tests passed unless they were actually executed.

Core rules that should have automated coverage include:

- hours > 0;
- future-date rule;
- owner edit/delete;
- unauthorized edit/delete;
- total calculation;
- work-item scoping;
- duplicate-submit/idempotency behavior where implemented;
- concurrency behavior.

## 11. Documentation rule

Documentation is part of the product.

Update the relevant file when implementation changes:

- product scope -> `PRODUCT.md`
- requirement/acceptance behavior -> `REQUIREMENTS.md`
- architecture/data flow -> `ARCHITECTURE.md`
- important technical/product choice -> `DECISIONS.md`
- delivery order/status -> `ROADMAP.md`
- developer usage/setup -> `README.md`
- agent behavior -> `AGENTS.md`

Do not silently make architecture decisions only in code.

## 12. Decision rule

If a requested change conflicts with an accepted ADR in `DECISIONS.md`:

1. identify the conflict;
2. propose the ADR change;
3. explain consequences;
4. wait for confirmation before making a large architectural reversal.

Small implementation details do not require a new ADR.

## 13. User review rule

For substantial changes to architecture, data model, authentication, Azure DevOps manifest permissions/scopes, or product workflow:

- present the proposed approach clearly;
- identify affected files;
- call out assumptions;
- get user confirmation before treating the design as final.

For straightforward implementation inside already accepted decisions, proceed with the change and report it for review.

## 14. No fake integrations

Do not claim Azure DevOps, Ruddr, a database, a data lake, or any external service is integrated unless the integration exists and has been tested.

Mocks must be clearly identified as mocks.

## 15. Error handling

Use user-friendly messages in the extension and structured errors in the API.

Do not expose raw stack traces to users.

Include correlation/request IDs where the existing architecture supports them.

## 16. Accessibility

New UI must be keyboard usable.

Use:

- semantic elements;
- explicit labels;
- accessible validation text;
- sensible focus behavior.

Do not rely on color alone to communicate state.

## 17. Performance

Avoid unnecessary Azure DevOps API calls.

Do not refetch the entire history after every small UI interaction unless required.

Use server-side filtering and indexes for time-log queries.

Do not introduce caching until there is a measured need or a clear correctness-safe benefit.

## 18. Completion format

When finishing a task, report:

1. what changed;
2. files changed;
3. important design choices;
4. tests run and results;
5. any assumptions or unresolved issues;
6. documentation updated.

Keep the report concise and factual.

## 19. Definition of done for agent changes

A change is not done merely because code compiles.

For applicable changes, verify:

- requirement is satisfied;
- error path is handled;
- tests exist/pass;
- no secrets are introduced;
- documentation is consistent;
- no unrelated changes were added;
- Azure DevOps context is not hard-coded.
