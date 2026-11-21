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
- NVDA/VoiceOver announces label, errors, loading/success and selected step. Next/Back focuses
  the localized step heading; the next Tab reaches the first input.
- Zoom200%, widths390/768/1440; no clipped controls. Wide tables may scroll independently.
- Indonesia/English toggle persists; IDR retains decimals, dates show Asia/Jakarta.
- Reduced motion and visible focus; status must be readable without color.

Do not label manual screen-reader testing as completed merely because axe passes. See IMPLEMENTATION.md for actual execution results and remaining environment checks.

## Execution record — 21 November 2026

| Check | Result | Evidence / next requirement |
|---|---|---|
| Frontend typecheck, lint, build | Passed | Local Node 22.22.0 |
| Component/authentication tests | Passed | 30 Vitest tests, including next/back step focus and Tab to first input |
| Cookie security | Passed | 5 Node tests |
| Backend SQLite | Passed | PHP 8.3.30: 164 passed / 2 database-specific skips, 847 assertions; Pint passed |
| Full E2E matrix | Existing four tests passed | Chrome with disposable SQLite/storage; five-test suite including upload recovery is being verified |
| MySQL / Docker | Not rerun | Historical evidence is retained in IMPLEMENTATION.md |
| Manual client/analyst QA | Not executed | Run core scenarios above on disposable data |
| Keyboard-only happy paths | Not executed | Complete both roles without pointer input |
| NVDA/VoiceOver | Not executed | Record reader/version, browser, route and announcements |
| Remote CI | Not rechecked | Local results do not establish the status of the latest remote commit |

The 19–20 November PR/CI execution history is preserved in [IMPLEMENTATION.md](IMPLEMENTATION.md).
See [TEST-COVERAGE.md](TEST-COVERAGE.md) for criterion-to-test mapping. The previous claim that
TEST-04 still lacked a passing expanded browser matrix is superseded by the local results above.

Before merge, require these CI checks on the proposed commit: `backend (sqlite)`,
`backend (mysql)`, `frontend`, `e2e`, and `docker`. This documents the merge criteria;
repository branch-protection settings were not changed. TEST-02 is now complete. A green
pipeline does not replace manual accessibility checks. TEST-05, UX-10 and BL-12 remain partial.

Upload recovery regression: select three distinct PDFs, remove one before confirmation, verify
the remaining filenames, interrupt an upload, then retry its individual button. Confirm the claim
ID stays the same and previously confirmed uploads are not sent again. Navigate away while an
upload remains incomplete and verify the unsaved-changes dialog. Submit an empty required field
and verify the summary, inline error and focus. Automated checks cover removal, filenames,
focus, and selective retry; upload-recovery.spec.ts adds the browser/API regression. The manual
flow remains outstanding.

## Manual execution worksheet

Use disposable data and record the tested revision, date/time (Asia/Jakarta), tester, OS,
browser/version, screen reader/version and language before running the checklist. For every
row record observed behavior, pass/fail, and an evidence path or issue; blank observations
must not be treated as a pass. Do not put real patient information into screenshots or logs.

| Ticket / checks | Required observations | Current status |
|---|---|---|
| TEST-05 core 1–3 | Registration errors, persisted profile/photo, draft resume and leave/stay | Pending manual execution |
| TEST-05 core 4–6 | Upload failure/retry, ownership, assignment conflict, messages, document requests and all decisions | Pending manual execution |
| TEST-05 core 7–10 | More than 20 records, filtered export, admin/payment, account lifecycle/2FA, guarded deletion | Pending manual execution |
| UX-10 client | Keyboard login, drawer, four-step form (including Next/Back focus), native file picker, document viewer, history/pagination | Pending manual execution |
| UX-10 analyst | Keyboard queue, assignment, notes/partial amount, decision dialog trap, Escape and return focus | Pending manual execution |
| UX-10 visual | 360/390/768/1440 px; actual browser zoom 200%; focus indicator, clipping, independent table scroll, reduced motion | Pending manual execution |
| BL-12 form | Reader announces labels, current step heading, required/invalid fields and error summary in ID/EN | Pending NVDA/VoiceOver execution |
| BL-12 async/dialogs | Reader announces loading, success/error, dialog name, restored focus and distinct conversation/history landmarks | Pending NVDA/VoiceOver execution |

For screen-reader checks, record the words actually announced and how focus moved, not just
“axe passed.” Browser viewport resizing is not proof of actual browser zoom. Playwright's
filechooser.setFiles is not proof of a manually operated native picker. These distinctions
are the reason the three manual tickets remain open.
