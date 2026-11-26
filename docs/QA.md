# Verification and QA

## Current acceptance scope — 22 November 2026

**Final result:** all 9 browser tests passed (8.6 minutes). The final validation-summary
fix passed both targeted QA tests again (1.9 minutes), plus typecheck/lint, 33 component tests
and production build. Backend: 167 passed, 2 database-specific skips, 859 assertions; Pint
passed. Cookie security: 5 passed. TEST-05, UX-10 and BL-12 are complete under the revised
automated scope. Detailed revision/run evidence is in IMPLEMENTATION.md.

The user requested that the agent perform QA without manual testing. The current gate for
TEST-05, UX-10 and BL-12 is the automated suite and coverage map in TEST-COVERAGE.md.
The manual procedures below remain optional reference material; unexecuted worksheet rows
are not release blockers under this revised scope and are not represented as passed.
Automated checks do not establish NVDA/VoiceOver speech behavior, native OS picker usability,
actual browser zoom behavior or complete accessibility conformance.

Run `npm run test:e2e` with Chrome (`PLAYWRIGHT_CHANNEL=chrome` on this Windows host), plus
the backend and frontend commands in README.md. E2E uses disposable SQLite/storage and
synthetic accounts. `qa-states.spec.ts` adds delayed responses, failed request/retry with
preserved filters, empty results, real token revocation, and ID/EN form validation semantics
at 360 px with reduced-motion preference. Keep Playwright's report, failure traces and
responsive screenshots as local evidence; do not include authentication traces in Git.

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

## Empty, loading, error and slow-network scenarios (TEST-05)

Use disposable accounts and browser network controls; record observations in the worksheet.

1. With a new client, open claims, drafts, notifications and claim history without entries.
   Confirm each empty state is understandable and offers the appropriate next action.
2. Throttle the network before opening a claim directly by URL and refreshing it. Confirm
   loading feedback appears, then the correct claim; repeat with the analyst account.
3. Go offline before loading the list/detail/history. Confirm a readable error and retry
   control; restore connectivity and retry without losing filters or showing another claim.
4. Delay a form submission and an analyst decision. Confirm busy feedback prevents duplicate
   actions; after completion, reload and verify exactly one mutation/history event.
5. Interrupt a document upload after the claim is saved. Confirm the failed filename is
   identified, navigation warns about incomplete uploads, and retry uses the existing claim.
6. Expire the session while on a protected page. Confirm the next protected request returns
   to login; after signing in, verify the intended destination and ownership restrictions.

These steps extend the manual checklist; they are not recorded as executed.

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

Follow-up: the user confirmed manual auditing is not currently available. This session has
no interactive desktop-control tool, and NVDA was not found in standard installation locations.
No tester observations have been supplied. Manual rows below remain unexecuted, not passed.
The additional profile/admin browser audit reproduced duplicate admin pagination landmarks;
the labels were corrected in ID/EN. The expanded seven-test suite is being verified.

| Check | Result | Evidence / next requirement |
|---|---|---|
| Frontend typecheck, lint, build | Passed | Local Node 22.22.0 |
| Component/authentication tests | Passed | 30 Vitest tests, including next/back step focus and Tab to first input |
| Cookie security | Passed | 5 Node tests |
| Backend SQLite | Passed | PHP 8.3.30: 164 passed / 2 database-specific skips, 847 assertions; Pint passed |
| Full E2E matrix | Passed | 5 tests, 3.3 minutes, exit 0; Chrome 157.0.8103.79 with disposable SQLite/storage; includes keyboard step focus and upload recovery |
| MySQL / Docker | Not rerun | Historical evidence is retained in IMPLEMENTATION.md |
| Manual client/analyst QA | Not executed | Run core scenarios above on disposable data |
| Keyboard-only happy paths | Not executed | Complete both roles without pointer input |
| NVDA/VoiceOver | Not executed | Record reader/version, browser, route and announcements |
| Remote CI | Not rechecked | Local results do not establish the status of the latest remote commit |

The 19–20 November PR/CI execution history is preserved in [IMPLEMENTATION.md](IMPLEMENTATION.md).
The earlier five-test run used revision `3e85bab617625fc1cd521e71e604f87764e4f39b`.
Later admin fixes have their own verification record in IMPLEMENTATION.md.
Local report: `Health_Guard-frontend/playwright-report/index.html` (Git-ignored).
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

## Execution record — 26 November 2026 (interactive browser session)

Environment: Windows desktop, packaged Chromium through the local browser panel (no screen
reader installed), live deployment `http://20.212.0.113` at revision `70ac58d`, Indonesian UI
with an English pass, accounts `test.analyst@example.test` / `test.client@example.test`,
disposable claims `CLM-2026-008` and `CLM-2026-009`. Input was real key presses and typing in a
browser, not Playwright scripts; this is closer to manual use but still not a human/AT session.

| Check | Result | Observation |
|---|---|---|
| Keyboard login | Passed | Email and password typed, `Enter` in the password field submitted and redirected to the requested page |
| ID/EN toggle | Passed | Labels, headings, filters and nav switched; `lang` attribute followed; typed client form values survived the switch |
| Analyst decision reachable and changeable by keyboard | Passed | Select focused by keyboard, `ArrowDown` moved `Approved` → `Partially Approved`; the conditional `Nominal disetujui` field appeared with `max` equal to the claim amount |
| Decision confirmation dialog | Passed | Native `<dialog>` opened by `Enter` on the trigger, accessible name `Konfirmasi keputusan`, summary showed claim → status, notes and `Rp 500.000`, initial focus on the non-destructive `Kembali` |
| Dialog focus trap | Passed | Four `Tab` presses stayed between the two dialog buttons; matches `keyboard.spec.ts`, which asserts eight Tab/Shift+Tab presses |
| Escape closes and restores focus | Passed | Dialog closed, no decision written, focus returned to `Tinjau keputusan` |
| Visible focus indicator | Passed | Focused trigger computed `outline: solid 2.4px` |
| Clipping at 360/390/768/1440 px | Passed | No page-level horizontal overflow at any width (document width below viewport); no clipped leaf elements; the claims table scrolls inside its own container (302 of 681 px visible at 390) |
| Decision persistence | Passed | `Enter` on the focused `Konfirmasi & simpan` wrote the decision: badge became `Approved`, `approved_amount` = claim amount, a new `status_changed` history event appeared, and the list reflected it |
| Screen reader announcements (BL-12) | Not executed | No NVDA/VoiceOver available; cannot be inferred from axe or DOM inspection |
| Browser zoom 200%, native file picker, OS reduced motion | Not executed | Viewport resizing is not zoom, and scripted uploads are not the native picker |

**Observations that are not failures.** The analyst decision form defaults to `Approved`, so a
stray `Enter` in that form opens an approve confirmation; the dialog focuses `Kembali` first,
which keeps the accidental confirm one deliberate key away. That is how `CLM-2026-009` became
`Approved` during this session: the tab order after four presses landed on `Konfirmasi & simpan`
and the next key activated it. The transition itself is legal (assigned analyst, `Pending` →
`Approved`) and the stored result was consistent everywhere, so it is recorded here as an
observation about defaults rather than a defect. A decision form that starts with no status
selected would remove the hazard; it is not required by [HEALTH_GUARD_IMPROVEMENTS.md](HEALTH_GUARD_IMPROVEMENTS.md)
and was not changed.

The 21 November conclusion still holds: TEST-05, UX-10 and BL-12 are released on the
revised automated scope, and the manual rows below are reference material, not blockers.

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
| TEST-05 state handling | Empty lists, throttled loading, offline error/retry, duplicate-action prevention, interrupted uploads and expired session | Pending manual execution |
| UX-10 client | Keyboard login, drawer, four-step form (including Next/Back focus), native file picker, document viewer, history/pagination | Partially executed 26 Nov 2026: keyboard login and four-step edit/resubmit observed; drawer, native picker and pagination still automated-only |
| UX-10 analyst | Keyboard queue, assignment, notes/partial amount, decision dialog trap, Escape and return focus | Partially executed 26 Nov 2026: decision select, conditional amount field, dialog trap, Escape, focus return and save all observed (see execution record). Queue/assignment still only automated |
| UX-10 visual | 360/390/768/1440 px; actual browser zoom 200%; focus indicator, clipping, independent table scroll, reduced motion | Partially executed 26 Nov 2026: four widths, focus indicator and independent table scroll observed; real 200% browser zoom and OS reduced motion not executed |
| BL-12 form | Reader announces labels, current step heading, required/invalid fields and error summary in ID/EN | Pending NVDA/VoiceOver execution |
| BL-12 async/dialogs | Reader announces loading, success/error, dialog name, restored focus and distinct conversation/history landmarks | Pending NVDA/VoiceOver execution |

For screen-reader checks, record the words actually announced and how focus moved, not just
“axe passed.” Browser viewport resizing is not proof of actual browser zoom. Playwright's
filechooser.setFiles is not proof of a manually operated native picker. These distinctions
are the reason the three manual tickets remain open.
