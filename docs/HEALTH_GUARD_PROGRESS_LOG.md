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
