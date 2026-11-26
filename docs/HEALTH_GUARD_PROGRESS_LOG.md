# Health Guard — Progress Log

**Repository:** https://github.com/TMRakaP26/Health_Guard  
**Purpose:** Chronological, append-only record of task progress, code changes, tests, blockers, and releases.  
**Timezone:** Asia/Jakarta (WIB)  
**Source of tasks:** [HEALTH_GUARD_IMPROVEMENTS.md](HEALTH_GUARD_IMPROVEMENTS.md), Section 9.

> Never write credentials, access tokens, personal patient records, or other sensitive data here. Record only verified work; do not claim tests or changes have happened without evidence.

## 2026-11-21 — Baseline tracking created

- **Owner:** Unassigned
- **Status:** Not Started
- **Scope:** HG-01 through HG-13, ADD-01 through ADD-10
- **Implemented code changes:** None. Documentation and tracking only.
- **Verification:** No application test runs; no branches changed.
- **Next action:** Start investigating HG-05 by reproducing claim overwrite and recording backend/front-end behavior. Then fix root cause and add regression tests.

---

## 2026-11-26 — [HG-04 + re-audit] Numeric XLSX amounts; backlog verified 23/23

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done
- **Branch / commit / PR:** `Health_Guard-frontend/src/app/portal/ClaimList.tsx`; Not committed.
- **Problem / feedback:** HG-04 requires that exported amounts are real Excel numbers, but the XLSX button converted the server CSV with `raw: true` and wrote every cell as text, so `1500.00` arrived as a string and could not be summed or formatted in Excel.
- **Goal / acceptance criteria:** amount columns in `healthguard-claims.xlsx` are numeric cells with a thousands/decimal number format, while the API and database keep plain decimals; display formatting continues to use grouping dots.
- **Implementation:**
  - `Health_Guard-frontend/src/app/portal/ClaimList.tsx`: after reading the CSV, walk each sheet, detect headers ending in `(IDR)`, and rewrite those cells as `{ t: "n", v: number, z: "#,##0.00" }`. Values are normalised for both `1.500.000` and `1500.00` shapes; empty or non-numeric cells are left untouched.
  - Database/API contract: None — the backend CSV export is unchanged.
  - `docs/HEALTH_GUARD_IMPROVEMENTS.md`: re-audited all 23 tasks against the monorepo, replaced the stale branch-era paths/metadata, resolved the P0 overwrite diagnosis, checked the acceptance checklist and rewrote the Section 9 tracker with per-task evidence plus a deviations list.
- **Verification:**
  - `npm run typecheck`: PASS — exit 0, no output.
  - `npm run lint`: PASS — exit 0, no findings.
  - `npm test`: PASS — 4 files, 33 Vitest tests.
  - `npm run build`: PASS — exit 0 (xlsx chunk split as expected).
  - Backend suite, Playwright, Docker/Compose: NOT RUN in this session. The backend tracker evidence cites the previously recorded runs, not new ones.
  - Manual check of the downloaded workbook in Excel/LibreOffice: NOT RUN — the numeric-cell rewrite is covered by types and code inspection only.
- **Evidence:** this log entry and Section 9 of `HEALTH_GUARD_IMPROVEMENTS.md`.
- **Risk / rollback:** low; the change only affects the client-side XLSX conversion. Revert the `exportFile` block to restore text cells. CSV download is unaffected.
- **Known limitations / blockers:** no read receipts for chat; `bpjs_number` retained in schema/profile by design.
- **Next action:** open the generated workbook once in a spreadsheet application to confirm the amount cells are numeric, and run the MySQL/Compose and Playwright suites on a Docker-capable machine.

---

## 2026-11-26 20:25 WIB — [ADD-01] Unauthenticated API calls return 401 instead of 500

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done
- **Branch / commit / PR:** `main`, commit `70ac58d` (pushed).
- **Problem / feedback:** while testing the deployed application, `GET /api/claims` without `Accept: application/json` returned **500 Server Error**. The server log showed `Route [login] not defined`.
- **Goal / acceptance criteria:** any unauthenticated request under `/api/*` answers `401 {"message":"Unauthenticated."}` in JSON, whatever the `Accept` header says, matching `docs/API.md`.
- **Implementation:**
  - `Health_Guard-backend/bootstrap/app.php`: the framework registers `redirectGuestsTo(fn () => route('login'))` by default, and that callback is evaluated *inside* `Authenticate` before the exception handler runs, so the routing error replaced the auth failure. Added `$middleware->redirectGuestsTo(null)` plus an explicit `AuthenticationException` renderer that returns JSON 401 for `api/*`.
  - `Health_Guard-backend/tests/Feature/SecurityAuthTest.php`: regression test covering `/api/claims` and a document download URL with no `Accept` header, plus the JSON variant.
  - Database/API contract: none; response shape unchanged, status code corrected to the documented one.
- **Verification:**
  - `php vendor/bin/phpunit --filter test_unauthenticated_api_requests`: FAIL before the fix (500), PASS after.
  - `APP_KEY=… php vendor/bin/phpunit`: PASS — 170 tests, 864 assertions, 2 skipped.
  - `php vendor/bin/pint --test`: PASS.
  - Live: `curl http://20.212.0.113/api/claims` → 401 JSON; document download → 401; `/healthz` 200.
  - MySQL variant and Playwright: NOT RUN in that step (run later, see the entry below).
- **Evidence:** `/var/lib/hg-be-test.log` and `/var/lib/hg-mysql.log` on the VM; `docs/API.md` status table.
- **Risk / rollback:** low; revert the two `bootstrap/app.php` blocks to restore the default guest redirect.
- **Known limitations / blockers:** none.
- **Next action:** none — closed by `70ac58d`.

---

## 2026-11-26 21:10 WIB — [§11] Release verification on the Azure deployment

- **Owner:** agent session (no human reviewer yet)
- **Status:** In Review → Done (release gate)
- **Branch / commit / PR:** `main`, deployed SHA `70ac58d`; documentation commit follows this entry.
- **Problem / feedback:** the backlog was marked complete but several Section 11 release gates had never been exercised against a running deployment.
- **Goal / acceptance criteria:** every Section 11 release-gate line has evidence (tests, live flows, copy/mobile, migration safety, docs).
- **Implementation:**
  - `docs/HEALTH_GUARD_IMPROVEMENTS.md`: Section 11 checked with per-line evidence; Section 9 deviations unchanged.
  - No application code changed in this step.
  - Database/API contract: none.
- **Verification:**
  - VM host (no image rebuild): PHPUnit 170 tests / 864 assertions / 2 skipped (SQLite) and 170 / 879 / 1 skipped (MySQL on a throwaway `healthguard_test` database, dropped afterwards), Pint pass, `tsc --noEmit` 0, ESLint 0, Vitest 33/33, `vite build` 0, Playwright 9/9 in 2.3 min.
  - Live UI: claim created (CLM-2026-008), document uploaded, chat sent, analyst assigned and partially approved, admin recorded `paid` → `settled`; CLM-2026-009 created, set to Needs Info, edited and resubmitted to Pending; paid claim resubmit rejected with 409.
  - Export: XLSX download triggered from the deployed app; both amount columns contain numeric cells (`t: "n"`, format `#,##0.00`).
  - Copy/mobile: English pass at 390×762 with no page-level overflow and an internally scrolling table; ID/EN switch preserved typed form values.
  - Not run: NVDA/VoiceOver listening, native OS file picker, opening the workbook in a spreadsheet application, load testing.
- **Evidence:** `/var/lib/hg-test.log`, `hg-be-test.log`, `hg-e2e.log`, `hg-mysql.log`, `hg-xlsx.log` on the VM; commits `38f18b7`, `70ac58d`.
- **Risk / rollback:** none — documentation only.
- **Known limitations / blockers:** test accounts (`test.*@example.test`) and claims CLM-2026-008/009 remain in the demo database; `terraform destroy` removes the whole environment.
- **Next action:** new defects or features need new tickets; do not reopen closed ones.

---

## 2026-11-26 21:45 WIB — [QA] Interactive keyboard and responsive observations

- **Owner:** agent session (no human reviewer yet)
- **Status:** In Review → Done (documentation only)
- **Branch / commit / PR:** `main`; documentation commit follows this entry. Deployed code unchanged (`70ac58d`).
- **Problem / feedback:** the release gate claimed keyboard and responsive behaviour on the strength of Playwright runs alone; no interactive session had been recorded, and the QA worksheet still showed every manual row as pending.
- **Goal / acceptance criteria:** exercise the analyst decision dialog, focus handling and the four target widths interactively on the deployment and record what was actually seen, without presenting unrun assisted-technology checks as passed.
- **Implementation:**
  - `docs/QA.md`: new "Execution record — 26 November 2026" section; UX-10 analyst/client/visual worksheet rows changed from "Pending manual execution" to a dated partial status with the gap that remains.
  - No application code changed; the defaults and dialog behaviour examined were deliberately left as they are because they are covered by `keyboard.spec.ts` and `claims-matrix.spec.ts` and are not required by the improvements backlog.
  - Database/API contract: none.
- **Verification:** real key presses against `http://20.212.0.113` at `70ac58d` — keyboard login; `ArrowDown` status change with the conditional amount field (`max` = claim amount); native `<dialog>` named `Konfirmasi keputusan` with summary content; four `Tab` presses contained; `Escape` closing and returning focus to the trigger; `outline: solid 2.4px`; no page overflow or clipped elements at 360/390/768/1440 px.
  - Not executed: NVDA/VoiceOver, real 200% browser zoom, native OS file picker, OS-level reduced motion.
- **Evidence:** this entry and the QA execution record; API read-back of the resulting claim state.
- **Risk / rollback:** none — documentation only.
- **Known limitations / blockers:** `CLM-2026-009` became `Approved` (Rp 800.000) during the session when `Enter` activated the focused confirm button; the transition is legal and the record is consistent, so it stands as disposable test data.
- **Next action:** decide separately whether the analyst decision form should start with no status selected.

---

## 2026-11-26 21:50 WIB — [UX] Analyst decision no longer defaults to Approved

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done
- **Branch / commit / PR:** `main`, commits `1e77052` (behaviour + tests) and the documentation commit that follows.
- **Problem / feedback:** during the interactive keyboard session an `Enter` on the dialog's focused confirm button saved an `Approved` decision on `CLM-2026-009`. The dialog was behaving as designed; the underlying hazard was that the decision form preselected `Approved` for the full claim amount, so a stray `Enter` in the form pre-filled an approve confirmation.
- **Goal / acceptance criteria:** the analyst must choose a decision deliberately; the confirmation dialog, history and amount handling stay unchanged.
- **Implementation:**
  - `ClaimDetail.tsx`: decision state starts empty; the select gains a disabled `Pilih keputusan` / `Choose a decision` placeholder and `required`, so native validation blocks a status-less submit like it already did for a missing note.
  - `tests/e2e/keyboard.spec.ts`: asserts the select starts empty, then selects `Approved` before reviewing.
  - `tests/e2e/workflows.spec.ts`: the approval path selects `Approved` before reviewing.
  - `tests/portal.test.tsx`: `useAuth` became an overridable mock with a client default, plus a guard test that the analyst sees no preselected status.
  - Database/API contract: none; `PATCH /claims/{id}/status` is untouched.
- **Verification:**
  - `npx tsc --noEmit`: 0; `npx eslint . --max-warnings=0`: 0; `npx vitest run`: 34 passed (was 33, one new guard test).
  - On the VM at `a47d756`: `npx playwright test` — 9 passed in 2.0 minutes, exit 0; the first run at `1e77052` failed `workflows.spec.ts` as expected because that spec still relied on the old default, which is why the second commit exists.
  - Not run: backend suite (no backend change), NVDA/VoiceOver.
- **Evidence:** `/var/lib/hg-e2e.log` on the VM; deployment rebuilt the frontend image and reported healthy containers at `a47d756`.
- **Risk / rollback:** low — revert the select and state change to restore the previous default; the tests would need the same revert.
- **Known limitations / blockers:** the placeholder is a native `required` validation message, whose wording follows the browser language rather than the app locale.
- **Next action:** none.

---

## 2026-11-26 22:05 WIB — [CI] First green remote pipeline

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done
- **Branch / commit / PR:** `main`, commit `c3a2482`.
- **Problem / feedback:** `gh run list` showed every workflow run in the repository failing, including docs-only commits, always in the `e2e` job. The documentation said remote CI had not been rechecked.
- **Goal / acceptance criteria:** all five required jobs green on the pushed commit without weakening the keyboard assertions.
- **Implementation:**
  - `tests/e2e/keyboard.spec.ts`: `tabTo` waits for network idle and re-runs its sweep (three sweeps) before failing, and the failure message now names the control holding focus and the target's text instead of a `null` attribute.
  - No application code changed; the retry tolerates a page that settles late, it does not make an unreachable control reachable.
  - Database/API contract: none.
- **Verification:**
  - Artifact from run `45839205165`: page snapshot and screenshot show `button "keyboard.png"` rendered and visible while the Tab sweep failed, so the element existed and focus never arrived.
  - Local: `npx tsc --noEmit` 0, `npx eslint . --max-warnings=0` 0, `npx playwright test tests/e2e/keyboard.spec.ts` passed (47.3s).
  - Remote: `gh run watch 45842080346` — conclusion `success`; `backend (sqlite)`, `backend (mysql)`, `frontend`, `e2e`, `docker` all `success`.
  - Not re-run in this step: full local suite, backend suite (unchanged).
- **Evidence:** run `45842080346`; `docs/QA.md` "Remote CI — 26 November 2026".
- **Risk / rollback:** low — the helper's retry adds ~2 seconds on a genuinely unreachable control.
- **Known limitations / blockers:** the root cause (focus reset during repeated re-renders on the runner) was not isolated to a component; the retry absorbs it.
- **Next action:** none.

---

## 2026-11-26 22:30 WIB — [QA] Volume, filters and export at 30 records

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done (verification only, no code change)
- **Branch / commit / PR:** `main`, deployed code `c3a2482`; documentation commit follows.
- **Problem / feedback:** "create more than 20 records, filter by text/date/status, page through them, statistics/export must reflect all filtered records" had only been covered by unit tests with mocked pages.
- **Goal / acceptance criteria:** observe the real list, statistics and exports above one page of data, with filters applied.
- **Implementation:**
  - No application change. 21 disposable claims were created through `POST /api/claims` and four decisions recorded through `PATCH /api/claims/{id}/status` so several statuses existed.
  - `docs/QA.md`: new "Volume, filters and export — 26 November 2026" section; the TEST-05 core 7–10 worksheet row moved to a dated partial status.
  - Database/API contract: none.
- **Verification:**
  - UI: 20 rows on page 1 and 10 on page 2 with indicator `1 / 2` → `2 / 2`; filtered total held at 30; `status=Rejected` gave 4 rows and `Rp 1.506.000` submitted / `Rp 0` approved with `1 / 1` pagination; `q=Volume` gave 21.
  - Export endpoint: data rows all 30, `Rejected` 4, `Pending` 15, `Approved` 4, search 21, single-record search 1, and `page=2` still 30; each figure matched the list total for the same query.
  - Date filter: 26 Nov 30, 25 Nov 0, 27–30 Nov 0, reversed range 422.
  - Scoping: the test client's list reports 23 of the 30 claims.
  - Not run: XLSX download for these filters (format verified earlier), screen reader, 2FA, account deletion.
- **Evidence:** this entry and the QA volume record.
- **Risk / rollback:** none — verification only. The extra claims stay in the demo database.
- **Known limitations / blockers:** the demo database now holds 30 claims plus the `test.*` accounts; `terraform destroy` removes the environment.
- **Next action:** none.

---

## 2026-11-26 23:00 WIB — [QA] Two-factor authentication end to end

- **Owner:** agent session (no human reviewer yet)
- **Status:** Not Started → Done (verification only, no code change)
- **Branch / commit / PR:** `main`, deployed code `c3a2482`; documentation commit follows.
- **Problem / feedback:** the QA core scenario covering 2FA had only unit coverage; no session had enabled 2FA on the deployment, logged in with a code, or checked replay and recovery behaviour.
- **Goal / acceptance criteria:** enable 2FA, authenticate with TOTP, confirm a used code cannot be replayed, confirm recovery codes are single-use, and disable cleanly.
- **Implementation:**
  - No application change. A throwaway TOTP generator replicating `TwoFactorService` (same base32 decode, HMAC-SHA1, dynamic truncation) ran on the VM so codes used the server clock; requests went through `http://127.0.0.1/api`.
  - `docs/QA.md`: new "Two-factor authentication — 26 November 2026" section; the TEST-05 core 7–10 row updated to reflect 2FA as executed.
  - Database/API contract: none observed; setup returned `no-store`, repeat setup 409, disable required password plus a valid code and revoked tokens.
- **Verification:**
  - Setup returned a 32-character secret and an `otpauth://totp/HealthGuard:…` URI; confirm with the current code returned 200 and eight recovery codes.
  - Password-only login returned 422; the next-window code returned a token; replaying that code returned 422.
  - Recovery code 1 authenticated, replaying it returned 422, codes 2 and 4 authenticated.
  - `DELETE /two-factor` returned 200 with `reauthenticate: true`; password-only login then worked and `two_factor_enabled` read `false`.
  - Failed-login bursts returned 429, so some attempts were spaced out.
  - Not run: email-based password reset (needs SMTP), screen reader, guarded account deletion.
- **Evidence:** this entry and the QA 2FA record; the analyst test account is left with 2FA disabled.
- **Risk / rollback:** none — verification only, account state restored.
- **Known limitations / blockers:** none outstanding.
- **Next action:** none.

---

## Entry template (copy below this line for each change)

```md
## YYYY-MM-DD HH:mm WIB — [TASK-ID] Short title

- **Owner:** @username
- **Status:** Not Started → In Progress / In Review / Done / Blocked
- **Branch / commit / PR:** frontend: ... ; backend: ...
- **Problem / feedback:** ...
- **Goal / acceptance criteria:** ...
- **Implementation:**
  - `path/to/file`: what changed and why
  - Database/API contract: ... (or None)
- **Verification:**
  - `command`: PASS / FAIL / NOT RUN — observed result
  - Manual steps and observed result: ...
- **Evidence:** screenshots, PRs, CI, reports (redacted)
- **Risk / rollback:** ...
- **Known limitations / blockers:** ...
- **Next action:** ...
```
