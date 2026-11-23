# Health Guard — Project Improvement Backlog

**Repository:** https://github.com/TMRakaP26/Health_Guard  
**Branches:** `frontend` (React/TypeScript/Vite) and `backend` (Laravel/Sanctum/SQLite)  
**Document date:** 2026-11-21  
**Status:** Proposed requirements; **not yet implemented**.
**Tracking:** Maintain the task register in Section 9 and append a dated entry to `HEALTH_GUARD_PROGRESS_LOG.md` after every meaningful change. The checkboxes below are not evidence of implementation until code and tests are verified.

## 1. Objective and implementation rules

Improve Health Guard's claim submission, patient identity, labels, localization, conversation UX, and data integrity. Preserve existing user and claim data. Implement changes in both branches wherever the API contract or database schema changes.

**Priority levels:** P0 = possible data loss/security; P1 = key workflow; P2 = usability/polish.

**Important distinction:** “Nomor BPJS jadi ID user/client” is interpreted as *displaying the application's client/user ID in the place where the BPJS number currently appears*. Do **not** overwrite existing BPJS numbers, replace Laravel's primary key, or assume BPJS numbers are identifiers for authentication. Keep legacy `bpjs_number` intact until a deliberate migration/data policy is approved. A separate human-friendly `client_id` is optional if internal numeric IDs should not be exposed.

## 2. Requested improvements (user feedback)

| ID | Priority | Area | Requested change | Acceptance criteria |
|---|---|---|---|---|
| HG-01 | P1 | Patient identity | Replace **Nomor BPJS** on claim screens with **User ID / Client ID**. | Display the ID of the authenticated client; value is read-only, derived from backend auth; cannot impersonate another client by modifying request payload; existing BPJS data remains preserved. Update corresponding review/detail/table labels. |
| HG-02 | P1 | Terminology | Replace **Provider / Provider Name** with **Rumah Sakit** (`Hospital` in English). | Claim form, dashboard, details, search, export, analyst screens and translations use consistent terms. Keep API field `provider_name` temporarily if necessary for backward compatibility, or migrate it safely. |
| HG-03 | P1 | Terminology | Replace **Kategori** with **Penyakit** (`Disease` in English). | Disease field appears consistently across forms/details/filters/exports. Establish whether existing `type` values are categories or diagnosis names before migration; do not silently relabel incompatible historical data. |
| HG-04 | P1 | Currency | Insert periods as thousands separators in monetary amounts. | `1000` → `1.000`; `1500000` → `1.500.000`; in Indonesian locale show `Rp 1.500.000`. Formatting is applied to form, summary, dashboard, analyst review, and export; API/database continue receiving numeric values, not formatted strings. |
| HG-05 | **P0** | Claim integrity | Fix intermittent bug: submitting a new claim appears to overwrite an existing claim. | Every new claim generates a unique persistent record; previous records and their document associations remain unchanged; UI lists all records with stable keys; creation never calls update flow; concurrent requests do not collide; tests cover repeated fast submissions. |
| HG-06 | P2 | Header | Move the flag-based language switcher to the **top right**, with **Logout beside it**. | Both Client and Analyst layouts use a consistent accessible header; switcher shows appropriate flags and explicit `ID`/`EN` labels, persists preference, works on mobile; logout remains visible and has confirmation only if needed. |
| HG-07 | P1 | Conversation | Rename **Percakapan** to **Chat**. | Navigation, page titles, buttons, empty states, notifications and translation dictionaries use `Chat`. |
| HG-08 | P1 | Chat UI | Make conversations visually resemble modern messaging. | Distinct incoming/outgoing bubbles, sender name/role, timestamp, chronological messages, scrolling, multiline input, send and loading/error states, responsive layout; authenticated access limited to claim participants/authorized staff. |
| HG-09 | P2 | Copy | Replace **Catatan Reimbursement** with **Deskripsi** (`Description`). | Consistent labels, placeholders, review cards and translations; clarify whether this is the claim's description or an analyst note before changing backend fields. |
| HG-10 | P1 | Autofill | Autofill **Tanggal Layanan** (service date). | New claim defaults to today's **local** date; remains editable; edit mode shows saved claim service date rather than overwriting it with today; date validation prevents accidental future dates when prohibited. |
| HG-11 | P1 | Autofill | Autofill **Tanggal Lahir** (date of birth). | Read from authenticated profile; correct `YYYY-MM-DD` without timezone-induced day shift; show blank plus guidance if not set; edit form uses stored data where applicable. |
| HG-12 | P1 | Autofill | Autofill **Nama**. | Prepopulate authenticated user's profile name, indicate source, and do not allow claim ownership to change through form input. If patient name may differ from account holder, explicitly offer a separate patient-name field. |
| HG-13 | P1 | Autofill | Autofill **User ID / Client ID**. | Read-only ID obtained from `/api/user` or server-owned claim metadata, displayed in form and review, and never trusted from the client request. |

### Field mapping and migration policy

| UI label (Indonesian) | English label | Current / proposed source | Migration note |
|---|---|---|---|
| ID Client | Client ID | `users.id` initially, or new non-sensitive `users.client_id` | Server controlled; **not** `bpjs_number` |
| Nama | Name | Authenticated `users.name` | Separate `client_name`/patient identity from account owner if needed |
| Tanggal Lahir | Date of Birth | `users.date_of_birth` | Do not accidentally shift day due to UTC conversion |
| Tanggal Layanan | Date of Service | Propose `claims.date_of_service` if not present in actual schema | Persist to backend; not just frontend state |
| Rumah Sakit | Hospital | Existing `claims.provider_name` initially | Rename API/DB only via versioned migration |
| Penyakit | Disease | Existing `claims.type` is **not necessarily equivalent** | Confirm diagnosis/value semantics; consider dedicated `disease_name` field |
| Nominal | Billed Amount | `claims.amount` | Store as decimal/numeric; format only on display |
| Deskripsi | Description | New or mapped claim description field | Keep separate from analyst's decision `notes` |

## 3. P0 — Diagnose and fix claim overwrite/data-loss bug

**Code areas to inspect:**

- `frontend/src/app/pages/ClientClaimForm.tsx` — `editClaim` navigation state, edit/new mode and submit handler.
- `frontend/src/app/state/ClaimContext.tsx` — `addClaim`, `updateClaim`, and list refresh.
- `frontend/src/app/pages/Dashboard.tsx` — record keys, refresh, navigation to edit/new.
- `backend/app/Http/Controllers/ClaimController.php` — `store`, `update`, claim ID creation.
- `backend/database/migrations/*claims*` and `backend/app/Models/Claim.php` — uniqueness, indexes, relationships.

**Known risk spotted in code review:** `ClaimController::store()` builds a public claim ID using `random_int(0, 999)` and a three-digit suffix (`CLM-YYYY-XXX`). That has only 1,000 possibilities per year and is **collision-prone**. This is a plausible contributor to wrong-record lookups or failed creation, but **not proof** of the reported overwrite. Reproduce the exact issue before claiming root cause.

**Implementation requirements:**

1. Reproduce: create several claims for the same account; create a new claim after editing another one; test quick back/forward navigation, refresh, and two simultaneous submissions. Record DB rows and API requests before/after.
2. Ensure `/client/submit` starts a *clean new claim state*. Explicitly clear stale `location.state.editClaim` when entering create mode. Editing must have a deliberate edit route or explicit mode identifier.
3. New claim **always uses `POST /api/claims`**; edit claim **only uses `PUT /api/claims/{id}`** after ownership/eligibility checks.
4. Use immutable DB primary key for relations; assign a collision-resistant externally visible claim number with a DB `UNIQUE` constraint (e.g., UUID/ULID or controlled database-backed sequence). Plan migration of existing IDs with references preserved. Handle uniqueness conflicts cleanly.
5. Prevent accidental double-submit using pending state / disabled button, plus backend idempotency key if clients may retry after network interruption.
6. Use stable React list keys `claim.id` tied to a guaranteed unique identifier; never use array index for claim rows.
7. After success, refetch claims / invalidate cache, then navigate to the new claim or dashboard. Show an error if create fails; never optimistically replace a different record.
8. Add automated tests: create A then B → both remain unchanged; edit A then create C → A, B, C intact; same-second and concurrent submissions; duplicate claim ID rejection; unauthorized updates.

**Definition of done:** No existing claim is overwritten during 100 repeated create operations plus parallel requests in test environment; DB uniqueness and audit assertions pass; regression tests run in CI.

## 4. P1 — Form and data improvements

### Autofill behavior

- On new claim, fetch `/api/user` and initialize name, user/client ID and DOB from authenticated profile.
- Default service date using **local calendar date**, not `new Date().toISOString().split('T')[0]` (UTC can change the displayed day in some time zones).
- On edit, loaded claim values take precedence; do not reset date of service to today.
- Profile values missing → blank field with helpful explanation, rather than fabricated defaults.
- Use controlled inputs; values remain editable only where the business rules allow it.
- Validate and persist `date_of_service` on the backend. Compare stored value after page refresh.
- Server derives claim owner from authenticated user; never accept a client-supplied `user_id` to set claim ownership.

### Currency behavior

- Show `Rp 1.234.567` using `Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })` for IDR display.
- While editing, allow typing/pasting digits and group separators; normalize to a numeric value before sending the API payload. Avoid cursor jumps and duplicated separators.
- For exports, store actual Excel numeric cells and apply a number format rather than exporting strings with periods.
- Test `0`, `999`, `1000`, `1000000`, pasted `1.500.000`, and cleared inputs. Decide if fractional rupiah is supported.

### Localization/header

- Use a single translation dictionary for Indonesian/English, rather than hardcoded mixed-language strings.
- Header right side: `🇮🇩 ID / 🇬🇧 EN` selector, followed by Logout (desktop and mobile).
- Keyboard accessible controls with text labels; flags are supplementary icons, not the sole language indicator.
- Persist language preference in local storage and update the UI without losing form entries.

### Chat

- Confirm whether Chat is an existing module or a new feature; repository review did not establish a dedicated chat implementation.
- If new, model `claim_messages` with message ID, claim ID, sender user ID, body, created timestamp, and read state.
- Enforce access control on every message endpoint; private claim/patient information must not be exposed to other clients or unrelated analysts.
- Start with paginated messages and polling, or use authenticated WebSockets/SSE if genuine real-time chat is needed.
- Provide message list, bubble styling, timestamps, sending state, retry on failure and empty state. Prevent duplicate messages on retries.

## 5. Additional recommended improvements

| ID | Priority | Recommendation | Why / acceptance |
|---|---|---|---|
| ADD-01 | **P0** | Strengthen role authorization in Laravel policies/middleware. | Public registration currently accepts `analyst` role. New users must default to `client`; analyst accounts are provisioned only by privileged admins. Verify every claim/document endpoint, not just frontend route guards. |
| ADD-02 | **P0** | Restrict claim resubmission to eligible statuses and owner. | `Rejected` / `Partially Approved` only (or a defined policy), and owner must match authenticated user. Do not allow analyst or arbitrary user to silently reset a finalized claim. |
| ADD-03 | P1 | Audit logging and claim history. | Record actor, timestamp, previous/new status, comments, amount decisions, assignments and document changes for traceability. |
| ADD-04 | P1 | Make assignment concurrency-safe. | Atomic compare-and-set or DB transaction prevents two analysts from taking the same claim. |
| ADD-05 | P1 | Validate monetary approvals. | When partially approved, require approved amount and constrain it to `0 <= approved_amount <= amount`; clear obsolete approval amount for other states. |
| ADD-06 | P1 | Establish diagnosis/medical-data privacy safeguards. | Minimize sensitive data, validate upload MIME/size, authorize downloads, apply safe storage/access URLs, define retention, backups, and recovery procedures. |
| ADD-07 | P1 | Fix API documentation drift. | Backend README references `PATCH /claims/{id}/assign`, but actual route and frontend use `POST`. Keep API docs and implementation aligned. |
| ADD-08 | P1 | Improve test coverage and CI. | Add Laravel feature tests for auth, role, claims, uploads, assignment; React tests for autofill, create/edit, currency, language; run tests on pull requests. |
| ADD-09 | P2 | Accessibility and usability. | Ensure field errors next to inputs, progress preservation for multistep form, keyboard navigation, mobile responsive tables and chat, loading/empty/error states. |
| ADD-10 | P2 | Use precise terminology and no unsupported claims. | Verify whether notifications are truly push real-time vs polling; distinguish claim **patient**, **client/account owner**, and analyst notes from claim description. |

## 6. Recommended implementation order

**Sprint 1 — Data safety and security (P0):** reproduce overwrite; unique claim number; clean create/edit state; server-side authorization; regression tests; backups before migrations.

**Sprint 2 — Claim form (P1):** identity/client ID display; hospital and disease fields; safe migrations/API compatibility; autofill; service-date persistence; nominal formatting.

**Sprint 3 — UX (P1/P2):** header language toggle + logout; terminology consistency; Description field; Chat scope/UI and authorization; responsive behavior.

**Sprint 4 — Quality (P1/P2):** audit trail, validation hardening, automated tests, documentation refresh, accessibility and user acceptance testing.

## 7. Suggested files to modify

### Frontend branch

- `src/app/pages/ClientClaimForm.tsx` — field labels, new/edit mode, date autofill, user identity, currency, description.
- `src/app/state/ClaimContext.tsx` — create/edit separation, mapping, refetch handling.
- `src/app/pages/Dashboard.tsx` — labels, stable claim rendering, click actions, monetary formatting.
- `src/app/components/Header.tsx` — language toggle at top-right next to Logout.
- `src/app/components/AnalystLayout.tsx`, `src/app/components/Layout.tsx` — consistent header.
- `src/app/pages/AnalystReview.tsx` — hospital/disease, description, status notes and monetary formatting.
- `src/app/state/AuthContext.tsx` — user identity / DOB source.
- Add `src/app/i18n/` for translations and `src/app/utils/currency.ts`.
- Add chat page/components/routes only after confirming chat's existing code or scope.

### Backend branch

- `app/Http/Controllers/ClaimController.php` — unique IDs, create/edit validation, claim identity/date/description, authorization.
- `app/Http/Controllers/AuthController.php` — secure role enrollment.
- `app/Http/Controllers/DocumentController.php` — access checks.
- `app/Models/Claim.php`, `app/Models/User.php` — appropriate casts, columns, relationships.
- `routes/api.php` — APIs/middleware and (if required) chat endpoints.
- `database/migrations/` — nullable new columns and unique constraints, with safe backfill strategy.
- `tests/Feature/` — regression and access-control tests.

## 8. Final acceptance checklist

- [ ] New claim never overwrites an old claim; unique ID enforced in DB.
- [ ] New/edit actions remain distinct after navigate, refresh and retry.
- [ ] Only authorized users can access/edit their claims, documents and chat messages.
- [ ] BPJS number is no longer shown as the client's User ID; historical BPJS values preserved.
- [ ] All UI labels use Rumah Sakit / Penyakit / Deskripsi / Chat as intended.
- [ ] All rupiah amounts show grouping dots; API and Excel store numeric values.
- [ ] Language selector is top-right with Logout next to it.
- [ ] Chat works as a messaging interface, with clear authorization and error states.
- [ ] New claim autofills current local service date, profile DOB, name and client ID.
- [ ] Edit claim keeps previously saved date and personal values correctly.
- [ ] Automated tests pass and no existing claims are lost during migration.

---

> **Developer note:** This document is a specification/backlog rather than a statement that features were already changed. Confirm the semantics of “Penyakit”, the patient-vs-account-owner model, and whether chat already exists before destructive schema changes.


## 9. Live progress tracker (update after every task)

**Overall status:** `Not Started`  
**Last reviewed:** 2026-11-21  
**Completion:** 0/23 tasks (0%). This is the initial baseline, not a code audit proving tasks were completed.  
**Status vocabulary:** `Not Started` → `In Progress` → `In Review` → `Done`; use `Blocked` when applicable. Check a task only when acceptance criteria and appropriate tests pass.

### P0 — Data integrity and security

- [ ] **HG-05** — Fix new claim overwriting existing claim. Status: Not Started. Owner: Unassigned. PR/commit: —. Tests: Pending.
- [ ] **ADD-01** — Enforce server-side role authorization and restrict analyst registration. Status: Not Started. Owner: Unassigned. PR/commit: —. Tests: Pending.
- [ ] **ADD-02** — Enforce claim resubmission eligibility and ownership. Status: Not Started. Owner: Unassigned. PR/commit: —. Tests: Pending.

### P1 — Data fields, form, messaging, and quality

- [ ] **HG-01** — Show User ID / Client ID in place of BPJS number, preserving historical values. Status: Not Started.
- [ ] **HG-02** — Rename Provider to Rumah Sakit / Hospital. Status: Not Started.
- [ ] **HG-03** — Rename Kategori to Penyakit / Disease with correct data semantics. Status: Not Started.
- [ ] **HG-04** — Format currency with separators while storing numeric values. Status: Not Started.
- [ ] **HG-07** — Rename Percakapan to Chat. Status: Not Started.
- [ ] **HG-08** — Implement messaging-style chat UI with permission checks. Status: Not Started.
- [ ] **HG-10** — Autofill service date correctly and persist it. Status: Not Started.
- [ ] **HG-11** — Autofill date of birth from profile. Status: Not Started.
- [ ] **HG-12** — Autofill name from authenticated profile. Status: Not Started.
- [ ] **HG-13** — Autofill read-only client/user ID from server. Status: Not Started.
- [ ] **ADD-03** — Add claim history / audit log. Status: Not Started.
- [ ] **ADD-04** — Make assignment updates concurrency-safe. Status: Not Started.
- [ ] **ADD-05** — Validate partial approval amounts. Status: Not Started.
- [ ] **ADD-06** — Strengthen medical-data privacy and document access safeguards. Status: Not Started.
- [ ] **ADD-07** — Synchronize API docs and implementation. Status: Not Started.
- [ ] **ADD-08** — Add automated tests and CI. Status: Not Started.

### P2 — UX and polish

- [ ] **HG-06** — Move flag/language selector next to Logout in right header. Status: Not Started.
- [ ] **HG-09** — Rename Catatan Reimbursement to Deskripsi / Description. Status: Not Started.
- [ ] **ADD-09** — Improve accessibility, responsive behavior, and UX feedback. Status: Not Started.
- [ ] **ADD-10** — Clarify domain terms and notification delivery claims. Status: Not Started.

### Tracking rules

1. **Before work:** change the task status to `In Progress`; add owner, branch, intended files, expected behavior, and date to the progress log.
2. **After each meaningful step:** append a new dated entry to the progress log describing exactly what changed and why. Link commits or PRs when available. Do not replace prior entries.
3. **At review:** mark `In Review`, include verification commands and observed results, plus screenshots/recordings if UI was changed.
4. **Mark `Done` only if:** relevant acceptance criteria are met, backend/frontend integration is tested when applicable, regression tests pass, and the log entry links to the relevant implementation. Then change `[ ]` to `[x]` here.
5. **If blocked:** set `Blocked`, explain the blocker and next action in the log. Do not check the box.
6. **After every completed task:** update completion count, last-reviewed date, and affected task status; never claim a test passed without running it.
7. **Branch consistency:** log changes separately for `frontend` and `backend` with commit hashes for each; note if a deploy or database migration is pending.
8. **Sensitive data:** do not paste credentials, real patient data, BPJS identifiers, access tokens, or medical records in logs/screenshots.

## 10. Progress documentation requirements

Keep an **append-only** Markdown file at project root named `HEALTH_GUARD_PROGRESS_LOG.md`, with one entry per meaningful development change, bug investigation, fix, test run, or release. A log entry must record:

- Timestamp in `Asia/Jakarta` (WIB), author/owner, task IDs, branch(es), status before/after.
- Initial problem, reproduction steps or user feedback, and expected outcome.
- Technical changes and files touched (including DB migrations or API contract changes).
- Commit SHA or pull request link for each branch (or `Not committed`).
- Tests performed: exact commands, observed outcomes, and any tests that were **not** run.
- Before/after screenshots or evidence links for UI changes; remove sensitive information.
- Open risks, backwards compatibility, rollback steps, and next action.

### Copyable entry template

```md
## YYYY-MM-DD HH:mm WIB — [TASK-ID] Short change title

- **Owner:** @username
- **Status:** Not Started → In Progress / In Review / Done / Blocked
- **Branch / commit / PR:** frontend: ... ; backend: ...
- **Problem / user feedback:** ...
- **Goal / acceptance criteria:** ...
- **Implementation:**
  - `path/to/file`: exact change and reason
  - Database/API contract: ... (or None)
- **Verification:**
  - `command`: PASS / FAIL / NOT RUN — observed result
  - Manual reproduction: steps + observed result
- **Evidence:** link to screenshot, log, test report or PR (no sensitive data)
- **Risk / rollback:** ...
- **Known limitations / blockers:** ...
- **Next action:** ...
```

### Suggested development workflow

- Work in small, reviewable commits; reference the task ID in messages (example: `fix(HG-05): ensure unique claim creation`).
- For a task spanning both branches, log the related frontend/backend commits in **one** task entry (and additional chronological updates if needed).
- Prioritize P0 regression checks before field naming or visual UI changes.
- At the end of each session, write a short session summary in the progress log: tasks updated, tests passed/failed, remaining blockers, and next priority.
- At the end of each sprint, summarize changed behavior, test evidence, migration/deployment readiness, and remaining backlog.

## 11. Release gate checklist (repeat for each release)

- [ ] Updated tracker task statuses and completion count.
- [ ] Added a progress log entry for every implemented change.
- [ ] Code reviewed and commit/PR links captured for both branches as applicable.
- [ ] Automated tests executed and actual outcomes documented.
- [ ] Manually verified core claim create/edit/resubmit flow with distinct records.
- [ ] Verified role, privacy, and document access checks.
- [ ] Reviewed migration safety and backup/rollback plan if DB changed.
- [ ] Validated Indonesian/English copy, mobile layout, and number formatting.
- [ ] Updated README/API documentation and recorded open limitations.
