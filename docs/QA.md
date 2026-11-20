# Verification and manual QA

Automated: composer test; Pint; TypeScript strict; ESLint; Vitest/RTL; cookie security tests; production build; Playwright + axe. CI includes MySQL8.4, SQLite and isolated Docker smoke. Passing local SQLite tests does not prove MySQL migration/import/restore.

## Core scenario

1. Register client (analyst registration must fail). Quick sign-in prefills email only.
2. Edit actual DOB/BPJS/address and upload/remove photo. Reload and confirm persistence.
3. Start claim, save incomplete draft, navigate away and resume. Unsaved changes prompt on navigation/reload. File inputs must be reselected after reload.
4. Submit positive decimal amount with service date and receipt. Interrupt upload; retry should use the same claim ID and avoid already confirmed uploads. Open detail by URL and refresh.
5. Analyst claims the unassigned record; second analyst cannot assign/decide it. Request additional document; client sees Needs Info and notification links to detail.
6. Client uploads against request, sends a message/attachment, resubmits. Original assignment and history remain. Analyst reviews partial/rejected/approved decisions including amount boundaries and confirmation dialog.
7. Create more than20 records; filter by text/date/status, page through them. Statistics/export must reflect all filtered records. Open CSV/XLSX and check formula-leading names are text.
8. Admin invites analyst, reviews workload, edits catalogs, records paid then settled. Try amount over approval and changing payment reference after recording: reject.
9. Configure Mailpit or test SMTP; verify email and reset password. Old tokens/reset token must no longer work. Enable TOTP, test replay and one-use recovery.
10. Request deletion. With feature disabled or open claims: reject approval. In disposable data with approved policy: delete account/files and preserve review record.

## Accessibility

Automated axe checks are included for login and mobile claims list. Manual audit still requires assistive technology:
- Keyboard-only Tab/Shift+Tab through nav, form, upload, pagination and dialog.
- Dialog traps focus, Escape closes, focus returns to opener; unsaved dialog respects stay/leave.
- NVDA/VoiceOver announces label, errors, loading/success and selected step.
- Zoom200%, widths390/768/1440; no clipped controls. Wide tables may scroll independently.
- Indonesia/English toggle persists; IDR retains decimals, dates show Asia/Jakarta.
- Reduced motion and visible focus; status must be readable without color.

Do not label manual screen-reader testing as completed merely because axe passes. See IMPLEMENTATION.md for actual execution results and remaining environment checks.

## Execution record — 19 November 2026

| Check | Result | Evidence / next requirement |
|---|---|---|
| Frontend typecheck, lint, build | Passed | Local Node 26; CI targets Node 22 |
| Component/authentication tests | Passed | Latest local run: 29 Vitest tests, including 401 handling, route access, notifications, status/history, file retry/removal and invalid-field focus |
| Cookie security | Passed | 5 Node tests |
| Backend boundary matrix | Passed | Latest PR revision: SQLite 164 passed / 2 database-specific skips, 847 assertions; MySQL 165 passed / 1 database-specific skip, 862 assertions. Pint passes; prior file_get_contents warnings resolved |
| Full E2E matrix | Partially verified | PR #1 CI passed the two existing Playwright scenarios; remaining TEST-04 scenarios still need coverage |
| Manual client/analyst QA | Not executed | Run core scenarios above on disposable data |
| Keyboard-only happy paths | Not executed | Complete both roles without pointer input |
| NVDA/VoiceOver | Not executed | Record reader/version, browser, route and announcements |
| Remote CI | New revision partially verified | [PR #1 run 44481972881](https://github.com/TMRakaP26/Health-Guard-Claim-Asurance/actions/runs/44481972881), commit `151ca213f30a568071e19a2916339ddc89b8742d`; backend and frontend passed, E2E/Docker pending |

The 12-file follow-up and fixture/selector corrections were published with permission. The first
expanded run exposed a success-toast color contrast failure (4.25:1). Its App.tsx correction
is ready locally, passes typecheck/lint/29 tests/build, and awaits separate publication permission.
See [TEST-COVERAGE.md](TEST-COVERAGE.md) for the full mapping and pending manual audit record.

Before merge, require these CI checks on the proposed commit: `backend (sqlite)`,
`backend (mysql)`, `frontend`, `e2e`, and `docker`. This documents the merge criteria;
repository branch-protection settings were not changed. TEST-02 is now complete. A green
pipeline does not replace manual accessibility checks; TEST-04 still requires a passing
expanded browser suite.

Upload recovery regression: select three distinct PDFs, remove one before confirmation, verify
the remaining filenames, interrupt an upload, then retry its individual button. Confirm the claim
ID stays the same and previously confirmed uploads are not sent again. Navigate away while an
upload remains incomplete and verify the unsaved-changes dialog. Submit an empty required field
and verify the summary, inline error and focus. Automated checks cover removal, filenames,
focus, and selective retry; the complete browser/manual flow still needs execution.
