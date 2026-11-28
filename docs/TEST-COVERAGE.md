# Ticket coverage — 22 November 2026

> **Status: CURRENT — peta kriteria tiket ke tes otomatis.** Berlaku untuk suite dan nama tes saat ini;
> angka kelulusan di bawah adalah bukti bertanggal 21–22 November 2026 pada revisi yang dicatat.
> Bukti lengkap: [archive/implementation-evidence-2026-11.md](archive/implementation-evidence-2026-11.md).
> Temuan fungsional aktif: [HEALTHGUARD_FUNCTIONALITY_AUDIT.md](HEALTHGUARD_FUNCTIONALITY_AUDIT.md).

## Revised automated acceptance

Final result on 22 November: **9/9 E2E passed**; after the validation-summary correction,
**2/2 targeted QA tests passed** and typecheck/lint/33 component tests/build passed again.
The unchanged backend passed 167 tests (2 database-specific skips, 859 assertions), Pint
and 5 cookie-security tests passed. TEST-05, UX-10 and BL-12 are closed under this revised scope.

On 22 November the user requested agent-run QA without manual testing. The following map
replaces the previous manual acceptance gates for TEST-05, UX-10 and BL-12. Historical manual
requirements below describe the earlier scope; they do not claim unperformed tests passed.

| QA scenario | Executable evidence |
|---|---|
| Registration/login, authorization and validation | claims-matrix.spec.ts; SecurityAuthTest, SecurityAuthorizationTest, ValidationBoundaryTest |
| All decisions, resubmission, history, notification navigation, direct URL/reload | claims-matrix.spec.ts; workflows.spec.ts; ProductWorkflowsTest; navigation.test.tsx |
| Profile/photo/password | profile-admin.spec.ts; AuthTest, SecurityUploadTest, SecurityAuthTest; ProductWorkflowsTest password reset |
| Draft resume and upload recovery without duplicates | workflows.spec.ts; upload-recovery.spec.ts; portal.test.tsx |
| Pagination/filter/export across more than one page | portal.test.tsx; ProductWorkflowsTest::test_filters_stats_and_export_cover_all_pages_and_escape_formulas |
| Admin/catalog/payment/invitation/2FA/retention guards | profile-admin.spec.ts; ProductWorkflowsTest |
| Loading, failed network request, retry, empty result and revoked session | qa-states.spec.ts; navigation.test.tsx; api-client.test.ts |
| Keyboard client/analyst, dialogs, preview, responsive widths, reduced motion | keyboard.spec.ts; workflows.spec.ts; profile-admin.spec.ts |
| ID/EN labels, invalid-field semantics, alert, current step, focus and axe | qa-states.spec.ts; portal.test.tsx; profile-admin.spec.ts; keyboard.spec.ts |

Browser tests validate the UI against a disposable real backend except deliberate network
interception for loading/failure states. Some operational workflows are verified at API level,
not through every UI control. No actual screen-reader speech, OS picker interaction, browser
zoom 200%, live SMTP, production MySQL or deployment-capacity claim follows from this map.

This map links the original IMPROVEMENT.md criteria to the current portal implementation.
The old ProtectedRoute, ClaimContext and NotificationBell components have been replaced by
Shell, API hooks in shared.tsx, ClaimForm/ClaimDetail, and Shell/Notifications respectively.
Tests exercise the replacements rather than adding tests for removed components.

## TEST-02: backend boundaries

| Original field / criterion | Executable coverage |
|---|---|
| name: missing, empty, whitespace, 255/256 | ValidationBoundaryTest::registrationCases |
| email: missing, invalid, normalized mixed case, duplicate, length | registrationCases; test_duplicate_email_is_rejected_after_normalization (254/255-character addresses and oversized address; domain-label syntax also applies) |
| password: missing, 7/8, confirmation | registrationCases |
| role: omitted/client/analyst | registrationCases; SecurityAuthTest |
| client_name, type, provider_name | claimCases: missing, empty, whitespace, 255/256 |
| amount | claimCases: missing, zero, negative, nonnumeric, decimals, precision, minimum, configured maximum and overflow |
| BPJS | claimCases: omitted, empty, 30/31 |
| approved_amount | decisionCases: missing, null, empty, negative, zero, over billed, invalid numeric/precision, minimum, equal to billed |
| status | decisionCases: all five strings, empty, missing, wrong case, unknown |
| notes | decisionCases: null, empty, normal, 4000/4001; mandatory notes for Rejected/Needs Info |
| per_page | paginationCases: default, 1, 100, 0, 101, negative, nonnumeric |
| document | SecurityUploadTest: actual-byte PDF/PNG/JPEG/DOCX/DOC, non-Word ZIP renamed .docx, DOC with PDF bytes, MIME mismatch, executable, empty, exact 10 MB and one byte over; DOCX fulfils a document request and records history |
| photo | SecurityUploadTest: PNG/JPEG, GIF/WebP rejection, MIME mismatch, empty, exact 2 MB and one byte over |
| claim/document IDs | ValidationBoundaryTest unknown/malformed IDs; SecurityAuthorizationTest ownership and document/claim mismatch; ProductWorkflowsTest history ownership |
| Failed mutations | ValidationBoundaryTest asserts no claim/history/notification is created for rejected input |
| Claim submission replay | ClaimSubmissionIdempotencyTest: replayed key → one claim/history/notification and 200, no consumed claim number; distinct keys/users; draft retired after creation; foreign draft 404; missing key keeps legacy behaviour |

## TEST-04: components and browser scenarios

| Original criterion | Executable coverage |
|---|---|
| Auth restore/login/logout | auth.test.tsx; api-client.test.ts covers actual Axios 401/reauthenticate interception |
| Route protection | navigation.test.tsx: guest redirect with return URL, allowed client content, analyst denied client form |
| Claim API data/state | portal.test.tsx: server pagination/totals, detail by URL; browser/backend lifecycle tests cover mutation/refetch and resubmission resets |
| Form validation, files, drafts, retry | portal.test.tsx; workflows.spec.ts; claims-matrix.spec.ts |
| Upload recovery across real browser/API requests | upload-recovery.spec.ts: remove one of three PDFs, abort second upload, stay in unsaved dialog, retry same claim, assert one creation and no duplicate uploaded files/history |
| Step focus and keyboard order | portal.test.tsx: next/back heading focus and aria-current; keyboard.spec.ts: heading focus then Tab to Provider |
| Profile/admin QA and broader axe checks | profile-admin.spec.ts: saved profile fields and provider survive reload; axe on profile/drafts/notifications/guide; admin at 390/768/1440 px and distinct pagination names in ID/EN |
| Notifications | navigation.test.tsx: unread count, single/all read, immediate count refresh, navigation even when mark-read fails; claims-matrix.spec.ts end-to-end |
| Status and history | portal.test.tsx: all five badges; actor/transition/amount/notes; empty state; independent history retry |
| E2E 1: registration/login/submission/document/history | claims-matrix.spec.ts |
| E2E 2: analyst assignment/rejection/client decision | claims-matrix.spec.ts; existing workflow also covers Needs Info |
| E2E 3: partial approval boundaries | claims-matrix.spec.ts |
| E2E 4: rejected resubmission and history | claims-matrix.spec.ts |
| E2E 5: notification read-all/count zero | claims-matrix.spec.ts |
| E2E 6: direct analyst URL, including refresh | claims-matrix.spec.ts legacy /analyst/review/:id redirect |
| E2E 7: visible validation / no submission | claims-matrix.spec.ts and portal.test.tsx |
| E2E 8: another client's data | claims-matrix.spec.ts checks claim/history/document API denial and UI denial |
| Cleanup | server.mjs puts DB and storage in the same disposable temporary directory; test teardown stops servers and removes it |

TEST-04 has local passing evidence on 21 November: all five Playwright tests passed in 3.3 minutes
on Chrome 157.0.8103.79 with disposable SQLite/storage, including upload recovery and step-focus
assertions. Tested code revision: 3e85bab617625fc1cd521e71e604f87764e4f39b;
later profile/admin changes are tracked separately in archive/implementation-evidence-2026-11.md.
Typecheck/lint/build and 30 Vitest tests pass; 5 cookie-security tests also pass.
Backend SQLite was rerun locally: 164 passed / 2 database-specific skips (847 assertions),
with Pint passing. The MySQL evidence remains run 44481972881 at commit
151ca213f30a568071e19a2916339ddc89b8742d: 165 passed / 1 database-specific skip (862 assertions).
Current remote CI/PR status was not rechecked; historical failures and corrections are retained
in archive/implementation-evidence-2026-11.md rather than treated as current blockers.

## Historical manual scope (superseded by the amendment above)

keyboard.spec.ts provides automated keyboard-only client submission and analyst approval,
native dialog focus containment, Escape and focus restoration, 360/390/768/1440 px checks, reduced-motion
preference, and axe on claim detail/decision dialog. It uses Tab/Enter/Space and keyboard text
entry for UI actions; browser navigation/reload and fixture login are explicit test setup.
It opens the file chooser with Enter and supplies fixture bytes through Playwright, then opens
and closes the uploaded image preview by keyboard. The native OS picker is not manually tested.
This is automated evidence, not a manual NVDA/VoiceOver audit.

The original manual scope required the following observations; these were not performed
and are excluded from the revised acceptance gate:

| Required record | Current result |
|---|---|
| All ten core manual QA scenarios | Not executed in this session |
| Complete client/analyst keyboard session by a tester, including document picker/viewer | Not executed in this session |
| NVDA or VoiceOver version, browser and announcements for labels/errors/status/dialogs | Not executed in this session |
| 200% zoom, 390/768/1440 px and visible focus/contrast | Full manual matrix not executed |

PHP 8.3.30, Node 22.22.0 and Chrome are now available locally. No MySQL/Compose verification
was performed in this session. Automated acceptance does not establish the unperformed
manual observations listed above.
