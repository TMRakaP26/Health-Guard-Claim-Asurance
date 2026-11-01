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
- NVDA/VoiceOver announces label, errors, loading/success and selected step.
- Zoom200%, widths390/768/1440; no clipped controls. Wide tables may scroll independently.
- Indonesia/English toggle persists; IDR retains decimals, dates show Asia/Jakarta.
- Reduced motion and visible focus; status must be readable without color.

Do not label manual screen-reader testing as completed merely because axe passes. See IMPLEMENTATION.md for actual execution results and remaining environment checks.
