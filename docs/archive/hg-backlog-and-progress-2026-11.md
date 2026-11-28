# Arsip: backlog HG dan log progres (November 2026)

> **Status: HISTORICAL / SUPERSEDED.** Diarsipkan 2026-11-27 saat Stage 0.
> **Sumber kebenaran saat ini:** [`../../README.md`](../../README.md), [`../API.md`](../API.md),
> [`../ADR.md`](../ADR.md), dan untuk temuan fungsional aktif
> [`../HEALTHGUARD_FUNCTIONALITY_AUDIT.md`](../HEALTHGUARD_FUNCTIONALITY_AUDIT.md).
> Jangan membuka ulang tiket di bawah tanpa bukti baru dari kode saat ini.

Dokumen ini menggabungkan dua berkas lama tanpa membuang isinya:

1. **Backlog HG** (asal: `docs/HEALTH_GUARD_IMPROVEMENTS.md`) — 23 tiket `HG-01..HG-13` dan `ADD-01..ADD-10`, ditutup 2026-11-26.
2. **Log progres** (asal: `docs/HEALTH_GUARD_PROGRESS_LOG.md`) — catatan kronologis 2026-11-21 s.d. 2026-11-26.

Keduanya berasal dari satu siklus kerja yang sudah selesai dan digantikan oleh
[`../../IMPROVEMENT.md`](../../IMPROVEMENT.md) (64 tiket, ditutup 26 November 2026) beserta bukti
implementasinya di [`implementation-evidence-2026-11.md`](implementation-evidence-2026-11.md).
Dipertahankan sebagai jejak sejarah: diagnosis bug P0 penimpaan klaim, alasan keputusan lapangan,
dan urutan pekerjaan. Bagian "progress tracker" dan "release gate" di bawah sudah selesai secara
historis dan bukan checklist yang masih harus dijalankan.

**Koreksi yang dicatat saat pengarsipan:** log progres menyebut repository `TMRakaP26/Health_Guard`.
Nama repository yang benar adalah `TMRakaP26/Health-Guard-Claim-Asurance`; URL di Bagian 2 sudah
dikoreksi. Isi lain dibiarkan apa adanya.

---

# Bagian 1 — Backlog HG (asal: `docs/HEALTH_GUARD_IMPROVEMENTS.md`)


**Repository:** `Health-Guard-Claim-Asurance` monorepo (`Health_Guard-frontend/` React + TypeScript + Vite, `Health_Guard-backend/` Laravel + Sanctum + MySQL 8.4). The original `frontend`/`backend` branch split no longer applies.  
**Original baseline of this draft:** two branches (`frontend`, `backend`), SQLite storage and `src/app/pages/*` components. Kept for history only; every current path is in Section 7.  
**Document date:** 2026-11-21 · **Re-audited against code:** 2026-11-26  
**Status:** Implemented — 23/23 tasks verified against the code on 2026-11-26; per-task evidence is in Section 9.
**Tracking:** Maintain the task register in Section 9 and append a dated entry to `HEALTH_GUARD_PROGRESS_LOG.md` after every meaningful change. The checkboxes below are not evidence of implementation until code and tests are verified.

## 1. Objective and implementation rules

Improve Health Guard's claim submission, patient identity, labels, localization, conversation UX, and data integrity. Preserve existing user and claim data. Implement changes in both branches wherever the API contract or database schema changes.

**Priority levels:** P0 = possible data loss/security; P1 = key workflow; P2 = usability/polish.

**Important distinction:** “Nomor BPJS jadi ID user/client” is interpreted as *displaying the application's client/user ID in the place where the BPJS number currently appears*. Do **not** overwrite existing BPJS numbers, replace Laravel's primary key, or assume BPJS numbers are identifiers for authentication. Keep legacy `bpjs_number` intact until a deliberate migration/data policy is approved. A separate human-friendly `client_id` is optional if internal numeric IDs should not be exposed.

**Re-audit note (2026-11-26):** the interface is a server-derived `client_id` (`CL-000123` from `User::clientIdFor()`), never a stored copy and never `bpjs_number`. `users.bpjs_number` and `claims.bpjs_number` remain in the schema and in the profile form, but claim screens show the client ID instead. Every task in this document was checked against the code; the tracker in Section 9 records the file and test that satisfies each acceptance criterion.

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

**Outcome (2026-11-26): resolved.** `ClaimService::create()` allocates the public ID from a per-year `claim_sequences` row locked inside the same transaction, `claims.claim_id` carries a unique index, and the random three-digit suffix described below no longer exists. Create and edit are separate routes (`/claims/new` and `/claims/:id/edit`), so no navigation state can turn a create into an update, and `test_resubmitting_one_claim_never_changes_another_claim` covers the reported symptom. The section below is the original diagnosis and is retained as history.

**Code areas to inspect:**

- `frontend/src/app/pages/ClientClaimForm.tsx` — `editClaim` navigation state, edit/new mode and submit handler.
- `frontend/src/app/state/ClaimContext.tsx` — `addClaim`, `updateClaim`, and list refresh.
- `frontend/src/app/pages/Dashboard.tsx` — record keys, refresh, navigation to edit/new.
- `backend/app/Http/Controllers/ClaimController.php` — `store`, `update`, claim ID creation.
- `backend/database/migrations/*claims*` and `backend/app/Models/Claim.php` — uniqueness, indexes, relationships.

**Known risk spotted in code review (superseded by the outcome above):** `ClaimController::store()` builds a public claim ID using `random_int(0, 999)` and a three-digit suffix (`CLM-YYYY-XXX`). That has only 1,000 possibilities per year and is **collision-prone**. This is a plausible contributor to wrong-record lookups or failed creation, but **not proof** of the reported overwrite. Reproduce the exact issue before claiming root cause.

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

**Current file map (2026-11-26).** The tables below replace the branch-era paths in the original list further down.

| Task | Old path | Current path |
| --- | --- | --- |
| HG-01..05, HG-09..13 | `src/app/pages/ClientClaimForm.tsx` | `Health_Guard-frontend/src/app/portal/ClaimForm.tsx` |
| HG-05, HG-14 | `src/app/state/ClaimContext.tsx` | `portal/ClaimList.tsx` + `shared.tsx` (`useQuery`/`useAction` per-route queries) |
| HG-04, HG-05 | `src/app/pages/Dashboard.tsx` | `portal/ClaimList.tsx` |
| HG-06 | `src/app/components/Header.tsx` | `portal/Shell.tsx` (`.topbar`) |
| HG-06 | `AnalystLayout.tsx`, `Layout.tsx` | `portal/Shell.tsx` (one shell for all three roles) |
| HG-02/03/08, ADD-05 | `src/app/pages/AnalystReview.tsx` | `portal/ClaimDetail.tsx` |
| HG-04, HG-06 | `src/app/i18n/`, `src/app/utils/currency.ts` | `portal/locale.tsx`; `rupiah()` and `MoneyInput` in `portal/shared.tsx` |
| HG-05, ADD-01/02/04/05 | `app/Http/Controllers/ClaimController.php` | `app/Http/Controllers/ClaimController.php`, `app/Services/ClaimService.php`, `app/Policies/ClaimPolicy.php`, `app/Enums/ClaimStatus.php` |

The list below is the original draft and is retained as history.

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

- [x] New claim never overwrites an old claim; unique ID enforced in DB. — `claim_sequences` + unique `claims.claim_id`; `ClaimFlowTest::test_consecutive_claims_get_unique_claim_ids`.
- [x] New/edit actions remain distinct after navigate, refresh and retry. — `/claims/new` POST, `/claims/:id/edit` PUT; no `location.state` mode flag.
- [x] Only authorized users can access/edit their claims, documents and chat messages. — `ClaimPolicy`/`DocumentPolicy`, `SecurityAuthorizationTest`, `SecurityUploadTest`.
- [x] BPJS number is no longer shown as the client's User ID; historical BPJS values preserved. — claim screens render `client_id`; `portal.test.tsx` asserts no BPJS label; `bpjs_number` columns untouched.
- [x] All UI labels use Rumah Sakit / Penyakit / Deskripsi / Chat as intended. — form, list, detail, export headers and both locales.
- [x] All rupiah amounts show grouping dots; API and Excel store numeric values. — `rupiah()` uses `Intl.NumberFormat(id-ID)`; `ClaimList.exportFile` writes amount columns as numeric cells with a `#,##0.00` format; API keeps decimals.
- [x] Language selector is top-right with Logout next to it. — `.topbar` in `portal/Shell.tsx` holds 🇮🇩 ID / 🇬🇧 EN then Sign out.
- [x] Chat works as a messaging interface, with clear authorization and error states. — bubble log, sender/role/time, paging, busy state; `CollaborationController` enforces participation.
- [x] New claim autofills current local service date, profile DOB, name and client ID. — `toLocaleDateString("en-CA")`, `user.date_of_birth`, `user.name`, read-only `clientId`.
- [x] Edit claim keeps previously saved date and personal values correctly. — edit mode loads the claim and never applies today's date.
- [x] Automated tests pass and no existing claims are lost during migration. — backend PHPUnit suites, 33 Vitest tests, typecheck/lint/build green on 2026-11-26; `MigrationAndLifecycleTest` covers import with preserved relationships.

---

> **Developer note:** This document is a specification/backlog rather than a statement that features were already changed. Confirm the semantics of “Penyakit”, the patient-vs-account-owner model, and whether chat already exists before destructive schema changes.


## 9. Live progress tracker (update after every task)

**Overall status:** `Done`  
**Last reviewed:** 2026-11-26 (full code re-audit with frontend verification)  
**Completion:** 23/23 tasks (100%). Every line names the code and the test evidence that satisfies its acceptance criteria.  
**Status vocabulary:** `Not Started` → `In Progress` → `In Review` → `Done`; use `Blocked` when applicable. Check a task only when acceptance criteria and appropriate tests pass.

### P0 — Data integrity and security

- [x] **HG-05** — Fix new claim overwriting existing claim. Status: Done. `ClaimService::create()` allocates from a locked `claim_sequences` row, `claims.claim_id` is unique, create/edit are separate routes, and the submit button is disabled while a request is in flight. Tests: `ClaimFlowTest::test_consecutive_claims_get_unique_claim_ids`, `test_resubmitting_one_claim_never_changes_another_claim`.
- [x] **ADD-01** — Enforce server-side role authorization and restrict analyst registration. Status: Done. `ClaimPolicy`/`DocumentPolicy`, `role:` route middleware, client-only `POST /register`, analysts via admin invitation or `healthguard:create-analyst`. Tests: `SecurityAuthorizationTest`, `SecurityAuthTest`.
- [x] **ADD-02** — Enforce claim resubmission eligibility and ownership. Status: Done. `ClaimPolicy::update()` (owner only), `ClaimStatus::canResubmit()`, and a paid-claim guard in `ClaimService::resubmit()`. Tests: `ValidationBoundaryTest`, `SecurityAuthorizationTest`.

### P1 — Data fields, form, messaging, and quality

- [x] **HG-01** — Show User ID / Client ID in place of BPJS number, preserving historical values. Status: Done. `User::clientIdFor()` → `CL-%06d`; exposed by `UserResource`/`ClaimResource`; read-only field in step 1, detail and list. Payload `user_id`/`client_id` are ignored. Tests: `test_claim_exposes_server_derived_client_id_and_disease_fields`, `test_user_endpoint_exposes_derived_client_id`, `portal.test.tsx` BPJS assertions.
- [x] **HG-02** — Rename Provider to Rumah Sakit / Hospital. Status: Done. Labels in form, list column, detail and the CSV `Hospital` header; API key stays `provider_name`.
- [x] **HG-03** — Rename Kategori to Penyakit / Disease with correct data semantics. Status: Done. Migration `2026_11_21_000000_add_claim_disease_and_description.php` adds `disease_name`; legacy `type` stays as Jenis layanan/service category and a legacy hint explains missing disease data.
- [x] **HG-04** — Format currency with separators while storing numeric values. Status: Done. `rupiah()` uses `Intl.NumberFormat(id-ID)`; `MoneyInput` normalises typed dots/commas before the payload; XLSX export now writes amount columns as numeric cells with a `#,##0.00` format (`portal/ClaimList.tsx`). Test: `groups thousands while typing an amount`.
- [x] **HG-07** — Rename Percakapan to Chat. Status: Done. Navigation, panel heading, aria labels and pager use Chat; no `Percakapan` string remains in `src/`.
- [x] **HG-08** — Implement messaging-style chat UI with permission checks. Status: Done. `.chat-log`/`.chat-message.mine|theirs`/`.chat-bubble` styles, sender + role + timestamp, scroll to latest, multiline textarea (Enter sends, Shift+Enter newline), busy/error states, paging, `FEATURE_MESSAGES` flag, `CollaborationController` authorization. Test: `renders hospital, disease, description and modern chat bubbles`.
- [x] **HG-10** — Autofill service date correctly and persist it. Status: Done. Default `toLocaleDateString("en-CA")` (local calendar date, no UTC shift), `max=today`, edit mode loads the saved `service_date`; persisted via `claims.service_date`.
- [x] **HG-11** — Autofill date of birth from profile. Status: Done. Prefilled from `user.date_of_birth`; blank field plus profile hint when unset; `date:Y-m-d` cast avoids timezone day shift.
- [x] **HG-12** — Autofill name from authenticated profile. Status: Done. `client_name` prefill with source hint; ownership always comes from the authenticated user (`ClaimService::create()` ignores a supplied `user_id`).
- [x] **HG-13** — Autofill read-only client/user ID from server. Status: Done. Read-only `client_id` from `/api/user`, repeated in the review step and detail page; never sent in a claim payload.
- [x] **ADD-03** — Add claim history / audit log. Status: Done. Immutable `claim_histories`, `GET /claims/{id}/history`, timeline UI, `healthguard:backfill-claim-history`. Tests: `ProductWorkflowsTest` history cases, `portal.test.tsx` history states.
- [x] **ADD-04** — Make assignment updates concurrency-safe. Status: Done. `lockForUpdate()` plus a conditional `whereNull('assigned_to')` update; the loser gets `409`. Tests: `ClaimFlowTest::test_claim_cannot_be_assigned_twice`, `SecurityAuthorizationTest` double-assign.
- [x] **ADD-05** — Validate partial approval amounts. Status: Done. `ClaimDecisionRequest` + re-validation in `ClaimService::decide()` after the lock: partial must be `> 0` and `<= amount`, Approved copies the full amount, other statuses clear it. Tests: `ValidationBoundaryTest`, `ClaimFlowTest` decision cases.
- [x] **ADD-06** — Strengthen medical-data privacy and document access safeguards. Status: Done. Private disk, `SafeUpload` MIME/extension/size rules, policy-checked download with `no-store`, retention policy/commands, backup scripts. Tests: `SecurityUploadTest`, `docs/RETENTION.md`.
- [x] **ADD-07** — Synchronize API docs and implementation. Status: Done. `docs/API.md` documents `POST /claims/{id}/assign` and the response shapes; README/ADR match the code.
- [x] **ADD-08** — Add automated tests and CI. Status: Done. PHPUnit feature suites + Pint, 33 Vitest tests, 5 cookie-security tests, Playwright + axe, `.github/workflows/ci.yml` (SQLite, MySQL, frontend, E2E, Docker).

### P2 — UX and polish

- [x] **HG-06** — Move flag/language selector next to Logout in right header. Status: Done. `.topbar` in `portal/Shell.tsx` renders 🇮🇩 ID / 🇬🇧 EN (`aria-pressed`, text labels) then Sign out, for every role; preference persisted in `localStorage.locale`; kept visible at mobile widths via the `@media (max-width: 850px)` `.topbar` rules.
- [x] **HG-09** — Rename Catatan Reimbursement to Deskripsi / Description. Status: Done. Dedicated `claims.description` column kept separate from the analyst `notes`; rendered in form step 2, review and detail.
- [x] **ADD-09** — Improve accessibility, responsive behavior, and UX feedback. Status: Done. Field errors + focus on first invalid input, step-heading focus, `useBlocker` unsaved-changes dialog, named pagers, mobile drawer, axe assertions in `tests/e2e`.
- [x] **ADD-10** — Clarify domain terms and notification delivery claims. Status: Done. Notifications documented as 30 s polling with opt-in SSE (ADR); patient (`client_name`), account owner (`user_id`/`client_id`), analyst `notes` and claim `description` are distinct fields everywhere.

### Known deviations

- `claim_messages` has no read-state column, so there are no read receipts; chat relies on chronological paging, reload after send and the 30 s notification poll. This was a suggestion in Section 4, not an HG-08 acceptance criterion.
- `bpjs_number` is retained in `users` and `claims` and still editable on the profile page, because the requirement was to stop using it as the client identity — not to delete history.
- `provider_name` and `type` remain the API keys; only the UI labels and export headers changed.

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

**Status:** completed for the 2026-11-26 Azure deployment at SHA `70ac58d`. Each line names the evidence; repeat the list for the next release.

- [x] Updated tracker task statuses and completion count. — Section 9 reads 23/23 `Done`.
- [x] Added a progress log entry for every implemented change. — `HEALTH_GUARD_PROGRESS_LOG.md` carries entries for `38f18b7`, `70ac58d` and the verification session.
- [x] Code reviewed and commit/PR links captured for both branches as applicable. — single `main` branch: `38f18b7` (HG-04 numeric export + tracker) and `70ac58d` (auth status codes); no PRs were used.
- [x] Automated tests executed and actual outcomes documented. — on the VM at `70ac58d`: PHPUnit 170 tests / 864 assertions (SQLite) and 170 / 879 (MySQL), Pint pass, Vitest 33/33, Playwright 9/9, typecheck, lint, build.
- [x] Manually verified core claim create/edit/resubmit flow with distinct records. — CLM-2026-008 created, assigned, partially approved and paid; CLM-2026-009 created, set to Needs Info, edited in the UI and resubmitted to Pending while 008 kept its own state and history.
- [x] Verified role, privacy, and document access checks. — anonymous document download and API calls return 401 JSON, `/storage/documents/*` 404, other clients' claims 404, disallowed upload 422, role matrix covered by `SecurityAuthorizationTest`.
- [x] Reviewed migration safety and backup/rollback plan if DB changed. — no schema change in this work; the MySQL run used a throwaway `healthguard_test` database created and dropped on the VM, so production data needed no rollback.
- [x] Validated Indonesian/English copy, mobile layout, and number formatting. — English pass at 390×762 (no page-level overflow; the table scrolls inside `.table-wrap`), ID/EN switch kept typed form values, `Rp 1.500.000` grouping in form, review, list, detail and export.
- [x] Updated README/API documentation and recorded open limitations. — `docs/API.md` already specified 401 for unauthenticated calls and now matches the code; limitations are recorded in Section 9 (deviations) and below.

---

# Bagian 2 — Log progres (asal: `docs/HEALTH_GUARD_PROGRESS_LOG.md`)


**Repository:** https://github.com/TMRakaP26/Health-Guard-Claim-Asurance  
**Purpose:** Chronological, append-only record of task progress, code changes, tests, blockers, and releases.  
**Timezone:** Asia/Jakarta (WIB)  
**Source of tasks:** Bagian 1 dokumen ini, Section 9.

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
