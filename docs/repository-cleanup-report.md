# Repository cleanup report — Stage 0

**Date:** 2026-11-27
**Status:** CLEANED WITH CAVEATS
**Branch / HEAD at start:** `main` @ `20f7601`, working tree clean except the untracked
`docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md`
**Scope:** documentation and repository hygiene only. No application code, schema, API, business rule,
Terraform, Compose, Docker or CI change was made. Nothing was committed, pushed or deployed.

## 1. Summary

The repository was not short of documentation; it had four competing records of the same work and two
closed backlogs that both presented themselves as current. The cleanup:

- turned the root README from a 409-line manual into a 189-line landing page and navigation index;
- reduced the active documentation set to eight current documents plus one active audit tracker;
- moved the two finished, superseded documentation cycles into `docs/archive/` with status banners,
  keeping all original text (nothing was deleted without a preserved copy);
- repaired every reference to the moved files and every broken internal path found;
- recorded the owner's real development workflow (manual run on a VM, no Docker Desktop) as a
  first-class mode next to the container mode;
- corrected one wrong repository URL, one wrong audit-tracker filename, and one duplicated decision table.

## 2. Documentation structure

### Before

```text
README.md                                    409 lines, product manual + runbook + test status
IMPROVEMENT.md                               903 lines, 64-ticket backlog claiming "closed"
DOCKER.md                                     69 lines, container runbook
docs/ADR.md                                   20 lines, decisions
docs/API.md                                   97 lines, API contract
docs/QA.md                                   226 lines, QA guide + dated session records
docs/TEST-COVERAGE.md                        112 lines, ticket-to-test map
docs/RETENTION.md                             13 lines
docs/IMPLEMENTATION.md                       241 lines, dated evidence for IMPROVEMENT.md
docs/HEALTH_GUARD_IMPROVEMENTS.md            304 lines, second backlog (23 tickets) + own tracker
docs/HEALTH_GUARD_PROGRESS_LOG.md            230 lines, chronological log
docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md      589 lines, Stage A tracker (untracked)
Health_Guard-backend/README.md               427 lines
Health_Guard-frontend/README.md              323 lines
```

Problems: three independent "progress/status" records for the same November work; two closed backlogs
with separate trackers; the README presented historical test counts as current status; the audit
tracker pointed at a filename that does not exist.

### After

```text
README.md                                    landing page, architecture, three run modes, navigation
DOCKER.md                                    VM/manual vs container modes, Compose, migration, backup/restore, production
IMPROVEMENT.md                               HISTORICAL banner, closed 2026-11-26
docs/ADR.md                                  CURRENT — canonical decisions and metric definitions
docs/API.md                                  CURRENT — canonical HTTP contract
docs/RETENTION.md                            CURRENT — retention and deletion
docs/QA.md                                   CURRENT — verification procedure + dated session records
docs/TEST-COVERAGE.md                        CURRENT — ticket-to-test map
docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md      ACTIVE — the only functional findings tracker
docs/repository-cleanup-report.md            this report
docs/archive/implementation-evidence-2026-11.md     HISTORICAL — dated test evidence
docs/archive/hg-backlog-and-progress-2026-11.md     HISTORICAL — earlier 23-ticket cycle + progress log
Health_Guard-backend/README.md               CURRENT — PHP setup, API layers, ERD
Health_Guard-frontend/README.md              CURRENT — Node setup, routes, components, tests
```

Rule now in force: one topic, one document. Decisions in ADR, HTTP contract in API, container
operations in DOCKER.md, per-app internals in the app READMEs, history in `docs/archive/`.

## 3. Files created, modified, moved, archived, deleted

| File | Action | Reason |
|---|---|---|
| `README.md` | rewritten | Now an accurate landing page and index. Removed the duplicated secrets/config/CI/status material that belongs in DOCKER.md, ADR, API and the app READMEs; kept one canonical topology diagram instead of four. |
| `DOCKER.md` | modified | Added `## Mode operasi` distinguishing manual-without-Docker from Docker-on-VM, recording that Docker Desktop is not a prerequisite and that VM runtime details are UNKNOWN; repaired the evidence link. |
| `IMPROVEMENT.md` | modified | Added a HISTORICAL/CLOSED banner (closed 2026-11-26, 64/64) pointing to the active audit tracker, ADR and the archived evidence. Content untouched. |
| `docs/QA.md` | modified | Added a CURRENT role banner; evidence references now point to the archive. |
| `docs/TEST-COVERAGE.md` | modified | Added a CURRENT role banner; evidence references now point to the archive. |
| `docs/ADR.md` | modified | Declared canonical for decisions so other documents point here instead of copying the table. |
| `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md` | modified | Fixed its own wrong filename in the A/B prompts (5 references), corrected the archived evidence path, added a pointer that ADR holds the canonical decisions, and recorded branch/HEAD/working-tree baseline facts. Phase status left `NOT STARTED`; no audit work was started. |
| `Health_Guard-backend/README.md`, `Health_Guard-frontend/README.md` | modified | Evidence link repointed to the archive. |
| `.gitignore` | modified | Added `.DS_Store`, `Thumbs.db`, `.idea/`, `*.swp` (no ignore rule removed or weakened). |
| `docs/IMPLEMENTATION.md` → `docs/archive/implementation-evidence-2026-11.md` | moved + banner | Historical dated evidence, not current specification. Full text preserved. |
| `docs/HEALTH_GUARD_IMPROVEMENTS.md` + `docs/HEALTH_GUARD_PROGRESS_LOG.md` → `docs/archive/hg-backlog-and-progress-2026-11.md` | merged, originals removed | Superseded by `IMPROVEMENT.md` and its evidence; both files were one cycle. Both bodies kept verbatim under "Bagian 1/2"; the wrong repository URL was corrected and noted. |
| `docs/repository-cleanup-report.md` | created | This report, required by the Stage 0 brief. |

No application source, migration, test, Dockerfile, Compose, Terraform or CI file was modified.

## 4. Contradictions found and how they were resolved

| Contradiction | Resolution | Canonical now |
|---|---|---|
| The README treated Docker Engine/Desktop as the prerequisite for running the project, while the owner develops by running the app directly on a VM without Docker Desktop. | Manual mode is now path 1 in the README; DOCKER.md states Docker Desktop is not a prerequisite and separates manual VM mode from Docker VM mode, with results not transferable between them. | `README.md` §Menjalankan aplikasi, `DOCKER.md#mode-operasi` |
| The README presented 64/64 backlog closure and 22 November test counts as project status; the owner's tracker states that is historical evidence, not proof the workflows are correct. | README status block now says the functional audit is running, and that all test numbers are dated evidence for a recorded revision. | `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md` |
| Two closed backlogs (`IMPROVEMENT.md` 64 tickets, `docs/HEALTH_GUARD_IMPROVEMENTS.md` 23 tickets) each had its own tracker and both claimed completion. | The earlier cycle was archived as one file; `IMPROVEMENT.md` was marked HISTORICAL/CLOSED. Only the audit tracker is active. | `IMPROVEMENT.md` banner + audit tracker |
| Three overlapping evidence records (`docs/IMPLEMENTATION.md`, `docs/HEALTH_GUARD_PROGRESS_LOG.md`, QA execution records in `docs/QA.md`) described the same November sessions. | Implementation evidence and the progress log were archived; `QA.md` keeps the reusable procedure plus its dated records and points to the archive for detail. No record was lost. | `docs/QA.md` (procedure), `docs/archive/` (evidence) |
| The audit tracker's own prompts told the agent to read and update `docs/FUNCTIONALITY_AUDIT.md`, which does not exist. | All five references corrected to `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md`. | `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md` |
| The progress log named the repository `TMRakaP26/Health_Guard`. | Corrected to `TMRakaP26/Health-Guard-Claim-Asurance` and noted in the archive banner. | repository remote |
| The audit tracker's "decisions that must not be silently reversed" duplicated `docs/ADR.md`. | ADR declared canonical; the tracker table is now labelled a working summary that must defer to ADR and report differences as `CONTRADICTION`. | `docs/ADR.md` |
| The README called `docs/IMPLEMENTATION.md` the implementation document, although it is a historical evidence log. | Repointed to the archive and described as dated evidence. | `docs/archive/implementation-evidence-2026-11.md` |
| Documentation mixed "Health Guard" and "HealthGuard", and mixed Indonesian/English. | New and edited text uses **HealthGuard**; existing Indonesian documents were kept in Indonesian, and the two English legacy documents keep their original wording as archived text. | `README.md` |

Observed but deliberately left alone (historical text, no runtime effect): `IMPROVEMENT.md` §1 item 7
still warns against copying `Health_Guard-frontend/_gen/`, a directory that no longer exists in the
repository, and `composer.json` still carries Laravel skeleton metadata (`name`, `description`).

## 5. Unverified claims and owner decisions

Unverified (stated as such in the documents, not silently fixed):

- Manual-VM runtime details (PHP, Node, MySQL versions, service manager, checkout path) — **UNKNOWN**,
  not recorded anywhere in the repository.
- Current MySQL/Compose, persistence and restore behaviour on the current revision — the last proof
  predates later commits; not re-run here (no Docker used, per the owner's workflow).
- Screen-reader behaviour, native OS file picker, real 200% browser zoom, live SMTP, load behaviour and
  live cutover — unchanged, still unproven.
- Every test count in the repository remains dated evidence for its recorded revision, not for HEAD.
- Nothing in the application was executed during this stage, so no runtime behaviour was verified.

Owner decisions required:

1. **Commit the audit tracker.** `docs/HEALTHGUARD_FUNCTIONALITY_AUDIT.md` is still untracked. It should
   be committed before Stage A so findings survive; this stage did not commit anything.
2. **Tracked conversation export.** `.cloud-attachments/imported-conversation-544218a2…json` (664 KB)
   is tracked and looks accidentally committed. It was left untouched because it is owner data. Decide
   whether to untrack it.
3. **Archive retention.** Nothing was deleted: the archive keeps both superseded cycles verbatim. Confirm
   that keeping `docs/archive/` is acceptable long term, or authorise deleting the archive files later.
4. **Local Terraform state.** `terraform.tfstate` and `terraform.tfstate.backup` exist locally with
   sensitive values. They are already gitignored and untracked; they were not read or modified. Keep them
   out of the repository and rotate anything exposed if they were ever shared.

## 6. Commands and checks run

| Check | Command | Result |
|---|---|---|
| Git state before edits | `git branch --show-current`, `git status --short`, `git log --oneline -15`, `git remote -v` | `main`, clean except the untracked tracker, HEAD `20f7601` |
| File inventory | `git ls-files` / `git status --porcelain --ignored` | 226 tracked files; ignored artifacts are `vendor/`, `node_modules/`, `dist/`, `slide/`, `.terraform/`, `*.tfstate`, browser test output, Laravel caches — all correctly ignored |
| Documentation survey | per-file line/byte counts, heading extraction | sizes and overlaps recorded in §2 |
| Reference inventory | `grep -rn` for links, `IMPLEMENTATION.md`, `HEALTH_GUARD_*`, `FUNCTIONALITY_AUDIT`, repository URLs | found the broken paths and the wrong URL listed in §4 |
| Manifest fact-check for README claims | `package.json`, `composer.json`, `vite.config.ts`, `compose.yaml`, `.env.example`, `ci.yml`, `.gitattributes` | versions, proxy targets, ports, flags and CI job names in the new README match the files |
| Internal link/path check after edits | see the checker run recorded in the session (`tsv`/`awk` over every tracked `*.md`) | see §6.1 |
| Change review | `git status --short`, `git diff --stat` | only documentation, `.gitignore` and the archive moves; no source, config, Terraform or CI file touched |

Not run, by design: PHPUnit, Vitest, Playwright, Pint, ESLint, `tsc`, Docker Compose and Terraform plan.
No application code or configuration changed, so those suites would not exercise this change; running
them would not prove anything about documentation. The audit's Stage A is where runtime evidence belongs.

### 6.1 Link and path verification

A Node script walked all 14 Markdown files in the repository (excluding `node_modules`, `vendor`,
`.terraform`, `slide`), resolved every relative link against the directory of the file that contains it,
and checked every anchor against the headings of the target file.

**Result: 124 relative links checked, 9 anchors verified, 0 broken paths, 0 broken anchors.**

Git reported only line-ending normalisation warnings for the edited Markdown (the repository keeps CRLF
in the working tree with `core.autocrlf=true`); no content was altered by it.

## 7. Functional issues deferred to Stage A

Observations only — none was fixed here, and none is a confirmed defect yet:

1. `docs/QA.md` and the archived evidence cite `playwright-report/index.html` and `test-results-final/`,
   which are gitignored and absent from a fresh clone. QA evidence is therefore not reproducible from the
   repository alone; Stage A should record reproducible commands instead of artifact paths.
2. The client-side XLSX conversion consumes the server-generated full-filter CSV
   (`ClaimList.tsx` + SheetJS). Whether export covers the entire filtered dataset for large pages, and
   whether numbers stay numeric, needs an end-to-end check with a seeded dataset.
3. `main.tf` bootstrap makes the frontend publicly reachable on port 80 without TLS, and stores sensitive
   state locally. Infrastructure is out of scope for Stage 0 and must not be changed here; verify the
   deployment path in Stage A only as far as the owner authorises.
4. `Health_Guard-backend/` still carries Laravel asset scaffolding (`package.json`, `package-lock.json`,
   `vite.config.js`, `resources/`) while the UI lives in `Health_Guard-frontend/`. Confirm nothing in the
   backend build depends on it before treating it as dead weight.
5. `docs/API.md`, `docs/ADR.md` and the backend README describe behaviour (immutable history, assigned-
   analyst-only decisions, private documents, resubmission preserving notes and assignment). Stage A must
   verify each against the code rather than trusting these documents.

## 8. Next step

Run **Stage A** (functional audit) with **Prompt A** from
[`HEALTHGUARD_FUNCTIONALITY_AUDIT.md`](HEALTHGUARD_FUNCTIONALITY_AUDIT.md), updating only that file with
findings, evidence and statuses. Do not start Stage B (engineering repair) until Prompt A has produced a
bounded batch of finding IDs. Before that, commit this cleanup and the tracker so the audit has a stable
baseline.
