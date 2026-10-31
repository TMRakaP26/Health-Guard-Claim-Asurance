# HealthGuard — Improvement & Execution Plan

> **Audience:** implementation agents working on this repository.
>
> **Baseline:** repository state at commit `cd329e0` (`main`, clean).
>
> **Preparation note:** this document was produced by reading the repository only. Docker was **not** launched. Implementation agents are expected to run the verification commands listed here after making changes.
>
> **Product name:** HealthGuard. **Repo name:** `Health-Guard-Claim-Asurance`.

---

## 1. How to use this document

1. Read sections 2–4 first so you understand the current system before changing it.
2. Execute workstreams in the order shown in section 6. Security work comes before feature work.
3. Treat each work item ID (`SEC-01`, `DB-01`, `HIST-01`, etc.) as a ticket. One PR should normally cover one ticket or a small group of related tickets.
4. Every ticket has acceptance criteria. Do not mark it complete until those criteria and the relevant tests pass.
5. Use Laravel migrations for schema changes. Never edit a database by hand.
6. Keep the existing API status strings exactly: `Pending`, `Approved`, `Rejected`, `Needs Info`, `Partially Approved`.
7. Do not copy code from `Health_Guard-frontend/_gen/`. It is a stale copy of backend PHP and is excluded from the frontend Docker build.
8. Update the docs affected by a change (`README.md`, `DOCKER.md`, frontend/backend READMEs) in the same PR.
9. Do not commit secrets, `.env` files, database dumps, or uploaded files.

---

## 2. Current project map

### 2.1 Repository layout

```text
Health-Guard-Claim-Asurance/
├── README.md                         # main project guide and stakeholder workflow
├── DOCKER.md                         # Docker operations
├── compose.yaml                      # backend + frontend, SQLite volume
├── auto-sync.ps1                     # optional git auto-sync watcher
├── docker/smoke.php                  # HTTP integration smoke test
├── Health_Guard-frontend/
│   ├── src/app/api/client.ts         # Axios base client and 401 handling
│   ├── src/app/state/AuthContext.tsx # user, token, login/register/logout
│   ├── src/app/state/ClaimContext.tsx# claim list, status update, resubmit
│   ├── src/app/pages/                # 12 page components
│   ├── src/app/components/           # layout, sidebar, header, notifications
│   ├── src/app/components/ui/        # mostly unused shadcn/Radix scaffolding
│   ├── src/app/utils/cookies.ts      # Quick Sign In cookie storage
│   ├── src/styles/                   # Tailwind and custom login CSS
│   ├── _gen/                         # STALE copy of backend PHP; not runtime code
│   ├── docker/default.conf           # Nginx SPA + /api + /storage proxy
│   └── Dockerfile                    # Node 22 build -> Nginx alpine
└── Health_Guard-backend/
    ├── app/Http/Controllers/         # Auth, Claim, Document, Notification
    ├── app/Http/Middleware/          # RoleMiddleware (registered but unused)
    ├── app/Models/                   # User, Claim, Document, Notification
    ├── routes/api.php                # all API routes
    ├── database/migrations/          # 15 migrations
    ├── database/seeders/             # non-idempotent demo data
    ├── tests/                        # PHPUnit feature and unit tests
    ├── docker/                       # Apache, PHP upload limits, entrypoint
    └── Dockerfile                    # PHP 8.4 + Apache
```

### 2.2 Current runtime topology

```text
Browser
  |
  v
Nginx frontend container :8080 (bound to 127.0.0.1)
  |-- /            -> React SPA static files
  |-- /api/*       -> backend:80 (Apache + Laravel)
  |-- /storage/*   -> backend:80 (public disk files)
  |
  v
Backend container
  |-- SQLite file  -> named volume healthguard_database
  |-- app.key      -> same volume
  |-- uploads      -> named volume healthguard_storage
```

The backend port is not published. The frontend waits for the backend `/up` healthcheck. The backend starts Apache after generating an app key, creating SQLite, running migrations, and creating the storage symlink.

### 2.3 Roles and workflow

**Client:**
register/login -> submit claim + upload documents -> track status -> resubmit when `Rejected` or `Partially Approved`.

**Analyst:**
login -> view unassigned `Pending` claims -> assign one to self -> review documents -> set status/notes/approved amount -> client is notified.

**Notifications:** database records only. The frontend polls the unread count every 30 seconds. There is no WebSocket or email delivery.

### 2.4 Current API surface

| Area | Endpoints |
|---|---|
| Auth | `POST /api/register`, `POST /api/login`, `POST /api/logout`, `GET/PUT /api/user` |
| Profile photo | `POST/DELETE /api/user/photo` |
| Demo | `GET /api/demo-users` (public) |
| Claims | `GET/POST /api/claims`, `GET/PUT /api/claims/{claimId}`, `PATCH /api/claims/{claimId}/status` |
| Assignment | `GET /api/claims/unassigned`, `GET /api/claims/my-assignments`, `POST /api/claims/{claimId}/assign` |
| Documents | `GET/POST /api/claims/{claimId}/documents`, `GET /api/claims/{claimId}/documents/{documentId}/download` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` |

Claim URLs use the public ID (`CLM-YYYY-NNN`). Document relationships use the numeric `claims.id`.

### 2.5 Current data model

| Table | Important columns | Notes |
|---|---|---|
| `users` | name, username, email, password, role, phone, address, profile_photo, date_of_birth, bpjs_number | role is `client` or `analyst` |
| `claims` | id, claim_id, user_id, assigned_to, client_name, provider_name, type, amount, approved_amount, status, notes, date_submitted, bpjs_number | current state only; no history |
| `documents` | id, claim_id (numeric FK), file_name, file_path, file_size, mime_type | files stored on the public disk |
| `notifications` | id, user_id, type, title, body, claim_id (string), is_read | internal polling only |

### 2.6 Current tests and operations

- Backend: PHPUnit 12 with SQLite `:memory:`; 4 auth tests, 7 claim-flow tests, plus 2 scaffold tests.
- Frontend: `npm run build` only; no lint, typecheck, unit-test, or E2E scripts.
- Integration: `docker/smoke.php` covers SPA routing, auth, claim creation, document upload/download, public storage access, notifications, and logout.
- CI/CD: none.
- Deployment: `docker compose up -d --build --wait`; optional one-time `db:seed --force`.

---

## 3. Assessment

### 3.1 What is good

| Area | Strength |
|---|---|
| Product scope | Clear two-role workflow with a real end-to-end claim lifecycle. |
| Architecture | Clean frontend/backend separation and a single API origin through Nginx. |
| Auth | Sanctum bearer tokens; protected routes; Axios interceptor clears stale auth on `401`. |
| Claim IDs | Human-readable `CLM-YYYY-NNN` format with retry handling for unique-constraint races. |
| Docker | Reproducible build; healthchecks; named volumes; automatic key generation/migrations; frontend waits for backend health. |
| Documentation | Root README is unusually detailed and honest about limitations. |
| Tests | Core claim assignment/status/resubmission rules already have feature tests. |
| UX foundation | Consistent Tailwind styling, functional document viewer, notification bell, responsive login/register screens. |
| Operational safety | Backend port not exposed; bind address restricted to loopback. |
| Data cleanup in smoke test | Smoke test removes the records it creates. |

### 3.2 What is bad / risk register

| ID | Area | Issue | Impact | Evidence |
|---|---|---|---|---|
| BAD-01 | Security | Quick Sign In stores plaintext passwords in a JavaScript-readable cookie. | Any XSS or shared-device access exposes credentials. | `src/app/utils/cookies.ts`, `AuthContext.tsx` |
| BAD-02 | Security | `GET /api/demo-users` is public and returns every user's name, email, and role. | PII/account enumeration. | `routes/api.php`, `AuthController::demoUsers` |
| BAD-03 | Security | Public registration accepts `role=analyst`. | Anyone can create an analyst account. | `AuthController::register` |
| BAD-04 | Authorization | `GET /api/claims/unassigned` and `GET /api/claims/my-assignments` do not check analyst role. | Any authenticated client can read the unassigned queue. | `ClaimController::unassigned`, `myAssignments` |
| BAD-05 | Authorization | `PATCH /claims/{id}/status` checks role but not assignment. | Any analyst can decide another analyst's claim. | `ClaimController::updateStatus` |
| BAD-06 | Privacy | Documents live on the public disk and are reachable at `/storage/{path}` without a bearer token. | Anyone with a URL can read claim documents. | `DocumentController`, `filesystems.php`, Nginx `/storage/` |
| BAD-07 | Data model | Claims only store current state; no status transition or resubmission history exists. | Users and analysts cannot audit what happened. | `claims` table, `ClaimController` |
| BAD-08 | Data model | Resubmission resets status/approved amount but leaves old notes and assignment. Frontend clears notes only locally. | Confusing stale notes and "Pending but assigned" claims. | `ClaimController::update`, `ClaimContext.tsx` |
| BAD-09 | Data integrity | Assignment uses check-then-update without a transaction/lock. | Two analysts can race and overwrite assignment. | `ClaimController::assign` |
| BAD-10 | Data integrity | Claim creation and document uploads are separate requests. Upload failures do not stop navigation. | Claims can exist without their required documents. | `ClientClaimForm.tsx` |
| BAD-11 | Validation | API accepts `amount >= 0` while UI requires `> 0`; no max amount; partial approval amount is nullable and can exceed billed amount. | Inconsistent rules and invalid financial data. | `ClaimController` |
| BAD-12 | Validation | No Form Requests/policies; validation and authorization are inline and inconsistent. | Hard to maintain and easy to bypass. | controllers |
| BAD-13 | UX | Analyst review reads only `ClaimContext`; direct refresh/deep link shows "Claim not found". | Broken links and poor analyst experience. | `AnalystReview.tsx` |
| BAD-14 | UX | Only the first 20 claims are loaded; pagination is decorative/absent; dashboard metrics are page-local. | Misleading counts and inaccessible older claims. | `ClaimContext.tsx`, dashboards |
| BAD-15 | UX | Client dashboard has a non-functional second search input and a dead filter button; stats include a hardcoded `+12%`. | Confusing and untrustworthy UI. | `Dashboard.tsx` |
| BAD-16 | UX | `Needs Info` has no resubmit action in the client dashboard. | Workflow dead end. | `Dashboard.tsx` |
| BAD-17 | UX | Client profile shows hardcoded address/insurance data; no DOB/BPJS/photo editing UI. | Cannot maintain real profile data. | `Profile.tsx` |
| BAD-18 | UX | Service date and DOB are collected in the claim form but never sent to the API. | Data loss and repeated entry. | `ClientClaimForm.tsx`, `ClaimController` |
| BAD-19 | UX | Notifications for clients do not navigate anywhere; only analysts navigate to review. | Client must manually search for the claim. | `NotificationBell.tsx` |
| BAD-20 | UX | No success toasts, retry actions, skeletons, or consistent error states. | Poor feedback on long operations. | pages |
| BAD-21 | Testing | No document, notification, authorization-matrix, validation-boundary, or frontend tests. | Regressions are likely. | `tests/` |
| BAD-22 | Frontend hygiene | Most `components/ui/*` files and several dependencies are unused Figma/shadcn scaffolding. | Confusing codebase, larger install surface. | `package.json`, `components/ui` |
| BAD-23 | Docs | READMEs claim behavior the code does not implement (real-time notifications, demo-users-driven quick sign-in, client Excel export, role middleware usage). | Misleads maintainers and testers. | READMEs vs. code |
| BAD-24 | Operations | SQLite shares a volume with the app key; no separate DB service, no DB backup procedure. | Poor production scalability, backup, and recovery story. | `compose.yaml`, `entrypoint.sh` |
| BAD-25 | Security | No explicit rate limiting or token expiration; password change does not revoke existing tokens. | Brute force/session risk. | auth config/routes |

### 3.3 Documentation drift to correct while implementing

- Frontend README says Quick Sign In is based on `/api/demo-users`; the UI uses a local cookie and never calls that endpoint.
- Frontend README calls notifications "real-time"; they are 30-second polling.
- Frontend README lists Excel export for clients; only the analyst dashboard implements export.
- Backend README describes `RoleMiddleware` as used; it is registered but no route uses it.
- Backend README says clients can resubmit `Needs Info`; the UI only offers resubmit for `Rejected` and `Partially Approved`.
- `DOCKER.md` references `C:\RAKA\Healtguard`, which is not this workspace path.

---

## 4. Target state

```text
Browser
  |
  v
Nginx frontend container :8080
  |-- /            -> React SPA
  |-- /api/*       -> backend:80
  |-- /storage/*   -> public profile photos only (or remove entirely)
  |
  v
Backend container (PHP 8.4 + Apache)
  |-- appdata volume: APP_KEY only
  |-- storage volume: private documents + public profile photos
  |
  v
MySQL 8.4 container
  |-- dbdata volume
  |-- healthcheck
```

Target qualities:

- Every mutating action records an immutable history event.
- Clients can read only their own data; analysts can read/decide only what they are allowed to.
- Documents are private by default and served through authenticated endpoints.
- Backend and database scale and restart independently.
- The frontend has real loading/error/empty states, working pagination/search/filters, and a persistent claim detail route.
- Test suites cover user capabilities, validation boundaries, and authorization failures.
- CI runs backend tests, frontend typecheck/lint/unit tests, build, and E2E smoke tests.
- Documentation matches the implementation.

---

## 5. Workstreams

## 5.1 P0 — Security and authorization hardening

### SEC-01 — Remove plaintext passwords from Quick Sign In

**Files:** `src/app/utils/cookies.ts`, `src/app/state/AuthContext.tsx`, `src/app/pages/Login.tsx`

**Change:**
- Remove `password` from `QuickUser` and from the cookie payload.
- Store only `name`, `email`, and `role` (or a server-issued refresh token if a real "remember me" feature is designed).
- On Quick Sign In, prefill the email and require the password, or replace the feature with a normal credential manager-friendly login form.
- Migrate/clean existing `hg_quick_user` cookies on load so old password-bearing cookies are discarded.

**Acceptance criteria:**
- No password appears in `document.cookie`, localStorage, or sessionStorage.
- Login still works normally.
- Existing quick-user cookies are safely ignored/removed.
- Add a unit test for cookie serialization/deserialization.

### SEC-02 — Restrict or remove `GET /api/demo-users`

**Files:** `routes/api.php`, `AuthController.php`, docs

**Change:**
- The frontend does not use this endpoint. Remove it, or gate it behind `app()->environment('local')` plus an analyst/admin check.
- Never expose emails/roles publicly in production.

**Acceptance criteria:**
- Unauthenticated/non-authorized calls return `403` or `404`.
- No public user PII is returned in production.
- Update README/backend docs.

### SEC-03 — Close public analyst registration

**Files:** `AuthController::register`, `Register.tsx`, seeder/console commands, tests

**Change:**
- Public registration always creates `client`; ignore or reject a supplied `role`.
- Provide a trusted way to create analysts: artisan command (recommended, e.g. `php artisan healthguard:create-analyst`), seeder for demos, or a future admin flow.
- Update API documentation and tests.

**Acceptance criteria:**
- `POST /api/register` with `role=analyst` cannot create an analyst.
- A trusted command can create an analyst.
- Existing demo seeder still works.

### SEC-04 — Enforce role and ownership policies consistently

**Files:** `app/Policies/`, `app/Providers/AppServiceProvider.php`, `ClaimController`, `DocumentController`, `routes/api.php`, tests

**Change:**
- Create `ClaimPolicy` and `DocumentPolicy` (or equivalent gates) covering: view, update, assign, decide, upload document, download document, view history.
- Required rules:
  - Client: only own claims/documents.
  - Analyst: list all claims; review only assigned claims for decisions; assignment only for `Pending` and unassigned claims.
  - `unassigned` and `my-assignments`: analyst only.
  - A claim owner cannot call analyst-only endpoints.
- Prefer route middleware for role gates and policies for per-record authorization.
- If the product wants any analyst to decide any claim, document that decision explicitly and test it; the recommended default is assigned-analyst-only.

**Acceptance criteria:**
- Authorization matrix in section 5.4 passes.
- No controller relies solely on `isClient()` checks for critical mutations.
- 403/404 responses are consistent and JSON for `/api/*`.

### SEC-05 — Make claim documents private

**Files:** `DocumentController.php`, `filesystems.php`, `compose.yaml`, Nginx config, `AnalystReview.tsx`, tests

**Change:**
- Move new documents to a private disk (for example `storage/app/private/documents`).
- Serve downloads through the authenticated `download` endpoint.
- For previews, fetch the file with the bearer token and create a browser blob URL, or implement short-lived signed URLs.
- Restrict legacy `/storage/documents/*` exposure; profile photos may remain public if desired.
- Provide a migration/console command to move existing document files from the public disk to the private disk and update `file_path`.

**Acceptance criteria:**
- Unauthenticated direct access to a document path is denied.
- Claim owner and authorized analyst can preview/download.
- Existing documents are migrated without breaking paths.
- Tests cover allowed/denied access.

### SEC-06 — Add rate limiting and token lifecycle

**Files:** `bootstrap/app.php`, `config/sanctum.php`, `AuthController`, tests

**Change:**
- Add throttling to login/register (for example `throttle:5,1` or a named limiter) and sensible API throttling.
- Set a Sanctum token expiration policy or document why tokens are long-lived.
- Revoke all tokens on password change.
- Consider revoking the current token on logout only (already implemented) and add "logout all devices" later.

**Acceptance criteria:**
- Repeated bad logins return `429`.
- Password change invalidates old tokens.
- Tests cover throttling and revocation.

### SEC-07 — Harden file validation

**Files:** `DocumentController`, `AuthController::uploadProfilePhoto`, tests

**Change:**
- Validate MIME type and extension; reject mismatches and zero-byte files.
- Keep limits: documents 10 MB, profile photo 2 MB.
- Store files with generated names (Laravel's `store()` already does this); never trust the original name for paths.
- Optionally scan images with `getimagesize` and reject decompression-bomb dimensions.
- Add per-claim document count limit if needed.

**Acceptance criteria:**
- Disallowed type, oversized file, empty file, and spoofed MIME all return `422`.
- Valid files still upload.
- Tests cover each boundary.

### SEC-08 — Add security notes and remove risky demo behavior

**Files:** docs, seeders, compose

**Change:**
- Document that demo credentials are for local use only.
- Do not run demo seeders automatically in production.
- Ensure `APP_DEBUG=false` and no stack traces leak in production.
- Add a short security section to README.

**Acceptance criteria:**
- Docs clearly separate demo/local and production behavior.

---

## 5.2 P1 — Separate backend and database containers

**Decision:** use **MySQL 8.4** as the database service. The existing MySQL-specific migration (`fix_claims_status_column_to_support_partially_approved`) already anticipates MySQL. If the team prefers MariaDB/PostgreSQL, make that decision before starting and adapt the tickets consistently.

### DB-01 — Add `pdo_mysql` to the backend image

**Files:** `Health_Guard-backend/Dockerfile`

**Change:**
- Add `pdo_mysql` to `docker-php-ext-install` (keep `pdo_sqlite` for tests).
- Rebuild and verify `php -m` includes `pdo_mysql`.

**Acceptance criteria:**
- Backend image starts with MySQL connectivity.
- PHPUnit still works with SQLite `:memory:`.

### DB-02 — Add the database service to Compose

**Files:** `compose.yaml`, `.env.example`, docs

**Change:**
- Add a `db` service using `mysql:8.4` with `dbdata:/var/lib/mysql`.
- Add a MySQL healthcheck (`mysqladmin ping`) with adequate start period/retries.
- Make `backend.depends_on.db` use `condition: service_healthy`.
- Set backend environment: `DB_CONNECTION=mysql`, `DB_HOST=db`, `DB_PORT=3306`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.
- Use environment variables for credentials. Provide safe local defaults in `.env.example` but document that production must override them.
- Keep the backend internal; do not publish the DB port to the host.

**Acceptance criteria:**
- `docker compose up -d --build --wait` reports backend and frontend healthy and `db` healthy.
- No MySQL port is published.
- `docker compose down` followed by `up` preserves data in `dbdata`.
- Credentials come from environment, not hardcoded source.

### DB-03 — Move app key/persistence out of the database volume

**Files:** `Health_Guard-backend/docker/entrypoint.sh`, `compose.yaml`

**Change:**
- Stop creating/touching SQLite in the entrypoint.
- Keep `APP_KEY` in a dedicated `appdata` volume (for example `/var/www/appdata/app.key`) so it survives backend rebuilds.
- Keep uploads in `healthguard_storage`.
- Remove the old `healthguard_database` volume usage for SQLite, or rename/retire it with a documented migration step.

**Acceptance criteria:**
- Restarting backend does not generate a new `APP_KEY`.
- DB data survives `docker compose down` and `up`.
- No `database.sqlite` is created in production.

### DB-04 — Make migrations MySQL-safe and add an import path

**Files:** migrations, `database/`, docs, possibly a console command

**Change:**
- Run `php artisan migrate:fresh --force` against MySQL in a disposable test environment.
- Confirm the status enum migration converts to `VARCHAR(50)` before `Partially Approved` is used.
- Confirm decimal precision, unique indexes, foreign keys, and cascade behavior.
- The existing SQLite volume cannot be mounted into MySQL. Provide one of:
  - a documented "fresh dev database" path for disposable local data, or
  - a one-off `healthguard:import-sqlite` artisan command that reads the old SQLite file and inserts users, claims, documents, and notifications into MySQL.
- Prefer the import command for any environment where data must be preserved.

**Acceptance criteria:**
- Fresh MySQL migration succeeds.
- Seeder succeeds once.
- Existing data import is tested on a copy, not production.
- `php artisan test` still uses SQLite memory and passes.

### DB-05 — Update Docker documentation and backups

**Files:** `DOCKER.md`, `README.md`, `.env.example`

**Change:**
- Document the new topology and volumes.
- Add backup/restore commands for MySQL (`mysqldump`, volume snapshot).
- Document which volumes must be preserved and which can be recreated.
- State clearly that `docker compose down -v` destroys data.

**Acceptance criteria:**
- A new developer can start, seed, back up, restore, and reset the project using only the docs.
- README architecture diagram and project structure match Compose.

---

## 5.3 P1 — Claim history / audit trail

This is a core requested feature: a user must be able to see the historical data for every claim, not just its current status.

### HIST-01 — Add the `claim_histories` schema and model

**Files:** new migration, `app/Models/ClaimHistory.php`, `Claim.php`

**Schema:**

```text
claim_histories
  id                 bigint PK
  claim_id           FK -> claims.id, cascade on delete, indexed
  actor_id           FK -> users.id, nullable, null on delete
  event              string(50)          # submitted, assigned, status_changed, resubmitted,
                                          # document_uploaded, document_deleted
  from_status        string(50) nullable
  to_status          string(50) nullable
  notes              text nullable
  approved_amount    decimal(10,2) nullable
  metadata           json nullable       # e.g. assigned_to, file name, old values
  created_at         timestamp
  updated_at         timestamp
```

Indexes: `(claim_id, created_at)`, `(actor_id)`, `(event)` if filtering is needed.

**Model:**
- `ClaimHistory` with fillable fields, `actor()` and `claim()` relations.
- `Claim::histories()` ordered by `created_at`.

**Acceptance criteria:**
- Migration runs on SQLite and MySQL.
- A claim can have many history rows.
- Deleting a claim cascades its history; deleting an actor preserves history with a null actor.

### HIST-02 — Record events centrally

**Files:** `app/Services/ClaimHistoryService.php` (new), `ClaimController`, `DocumentController`, tests

**Events to record:**

| Action | Event | from_status | to_status | Metadata |
|---|---|---|---|---|
| Create claim | `submitted` | null | `Pending` | claim snapshot/amount |
| Analyst assigns | `assigned` | current | current | `assigned_to` user ID/name |
| Analyst changes status | `status_changed` | old status | new status | notes, approved amount |
| Client resubmits | `resubmitted` | old status | `Pending` | old notes old approved amount |
| Document uploaded | `document_uploaded` | current | current | document ID/file name |
| Document removed (future feature) | `document_deleted` | current | current | document ID/file name |

**Implementation rules:**
- A single `record()` method accepts claim, actor, event, from/to, notes, approved amount, metadata.
- Wrap the claim mutation and history insert in `DB::transaction`.
- Use `lockForUpdate()` for assignment and any read-modify-write status transition.
- Do not record a history row when the update is a no-op; either skip or record explicitly with a clear event.
- Notifications can remain in the same transaction; if notification delivery becomes asynchronous later, history must still be committed with the claim.

**Acceptance criteria:**
- Every create/assign/status/resubmit/upload action produces exactly one history row.
- Failed requests do not leave orphan history rows.
- Concurrent assignment attempts cannot both succeed.

### HIST-03 — Add the history API

**Files:** `routes/api.php`, `ClaimController` or `ClaimHistoryController`, new `ClaimHistoryResource`, policy

**Endpoint:**

```http
GET /api/claims/{claimId}/history?per_page=50&page=1
Authorization: Bearer <token>
```

**Rules:**
- Client: only the owner of the claim.
- Analyst: any claim they are allowed to review (recommended: assigned claims; if the policy allows all analysts to view, be explicit).
- Paginate with a sensible max (for example 100).
- Return newest-first by default, with an optional `order=asc`.

**Response shape (example):**

```json
{
  "data": [
    {
      "id": 12,
      "event": "status_changed",
      "from_status": "Pending",
      "to_status": "Partially Approved",
      "notes": "Only the room charge is covered.",
      "approved_amount": "450.00",
      "actor": { "id": 2, "name": "Sarah Analyst", "role": "analyst" },
      "created_at": "2026-10-29T10:30:00Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 3 }
}
```

**Acceptance criteria:**
- Owner and authorized analyst can read history.
- Other clients and unauthorized analysts get `403`.
- Invalid claim ID returns `404`.
- History is ordered deterministically and paginated.

### HIST-04 — Backfill history for existing claims

**Files:** migration or `app/Console/Commands/BackfillClaimHistory.php`, docs

**Change:**
- Insert one `submitted` history row per existing claim, using the claim owner as actor and `claims.date_submitted` as `created_at`.
- Add a later `migrated_snapshot` or similar event if useful; do not invent decisions that never happened.
- Make the backfill idempotent (do not duplicate rows if rerun).

**Acceptance criteria:**
- Existing claims show at least a "submitted" event after migration.
- Running the command twice does not duplicate rows.
- Backfill is documented in the upgrade notes.

### HIST-05 — Client history UI

**Files:** `Dashboard.tsx`, a new claim detail component/page, `ClaimContext` or a new history hook, API client

**Change:**
- When a client opens a claim, fetch `GET /api/claims/{claimId}/history`.
- Add a "History" tab/section in the claim detail modal or a dedicated claim detail page.
- Render a chronological timeline:
  - Submitted
  - Assigned to an analyst
  - Status changed (with from/to badges)
  - Resubmitted
  - Documents uploaded
- Show actor name/role when appropriate, timestamp, notes, and approved amount.
- Show an empty state for legacy claims with no history.
- Add loading, error, and retry states.
- Add a "Claim history" list view with filters if the product wants a full archive; otherwise the per-claim timeline is the minimum.

**Acceptance criteria:**
- Client sees their own claim timeline; another client cannot load it.
- New actions appear after refresh and after a successful mutation (refetch or optimistic update).
- Timeline is readable on mobile widths.
- Existing claim detail information remains available.

### HIST-06 — Analyst history UI and tests

**Files:** `AnalystReview.tsx`, tests

**Change:**
- Fetch and show the same timeline in the review screen, near the decision panel.
- Highlight the current status and who made the last decision.
- After submitting a decision, refresh the timeline.
- Add feature/component/E2E tests for the history flow.

**Acceptance criteria:**
- Analyst sees history for the claim under review.
- A decision immediately adds a visible status-change event.
- History is not editable from the UI.

---

## 5.4 P1 — User capability and input validation tests

The goal is to prove what each user can and cannot do, not only to test happy paths.

### TEST-01 — Backend capability/authorization test matrix

**Files:** `tests/Feature/` (new files), factories/helpers

Create tests for every row in this matrix. Use `Sanctum::actingAs()` or real tokens consistently.

| Action | Unauthenticated | Client (owner) | Client (other) | Analyst (assigned) | Analyst (other) |
|---|---|---|---|---|---|
| List claims | 401 | own only | own only | all | all |
| View claim | 401 | allow | 403 | allow | allow if view policy permits |
| Create claim | 401 | allow | allow | deny/decide | deny/decide |
| Update/resubmit claim | 401 | allow | 403 | deny | deny |
| Assign claim | 401 | deny | deny | allow if unassigned | allow if unassigned |
| Change status | 401 | deny | deny | allow | deny (recommended) |
| List documents | 401 | own | 403 | allow | allow if view policy permits |
| Upload document | 401 | own | 403 | deny | deny |
| Download document | 401 | own | 403 | allow | allow if view policy permits |
| View history | 401 | own | 403 | allow | allow if view policy permits |
| List notifications | 401 | own | own | own | own |
| Mark notification read | 401 | own | 403 | own | 403 |
| `unassigned` queue | 401 | deny | deny | allow | allow |
| `my-assignments` | 401 | deny | deny | own | own |

Also test:
- Double assignment returns `409`.
- Assigning a non-Pending claim is rejected.
- A decision cannot be submitted by an unassigned analyst.
- Resubmission only resets the fields the product says it resets; history records the change.
- Client cannot see another client's claim via any endpoint, including documents/history.

### TEST-02 — Input validation boundary matrix

Add backend tests for every rule below. Prefer Form Request classes so these rules are centralized.

| Field | Cases |
|---|---|
| `name` | missing, empty, whitespace-only, 255 chars, 256 chars |
| `email` | missing, malformed, duplicate, mixed case, max length |
| `password` | missing, 7 chars, 8 chars, confirmation mismatch (if confirmation becomes server-enforced) |
| `role` | omitted, `client`, `analyst` (must not create analyst publicly) |
| `client_name` | missing, empty, max 255, long input |
| `type` | missing, empty, max 255 |
| `provider_name` | missing, empty, max 255 |
| `amount` | missing, `0`, negative, non-numeric, decimal, huge value beyond `decimal(10,2)` |
| `bpjs_number` | missing (allowed), empty, 30 chars, 31 chars |
| `approved_amount` | missing for partial (reject), negative, greater than billed (reject), valid |
| `status` | each valid status, invalid/case-wrong value, empty |
| `notes` | null, empty, normal, extremely long (define and test a max) |
| `per_page` | default, 1, 100, 101, negative, non-numeric |
| Document file | valid PDF/JPG/PNG, `.exe`, spoofed MIME, 10 MB + 1 byte, empty file |
| Profile photo | valid JPG/PNG, 2 MB + 1 byte, GIF/WebP (reject), empty file |
| Claim/document IDs | unknown ID, malformed ID, another user's ID |

### TEST-03 — Frontend test tooling

**Files:** `package.json`, `tsconfig.json`, `vitest.config.ts`, test setup

**Change:**
- Add `tsconfig.json` with strict mode; the project currently has none.
- Add Vitest + React Testing Library + jsdom.
- Add scripts: `typecheck`, `lint`, `test`, `test:watch`, `test:e2e`.
- Add ESLint/Prettier or the team's preferred equivalent.
- Keep `npm run build` working.

**Acceptance criteria:**
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` exist and pass.
- CI can run them without a browser for unit tests.

### TEST-04 — Component and E2E tests

**Component tests:**
- `ProtectedRoute`: unauthenticated redirect, wrong-role redirect, allowed role renders.
- `AuthContext`: restore from localStorage, login/logout, 401 cleanup.
- `ClaimContext`: API transformation, resubmit state reset, status update.
- `ClientClaimForm`: each step’s required fields, amount > 0, file selection, edit/resubmit path.
- `NotificationBell`: unread count, mark one/all read, navigation.
- Status badge rendering for all five statuses.
- Claim history timeline rendering and empty/error states.

**Playwright E2E scenarios:**
1. Client register -> login -> submit claim with a document -> see claim and history.
2. Analyst login -> unassigned queue -> assign -> review -> set `Rejected` with notes -> client sees decision/history.
3. Partial approval requires an approved amount and cannot exceed the billed amount.
4. Client resubmits a rejected claim -> status returns to `Pending` -> history shows resubmission.
5. Notification unread badge -> mark all read -> count reaches zero.
6. Direct navigation to `/analyst/review/CLM-...` works without first visiting the dashboard.
7. Form validation errors are visible and do not submit.
8. Unauthorized client cannot open another client's claim/documents/history.

**Acceptance criteria:**
- E2E tests run against a disposable database and do not depend on seeded demo data.
- Tests clean up their own records/files.
- Tests are deterministic and can run in CI.

### TEST-05 — Manual QA script

Add a `QA.md` or a section in `README.md` with a repeatable checklist covering:
- Client happy path and validation errors.
- Analyst happy path, partial approval, rejection, needs-info.
- Resubmission and history.
- Notifications.
- Profile/photo/password.
- Mobile widths and keyboard navigation.
- Direct URLs and refresh.
- Empty, loading, error, and slow-network states.

---

## 5.5 P1 — User experience improvements

### UX-01 — Make claim detail API-driven and deep-link safe

- Fetch the claim from `GET /api/claims/{claimId}` in `AnalystReview` (and a new client detail page) instead of relying only on `ClaimContext`.
- Keep the context as a cache, but make the route self-sufficient.
- Add loading/error/not-found states.
- Acceptance: refreshing `/analyst/review/CLM-2026-001` works; unknown IDs show a clean 404 state.

### UX-02 — Make search, filters, and pagination real

- Move filtering and pagination to the API (`status`, `q`, `date_from`, `date_to`, `per_page`, `page`, `sort`).
- Wire the existing dashboard pagination or replace it with a proper page control.
- Remove or wire the duplicate search box and dead filter button in the client dashboard.
- Dashboard metrics must come from server-side aggregates or clearly state that they reflect the current page.
- Acceptance: page 2+ is reachable; search results are not limited to the first 20 claims.

### UX-03 — Consistent feedback and error handling

- Add a toast system (the `sonner` dependency already exists) for success/error.
- Normalize API errors into user-friendly messages (validation, 401, 403, 409, 500, network).
- Add retry buttons on failed loads and mutations.
- Add loading skeletons or spinners instead of blank tables.
- Add empty states with a clear next action.
- Add error boundaries for route-level crashes.
- Acceptance: no mutation fails silently; every long operation shows progress.

### UX-04 — Claim form improvements

- Persist a draft locally (or server-side) between steps.
- Show per-field validation messages, focus the first invalid field, and keep the error summary.
- Upload files with progress, per-file retry, cancel, and remove-before-submit.
- Do not navigate away silently if document uploads fail; show the failure and let the user retry.
- Add a confirmation step that lists all selected files.
- Add a clear "unsaved changes" guard.
- Acceptance: a failed upload gives the user a recoverable path; refreshing does not lose a draft without warning.

### UX-05 — Profile completeness and real data

- Replace hardcoded address, Member ID, Group Number, coverage status, and effective date in `Profile.tsx`.
- Add editable DOB, BPJS number, phone, address, and profile photo for clients.
- Keep the existing backend validation and add field-level errors.
- Show profile completeness prompts before claim submission.
- Acceptance: profile data comes from the authenticated user; updating it persists after refresh.

### UX-06 — Complete the `Needs Info` workflow

- Add an edit/resubmit action for `Needs Info` claims, with the analyst’s requested information shown prominently.
- Decide and document whether resubmission clears analyst notes, keeps them, or appends a new history event.
- Ensure the status returns to `Pending` and the assigned analyst is notified or the claim re-enters the right queue.
- Acceptance: a `Needs Info` claim can be corrected and resubmitted from the UI.

### UX-07 — Notification navigation for clients

- Clicking a client notification should open the relevant claim detail (and ideally the history section).
- Analysts should open the review page.
- Mark as read should not prevent navigation.
- Acceptance: clicking any claim-related notification lands on the correct claim.

### UX-08 — Analyst decision guardrails

- Require notes for `Rejected` and `Needs Info` (and document the rule).
- Require `approved_amount` for `Partially Approved`; ensure it is `> 0` and `<= amount`.
- Disable the submit button while a request is in flight and prevent double submission.
- Show a confirmation dialog for final decisions.
- Show the claim history next to the decision panel.
- Acceptance: invalid decisions cannot be submitted; the server also enforces every client-side rule.

### UX-09 — Accurate dashboards

- Remove the hardcoded `+12%` trend.
- Compute counts/amounts from the API, not from the current page only.
- Label the currency consistently (`Rp`, `id-ID`) and the timezone.
- Show the assigned analyst, current status, and last update clearly.
- Acceptance: dashboard numbers match the database for the selected filters.

### UX-10 — Responsive and accessible navigation

- Replace fixed `ml-64` sidebars with a mobile drawer/overlay.
- Ensure sidebar links, tables, modals, and the document viewer work at 360–768 px.
- Add visible focus states, correct labels, `aria-*` attributes, keyboard support for dropdowns/modals, and sufficient contrast.
- Respect `prefers-reduced-motion` in animations.
- Acceptance: keyboard-only navigation completes the client and analyst happy paths.

### UX-11 — Consistent formatting and shared components

- Centralize status badges, currency formatting, date/time formatting, and empty states.
- Use the API’s timestamps and convert to the user’s local timezone in one helper.
- Remove duplicated table markup where practical.
- Acceptance: identical status values render consistently on every page.

### UX-12 — Export and data access

- Keep client-side Excel export as a convenience, but add a server-side export endpoint for all filtered results.
- Include the same columns as the analyst table, with current filters and totals.
- Respect authorization and rate limits.
- Acceptance: exporting a filter with more than 20 claims exports all matching rows, not just the loaded page.

---

## 5.6 P2 — Backend maintainability

### ARCH-01 — Introduce a `ClaimStatus` enum and central constants

- Create `app/Enums/ClaimStatus.php` with the five string values and helper labels.
- Cast `Claim::$status` to the enum carefully; keep API serialization as the same strings.
- Replace magic strings in controllers/tests.
- Acceptance: invalid statuses fail validation through the enum; API output remains compatible.

### ARCH-02 — Add Form Request classes

Create requests for register/login, profile update, photo upload, claim store/update/status, assignment, document upload.

- Centralize validation and authorization.
- Add `notes` max length, `amount` max, `approved_amount <= amount` for partial approval.
- Acceptance: controllers become thin; tests cover validation rules.

### ARCH-03 — Add API Resources

- `UserResource`, `ClaimResource`, `ClaimDetailResource`, `DocumentResource`, `NotificationResource`, `ClaimHistoryResource`.
- Do not expose password hashes, tokens, or unnecessary internal fields.
- Keep snake_case keys expected by the frontend, or update the frontend and document the contract.
- Acceptance: API contract is explicit and stable.

### ARCH-04 — Service/action layer and transactions

- Move claim lifecycle logic into `ClaimService`/actions: create, assign, update, decide, resubmit.
- Wrap mutations + history + notifications in transactions.
- Use `lockForUpdate()` for assignment and status transitions.
- Acceptance: controllers only validate/authorize/delegate; concurrency tests pass.

### ARCH-05 — Database constraints and indexes

- Add indexes for `claims.user_id`, `claims.assigned_to`, `claims.status`, `claims.date_submitted`, `documents.claim_id`, `notifications.user_id/is_read`, `claim_histories.claim_id/created_at`.
- Confirm foreign-key behavior for users, claims, documents, notifications, history.
- Consider soft deletes for claims/users only if the product needs recovery; otherwise document hard-delete behavior.
- Acceptance: `EXPLAIN`/query plans are reasonable; cascade tests pass.

### ARCH-06 — Frontend data layer and types

- Centralize API response types in one module.
- Replace ad-hoc `any` mapping with typed transform functions.
- Consider React Query/TanStack Query for caching, refetching, and loading/error states; if not, create reusable hooks with the same behavior.
- Avoid components fetching the same data with different shapes.
- Acceptance: no `any` in new API code; a single claim-shape source of truth.

### ARCH-07 — Remove dead scaffolding and unused dependencies

- Delete or archive `_gen/` after confirming no imports.
- Remove unused shadcn/Radix/MUI/Recharts/Motion/React Hook Form dependencies if no code uses them.
- Keep only the UI components actually imported.
- Acceptance: `npm ci` is smaller/faster; `npm run build` passes; no broken imports.

### ARCH-08 — Add linting, formatting, and static analysis

- Backend: Laravel Pint (`vendor/bin/pint --test`) and optionally Larastan/PHPStan.
- Frontend: ESLint + Prettier + TypeScript strict.
- Acceptance: CI runs all checks and fails on errors.

### ARCH-09 — Documentation and API contract

- Add `docs/API.md` or an OpenAPI specification generated/maintained from routes.
- Add ADRs for: MySQL choice, document privacy, assigned-analyst decision rule, history immutability, polling vs real-time.
- Keep READMEs synchronized.
- Acceptance: a new developer can implement a client from the docs without reading controllers.

---

## 5.7 P2 — CI, operations, and reliability

### OPS-01 — Add CI

Create `.github/workflows/ci.yml` with jobs:
- Backend: setup PHP 8.4, `composer install`, `php artisan test`, Pint check.
- Frontend: setup Node 22, `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- E2E (optional but recommended): start SQLite/MySQL test DB, run Playwright.
- Docker build check: build both images (not necessarily full Compose).

Acceptance: every PR runs the pipeline; required checks are documented.

### OPS-02 — Backups and restore

- Document `mysqldump` and restore commands.
- Document storage volume backup.
- Add a periodic backup recommendation; do not build a full scheduler unless requested.
- Test restore on a disposable environment.

### OPS-03 — Production configuration

- Require strong DB passwords and `APP_KEY`.
- Keep `APP_DEBUG=false`.
- Configure trusted proxies/hosts if deployed behind a reverse proxy.
- Set log rotation and external error monitoring.
- Consider non-root execution and read-only filesystems where feasible.
- Acceptance: production checklist exists and has been reviewed.

### OPS-04 — Observability

- Add structured request/error logging for auth, claims, documents, and history.
- Never log tokens or passwords.
- Add health endpoints for DB connectivity (`/up` plus a DB-aware check if useful).
- Consider Sentry/OpenTelemetry later.

### OPS-05 — Keep the smoke test current

- Extend `docker/smoke.php` after DB separation and history:
  - Assert DB is MySQL (not SQLite) in the runtime.
  - Create history and assert the endpoint returns it.
  - Assert document URLs are not publicly accessible.
  - Clean up history rows and files.
- Acceptance: smoke test passes against the new Compose stack.

---

## 5.8 P3 — Product backlog (after the above)

These are valuable but should not delay security, history, DB separation, tests, and core UX.

1. **Claim conversation/messages**: client-analyst thread per claim; attachments; notification on message.
2. **Document requests**: analyst requests a specific document; client uploads against the request; status `Needs Info`.
3. **Draft claims**: save incomplete claims and resume.
4. **Claim categories/providers**: structured provider registry, diagnosis codes, policy coverage rules.
5. **Payment/reimbursement tracking**: approved -> paid -> settled, with reference numbers (only if the business actually pays).
6. **Admin/analyst management**: invite analysts, deactivate users, workload view, SLA timers.
7. **Analytics**: volume by status/provider/type, approval rate, turnaround time, exportable reports.
8. **Real-time notifications**: replace polling with SSE/WebSocket if scale requires it; add email notifications.
9. **Password reset and email verification**: complete account lifecycle.
10. **Two-factor authentication** for analysts.
11. **Multi-language UI** (Indonesian/English) and localized dates/currency.
12. **Accessibility audit** with axe-core and manual screen-reader testing.
13. **Data retention**: document retention policy, deletion requests, audit-log retention.
14. **Feature flags / environment separation** for demo accounts and seed data.

---

## 6. Execution order

| Phase | Tickets | Why / dependency | Exit criteria |
|---|---|---|---|
| 0. Baseline | Read docs, run `composer test`, `npm run build`, establish branch | Know the current baseline; author did not run Docker | Baseline commands pass or failures are documented |
| 1. Security | SEC-01..SEC-08 | Prevents credential/PII/authorization exposure before adding features | Security tests pass; review checklist complete |
| 2. Database | DB-01..DB-05 | Independent infrastructure change; needed before history/backups mature | MySQL Compose stack healthy; data persists; SQLite no longer used in production |
| 3. History | HIST-01..HIST-06 | Core requested feature; depends on stable DB and authorization | History is recorded for every action, visible to clients/analysts, tested |
| 4. Tests | TEST-01..TEST-05 | Locks in the new behavior; can start in parallel after SEC/HIST APIs stabilize | Backend/frontend/E2E suites pass in CI |
| 5. UX | UX-01..UX-12 | User-facing quality; prioritize UX-01/02/03/06 first | Manual QA checklist and E2E happy paths pass |
| 6. Maintainability | ARCH-01..ARCH-09, OPS-01..OPS-05 | Refactor safely after behavior is covered by tests | Lint/typecheck/static analysis green; docs updated |
| 7. Product | Backlog | New scope | Product owner prioritizes |

**Parallelization guidance:**
- SEC-01/02/03 and UX-01 can run in parallel with DB work, but avoid touching the same files without coordination.
- TEST-02/03 can begin while HIST/UX work is in progress, using the acceptance criteria here as the contract.
- Do not refactor controllers into services (ARCH-04) until TEST-01 covers the current behavior.

---

## 7. Definition of done

A change is complete only when:

- [ ] The implementation matches the ticket’s acceptance criteria.
- [ ] Backend tests pass (`cd Health_Guard-backend && composer test`).
- [ ] Frontend typecheck, lint, unit tests, and build pass.
- [ ] New authorization rules have negative tests (denied cases), not just happy-path tests.
- [ ] New input rules have boundary tests.
- [ ] Migrations work on a fresh database and, where relevant, on MySQL.
- [ ] History/audit rows are created transactionally for every relevant mutation.
- [ ] No secrets, passwords, tokens, or PII are added to logs/cookies/public endpoints.
- [ ] Documentation is updated (`README.md`, `DOCKER.md`, frontend/backend READMEs, API docs).
- [ ] The Docker smoke test passes after infrastructure changes.
- [ ] The PR description lists the tickets, migrations, env changes, and manual verification steps.

---

## 8. Agent guardrails

1. **Do not launch Docker while only planning or reading this document.** Docker verification is a later implementation step.
2. **Do not modify `_gen/`.** It is stale and excluded from builds. Remove it only through `ARCH-07` after confirming no references.
3. **Do not “fix” the database by editing `database.sqlite` or a volume.** Use migrations/commands.
4. **Do not change status strings or the public claim ID format** without a migration and frontend updates.
5. **Do not weaken authorization to make a test pass.** Fix the policy and the test together.
6. **Do not store passwords, API tokens, or full document contents in logs.**
7. **Preserve API compatibility** unless the PR explicitly documents a breaking change and updates the frontend/docs/tests.
8. **Keep changes small and reviewable.** One ticket per PR where possible.
9. **Report blocked decisions** instead of silently inventing product rules. The open decisions are listed below.

---

## 9. Open decisions for the product owner

| Decision | Recommended default |
|---|---|
| Database engine | MySQL 8.4 |
| Can any analyst decide any claim, or only the assigned analyst? | Only the assigned analyst; add an admin override later |
| Should `Needs Info` resubmission keep or clear old analyst notes? | Keep them as history; show the latest request prominently; clear the current note only if the product explicitly wants it |
| Should rejected claims be assignable to another analyst after resubmission? | Keep the original assignment; let the analyst re-review; add reassignment later |
| Should documents be private? | Yes, private by default with authenticated/signed access |
| Should profile photos be public? | Acceptable for demo; move private if privacy requirements demand it |
| Should Quick Sign In remain? | Remove password storage; keep email prefilling only, or remove the feature |
| Real-time notifications now or later? | Keep polling for now; add SSE/WebSocket in the backlog |
| What is the maximum claim amount? | Define a business limit (for example `decimal(12,2)` and a max validation) |
| Should claim history be editable/deletable? | No; immutable audit trail |

---

## 10. Manual verification scenarios (for the implementation phase)

### Client

1. Register with valid data -> lands on `/client`.
2. Register with invalid email/short password/mismatched confirmation -> sees clear errors, no account created.
3. Submit a claim with all required fields and one valid PDF -> claim appears as `Pending`.
4. Submit with missing fields, zero/negative amount, and an invalid file -> blocked with readable errors.
5. Open the claim -> see current data, documents, and a history timeline with a `submitted` event.
6. Receive an analyst decision -> see the new status, notes, approved amount, and history event.
7. Rejected/partial claim -> resubmit -> status returns to `Pending`, history shows `resubmitted`.
8. `Needs Info` claim -> can edit and resubmit with the requested information.
9. Update profile photo, DOB, BPJS, phone, address -> persists after refresh.
10. Click a notification -> navigates to the relevant claim.
11. Open a direct claim URL after refresh -> page loads, not "Claim not found".

### Analyst

1. Login -> dashboard shows accurate counts.
2. Unassigned queue shows only unassigned `Pending` claims.
3. Assign a claim -> appears in My Assignments.
4. Another analyst cannot assign the same claim (409).
5. Review a claim via direct URL -> loads without visiting the dashboard first.
6. View/download documents and see their preview.
7. Reject without notes -> blocked (per chosen rule).
8. Partial approval with empty/too-large approved amount -> blocked; valid amount succeeds.
9. Submit a decision -> client notification is created and history records the change.
10. Attempt to decide a claim assigned to another analyst -> denied (per chosen rule).
11. Search/filter/paginate beyond the first page -> results are correct.

### Security

1. A client cannot open another client's claim, documents, or history.
2. A client cannot call analyst-only endpoints.
3. An unauthenticated request to a protected endpoint returns `401` JSON.
4. A direct `/storage/...documents...` URL does not expose a private document.
5. No password is present in cookies/localStorage.
6. `GET /api/demo-users` is unavailable or restricted in production.
7. Repeated failed logins are throttled.

### Infrastructure

1. `docker compose up -d --build --wait` -> DB, backend, frontend healthy.
2. MySQL data and app key survive `docker compose down` + `up`.
3. `docker compose down -v` is documented as destructive.
4. MySQL backup/restore works on a disposable copy.
5. `composer test` passes.
6. Frontend typecheck, lint, unit tests, and build pass.
7. Docker smoke test passes and cleans up its data.

---

## 11. Appendix — current limitations that must not be mistaken for finished behavior

- Claim documents are currently public.
- Claim history does not exist yet.
- Notifications are polling-based.
- Direct review links currently fail without preloaded context.
- Client dashboard stats and export are page-local.
- Only the first page of claims is loaded.
- The client profile shows placeholder insurance data.
- `Needs Info` resubmission is not implemented in the UI.
- Analyst decisions are not restricted to the assigned analyst.
- Public registration can create analysts.
- Quick Sign In stores plaintext passwords.
- `_gen/` is stale.
- The frontend has no typecheck/lint/unit/E2E scripts yet.
- CI/CD and DB backups are not implemented.

Treat this appendix as the baseline; update it as tickets are completed.
