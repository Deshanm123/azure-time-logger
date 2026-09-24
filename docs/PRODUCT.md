# Product

## Product name

**Azure DevOps Time Logger**  
Working name only; branding can change later.

## Product statement

Build an Azure DevOps extension that lets delivery teams record **daily, granular time entries against Azure DevOps work items** without leaving the work-item experience.

The extension should feel native to Azure DevOps while providing the work-log detail commonly expected from tools such as Jira time logging or Ruddr.

## Problem

Azure DevOps work items are good at tracking delivery state, hierarchy, ownership, estimates, and remaining work. They can also store aggregate work values.

What is missing for this use case is a convenient daily log such as:

- who logged time;
- which work item the time belongs to;
- date worked;
- hours spent;
- time code;
- activity type;
- short note describing the work;
- history of edits.

Without this detail, a value such as `Actual Hours = 12.5` cannot explain how those hours were accumulated.

Teams then have to use a separate system, spreadsheet, manual notes, or another SaaS product. That creates duplicate entry and weakens the connection between delivery work and time data.

## Product goal

Make time logging a natural part of Azure DevOps work-item usage.

A developer, QA engineer, analyst, or other contributor should be able to open a work item, log time in a few seconds, and later see the detailed history.

## Primary users

### Individual contributors

Developers, QA engineers, analysts, designers, and other delivery-team members who need to record time against work.

### Delivery leads

Scrum Masters, Tech Leads, Engineering Managers, Delivery Managers, and Product/Project stakeholders who need aggregate delivery information.

### Reporting and analytics users

BI analysts and engineering-operations users who need structured data for reporting, trend analysis, data-lake ingestion, Power BI, or later ML/AI analysis.

## Primary user story

> As a team member, I want to record the time I spent on an Azure DevOps work item, including the date, time code, activity, and note, so that my work is captured accurately without using another application.

## Supporting user stories

> As a team member, I want to see previous logs for the work item so that I understand how much work has already been recorded.

> As a team member, I want to correct my own time log if I entered it incorrectly.

> As a delivery lead, I want time data to remain structured so that it can be used in sprint and delivery reporting.

> As a BI user, I want time logs to be available for downstream analytics without scraping work-item comments or history.

## MVP experience

The first product experience is a **Time Logs** tab on the work-item form.

The tab contains:

1. Date.
2. Hours.
3. Time code, defaulted from the work item's `Time_Code` field.
4. Activity.
5. Note.
6. `Log Time` action.
7. Existing time logs for the current work item.
8. Total logged hours.

The extension automatically obtains the current work-item context. The user does not manually enter a work-item ID.

## Implementation stack

The agreed implementation stack is:

```text
Azure DevOps Extension
React + TypeScript
        │
        │ HTTPS/JSON
        ▼
Time Logger API
Node.js + TypeScript + Fastify
        │
        ▼
Prisma
        │
        ▼
PostgreSQL
```

The use of Node.js/TypeScript is an application architecture choice, not an Azure DevOps extension compatibility requirement. The extension communicates with the API over normal HTTPS.

## Example

```text
Task #160637 — Delete stale branches

Time Logs

Date:      23 Sep 2026
Hours:     1.5
Time code: VH-DEV-LKA
Activity:  Development
Note:      Validated stale branches merged to main

[ Log Time ]

History
-------------------------------------------------------
23 Sep  Developer A  Development  1.5h
        Validated stale branches merged to main

22 Sep  Developer A  Development  2.0h
        Reviewed repository branch history

Total logged: 3.5h
```

## Value

The product creates a clean relationship between:

```text
Azure DevOps delivery context
        +
Granular time-log history
        =
Better delivery reporting
```

It can later support questions such as:

- How many hours were spent on a work item?
- How were hours distributed between Development, QA, Review, Analysis, and other activities?
- How did actual logged effort compare with Original Estimate?
- Which work was carried across sprints?
- How much effort was spent on defects versus feature work?
- How accurate are estimates over time?

## Product principles

### Logging must be quick

Time logging should not feel like a second project-management tool.

### Detailed time is separate from aggregate work fields

The time-log records are the detailed source. Azure DevOps fields such as Original Estimate, Remaining Work, Completed Work, or custom Actual Hours are summary values.

### The work item remains the delivery context

The extension complements Azure DevOps. It does not attempt to replace Boards, work-item hierarchy, sprint planning, or Azure DevOps reporting.

### Analytics should not be employee surveillance

Reporting should be designed for delivery understanding, estimation improvement, capacity analysis, and process improvement rather than simplistic individual performance scoring.

### AI output is advisory

If AI or ML is added later, its output is a suggested insight, not a definitive judgment about a person or team.

## MVP scope

Included:

- Time Logs work-item tab.
- Create a time log.
- Read logs for the current work item.
- Edit own log.
- Delete own log.
- Total logged hours.
- Activity selection.
- Time-code selection defaulted from the work item.
- Validation.
- Persistent backend storage.
- User/work-item context capture.

Not included in MVP:

- Ruddr synchronization.
- Automatic payroll/billing.
- Organization-wide dashboards.
- AI-generated performance judgments.
- Automatic update of Remaining Work.
- Automatic update of Completed Work or Actual Hours.
- Offline mode.
- Mobile-specific Azure DevOps experience.
- Advanced approvals.

## Future product areas

- My Timesheet.
- Weekly/monthly calendar.
- Sprint time summary.
- Team/project reporting.
- Export.
- Ruddr integration.
- Optional synchronization to Azure DevOps aggregate fields.
- Data-lake/lakehouse ingestion.
- Power BI semantic model.
- Estimate-versus-actual analytics.
- ML-assisted estimation and anomaly detection.
- AI-generated delivery summaries with clear evidence and human review.
