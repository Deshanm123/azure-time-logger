# MVP Acceptance Test Cases

These cases validate the Azure DevOps Remaining Work integration added in
version `0.1.12`. Run the live cases in the private Vita-Rapidus test
organization after approving the extension's `vso.work_write` permission.

## Remaining Work calculation

| ID | Starting fields | Logged hours | Expected result |
| --- | --- | ---: | --- |
| RW-001 | Remaining Work `5`, Original Estimate `8` | 2 | Remaining Work is saved as `3` |
| RW-002 | Remaining Work blank, Original Estimate `8` | 2 | Original Estimate is used and Remaining Work is saved as `6` |
| RW-003 | Remaining Work `null`, Original Estimate `4` | 6 | Remaining Work is clamped and saved as `0` |
| RW-004 | Remaining Work `0`, Original Estimate `8` | 2 | Existing zero is respected; Remaining Work stays `0` |
| RW-005 | Remaining Work `2`, Original Estimate `8` | 2 | Remaining Work is saved as exactly `0` |
| RW-006 | Remaining Work `1.1`, Original Estimate `8` | 0.2 | Remaining Work is saved as `0.9`, without floating-point noise |
| RW-007 | Both fields blank | 1 | Baseline is `0`; Remaining Work is saved as `0` |

For RW-001 through RW-007:

1. Open a saved supported work item and set the starting field values.
2. Open **Time Logs** and confirm the initial **Remaining work** summary.
3. Submit a new time log with the specified hours.
4. Confirm the success message says Remaining Work was updated.
5. Confirm both the Azure DevOps field and summary show the expected result.
6. Refresh the work item and confirm the value remains saved.

## UI and persistence

| ID | Scenario | Expected result |
| --- | --- | --- |
| UI-001 | Open a work item with existing Remaining Work | The value appears beside **Total logged** |
| UI-002 | Open a work item with blank Remaining Work and a populated Original Estimate | The Original Estimate appears as the initial Remaining Work baseline |
| UI-003 | Log time successfully | The log appears in history, Total logged refreshes, and Remaining work updates without reopening the tab |
| UI-004 | Use the form on a narrow viewport | Both summary cards remain readable and stack vertically |

## Failure and regression behavior

| ID | Scenario | Expected result |
| --- | --- | --- |
| ER-001 | Time Logger API rejects the create request | No log is stored and Remaining Work is not changed |
| ER-002 | Log storage succeeds but Azure DevOps rejects `setFieldValue` | The log remains stored and the UI reports that Remaining Work was not updated |
| ER-003 | Field update succeeds but the work-item save fails | The log remains stored and the UI reports the partial failure |
| ER-004 | User lacks work-item edit permission | The log remains stored; Remaining Work is unchanged and a clear error is shown |
| RG-001 | Edit an existing log | Remaining Work is not recalculated in the current MVP |
| RG-002 | Delete an existing log | Remaining Work is not restored in the current MVP |
| RG-003 | Create a log whose time code came from `Time_Code` | Time code persistence and history display continue to work |
| RG-004 | Submit an unsupported time code through the API | API returns `400` and no record is created |

## Automated coverage

The extension tests cover:

- existing Remaining Work as the baseline;
- blank and null fallback to Original Estimate;
- zero as a valid existing value;
- lower-bound clamping;
- decimal rounding;
- both estimates missing;
- initial summary fallback;
- rejected field updates;
- work-item save failures;
- Remaining Work summary rendering.
