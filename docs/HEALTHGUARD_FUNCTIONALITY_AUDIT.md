# HealthGuard Functional Correctness Audit and Repair Ledger

**Repository:** `TMRakaP26/Health-Guard-Claim-Asurance`  
**Repository URL:** https://github.com/TMRakaP26/Health-Guard-Claim-Asurance  
**Created:** 2026-11-27  
**Primary objective:** Correct functionality and coherent business workflows. Visual redesign is explicitly deferred.

---

## 1. Purpose and relationship to existing documentation

This document starts a new workstream: **functional correctness, workflow consistency, and end-to-end behavior**.

It does not replace or rewrite:

- `IMPROVEMENT.md`, the previous 64-ticket improvement plan.
- `docs/archive/implementation-evidence-2026-11.md`, the implementation and verification history.
- `docs/QA.md` and `docs/TEST-COVERAGE.md`, the existing QA guidance and automated coverage map.
- `docs/API.md`, `docs/ADR.md`, `docs/RETENTION.md`, `README.md`, or `DOCKER.md`.

The previous improvement plan reports 64/64 tasks completed under its revised automated acceptance criteria. That is useful historical evidence, not proof that every real user workflow is coherent or complete. Do not reopen completed tickets merely because this audit exists. Create a new finding only when current code, behavior, requirements, or evidence demonstrate a gap.

The audit must distinguish:

1. **Implemented and verified:** behavior exists and a meaningful test proves the expected result.
2. **Implemented but insufficiently verified:** code exists, but the expected behavior is not adequately tested.
3. **Incomplete:** a required part of the workflow is absent or unfinished.
4. **Incorrect or inconsistent:** behavior exists but contradicts another part of the system or the agreed product rules.
5. **Undecided product behavior:** the correct outcome cannot safely be inferred from code or current documentation. Record the decision needed. Do not invent a business rule.
6. **Environment/deployment gap:** behavior may be correct in code but has not been proven in the relevant runtime.

A green test suite is evidence for the scenarios it actually tests. It is not proof of untested behavior.

## 2. Project operating context

### Application

The repository describes HealthGuard as a health-insurance claim submission and review application with:

- React and TypeScript frontend.
- Laravel REST API backend.
- MySQL 8.4 as the intended application database in the current Docker Compose architecture.
- Client, analyst, and administrator roles.
- Claim submission, review, decisions, documents, history, notifications, administration, and payment-related records.

Treat the actual repository code and current runtime as authoritative evidence. Do not rely on the README alone.

### Development and deployment environment

The owner does not want to install Docker Desktop on the development workstation.

The intended workflow is:

1. Terraform provisions an Azure VM.
2. During the initial/manual testing stage, the application is pulled from Git and run without Docker on the VM.
3. Docker on the Azure VM is used later for container-based verification and deployment.

Preserve this separation. Do not make Docker Desktop a prerequisite. Do not redesign Terraform, rebuild the Azure infrastructure, or force a Docker-only development workflow as part of this functionality audit.

Before running environment-dependent commands, inspect the actual repository instructions and the VM's established setup. Do not assume which PHP, Composer, Node, MySQL, service manager, or runtime configuration is already installed.

Maintain two distinct verification records:

- **Manual VM mode:** the real non-container execution path used during the initial testing stage.
- **Docker VM mode:** the Compose/container execution path used for container verification and deployment.

Passing one mode does not automatically prove the other. Record the exact mode, VM/runtime details that matter, commit SHA, commands, and results.

### Data and infrastructure safety

- Use synthetic test accounts, claims, documents, and other test data.
- Never use real patient or insurance claimant information in test fixtures.
- Never expose secrets, `.env` contents, tokens, passwords, private documents, or sensitive VM details in reports.
- Do not run destructive database commands against persistent data.
- Do not run `docker compose down -v`, `migrate:fresh`, volume deletion, database resets, or destructive Terraform actions against a persistent environment.
- Before any operation that could alter persistent data, identify the target database, confirm that it is disposable, and confirm a usable backup or snapshot exists.
- Do not deploy to a live or externally exposed environment without explicit owner authorization.


## 3. Existing decisions that must not be silently reversed

> Ringkasan ini untuk keperluan audit. Sumber kanonik keputusan adalah [ADR.md](ADR.md); bila keduanya
> berbeda, ADR dan kode yang berlaku, dan perbedaannya dicatat sebagai temuan `CONTRADICTION`.


The previous `IMPROVEMENT.md` records these implementation decisions. Treat them as the current product contract unless the owner explicitly changes them or code evidence proves that the implementation does not follow them.

| Area | Recorded decision |
|---|---|
| Database | MySQL 8.4 for the current Compose application; SQLite is used for local tests/import workflows. |
| Roles | Client, analyst, administrator. Public registration creates clients, not analysts or administrators. |
| Claim statuses | `Pending`, `Approved`, `Rejected`, `Needs Info`, `Partially Approved`. Preserve exact API values. |
| Claim decisions | Only the analyst assigned to a claim can decide it. An administrator override is not currently implemented. |
| Resubmission notes | Existing analyst notes are retained when a claim is resubmitted, with the previous state recorded in history. |
| Resubmission assignment | Resubmission preserves the existing analyst assignment. There is no reassignment endpoint in the documented design. |
| Documents | Claim documents are private and require authorized access. Do not expose them through public storage URLs. |
| Profile photos | Currently use public storage under the recorded policy. Do not silently change this behavior. |
| Quick Sign In | May remember identity details, but must not store the user's password. The password is still required for authentication. |
| Notifications | Polling is the default behavior. SSE and email are optional features behind configuration. |
| Claim amount | Maximum recorded amount is IDR 99,999,999.99, with at most two decimal places. |
| Claim history | History is immutable through normal application APIs. Retention-authorized deletion is a separate operation. |
| Payment | A recorded payment status is not an actual bank transfer. Do not imply that recording `paid` or `settled` moves money. |

If a recorded decision itself appears to produce a nonsensical workflow, report the contradiction with evidence and ask for an owner decision. Do not quietly rewrite the rule.

## 4. Audit priorities

### In scope now

1. Real user workflows from start to finish.
2. Business-rule consistency between client, analyst, and administrator behavior.
3. Claim lifecycle and state transitions.
4. Data correctness, persistence, and history.
5. Authorization and role boundaries.
6. API and frontend behavior agreeing with each other.
7. Documents, uploads, retries, downloads, and ownership.
8. Error handling, loading states, retries, duplicate actions, stale data, and navigation.
9. Search, filters, pagination, dashboards, exports, and their underlying data.
10. Concurrency and race conditions in important operations.
11. Behavior in manual VM mode and Docker VM mode, recorded separately.

### Explicitly deferred

- Visual redesign, theme changes, color adjustments, spacing, animation, and cosmetic polish.
- New features that are not necessary to complete or correct an existing workflow.
- Broad refactors that do not address a demonstrated functional issue.
- Infrastructure redesign or Terraform changes unrelated to a demonstrated blocker.

A visual change is allowed only when it is required to make a functional control usable or to communicate a necessary state, error, confirmation, or result.

## 5. Required audit coverage

Do not assume every item below is currently broken. Inspect the code and test it. Mark each item as verified, failed, not implemented, not tested, blocked, or not applicable, with evidence.

### 5.1 Authentication and session lifecycle

- Client registration, validation, login, logout, and session revocation.
- Analyst and administrator account creation/invitation and activation.
- Invalid credentials, expired sessions, revoked tokens, repeated login failures, and simultaneous sessions.
- Direct access to protected pages and API endpoints without authentication.
- Browser refresh, opening a deep link, and returning after logout.
- Quick Sign In behavior without password storage.

### 5.2 Client claim lifecycle

- Create a claim with valid data and required documents.
- Prevent submission when required information or required files are missing.
- Save and restore drafts, including browser refresh and interrupted sessions.
- Prevent accidental duplicate submissions and duplicate document creation.
- View claim details, documents, current status, decision notes, and history.
- Handle `Needs Info`, `Rejected`, and `Partially Approved` resubmission correctly.
- Preserve or update the right fields when resubmitting. Verify assignment, notes, approved amount, documents, timestamps, and history together.
- Prevent editing or resubmission when the lifecycle rules prohibit it.
- Ensure the client can never view another client's claims, documents, or history.

### 5.3 Analyst workflow

- View the unassigned queue and assigned claims.
- Ensure queue membership agrees with claim status and assignment state.
- Assign a claim, refresh the page, and verify the assignment remains consistent.
- Handle two analysts attempting to assign the same claim.
- Open an assigned claim directly through a URL and after browser refresh.
- Review all relevant claim details and authorized documents.
- Submit every supported decision with valid and invalid inputs.
- Verify required notes, approved amount, status, timestamps, notifications, and history.
- Prevent an analyst from deciding another analyst's claim.
- Verify what happens when the claim changes while an analyst has it open.

### 5.4 Administrator workflow

- Invite, activate, deactivate, and manage analyst accounts.
- Verify that deactivated users lose access as intended, including existing sessions.
- Verify role restrictions on both frontend and backend.
- Maintain provider, category, diagnosis, and coverage-rule reference data.
- Verify that reference-data changes affect new and existing claim workflows as intended.
- Verify workload, SLA, analytics, and exports against actual database records.
- Confirm that administrator capabilities do not accidentally bypass analyst-only claim decisions.

### 5.5 Documents and uploads

- Accept only allowed file types and sizes based on actual server-side validation.
- Reject spoofed MIME types, malformed files, zero-byte files, oversized files, and unauthorized uploads.
- Verify upload progress, cancellation, retry, partial failure, and recovery after reload.
- Ensure retries do not create duplicate claims, documents, messages, or history events.
- Verify document ownership and authorization on preview and download endpoints.
- Ensure private documents are not accessible through direct public URLs, guessed IDs, or another user's account.
- Verify behavior if a database operation succeeds but file storage fails, or vice versa.

### 5.6 Claim state, history, and data integrity

- Derive the actual transition matrix from the implementation and compare it with the documented workflow.
- Test every valid transition and every invalid transition.
- Check for impossible combinations, such as a status, assignment, approved amount, payment state, or document state that contradicts the rest of the claim.
- Verify transactions around claim creation, assignment, decisions, resubmissions, uploads, and history creation.
- Verify that failed operations do not leave partial or contradictory records.
- Verify history ordering, timestamps, actor identity, event meaning, and metadata.
- Verify that displayed totals and counts are based on the correct full dataset, not only the current page.

Do not invent a state transition that is not supported by the current contract. Record missing or ambiguous transitions as product decisions.

### 5.7 Notifications and conversations

- Verify which events create notifications and for which recipient.
- Ensure notifications link to the correct claim or conversation.
- Verify read/unread state and read-all behavior.
- Test polling, stale notifications, duplicate notifications, and failure recovery.
- Verify conversation messages, attachments, read state, and document-request workflows.
- Confirm that one user cannot read or mutate another user's messages or attachments.
- Do not claim that email or real-time delivery works unless the required provider/configuration is present and tested.

### 5.8 Payments, reporting, retention, and exports

- Verify the meaning and allowed transitions of payment records.
- Check that payment records cannot contradict claim decisions or approved amounts.
- Verify dashboard metrics, filters, pagination, sorting, and export results against a known synthetic dataset.
- Ensure exports include the full filtered dataset rather than only the visible page.
- Verify retention rules, deletion requests, dry runs, and purge behavior using disposable data only.
- Clearly separate configured capabilities from features that require an external provider or organizational policy.

### 5.9 Cross-layer and failure behavior

For important workflows, compare all of the following:

- Visible frontend behavior.
- Frontend state and API request/response handling.
- Backend routes, validation, authorization, and business logic.
- Database writes and constraints.
- Audit/history/notification side effects.
- Actual behavior after reload or a second user logs in.

Test network errors, server errors, validation errors, stale pages, repeated clicks, slow responses, duplicate requests, expired sessions, and partial failures. The UI must not show a successful result when the server operation failed.

## 6. Evidence rules

Every finding must have reproducible evidence. Prefer:

- Exact file paths, classes, functions, routes, and relevant line numbers.
- An API request/response or a minimal sequence of user actions.
- A test name and the assertion that is missing or failing.
- A database state before and after, using synthetic data and excluding secrets/PII.
- Relevant logs with credentials and sensitive values removed.
- Exact commit SHA and environment mode.

Do not report a defect solely because a code pattern looks unusual. Explain the user-visible or data-integrity consequence.

Do not claim a workflow is correct merely because a page renders, an endpoint returns HTTP 200, a test exits with code 0, or a screenshot looks acceptable. Assert the actual persisted and user-visible outcome.

## 7. Finding classification and priority

### Finding type

- `BUG`: existing behavior is incorrect.
- `MISSING`: required behavior is absent.
- `CONTRADICTION`: frontend, backend, database, documentation, or roles disagree.
- `DATA_INTEGRITY`: records or state can become inconsistent or lost.
- `AUTHORIZATION`: an actor can perform or view something they should not.
- `TEST_GAP`: the behavior may work, but there is no adequate test proving it.
- `DOC_DRIFT`: documentation does not match actual behavior.
- `ENVIRONMENT`: behavior is blocked or unverified in the target runtime.
- `OWNER_DECISION`: the correct business behavior is not specified well enough to implement safely.

### Priority

- `P0 - Critical`: security/privacy breach, unauthorized claim access or decision, data loss/corruption, or a defect that invalidates the main claim lifecycle.
- `P1 - High`: a major client, analyst, or administrator workflow is blocked, materially incorrect, or can create contradictory records.
- `P2 - Medium`: a significant secondary workflow or data/reporting inconsistency, with a reasonable workaround.
- `P3 - Low`: isolated edge case or non-blocking functional issue.

Do not inflate priority. Explain the impact and affected users.

### Finding status

Use only these statuses:

- `NEW`
- `NEEDS_OWNER_DECISION`
- `READY_FOR_ENGINEERING`
- `IN_PROGRESS`
- `FIXED_PENDING_QA`
- `VERIFIED`
- `ACCEPTED_WONT_FIX`
- `BLOCKED`

Only the independent QA pass may mark a finding `VERIFIED`. Engineering must not self-certify its own fix.

## 8. Finding template

Create one entry per distinct issue. Do not combine unrelated defects into one ticket.

```markdown
### [FNC-000] Short, specific title

- Type:
- Priority:
- Status:
- Affected role(s):
- Affected workflow:
- Environment: Manual VM / Docker VM / Both / Not environment-specific
- First observed commit:
- Related findings:

**Preconditions**

**Steps to reproduce**

1.
2.
3.

**Expected behavior**

**Actual behavior**

**Evidence**

- Files/routes/functions:
- Test or command:
- Observed result:

**Impact**

**Likely root cause**

**Proposed correction**

**Required regression test**

**Owner decision required**

**Verification result**
```

## 9. Owner feedback is a first-class priority

Owner feedback must never disappear inside a generic backlog or be postponed behind agent-discovered improvements.

Whenever the owner provides feedback:

1. Capture it verbatim in the Owner Feedback Register below.
2. Create a finding ID immediately, even if investigation is incomplete.
3. Mark it `P0` when it explicitly identifies a critical issue or the evidence shows critical security/data/lifecycle impact. Otherwise assign a justified priority.
4. Investigate it before unrelated work. Do not let the current engineering batch silently supersede it.
5. If the feedback contains multiple independent problems, split them into separate findings while preserving the original wording in the register.
6. If the feedback conflicts with a documented product decision, stop the conflicting implementation and ask the owner to resolve the rule.
7. Keep it visible until independently verified or explicitly accepted by the owner as not being fixed.

### Owner Feedback Register

| Feedback ID | Owner's original wording | Finding ID(s) | Priority | Status | Notes |
|---|---|---|---|---|---|
| OF-001 | No owner feedback was supplied for cycle 1 (2026-11-27). The reuse template's placeholder was replaced so it cannot be mistaken for a real report. | — | — | N/A | Register is ready for the next owner report; preserve wording verbatim when it arrives. |

## 10. Work phases

### Phase 0 - Establish the real baseline

- [x] Record branch, working tree state, current HEAD SHA, and uncommitted changes.
- [x] Read the existing project documentation listed in section 1.
- [x] Inspect the current source tree, routes, models, services, frontend pages, tests, migrations, and CI workflow.
- [ ] Identify the exact runtime and database used for manual VM testing. **BLOCKED — no VM access; still UNKNOWN.**
- [ ] Identify the exact Compose services, volumes, networks, and environment requirements for Docker VM mode. **PARTIAL — Compose service env, Apache/Nginx config, entrypoint and feature flags read; volumes/network not executed.**
- [x] Map existing test commands and identify which ones have actually been run against the current HEAD.
- [x] Compare recorded CI and local test evidence with the current HEAD SHA. Historical green runs must not be presented as proof for a different revision.
- [x] Record any mismatch between README, API docs, ADRs, implementation notes, tests, and source code.

**Exit condition:** baseline and evidence boundaries are documented. No application code changes are made during baseline discovery.

### Phase 1 - Reconstruct the real product workflows

- [x] Build a role and permission matrix for client, analyst, and administrator.
- [x] Build the claim lifecycle/state-transition matrix from code and documentation.
- [x] Map the complete client journey.
- [x] Map the complete analyst journey.
- [x] Map the complete administrator journey.
- [x] Map document, message, notification, payment, history, and retention side effects.
- [x] Identify every product decision that is missing, contradictory, or ambiguous.

**Exit condition:** a reviewer can understand the actual behavior and intended behavior without guessing.

### Phase 2 - Functional audit

- [ ] Execute or instrument the scenarios in section 5. **PARTIAL — locally reachable API/unit paths and a validation probe were exercised; Playwright, MySQL, mail, SSE and both VM modes were not.**
- [x] Compare frontend, API, authorization, database, and user-visible outcomes.
- [x] Create findings using section 8.
- [ ] Add regression tests for reproduced defects when possible, without changing application behavior during the audit-only pass. **NOT DONE — this pass is audit-only and created no tests; every finding lists its required test.**
- [x] Record test gaps separately from confirmed defects.
- [x] Record owner decisions separately from defects.

**Exit condition:** every major workflow area has a status and evidence. No unsupported claim of completeness.

### Phase 3 - Prioritization and owner review

- [ ] Resolve or explicitly defer owner decisions.
- [ ] Prioritize P0 and P1 findings before P2 and P3.
- [ ] Group only tightly related findings into an engineering batch.
- [ ] Identify migration, data compatibility, security, and deployment risks before implementation.
- [ ] Select a small, explicit set of finding IDs for the next engineering cycle.

**Exit condition:** the next engineering task is unambiguous and bounded.

### Phase 4 - Engineering repair

- [ ] Engineer works only on selected finding IDs and urgent owner feedback.
- [ ] Add or update meaningful regression tests.
- [ ] Keep changes small and reviewable.
- [ ] Update affected docs and API contracts in the same change.
- [ ] Record commands, exact results, changed files, and commit SHA.
- [ ] Mark fixes `FIXED_PENDING_QA`, never `VERIFIED`.

**Exit condition:** implementation is ready for independent QA.

### Phase 5 - Independent QA and regression

- [ ] QA reviews the actual diff and the original finding.
- [ ] QA reproduces the original issue before the fix when feasible, or explains why a baseline reproduction is unavailable.
- [ ] QA verifies the correction against the original expected behavior.
- [ ] QA tests nearby workflows and negative/permission cases for regressions.
- [ ] QA runs the relevant existing suites and new tests.
- [ ] QA checks documentation and test evidence against the current commit.
- [ ] QA marks each finding `VERIFIED`, returns it to `IN_PROGRESS`, or records a new finding.

**Exit condition:** no finding is marked verified solely on the engineer's report.

### Phase 6 - Environment verification

- [ ] Verify the non-container manual VM path independently.
- [ ] Verify Docker Compose on the Azure VM independently when the release candidate is ready.
- [ ] Verify MySQL 8.4 migrations, persistence, backup/restore, service health, and application workflows in Docker VM mode.
- [ ] Verify the application survives the intended restart/redeployment procedure without losing persistent data or changing encryption keys unexpectedly.
- [ ] Record any environment-dependent configuration and unresolved external provider requirements.
- [ ] Do not perform live cutover without explicit owner authorization.

**Exit condition:** manual VM and Docker VM verification results are separately recorded. A successful local test is not mislabeled as a successful deployment test.

## 11. A/B agent workflow

Use the same two reusable prompts throughout the work. The Markdown file is the shared source of truth. Do not rely on chat history as the only record.

### Prompt A - QA auditor, triage controller, and independent verifier

Use Prompt A for the initial audit, after each engineering batch, and whenever the owner reports a problem.

```text
You are the QA auditor and functional correctness controller for this repository.

Read docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md completely, then inspect the current repository state. Follow its priorities, existing product decisions, safety constraints, evidence rules, and workflow.

Your first priority is OWNER FEEDBACK. Read the Owner Feedback Register and any new owner feedback supplied in this turn. Capture new feedback verbatim, give it a finding ID immediately, investigate it before unrelated tasks, and keep it visible until independently verified or explicitly accepted by the owner. Do not bury owner feedback inside an ordinary backlog.

Determine the current mode from repository state:
- Initial audit: establish baseline, reconstruct workflows, and find functional gaps.
- Post-engineering QA: inspect the diff, independently verify selected findings, and check regressions.
- Owner-feedback investigation: investigate the supplied report first, then assess related workflows.

Do not assume the previous 64/64 improvement backlog proves functional completeness. Do not reopen old tickets without new evidence. Do not treat a green test suite, HTTP 200, successful build, or rendered page as proof that the complete user workflow is correct.

Prioritize functional behavior over visual appearance. Do not request cosmetic redesign. Do not modify application code during an audit-only pass. You may update docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md with findings, evidence, statuses, scenario coverage, and next steps.

Inspect actual code, routes, models, services, frontend state, database constraints/migrations, tests, and documentation. Reconstruct end-to-end behavior for client, analyst, and administrator. Check lifecycle transitions, authorization, persistence, history, documents, notifications, payments, reporting, duplicate actions, retries, stale state, failures, and cross-layer consistency.

For every finding, provide a reproducible path and exact evidence. Separate confirmed defects, missing behavior, test gaps, documentation drift, environment blockers, and unresolved product decisions. Never invent insurance/business rules. If the intended behavior cannot be determined, record an OWNER_DECISION and explain the alternatives and consequences.

Respect the two environment modes. Do not require Docker Desktop. Do not run Docker merely to inspect or plan. Preserve the manual non-container VM workflow and the later Docker-on-Azure-VM verification workflow. Never run destructive database, volume, or Terraform operations against persistent infrastructure.

After engineering work, independently verify the original finding and likely regressions. Do not accept the engineer's statement as proof. Mark an issue VERIFIED only when you have evidence from your own QA pass. Otherwise return it to IN_PROGRESS or BLOCKED with the exact reason.

At the end, update docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md and report:
1. Owner feedback status, first.
2. Current commit SHA and working tree state.
3. Findings verified, failed, new, blocked, and awaiting owner decision.
4. Evidence and tests actually executed, including failures and skipped checks.
5. Whether checks were run in manual VM mode or Docker VM mode.
6. The next smallest, highest-priority engineering batch, identified by finding IDs.

Do not claim work was executed when it was only inspected or planned. Be explicit about uncertainty and unavailable environments.
```

### Prompt B - implementation engineer

Use Prompt B only after Prompt A has identified a bounded batch of finding IDs that are ready for engineering.

```text
You are the implementation engineer for this repository.

Read docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md, the relevant existing project documentation, and the exact finding IDs assigned for this batch. Inspect the current git status and HEAD before changing anything.

OWNER FEEDBACK takes precedence over ordinary backlog work. If owner feedback is present, verify that its finding IDs are included in the assigned batch. Do not silently postpone it. If a critical owner issue conflicts with the assigned task, stop unrelated work and investigate the owner issue first. If the correct business behavior is unclear, record the decision needed rather than inventing a rule.

Implement only the explicitly assigned finding IDs and necessary supporting changes. Do not use the task as permission for broad refactoring, feature expansion, redesign, cosmetic cleanup, or infrastructure changes. Do not reopen completed IMPROVEMENT.md tasks without evidence that they are relevant to the assigned issue.

Before editing:
- Reproduce the reported behavior when feasible.
- Identify the responsible frontend, API, backend, database, and test paths.
- Identify data migration, compatibility, security, and persistence risks.
- State the intended minimal change and regression tests.

During implementation:
- Fix the underlying cause, not just the visible symptom or test assertion.
- Preserve existing API contracts and recorded product decisions unless an explicit owner decision authorizes a change.
- Keep frontend and backend behavior consistent.
- Add meaningful positive, negative, boundary, authorization, and lifecycle tests as relevant.
- Keep history, notifications, documents, and related side effects transactionally consistent where required.
- Never weaken validation, authorization, or tests merely to make a suite pass.
- Never use real claimant or patient data.
- Do not expose secrets or sensitive data in logs, tests, fixtures, or documentation.
- Do not perform destructive database, Docker volume, or Terraform operations against persistent infrastructure.
- Preserve the manual non-container VM workflow. Docker Desktop is not a requirement. Run Docker/Compose checks only in the designated Docker-on-Azure-VM verification stage or an explicitly disposable Docker environment.

After implementation:
- Run the most relevant regression tests, then the broader required suites that are available in the current environment.
- Record exact commands, exit codes, skipped tests, failures, and environment limitations.
- Inspect the diff for unrelated changes and unintended behavior changes.
- Update affected documentation and API contracts.
- Update docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md with files changed, implementation notes, tests, commit SHA if available, and remaining risks.
- Change the finding status to FIXED_PENDING_QA, not VERIFIED.

Report exactly what changed, what tests actually ran, what did not run, what environment was used, and any unresolved decision or blocker. Do not claim deployment or container verification unless it was actually performed.
```

## 12. Current project ledger

Update this section after each A/B cycle. Keep dated history rather than deleting important previous findings.

### Current phase

- **Phase:** 4/5 - Batch 2 implemented and locally checked; independent QA outstanding
- **Overall status:** IN PROGRESS — FNC-001 and FNC-002 remain `VERIFIED`; Batch 2 (FNC-003, FNC-005, FNC-008, FNC-009, FNC-010) is `FIXED_PENDING_QA` at `8e8fbc8`; VM, MySQL and browser verification still outstanding
- **Canonical tracker:** `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md` (selected by the Stage 0 cleanup report). The prompt path `docs/FUNCTIONALITY_AUDIT.md` does not exist; no second tracker was created.
- **Current branch:** `agent/healthguard/fnc-001-fnc-002` (created from `main` at `20f7601` for Batch 1)
- **Current HEAD SHA:** `8e8fbc8` (Batch 2 implementation, 9 files) on top of `5d48a41` (Batch 1 evidence) and `1a1e958` (Batch 1 implementation). This tracker edit follows `8e8fbc8` as a separate evidence commit.
- **Working tree:** unchanged from Stage 0 apart from the Batch 2 commit; Stage 0 still holds uncommitted `.gitignore`, `DOCKER.md`, both package READMEs, `IMPROVEMENT.md`, `README.md`, `docs/ADR.md`, `docs/QA.md`, `docs/TEST-COVERAGE.md` (the rest of its Stage 0 edit; its header line is now committed), three deleted superseded docs, and untracked `docs/archive/` plus `docs/repository-cleanup-report.md`. The batch committed only its own nine files.
- **Manual VM mode:** NOT RUN this cycle. `main.tf` hard-codes `BRANCH=main` for the `/opt/healthguard` checkout and enables the 10-minute `healthguard-sync` timer, so a Terraform-provisioned VM cannot run an engineering branch; changing that is infrastructure work outside every batch. No plan was produced and no infrastructure was applied or destroyed.
- **Docker VM mode:** NOT RUN for this revision. Docker Desktop remains a non-prerequisite; no container was started locally.
- **Next action:** Prompt A independently verifies Batch 2 on `8e8fbc8`; the owner decides FNC-004. FNC-006 and FNC-007 need a disposable MySQL/VM environment (and, for FNC-007, a configurable branch).

### Summary counts

| Priority | New | Needs owner decision | Ready | In progress | Fixed pending QA | Verified | Blocked |
|---|---:|---:|---:|---:|---:|---:|---:|
| P0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| P1 | 0 | 1 | 0 | 0 | 0 | 2 | 0 |
| P2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 |
| P3 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |

### Workflow coverage

| Workflow area | Status | Evidence / finding IDs | Notes |
|---|---|---|---|
| Baseline and documentation consistency | AUDITED — FIX VERIFIED, ONE PENDING QA | FNC-001, FNC-008 | The document-type rule matches enforced behaviour. The committed coverage heading was restored as UTF-8 at `8e8fbc8`, awaiting QA. |
| Authentication and sessions | PARTIALLY AUDITED — FIX PENDING QA | FNC-003, FNC-005, FNC-007 | Registration/login/logout/token revocation/2FA/deactivation read; backend auth+security tests pass. The verification link now accepts the API origin, and the 2FA setup panel renders the `otpauth://` URI; neither is proven in a browser or manual VM. No live session-expiry test. |
| Client claim lifecycle | AUDITED — FIXES VERIFIED, ONE PENDING QA | FNC-001, FNC-002, FNC-009 | Create, draft, submit, track, request-for-info, resubmit, decision view and history read layer by layer. Batch 1 replay and draft retirement verified; the submission key now survives a reload (FNC-009) and awaits QA. |
| Analyst workflow | AUDITED — OWNER DECISION | FNC-004 | Queue/assignment/competing assignment/decide/notes/documents read; assignment and decision locks are transactional. Deactivated analyst leaves claims undecidable. |
| Administrator workflow | AUDITED — OWNER DECISION | FNC-004 | Users, invitations, activation, catalog, payments, deletion review read. No decision override, as recorded. Workload counts derive from claims. |
| Documents and uploads | AUDITED — FIX VERIFIED, ONE PENDING QA | FNC-001, FNC-010 | Private disk, policy checks, Apache/Nginx `documents` denial read. DOC/DOCX accepted with extension + MIME + container checks; PDF/image behaviour unchanged. The profile-photo rejection now names only JPG/JPEG/PNG (FNC-010). Live file I/O on a VM still not exercised. |
| Claim state, history, and data integrity | PARTIALLY AUDITED | FNC-002, FNC-006 | Five statuses, allowed/blocked transitions, locks, transactions, immutable-history model read and covered by passing tests. MySQL row-lock behaviour unverified at HEAD. |
| Notifications and conversations | PARTIALLY AUDITED | — | Recipients, triggers, read/read-all, polling and optional SSE/email read. Polling default is coherent. SSE and mail delivery not executed. |
| Payments, reporting, retention, and exports | PARTIALLY AUDITED | FNC-006 | Payment paid→settled locking, amount ceiling, export filter scope, analytics metric definitions and retention guards read and covered by tests. Live XLSX/CSV re-check not run. |
| Cross-layer and failure behavior | AUDITED — FIXES PENDING QA | FNC-001, FNC-002, FNC-003, FNC-005, FNC-009, FNC-010 | Form validation, API rules, DB constraints, error copy, retry paths and docs compared. FNC-001 and FNC-002 verified; the email-origin, 2FA field, reload-retry and photo-message divergences are corrected at `8e8fbc8` and await independent QA. |
| Manual non-container VM verification | BLOCKED | FNC-007 | No VM access, no runtime record, no owner-supplied command output. Nothing was run on a VM. |
| Docker VM verification | NOT RUN | FNC-007 | Not attempted; Docker is not a workstation prerequisite. Container files were read, not executed. |

### Role and permission matrix (derived from code, 2026-11-27)

| Action | Client | Assigned analyst | Unassigned analyst | Administrator |
|---|---|---|---|---|
| List/view claims | Own only | All | All | All |
| Create claim | Yes | No | No | No |
| Edit/resubmit claim data | Owner; only Rejected / Needs Info / Partially Approved; not paid | No | No | No |
| Assign unassigned Pending claim | No | Yes | Yes | No |
| Decide (five statuses) | No | Yes | No | No |
| Upload documents | Own claim | Own message attachment only | No | No |
| Download/preview documents | Own claim | Any claim | Any claim | Any claim |
| Read messages/history/document requests | Own claim | Any claim | Any claim | Any claim |
| Send message | Own claim | Assigned claim | No | No |
| Request additional document | No | Assigned claim | No | No |
| Read payment record | Own claim | Any claim | Any claim | Any claim |
| Record paid → settled | No | No | No | Yes |
| Analytics | No | All claims | All claims | All claims |
| CSV/XLSX claim export | No | Yes | Yes | Yes |
| Users, invitations, activation, catalog, deletion review | No | No | No | Yes |
| Drafts | Own only | No | No | No |

### Claim lifecycle matrix (derived from code, 2026-11-27)

| From | Action | To | Actor | Enforced guard |
|---|---|---|---|---|
| — | create | Pending | client | client role, amount/date rules, sequential ID, submitted history, notify all active analysts |
| Pending | assign | Pending | any analyst | unassigned + Pending, row lock, atomic update, assigned history |
| Pending | decide Approved | Approved | assigned analyst | paid claim blocked; approved_amount := amount |
| Pending | decide Partially Approved | Partially Approved | assigned analyst | approved_amount required, > 0, ≤ claim amount, re-checked under lock |
| Pending | decide Rejected / Needs Info | Rejected / Needs Info | assigned analyst | notes required |
| Pending | request document | Needs Info | assigned analyst | request row + decision + history in one transaction |
| Rejected / Needs Info / Partially Approved | resubmit | Pending | owning client | not paid; previous snapshot stored; assignment and notes preserved; approved_amount cleared |
| Approved / Partially Approved | record payment | unchanged | administrator | amount ≤ approved amount; first write must be `paid` |
| paid | settle | unchanged | administrator | same amount and reference; no further rewrite |
| any decided status | decide again | any of five | assigned analyst | blocked if paid; **no other transition guard** |
| Approved | resubmit | — | client | not offered (not in `canResubmit`) |

Observed risk, not a finding: `PATCH /claims/{id}/status` accepts any of the five values on an unpaid claim, so an assigned analyst can move `Approved` back to `Rejected` or `Pending` and can send `Pending` directly. `docs/API.md` permits all five and `docs/ADR.md` only locks paid claims, so this is treated as the recorded contract; the UI never offers `Pending`. It should be confirmed or explicitly constrained in a later cycle, because a decision already communicated to the client can be reversed without a resubmission.

### Active findings

Audit baseline: `main` @ `20f7601dd7e035a1d87ebceca340926ca24e0a33`. Cycle 1 was an audit-only pass. Cycle 3 verified Batch 1 on the engineering branch `agent/healthguard/fnc-001-fnc-002`; the audit pass itself changed only this tracker, committed and pushed nothing, and deleted its throwaway probes. No owner feedback has been supplied in any cycle, so all findings remain agent-discovered.

Locally executed evidence (Windows, PHP 8.3.30, Node 25.9.0): backend `vendor/bin/phpunit` → 170 tests, 864 assertions, 2 skipped, OK; frontend `npm test` → 34 passed, `npm run typecheck` clean, `npm run lint` clean, `npm run test:security` → 5 passed, `npm run build` succeeded. Environment caveat: `php artisan test` fails without an `APP_KEY` in a fresh clone (no `.env` here); the runs above supplied a disposable inline key, and CI copies `.env.example`. Playwright was not run.

Batch 1 evidence at `1a1e958` (same workstation, same inline disposable `APP_KEY`): targeted `vendor/bin/phpunit --filter='SecurityUploadTest|ClaimSubmissionIdempotencyTest'` → 35 tests, 165 assertions, OK. Full backend `vendor/bin/phpunit` → 183 tests, 938 assertions, 2 skipped (the two MySQL-only import tests, unchanged), OK. `vendor/bin/pint --test` on the changed PHP files → clean after one literal-case fix. Frontend `npm test -- --run` → 4 files, 35 tests passed; `npm run typecheck`, `npm run lint`, `npm run test:security`, `npm run build` all exit 0. Playwright and the E2E specs were NOT run this cycle. No VM, Docker, MySQL or browser run was performed.

Independent QA pass at `1a1e958` (cycle 3, same workstation, PHP 8.3.30, Node 25.9.0): full backend `php vendor/bin/phpunit` → 183 tests, 938 assertions, 2 skipped, OK; `pint --test` over the nine changed PHP files → clean (9 files); frontend `npm test -- --run` → 4 files / 35 tests, plus `typecheck`, `lint`, `test:security` and `build` all exit 0. QA wrote and deleted two throwaway probe classes (changed-payload replay, replay carrying a foreign surviving draft, DOCX missing `[Content_Types].xml`, DOCX/DOC on `/api/user/photo`, and the photo error payload); 5 probes passed and no probe file remains. Playwright/E2E were NOT run, and no VM, Docker, MySQL or browser run was performed.

### [FNC-001] DOC/DOCX evidence is advertised and client-accepted but rejected by the server

- Type: CONTRADICTION
- Priority: P1 - High
- Status: VERIFIED
- Affected role(s): client (primary), assigned analyst (message attachments)
- Affected workflow: claim evidence upload in the 4-step form and on claim detail
- Environment: Not environment-specific
- First observed commit: `20f7601`
- Related findings: FNC-002

**Preconditions**

An authenticated client owns a claim (or is submitting a new one). `FEATURE_MESSAGES` is at its default.

**Steps to reproduce**

1. Open `/claims/new`, reach step 3, or open an owned claim detail and the attachment form.
2. Observe the picker accepts `.doc`/`.docx` (`shared.tsx:331`) and the copy promises “PDF, JPG, PNG, DOC/DOCX” (`ClaimForm.tsx:514`, `Shell.tsx:256`).
3. Select a valid non-empty `.docx` under 10 MB and submit/upload.

**Expected behavior**

Per `docs/API.md` §Documents and collaboration: “PDF/JPG/PNG/DOC/DOCX actual MIME and extension, 1 byte–10 MB”, so the upload is stored and appears on the claim.

**Actual behavior**

HTTP 422: “The file field must be a file of type: pdf, jpg, jpeg, png.” On a new claim the claim has already been created, so the user is left with a saved claim and no evidence; the failed file can only be retried with a different type.

**Evidence**

- `Health_Guard-backend/app/Http/Requests/DocumentUploadRequest.php:21` — `mimes:pdf,jpg,jpeg,png`.
- `Health_Guard-backend/app/Rules/SafeUpload.php:15-17` — type map contains only jpg/jpeg/png/pdf.
- `Health_Guard-frontend/src/app/portal/shared.tsx:331-338` — accept list and `validateFile` allow `doc`/`docx`.
- `Health_Guard-frontend/src/app/portal/ClaimForm.tsx:514`, `Shell.tsx:256` — user-facing copy; `docs/API.md` states the wider contract; `docs/TEST-COVERAGE.md:56` records only PDF/PNG/JPEG tests.
- Command: `APP_KEY=… php artisan tinker --execute` validating an `UploadedFile` against the request rule → `pdf: accepted` / `docx: The file field must be a file of type: pdf, jpg, jpeg, png.` (2026-11-27, local SQLite-free validation, not VM).

**Impact**

A documented evidence format cannot be attached. Clients who need to supply a Word document either submit without evidence or cannot fulfil an analyst’s document request, while the UI claims the type is supported. The failure is only discoverable after the claim record exists.

**Likely root cause**

Confirmed: the server whitelist and `SafeUpload` were narrowed to PDF/image types, but the frontend picker/validator/copy and the API contract were not updated with that decision.

**Proposed correction**

Make all layers state the same rule. If the recorded API contract stands, accept DOC/DOCX server-side with the same strict extension-plus-content validation used for PDF/images. If the narrowing was deliberate, the owner must authorise it and the frontend accept list, both copy strings, the Guide, `docs/API.md` and the tests must be changed instead. Do not weaken the existing PDF/image checks, and do not claim DOC/DOCX support without a server-side test.

**Required regression test**

Backend feature test: a real minimal DOCX and a legacy DOC upload are accepted and persisted with claim/history/request side effects; an executable or MIME-mismatched file is still 422. Frontend unit: `validateFile`/`fileAccept` and the server whitelist cannot disagree. Extend the E2E only if a DOCX fixture is easy to keep valid.

**Owner decision required**

Only if the DOC/DOCX exclusion is the intended rule; otherwise the documented contract is authoritative.

**Implementation notes (2026-11-27, branch `agent/healthguard/fnc-001-fnc-002`, commit `1a1e958`)**

- `Health_Guard-backend/app/Rules/SafeUpload.php` now owns the single whitelist: PDF, JPG/JPEG, PNG, DOC and DOCX. It checks client extension, finfo MIME **and** container bytes — `%PDF-`, PNG/JPEG signatures, the Compound File Binary header for DOC, and for DOCX the ZIP signature plus the presence of `word/document.xml` and `[Content_Types].xml`. A ZIP renamed `.docx` without a Word part is rejected.
- `Health_Guard-backend/app/Http/Requests/DocumentUploadRequest.php` dropped the narrower `mimes:pdf,jpg,jpeg,png` rule so the format decision lives in one place; the 10 MB limit, authorization, private disk storage, transaction, request/message scoping and download rules are unchanged. Profile photos keep `imagesOnly` narrowing to JPG/PNG.
- The frontend picker, `validateFile`, both copy strings and `docs/API.md` already promised DOC/DOCX and needed no functional change; they now match the enforced server rule.
- `docs/TEST-COVERAGE.md` records the new cases.

**Tests added and run**

- `Health_Guard-backend/tests/Feature/SecurityUploadTest.php`: DOCX and legacy DOC in the valid provider (private storage, download bytes, `document_uploaded` history), DOCX fulfilling an open document request, and rejects for a non-Word ZIP named `.docx`, a DOCX behind `.exe`, and a `.doc` carrying PDF bytes. PDF/PNG/JPEG, empty, oversized and MIME-mismatch cases are unchanged.
- `Health_Guard-frontend/tests/portal.test.tsx`: `validateFile` accepts `.docx`/`.doc` and `fileAccept` lists exactly `.pdf,.jpg,.jpeg,.png,.doc,.docx`.

**Verification result**

`VERIFIED` (2026-11-27, independent QA pass at `1a1e958`, local SQLite on Windows). Re-ran the full backend suite (183 tests, 938 assertions, 2 skipped — the same two MySQL-only import tests) and `pint --test` over the nine changed PHP files (clean). Read `SafeUpload`, `DocumentUploadRequest` and `ProfilePhotoRequest` in full: the whitelist now lives in exactly one place, and `imagesOnly` still narrows profile photos to JPG/JPEG/PNG. Independent probes beyond the shipped tests: a ZIP containing `word/document.xml` but no `[Content_Types].xml` is rejected 422, proving the second half of the DOCX content check is enforced; `.doc` and `.docx` are both rejected 422 on `/api/user/photo`. Picker/`validateFile`, both UI copy strings (`Shell.tsx:256-257`, `ClaimForm.tsx:525-526`), the backend README and `docs/API.md:63` now agree with the server rule, so no layer advertises a format the API refuses. Manual VM and Docker VM runtime checks were NOT run (FNC-007) and no real VM file I/O was exercised. Residual, recorded separately: the rejection text is unconditionally DOC/DOCX-aware and leaks into the profile-photo message (FNC-010).

### [FNC-002] Claim submission is not idempotent; a retry or a resumed draft can create a duplicate claim

- Type: DATA_INTEGRITY
- Priority: P1 - High
- Status: VERIFIED
- Affected role(s): client (creates), analyst (receives duplicates)
- Affected workflow: claim create, draft resume, document upload retry
- Environment: Not environment-specific
- First observed commit: `20f7601`
- Related findings: FNC-001

**Preconditions**

A client has a saved server draft (clicked “Simpan draf” or opened `/claims/new?draft=<id>`), or a claim POST commits while the response is lost.

**Steps to reproduce**

1. `/claims/new`, fill the form, click “Simpan draf”.
2. Submit with two or more documents and make the second upload fail (network drop, proxy 5xx, tab close after failure).
3. The claim is created and the page shows the saved claim ID, but the draft is still listed on `/drafts` because deletion happens only after every upload succeeds (`ClaimForm.tsx:212`).
4. Leave the page, open `/drafts`, open the same draft, submit it again.

**Expected behavior**

One claim per patient episode/submission; a retry must continue the existing claim. The audit scope explicitly requires “Prevent accidental duplicate submissions and duplicate document creation.”

**Actual behavior**

A second `POST /api/claims` succeeds and creates a second claim ID with its own `submitted` history, notification to every active analyst and analyst queue entry. The same happens when the first POST commits but the client sees a network error: `savedClaim` is never set (`ClaimForm.tsx:181`), so pressing submit again sends another POST. No idempotency key or duplicate guard exists (`grep -i idempoten` finds only the history-backfill command).

**Evidence**

- `Health_Guard-frontend/src/app/portal/ClaimForm.tsx:172-218` — POST first, per-file upload loop, draft deleted only at line 212 after all uploads; `setSavedClaim` only on a received response.
- `Health_Guard-backend/app/Services/ClaimService.php:19-47` — every call allocates the next `claim_id` and records history; no submission key.
- `Health_Guard-backend/app/Http/Requests/ClaimInputRequest.php` — no idempotency field; `claims` has only the `claim_id` unique index.
- `Health_Guard-frontend/tests/e2e/upload-recovery.spec.ts` — covers retry on the same page without a draft and asserts one creation; it does not cover a saved draft or a lost response.

**Impact**

Duplicate claim records for one episode: duplicated monetary exposure, duplicate notifications/history and two reviews for one treatment. Nothing in the UI warns the client that the draft already became a claim.

**Likely root cause**

Confirmed: claim creation is a non-idempotent side effect, and the draft’s lifecycle is not tied to the created claim.

**Proposed correction**

Make submission idempotent at the API boundary (a client-generated key persisted with the claim, returning the existing claim on replay) and delete or mark the draft converted as part of/with the claim creation so it cannot be resubmitted. Keep the existing per-file retry against the same claim.

**Required regression test**

Backend feature test: two POSTs with the same submission key produce one claim, one submitted history entry and one notification set. Frontend/E2E: save draft → make a later upload fail → leave and resume the draft → assert one claim exists and the draft is gone/converted.

**Owner decision required**

None for the defect; the replay contract (which response a duplicate key returns) should be recorded in `docs/API.md` when implemented.

**Implementation notes (2026-11-27, branch `agent/healthguard/fnc-001-fnc-002`, commit `1a1e958`)**

- New reversible migration `2026_11_27_000000_add_submission_key_to_claims_table.php`: nullable `claims.submission_key` (64) plus a unique index on `(user_id, submission_key)`. Existing rows keep `NULL`, which is allowed repeatedly in both SQLite and MySQL; no backfill is needed and no existing column changed.
- `ClaimService::submit()` (with `create()` kept as a compatibility wrapper for the import command and existing tests) checks the key under the existing user row lock, returns the stored claim for a replay, and lets the unique index settle a concurrent insert race (`UniqueConstraintViolationException` → re-read and return the winner). A replay consumes no claim sequence number and writes no history or notification.
- `draft_id` is accepted only on POST, must belong to the submitting client (404 otherwise), and is deleted inside the same transaction that creates the claim, so a saved draft cannot produce a second claim.
- `ClaimInputRequest` validates `submission_key` (8–64 characters) and `draft_id` on POST only; `ClaimController::store` returns 201 for a new claim and 200 for a replay.
- `ClaimForm.tsx` generates one key per page session, sends it with `draft_id`, and no longer deletes the draft after uploads (the server already retired it). Per-file retry against the same claim is unchanged.
- `docs/API.md` records the fields, the 200 replay response and the draft-retirement behaviour.

**Tests added and run**

- `Health_Guard-backend/tests/Feature/ClaimSubmissionIdempotencyTest.php`: replay yields one claim, one `submitted` history entry, one notification set and does not consume a claim number; distinct keys and distinct users both create separate claims; the draft is retired and a replay still returns the same claim; a foreign `draft_id` is 404 with no claim and no draft deletion; a malformed key is 422; omitting the key keeps the previous behaviour.
- `Health_Guard-frontend/tests/portal.test.tsx`: submitting a loaded draft posts `/claims` with a `submission_key` and `draft_id` and performs no `DELETE /drafts`.

**Verification result**

`VERIFIED` (2026-11-27, independent QA pass at `1a1e958`, local SQLite on Windows). Re-ran the full backend suite (183/938, 2 skipped), `ClaimSubmissionIdempotencyTest` (7 tests) and `portal.test.tsx` (22 of the 35 frontend tests) — all green. Independent probes beyond the shipped tests: replaying a key with a *different* payload (amount 999, different patient name) returns the originally created claim with its original values and one history row, so the contract is “first write wins” exactly as `docs/API.md` states; and a replay carrying an unrelated surviving `draft_id` returns the original claim without deleting that draft. The migration is additive and reversible, the unique index is `(user_id, submission_key)` so one client cannot block another, and `NULL` keys keep the legacy path (covered by test). Concurrency and MySQL row-lock behaviour were NOT executed (FNC-006), so the `UniqueConstraintViolationException` race branch is verified by inspection only. One duplicate path lies outside this fix's scope and is recorded as FNC-009: the key lives only in a `useRef`, so a full page reload after a committed-but-unacknowledged POST generates a new key.

### [FNC-003] Email verification cannot be completed in manual mode because the link origin never matches the frontend

- Type: BUG
- Priority: P2 - Medium
- Status: FIXED_PENDING_QA
- Affected role(s): all roles using email verification (clients, analysts, admins)
- Affected workflow: account email verification, and email notifications that require a verified address
- Environment: Manual VM (frontend `:5173`, API `:8000`); Docker VM shares one origin and is not affected by this path
- First observed commit: `20f7601`
- Related findings: FNC-007

**Preconditions**

`FEATURE_EMAIL=true` with a working mailer; backend `APP_URL=http://127.0.0.1:8000`, `FRONTEND_URL=http://127.0.0.1:5173` (the documented manual configuration in `Health_Guard-backend/.env.example`).

**Steps to reproduce**

1. Sign in, open Profile, request a verification email.
2. Open the emailed link; it lands on `/verify-email?url=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Femail%2Fverify%2F…`.
3. Press “Verifikasi alamat email”.

**Expected behavior**

The signed link verifies the account, as `docs/API.md` describes (“Verification email links to frontend /verify-email, which preserves the signed URL”).

**Actual behavior**

The page throws “Invalid verification link” and no request is sent, because the signed URL’s origin is the API origin while the predicate demands the page’s origin.

**Evidence**

- `Health_Guard-backend/app/Providers/AppServiceProvider.php:35-38` wraps the temporary signed API route in the frontend path.
- `Health_Guard-backend/routes/api.php:36` — signed route is under `/api/email/verify/…`; `APP_URL` is the API origin.
- `Health_Guard-frontend/src/app/portal/Profile.tsx:389` — `url.origin !== window.location.origin` rejects it; `vite.config.ts` proxies `/api` with `changeOrigin: true`.
- Command: `URL::temporarySignedRoute('verification.verify', …, ['id'=>1,'hash'=>'abc'])` with `APP_URL=http://127.0.0.1:8000` → `http://127.0.0.1:8000/api/email/verify/1/abc?expires=…&signature=…` (signature omitted) while the page origin is `http://127.0.0.1:5173`.

**Impact**

Email verification is unreachable in the primary manual/VM development mode. Because notification email is only sent to verified addresses (`NotificationService.php:20`), optional email notifications also never start. Docker/production with one public origin is unaffected, so a green container check cannot prove this path.

**Likely root cause**

Confirmed: the frontend enforces same-origin against the page origin instead of the configured API origin, while the backend signs for `APP_URL`.

**Proposed correction**

Agree on one origin contract: either sign the URL for the frontend origin and let the frontend submit the signed query to its own `/api` proxy, or accept the configured API origin in the frontend guard. Keep the signature and user-identity checks; do not accept arbitrary origins. Document the chosen origin rule in `docs/API.md`.

**Required regression test**

A frontend unit test for the accepted/rejected URL shapes (API origin, page origin, foreign origin, missing signature) plus a backend test that a generated verification link verifies the matching user and rejects a tampered/foreign one. A VM/manual run remains the only end-to-end proof.

**Owner decision required**

None; the recorded contract already says the frontend preserves the signed URL.

**Implementation notes (2026-11-27, Batch 2, commit `8e8fbc8`)**

- `Health_Guard-frontend/src/app/portal/Profile.tsx`: `acceptedVerificationOrigins(pageOrigin, configuredApiOrigin)` returns the page origin plus the configured API origin (`VITE_BACKEND_URL`, defaulting to `http://127.0.0.1:8000`, the same value the Vite proxy uses). `verificationRequestPath(raw, origins)` rejects a foreign origin, any path outside `/api/email/verify/`, a link without `expires` or `signature`, and an unparsable/empty value; otherwise it returns the relative path (`/email/verify/…?expires=…&signature=…`) that the api client sends through its own `/api` base, exactly as before.
- Nothing on the signing side changed: the link is still signed for `APP_URL` with the same lifetime, the `signed` middleware and the user-identity check are untouched, and only the two allow-listed origins are accepted — not an arbitrary origin.
- `docs/API.md` records the origin rule and states that the server still validates the signature.

**Tests added and run (2026-11-27, commit `8e8fbc8`)**

- `MigrationAndLifecycleTest::test_verification_email_wraps_the_api_signed_url_for_the_frontend`: captures the real `VerifyEmail` notification, asserts the `FRONTEND_URL/verify-email?url=` wrapper, extracts the signed API-origin URL and uses it to verify the user (200, `email_verified_at` set).
- `portal.test.tsx` “email verification link guard”: accepts the API origin and the page origin (both resolve to the same relative path) and rejects a foreign origin, a non-verification path, a missing signature and an empty value.

**Verification result**

`FIXED_PENDING_QA` (2026-11-27, commit `8e8fbc8`, local SQLite/Windows). Targeted PHPUnit (`SecurityUploadTest|MigrationAndLifecycleTest|ProductWorkflowsTest`) 50 tests / 260 assertions / 2 skipped OK; full backend 187 tests / 966 assertions / 2 skipped OK. Frontend 40 Vitest tests pass, typecheck/lint clean, security tests 5 pass, production build succeeds. Not verified: any browser run of `/verify-email` and any manual-VM run — `main.tf` pins the VM checkout to `BRANCH=main`, so the engineering branch cannot be exercised there (FNC-007).

### [FNC-004] Deactivating an analyst leaves their assigned claims permanently undecidable

- Type: OWNER_DECISION
- Priority: P1 - High
- Status: NEEDS_OWNER_DECISION
- Affected role(s): administrator, analysts, clients whose claims are assigned
- Affected workflow: analyst offboarding, assignment, decision, SLA
- Environment: Not environment-specific
- First observed commit: `20f7601`
- Related findings: —

**Preconditions**

An analyst has one or more claims assigned and in `Pending`/`Needs Info`.

**Steps to reproduce**

1. As admin, `PATCH /api/admin/users/{id}/active` with `is_active=false` for an analyst holding assigned claims.
2. Sign in as another analyst; open one of those claims.
3. Try “Ambil tugas”, then `PATCH /api/claims/{id}/status`.

**Expected behavior**

An administrator must be able to keep the claim lifecycle moving after staff leave (or be prevented from creating the dead-end).

**Actual behavior**

Deactivation succeeds with no assignment check and revokes the analyst’s tokens. The claim keeps `assigned_to` pointing at the inactive analyst. `assign` only accepts `assigned_to === null` (409 otherwise), `decide` only accepts the assigned analyst, and there is no reassignment route. Administrators have no decision override by design. The claim therefore cannot be assigned, decided or returned to the queue by any API path.

**Evidence**

- `Health_Guard-backend/app/Http/Controllers/AdminController.php:34-47` — deactivation has no open-assignment guard.
- `Health_Guard-backend/app/Policies/ClaimPolicy.php:36-39` — `decide` requires `assigned_to === user->id`.
- `Health_Guard-backend/app/Services/ClaimService.php:47-60` — assignment requires `assigned_to === null && status === Pending`.
- `Health_Guard-backend/routes/api.php` — no reassign/unassign endpoint; `docs/ADR.md` records “Resubmission preserves the existing analyst assignment… no reassignment endpoint”.
- Passing tests do not cover deactivation with assigned work; `ProductWorkflowsTest` covers invitation/disable token revocation only.

**Impact**

Claims can silently breach SLA and never reach a decision without direct database intervention, which the operator rules discourage. Clients wait indefinitely; workload reporting still counts the claim against an inactive analyst.

**Likely root cause**

Confirmed: two recorded rules conflict — administrators may deactivate analysts, and claims cannot be reassigned or decided by anyone else.

**Proposed correction**

Owner must choose one: (a) block deactivation while the analyst holds non-final claims and require reassignment first; (b) add an administrator reassignment action that records history and notifies the client/new analyst; (c) allow an administrator decision override (this would reverse the recorded “no admin override” rule); or (d) accept the dead-end and document a manual operator procedure. Recommendation: (a) plus (b), because it preserves assigned-analyst-only decisions. Do not implement any option before the decision is recorded.

**Required regression test**

Depends on the chosen option: either deactivation is refused with a precise message while open assignments exist, or reassignment moves assignment atomically, preserves history and notifies both client and new analyst.

**Owner decision required**

Yes — choose (a), (b), (c) or (d) and record it in `docs/ADR.md`.

**Verification result**

BLOCKED on the owner decision; no implementation exists.

### [FNC-005] Two-factor setup response field does not match the frontend contract

- Type: CONTRADICTION
- Priority: P3 - Low
- Status: FIXED_PENDING_QA
- Affected role(s): analyst, administrator
- Affected workflow: enabling two-factor authentication
- Environment: Not environment-specific
- First observed commit: `20f7601`
- Related findings: —

**Preconditions**

Signed-in staff account without 2FA; open Profile.

**Steps to reproduce**

1. Enter the password and press “Siapkan 2FA”.
2. Compare the response with the rendered setup panel.

**Expected behavior**

`docs/API.md` says setup returns `{secret, uri}` and the user can add the account by scanning/opening the `otpauth://` URI.

**Actual behavior**

The API returns `{secret, uri}` but the page declares and reads `otpauth_url` (`Profile.tsx:30,238`), so only the raw secret is displayed. 2FA still works by manual key entry; no URI/QR is offered and the declared type is false.

**Evidence**

- `Health_Guard-backend/app/Http/Controllers/AccountController.php:69-73` — returns `secret` and `uri`.
- `Health_Guard-frontend/src/app/portal/Profile.tsx:30` and `:238` — `otpauth_url`; only `setup.secret` is rendered at `:265`.

**Impact**

Low: an optional convenience (URI/QR) is silently absent and the frontend type disagrees with the API. No security or workflow is blocked.

**Likely root cause**

Confirmed: field rename on one side only.

**Proposed correction**

Align the field name and either render the `otpauth://` URI (link or QR) or document that only the manual key is supported. Add a contract assertion in the existing 2FA test.

**Required regression test**

Backend assertion on the setup response keys; frontend test that the setup panel renders the expected value from the response.

**Owner decision required**

None — the existing API contract already defines `uri`, or the API doc can be narrowed to `secret` if the owner prefers key-only setup.

**Implementation notes (2026-11-27, Batch 2, commit `8e8fbc8`)**

- `Profile.tsx` now declares the API's actual response (`{secret, uri}`) and renders the `otpauth://` URI as a link (“Buka di aplikasi authenticator” / “Open in authenticator app”) beside the manual key, so scanning or opening the account in an authenticator app is possible without changing the server contract.
- No TOTP algorithm, recovery-code, enable/disable, replay or rate-limit behaviour changed; the response still carries `Cache-Control: no-store`.
- `docs/API.md` already documented `{secret,uri}`; it now also states that the frontend links to the URI.

**Tests added and run (2026-11-27, commit `8e8fbc8`)**

- `ProductWorkflowsTest::test_totp_known_vector_replay_and_recovery_code` now asserts the setup response structure (`secret`, `uri`, no `otpauth_url`) and that `uri` starts with `otpauth://totp/`, then continues through confirm, replay rejection and single-use recovery codes.
- `portal.test.tsx` “two-factor setup panel” mounts `Profile`, submits the setup password and asserts the rendered link's `href` is the returned URI and the secret is displayed.

**Verification result**

`FIXED_PENDING_QA` (2026-11-27, commit `8e8fbc8`, local). Same runs as FNC-003: targeted and full PHPUnit green (187/966, 2 skipped), Pint clean, frontend 40 tests plus typecheck/lint/security/build green. Not verified: opening the URI in a real authenticator app, and any browser or VM run. MySQL-specific migration, import and concurrency behaviour is unverified at this commit

- Type: ENVIRONMENT
- Priority: P2 - Medium
- Status: BLOCKED
- Affected role(s): all, via the intended MySQL 8.4 database
- Affected workflow: migrations, SQLite import, claim-ID sequencing, retention purge
- Environment: MySQL/Compose (Docker VM mode); local suite uses SQLite
- First observed commit: `20f7601`
- Related findings: FNC-007

**Preconditions**

A disposable MySQL 8.4 instance. No MySQL server was available to this pass.

**Steps to reproduce**

1. Run the suite with `DB_CONNECTION=mysql` against a disposable database.
2. Observe the two database-specific skips and the enum/varchar migration path.

**Expected behavior**

The documented default database is MySQL 8.4; migration, import, sequencing, transaction/lock and retention behaviour must be proven there, not only on SQLite.

**Actual behavior**

Not verified at HEAD. Local run: 170 tests, 2 skipped — `test_sqlite_import_preserves_relationships_history_and_next_claim_id` and `test_sqlite_import_rolls_back_all_records_on_invalid_relationship` call `markTestSkipped('Requires isolated MySQL CI database.')`. The only MySQL evidence in the repository is a dated CI record for `c3a2482`, not for `20f7601`, and the `claims.status` enum is altered to a wider column by `2026_06_18_300000_fix_claims_status_column_to_support_partially_approved`.

**Evidence**

- `Health_Guard-backend/tests/Feature/MigrationAndLifecycleTest.php:31-34,73-76`.
- `.github/workflows/ci.yml` has a `backend (mysql)` matrix job; it was not run here.
- `docs/QA.md` reports the last MySQL/CI result for an older revision.

**Impact**

Unknown MySQL-only defects (enum alteration, unique/foreign-key behaviour, row locks, import transaction) would reach the documented deployment target undetected. This is a verification gap, not a confirmed defect.

**Likely root cause**

Environment limitation: SQLite is the local default and the MySQL job needs a service container.

**Proposed correction**

Run the MySQL matrix on the audit commit in CI or against a disposable local MySQL 8.4, then record the exact command and result. Do not run it against persistent data.

**Required regression test**

No new test required; the existing MySQL matrix must actually execute and pass at the commit being verified.

**Owner decision required**

None.

**Verification result**

BLOCKED — no MySQL service available in this environment.

### [FNC-007] Manual VM and Docker VM verification was not performed

- Type: ENVIRONMENT
- Priority: P2 - Medium
- Status: BLOCKED
- Affected role(s): all
- Affected workflow: deployment/runtime verification, restart and persistence
- Environment: Manual VM / Docker VM (both)
- First observed commit: `20f7601`
- Related findings: FNC-006

**Preconditions**

Access to the target VM, or owner-supplied command output. Neither was available; no VM hostname, service manager, PHP/Node versions or checkout path is recorded in the repository.

**Expected behavior**

Manual non-container and container paths are verified separately, with commands and results for the same commit.

**Actual behavior**

Nothing was executed on a VM; no Docker container was started. All runtime evidence in this cycle comes from local SQLite/Node runs on the workstation. `docs/QA.md` describes differences and the Docker path shares one origin, so local results cannot be substituted.

**Evidence**

- No VM access in this session; `docs/repository-cleanup-report.md` records manual VM runtime details as UNKNOWN.
- Commands actually run: PHPUnit (SQLite in-memory), Vitest/RTL, TypeScript, ESLint, Node security tests, Vite build. Playwright was not run.

**Impact**

The functional verdict is limited to code and SQLite-backed tests. Production behaviours such as MySQL locks, Apache/Nginx document denial, persistent storage, mail transport and restart survive-data are unproven at HEAD.

**Likely root cause**

Environment/access constraint, not a code defect.

**Proposed correction**

Owner provides VM access or runs the documented manual commands and returns exact output, then the Docker-on-VM path is verified separately when a release candidate is ready. Keep results labelled by mode.

**Required regression test**

Not automatable; record commands and observed outcomes per mode.

**Owner decision required**

Access or evidence is needed from the owner.

**Verification result**

BLOCKED.

Engineering note (2026-11-27, Batch 1 session): the Azure CLI is authenticated to the expected “Azure for Students” subscription, Terraform `main.tf` state holds no resources and no VM exists, so a temporary apply would have been technically possible. It was not applied because this batch does not require VM runtime proof and `main.tf` is the full deployment stack, not a disposable minimal VM: provisioning clones `/opt/healthguard` on the hard-coded branch `main` and enables a 10-minute `healthguard-sync` timer that fetches `origin/main` and rebuilds. A VM from this configuration cannot stably run a non-`main` engineering branch, and opening HTTP to `*` for a proof already covered by feature tests would exceed the batch scope. Resolving FNC-007 needs either a Test-VM mode in Terraform with a configurable branch and the auto-update timer deferred, or explicit owner instructions for a session where VM evidence is mandatory.

### [FNC-008] Committed `docs/TEST-COVERAGE.md` begins with a mis-encoded line

- Type: DOC_DRIFT
- Priority: P3 - Low
- Status: FIXED_PENDING_QA
- Affected role(s): maintainers and QA readers
- Affected workflow: documentation fidelity of the test-coverage map
- Environment: Not environment-specific
- First observed commit: `1a1e958`
- Related findings: FNC-001

**Preconditions**

None.

**Steps to reproduce**

1. On branch `agent/healthguard/fnc-001-fnc-002`, read the committed blob: `git show HEAD:docs/TEST-COVERAGE.md | head -1`.

**Expected behavior**

The heading reads `# Ticket coverage — 22 November 2026`, as it does on `main`.

**Actual behavior**

The committed heading is `# Ticket coverage â€” 22 November 2026` — UTF-8 bytes `C3 A2 E2 82 AC E2 80 9D` — an em dash decoded as cp1252 and re-encoded. The working copy currently holds the correct characters, but that correction belongs to the uncommitted Stage 0 edits, so the branch commit itself still ships the corruption.

**Evidence**

- `git show HEAD:docs/TEST-COVERAGE.md | sed -n 1p | od -c` → `#   T i c k e t   c o v e r a g e   303 242 342 202 254 342 200 235 ...`
- `git show main:docs/TEST-COVERAGE.md | sed -n 1p` → `# Ticket coverage — 22 November 2026`
- `git grep -n "â€" HEAD` matches only this line, and a `U+FFFD` scan of HEAD found no other replacement characters.

**Impact**

The published coverage map opens with a corrupted heading. The corruption also shows the file was written through a non-UTF-8 path, so later edits to it can silently damage other non-ASCII text.

**Likely root cause**

Confirmed: the Batch 1 edit wrote the file with the console's legacy code page instead of UTF-8.

**Proposed correction**

Commit the already-correct working-copy line as UTF-8 and confirm the blob with `git show HEAD:docs/TEST-COVERAGE.md | head -1 | od -c`. Do not reformat the rest of the file.

**Required regression test**

Not automatable beyond the byte check; a CI step that greps `docs/` for `â€` and `U+FFFD` would prevent recurrence.

**Owner decision required**

None.

**Implementation notes (2026-11-27, Batch 2, commit `8e8fbc8`)**

- The committed blob was rebuilt from `HEAD:docs/TEST-COVERAGE.md` with only line 1 replaced by `# Ticket coverage — 22 November 2026` (UTF-8 `E2 80 94`) and staged directly, so the pre-existing Stage 0 working-copy edits to the same file stayed uncommitted and untouched. `git diff` of the blob against `HEAD` is that one line; no other content moved.

**Verification result**

`FIXED_PENDING_QA` (2026-11-27). `git show HEAD:docs/TEST-COVERAGE.md | sed -n 1p | od -c` → `#   T i c k e t   c o v e r a g e   342 200 224   2 2 ...` (valid UTF-8 em dash). `git show HEAD:docs/TEST-COVERAGE.md | grep -c 'â€'` returns 0 after this commit (it returned 1 at `5d48a41`), and `git grep -c $'\uFFFD' HEAD -- docs` matches nothing. `git grep 'â€' HEAD` now matches only this tracker's own quoted description of the corruption (FNC-008 evidence), not copied content.

### [FNC-009] A reload after a committed-but-unacknowledged submission still creates a duplicate claim

- Type: DATA_INTEGRITY
- Priority: P2 - Medium
- Status: FIXED_PENDING_QA
- Affected role(s): client (creates), analyst (receives the duplicate)
- Affected workflow: claim submission whose response is lost
- Environment: Not environment-specific
- First observed commit: `1a1e958`
- Related findings: FNC-002

**Preconditions**

`/claims/new` with no saved draft, and form data that passes validation.

**Steps to reproduce**

1. Fill the form and press submit.
2. Let the POST reach the server and commit while the response never arrives (offline mode, or a proxy dropping the connection immediately after the request is sent).
3. Reload `/claims/new` and submit the same data again.

**Expected behavior**

The retry continues the existing claim, which FNC-002 now guarantees for a same-page retry.

**Actual behavior**

Two claims. `submissionKey` is created by `useRef` at mount, so a reload generates a fresh key and the server correctly treats it as a new submission; `savedClaim` is component state and is likewise lost.

**Evidence**

- `Health_Guard-frontend/src/app/portal/ClaimForm.tsx:110-114` — key generated per mount and never persisted; `:181-194` — `savedClaim` only set from a received response.
- `Health_Guard-backend/app/Services/ClaimService.php` — dedupes on `(user_id, submission_key)` only; no content-based guard exists.
- Cycle 3 probes confirmed that the same key replays and that distinct keys create distinct claims by design, so the gap is the key's lifetime, not the server rule.

**Impact**

The duplicate-claim outcome FNC-002 was raised for is still reachable through the most common user reaction to a stalled submit. Clients cannot withdraw a claim, and every duplicate notifies all active analysts and enters the review queue.

**Likely root cause**

Confirmed: the idempotency key has a page-session lifetime rather than a form-submission lifetime.

**Proposed correction**

Persist the opaque key across reloads for the same form instance — for example `sessionStorage` containing only the key (no patient data), cleared once the claim ID is known — or bind the key to a server draft created on first submit and reuse the draft ID. Keep the existing per-file retry unchanged.

**Required regression test**

Frontend test: submit, simulate a failed response, remount the form, submit again with the persisted key and assert a single claim (replay 200). Backend replay coverage already exists.

**Owner decision required**

None for the defect; record the chosen persistence rule in `docs/API.md`.

**Implementation notes (2026-11-27, Batch 2, commit `8e8fbc8`)**

- `ClaimForm.tsx` no longer creates the key in `useRef` at mount. The key is created lazily on the first POST and persisted in `sessionStorage` under `healthguard.claim-submission-key` — only the opaque UUID, never a name, amount, date, provider or any other claim field — so a reload of `/claims/new` (with or without a draft) sends the same key and the Batch 1 server rule replays the existing claim with 200. `sessionStorage` is per tab, so two tabs of the same client still create two independent claims by design.
- The key is removed as soon as the API returns the claim, so a later, genuinely new submission in the same tab gets a fresh key and cannot replay onto an already acknowledged claim. Edit mode (`/claims/:id/edit`) never creates one. If storage is unavailable the key stays in memory and behaviour degrades to the Batch 1 per-page-session rule.
- Per-file upload retry, the draft linkage and the server-side replay/unique-index rules are unchanged.
- `docs/API.md` records the key lifetime, that only the key is stored and that it is cleared when the claim is returned.

**Tests added and run (2026-11-27, commit `8e8fbc8`)**

- `portal.test.tsx` “submission key lifetime / replays the same key after a reload when the response was lost”: submits a loaded draft with a failing response, unmounts, remounts and submits again; both POSTs carry the same `submission_key`, and the `sessionStorage` contents contain no patient data.
- `portal.test.tsx` “clears the key once the server acknowledges the claim”: the stored key is gone after a 200.
- Server-side replay, one-history-entry, one-notification-set, draft retirement and claim-number coverage remains the Batch 1 `ClaimSubmissionIdempotencyTest` (still green in the full run).

**Verification result**

`FIXED_PENDING_QA` (2026-11-27, commit `8e8fbc8`, local). Frontend 40 Vitest tests pass (typecheck/lint clean); backend full suite 187/966 with 2 MySQL-only skips, so the server contract the replay depends on is still green. Not verified: a real browser reload against a live API, Playwright/E2E, and any VM run. Concurrency of two simultaneous POSTs still rests on the Batch 1 unique index, which was verified by inspection only (FNC-006).

### [FNC-010] Profile-photo rejections list DOC/DOCX as acceptable formats

- Type: CONTRADICTION
- Priority: P3 - Low
- Status: FIXED_PENDING_QA
- Affected role(s): client, analyst, administrator (own profile photo)
- Affected workflow: profile photo upload
- Environment: Not environment-specific
- First observed commit: `1a1e958`
- Related findings: FNC-001

**Preconditions**

Signed in; open Profile, or call the endpoint directly.

**Steps to reproduce**

1. `POST /api/user/photo` with a `.docx` or `.doc` file.

**Expected behavior**

The rejection names only the formats a photo may have: JPG, JPEG, PNG.

**Actual behavior**

HTTP 422 with three messages, the last reading “The photo contents must match its PDF, JPG, JPEG, PNG, DOC, or DOCX extension.” The upload is correctly refused; only the explanation is wrong.

**Evidence**

- `Health_Guard-backend/app/Rules/SafeUpload.php:51` — one unconditional message for every caller.
- `Health_Guard-backend/app/Rules/SafeUpload.php:46` — `imagesOnly` narrows the allowed map to jpg/jpeg/png.
- `Health_Guard-backend/app/Http/Requests/ProfilePhotoRequest.php:17` — `new SafeUpload(imagesOnly: true)`.
- Cycle 3 probe: `POST /api/user/photo` with `photo.docx` → 422 `{"photo":["The photo field must be an image.","The photo field must be a file of type: jpg, jpeg, png.","The photo contents must match its PDF, JPG, JPEG, PNG, DOC, or DOCX extension."]}`.

**Impact**

Low: the user is told a Word document is acceptable for a profile photo in the same response that refuses one, which invites a pointless retry. Nothing is wrongly accepted.

**Likely root cause**

Confirmed: Batch 1 widened the shared message without branching on `imagesOnly`.

**Proposed correction**

Derive the message from the allowed set for the current mode (or pass a label into the rule), leaving the claim-evidence wording unchanged.

**Required regression test**

Extend the existing profile-photo rejection test to assert the message names only JPG/JPEG/PNG, while the document test keeps asserting DOC/DOCX in its message.

**Owner decision required**

None.

**Implementation notes (2026-11-27, Batch 2, commit `8e8fbc8`)**

- `SafeUpload` now derives the failure sentence from the caller's mode: `imagesOnly` says “must match its JPG, JPEG, or PNG extension”, claim evidence keeps “PDF, JPG, JPEG, PNG, DOC, or DOCX”. The accepted sets, signatures, container checks and the 10 MB / 2 MB limits are untouched, so only the explanation changed.
- `docs/API.md` also corrects the profile-photo row to JPG/JPEG/PNG (it listed “JPG/PNG”).

**Tests added and run (2026-11-27, commit `8e8fbc8`)**

- `SecurityUploadTest::test_profile_photo_rejection_names_only_image_formats`: a real DOCX photo is 422 and the message contains “JPG, JPEG, or PNG” and neither “DOC” nor “PDF”, with public storage still empty.
- `SecurityUploadTest::test_document_rejection_still_names_document_formats`: a non-Word ZIP named `.zip` on the claim endpoint is 422, the message still names “PDF, JPG, JPEG, PNG, DOC, or DOCX”, and neither private storage nor the `documents` table gained a row.
- The existing `invalidPhotos` provider gained a `Word document` case (`photo.docx` with real DOCX bytes).

**Verification result**

`FIXED_PENDING_QA` (2026-11-27, commit `8e8fbc8`, local SQLite/Windows). Targeted PHPUnit 50 tests / 260 assertions / 2 skipped OK; full backend 187 tests / 966 assertions / 2 skipped OK; Pint clean. Not verified: a browser upload of a DOCX photo against the running API, and any VM run.

### Owner decisions required

#### [FNC-004] Claims assigned to a deactivated analyst

An administrator can deactivate an analyst who still holds assigned claims, while only the assigned analyst may decide and there is no reassignment route. Claims become permanently undecidable through the API. Choose and record one rule in `docs/ADR.md` before engineering proceeds:

- **(a)** Refuse deactivation while the analyst holds non-final claims (safest, smallest change).
- **(b)** Add administrator reassignment that preserves history and notifies the client and new analyst (keeps assigned-analyst-only decisions).
- **(c)** Allow an administrator decision override (reverses the recorded “no admin override” rule).
- **(d)** Accept the dead-end and document an operator procedure.

Recommendation: (a) plus (b). No implementation is assigned until the owner chooses.

### Cycle history

| Cycle | Date | Agent role | Commit SHA | Work performed | Outcome / next action |
|---|---|---|---|---|---|
| 0 | 2026-11-27 | Setup | Repository snapshot | Created this audit process. No application code inspected or modified by this document. | Start Phase 0 with Prompt A. |
| 1 | 2026-11-27 | Prompt A — independent QA auditor | `20f7601dd7e035a1d87ebceca340926ca24e0a33` | Initial functional audit: read README/ADR/API/QA/cleanup report, routes, controllers, service, policies, enums, requests, resources, models, migrations, frontend routes/context/pages/shared utilities, Compose/Docker/CI, and the test suites. Ran PHPUnit (170/864, 2 skipped), Vitest (34), typecheck, ESLint, Node security tests, Vite build, and a Tinker upload-validation probe. Reconstructed the role, lifecycle, document, notification, payment and retention flows. | 7 findings: 2 P1 READY (FNC-001, FNC-002), 1 P1 owner decision (FNC-004), 1 P2 READY (FNC-003), 1 P3 READY (FNC-005), 2 P2 BLOCKED environment gaps (FNC-006, FNC-007). No P0. Next: Prompt B Batch 1 = FNC-001 + FNC-002; then Prompt A post-engineering QA. |
| 2 | 2026-11-27 | Prompt B — implementation engineer | `1a1e958f2aea0513a4895d69f05edd4d7441401a` on `agent/healthguard/fnc-001-fnc-002` | Batch 1 only: FNC-001 (single DOC/DOCX-aware upload whitelist with container validation) and FNC-002 (submission key + unique index + in-transaction draft retirement, 200 replay). Added `ClaimSubmissionIdempotencyTest`, extended `SecurityUploadTest` and `portal.test.tsx`, updated `docs/API.md` and `docs/TEST-COVERAGE.md`. Ran targeted PHPUnit (35/165), full PHPUnit (183/938, 2 skipped), Pint, Vitest (35), typecheck, ESLint, security tests and Vite build. | Both findings `FIXED_PENDING_QA`. No VM/Docker/MySQL run; Terraform not applied (see FNC-007 note). Next: Prompt A independent QA of FNC-001 and FNC-002 on `1a1e958`. |
| 3 | 2026-11-27 | Prompt A — independent QA and regression | `1a1e958` (code) / `5d48a41` (evidence commit); tracker edited on `agent/healthguard/fnc-001-fnc-002` | Batch 1 QA only: inspected the full diff, re-read `SafeUpload`/`ClaimService`/`ClaimInputRequest`/`ProfilePhotoRequest`/`ClaimForm`, and re-ran backend PHPUnit (183/938, 2 skipped), Pint (9 files), Vitest (35), typecheck, ESLint, security tests and the Vite build. Wrote and deleted two throwaway probe classes covering changed-payload replay, a foreign surviving draft, a DOCX missing `[Content_Types].xml`, DOCX/DOC on the photo endpoint, and the photo error payload. | FNC-001 and FNC-002 `VERIFIED`. Three new findings: FNC-008 (P3 mis-encoded coverage-doc line), FNC-009 (P2 reload after a lost response still duplicates), FNC-010 (P3 photo message names DOC/DOCX). No regressions in the existing suites. Next: owner decides FNC-004; Prompt B Batch 2. |
| 4 | 2026-11-27 | Prompt B — implementation engineer | `8e8fbc8` on `agent/healthguard/fnc-001-fnc-002` | Batch 2 only: FNC-003 (frontend accepts the API origin the signed link uses, still rejects foreign origins/paths/unsigned links), FNC-005 (setup panel declares and renders `uri`), FNC-008 (committed coverage heading restored as UTF-8 without touching the Stage 0 working copy), FNC-009 (opaque submission key persisted in `sessionStorage` until the claim is acknowledged), FNC-010 (upload rejection text scoped to the caller's formats). Added two backend tests, three frontend tests, extended the photo provider, updated `docs/API.md`. Ran targeted PHPUnit (50/260, 2 skipped), full PHPUnit (187/966, 2 skipped), Pint, Vitest (40), typecheck, ESLint, security tests and Vite build. | All five `FIXED_PENDING_QA`. No VM, Docker, MySQL, Playwright or browser run: `main.tf` hard-codes `BRANCH=main`, so no session VM was provisioned and Terraform was not applied or destroyed. Next: Prompt A independent QA of Batch 2 at `8e8fbc8`. |

### Engineering batches

#### Batch 2 — next assignment (Prompt B)

**STATUS: IMPLEMENTED — `FIXED_PENDING_QA` at `8e8fbc8`; awaiting independent QA.** Batch 1 is closed: FNC-001 and FNC-002 are `VERIFIED` (cycle 3).

Assign only these finding IDs; everything else is out of scope.

**FNC-003 — email verification link origin (P2)**

- Acceptance: the link generated with `APP_URL` at the API origin and `FRONTEND_URL` at the frontend origin verifies the account when opened from the frontend page; a foreign origin, a missing signature and a tampered signature are still rejected; the chosen origin rule is stated in `docs/API.md`.
- Regression scope: `AppServiceProvider` link generation, `routes/api.php`, `Profile.tsx` guard, `vite.config.ts` proxy, existing auth/security tests.
- Exclusions: no change to signature lifetime, no new mail provider, no change to the signed middleware.

**FNC-005 — two-factor setup response field (P3)**

- Acceptance: frontend and API agree on the setup response (`secret`, `uri`); the `otpauth://` URI is rendered, or the API contract is narrowed to key-only; a contract assertion covers the response keys.
- Regression scope: `AccountController` setup/confirm/recovery, `Profile.tsx` setup panel, existing 2FA tests, `docs/API.md`.
- Exclusions: no change to the TOTP algorithm, recovery codes or enable/disable rules.

**FNC-008 — mis-encoded `docs/TEST-COVERAGE.md` line (P3)**

- Acceptance: `git show HEAD:docs/TEST-COVERAGE.md | head -1` is valid UTF-8 with an em dash (the working copy already holds the correct text, so committing it clears the defect), and no other non-ASCII line in the file is corrupted.
- Regression scope: that single file; do not rewrite unrelated content.
- Exclusions: no content changes beyond restoring the intended characters.

**FNC-009 — reload after a lost response still duplicates a claim (P2)**

- Acceptance: submit, lose the response, reload `/claims/new`, submit again → one claim, one `submitted` history entry and one notification set; the mechanism stores no patient data.
- Regression scope: `ClaimForm` key lifecycle, `POST /claims` replay, draft linkage, `portal.test.tsx`, `upload-recovery.spec.ts`.
- Exclusions: no change to claim fields or statuses; no PHI in `localStorage`; no new background job.
- Note: persisting only the opaque key in `sessionStorage`, or reusing a server draft as the key, are both acceptable; record the chosen rule in `docs/API.md`.

**FNC-010 — profile-photo rejection text names DOC/DOCX (P3)**

- Acceptance: the `imagesOnly` failure message names only JPG/JPEG/PNG; the claim-evidence message keeps DOC/DOCX.
- Regression scope: `SafeUpload`, `ProfilePhotoRequest`, `DocumentUploadRequest`, the photo and document cases of `SecurityUploadTest`.
- Exclusions: no change to the accepted sets themselves.

#### Batch 1 — closed (FNC-001, FNC-002 `VERIFIED`)

Assign only these finding IDs; everything else is out of scope.

**FNC-001 — unify the accepted document types**

- Acceptance: the server, picker/`validateFile`, both UI copy strings, the Guide, `docs/API.md` and tests state and enforce the same set; a valid DOCX and DOC upload persist with their claim/history/request side effects; an executable, empty, oversized or MIME-mismatched file is still rejected; PDF/JPG/PNG behaviour is unchanged.
- Regression scope: `DocumentUploadRequest`, `SafeUpload`, document upload on new claim and on claim detail, analyst message attachment, document-request fulfilment, `SecurityUploadTest`, frontend `portal.test.tsx` file validation.
- Exclusions: no new document viewer, no storage redesign, no change to the 10 MB limit, no change to private storage or download authorization.

**FNC-002 — make claim submission idempotent and retire the draft**

- Acceptance: replaying a submission (same draft or same client submission key) yields exactly one claim, one `submitted` history entry and one notification set; after a claim is created its draft can no longer produce another claim; a failed document upload still retries against the same claim without duplicate documents.
- Regression scope: `POST /claims`, `DraftController`, `ClaimService::create`, `ClaimForm` save/submit/retry, `upload-recovery.spec.ts`, draft privacy and ownership tests, claim-ID sequencing.
- Exclusions: no change to the claim fields, statuses, amounts or resubmission rules; no new background job; no change to draft privacy or the no-PHI-in-localStorage rule.
- Requires `docs/API.md` to state the replay behaviour and its response code.

Batch 1 is closed; the same exclusions carry into future batches. FNC-004 must not be implemented before the owner decision is recorded, and FNC-006/FNC-007 stay blocked on environment access.

## 13. Final functional acceptance criteria

Do not call the project functionally complete merely because the existing improvement backlog is closed.

The owner and QA should agree that:

- [ ] Every major client, analyst, and administrator workflow has been mapped.
- [ ] Critical and high-priority findings are verified or explicitly accepted by the owner.
- [ ] No known P0 security, privacy, authorization, or data-integrity issue remains.
- [ ] No known P1 issue blocks a core workflow or creates materially contradictory records.
- [ ] Claim lifecycle transitions and business rules are documented and enforced consistently.
- [ ] Important side effects, including history, documents, and notifications, are consistent with the underlying operation.
- [ ] Backend and frontend tests assert meaningful outcomes, not just successful responses or rendering.
- [ ] Regression tests cover every repaired finding that can be automated.
- [ ] Manual VM and Docker VM verification are separately recorded.
- [ ] MySQL persistence, backup/restore, and deployment-specific behavior are verified in the appropriate disposable or approved environment.
- [ ] Remaining P2/P3 issues, provider configuration, operational decisions, performance limits, and accessibility limitations are visible and explicitly accepted or scheduled.
- [ ] The README and relevant operational/API documentation accurately reflect the actual shipped behavior.

Functional acceptance is not the same as production readiness, regulatory compliance, security certification, or approval to process real health/insurance data.
