# HealthGuard API contract

Base URL: /api. JSON request/response; use Accept: application/json. All protected endpoints require Authorization: Bearer <token>. Uploads use multipart/form-data without manually setting its boundary. IDs in claim routes are public strings such as CLM-2026-001; document/message/request IDs are integers.

## Response conventions

- 200 successful read/update; 201 created.
- 401 unauthenticated/expired; 403 unauthorized; 404 absent or foreign nested record; 409 lifecycle conflict; 422 invalid input; 429 throttled; 503 unavailable optional mail/storage.
- Validation: `{"message":"...","errors":{"amount":["..."]}}`. Other errors expose a message.
- Claim lists/messages/users/notifications/deletion lists: `{data:[],current_page,last_page,per_page,total,...}`.
- History uses Laravel resources: `{data:[],links:{...},meta:{current_page,last_page,total,...}}`.
- Claim show/create/update/status return a claim object directly. Assignment returns `{claim,message}`.
- Decimal amounts are strings. Dates ending _at/date_submitted are timestamps; patient_date_of_birth/service_date are YYYY-MM-DD.
- User resource contains id,name,email,role,username,phone,address,date_of_birth,bpjs_number,profile_photo,email_verified_at,two_factor_enabled,is_active. Never password/2FA secrets.
- Claim: id,claim_id,user_id,client_name,type,provider_name,amount,approved_amount,status,notes,bpjs_number,patient_date_of_birth,service_date,date_submitted,updated_at,assigned_to,assigned_analyst{id,name,role}|null,sla_due_at. Show additionally includes documents.
- Document: id,file_name,file_path,file_size,mime_type,request_id,message_id,created_at. file_path is a storage key, **not a public URL**.
- Notification: id,type,title,body,claim_id,is_read,created_at.

## Authentication

| Method / path | Body / behavior |
|---|---|
| POST /register | name,email,password8–128,password_confirmation(optional matching); optional username/phone/address/date_of_birth/bpjs_number per request validation; role omitted/client only. Returns {user,token}. |
| POST /login | email,password,two_factor_code(optional; mandatory when configured). Returns {user,token}. |
| POST /forgot-password | email. Requires FEATURE_EMAIL and configured mailer. Generic result regardless of account existence. |
| POST /reset-password | email,token,password,password_confirmation. Revokes all tokens; reset token single-use. |
| POST /invitations/accept | token64chars,name,password,password_confirmation. Creates analyst and returns {user,message}; no auth token. |

Protected:
- GET /user → user.
- PUT /user → optional name,email,username,phone,address,DOB/BPJS,locale(id/en). Password change requires current_password; returns {user,reauthenticate,message}. Password changes revoke all sessions.
- POST /user/photo: photo JPG/PNG ≤2MB; DELETE /user/photo. Returns {user,message}.
- POST /logout: revoke current token; POST /logout-all: revoke all, reauthenticate=true.
- POST /email/verification-notification: mail feature required.
- GET /email/verify/{id}/{hash}?expires=...&signature=...: auth user must match and signature valid. Verification email links to frontend /verify-email, which preserves the signed URL.
- POST /two-factor/setup: staff only, password required → {secret,uri}; setup must be confirmed.
- POST /two-factor/confirm: code6digits → {recovery_codes:[...]}; display once.
- DELETE /two-factor: password,code(authenticator or recovery) → reauthenticate=true. TOTP rejects replay; recovery codes are single-use. Secrets/recovery hashes encrypted at rest.

## Claims

GET /claims accepts q(max255; claim ID/patient/provider/type), status, date_from/date_to(YYYY-MM-DD), scope(all/unassigned/assigned), sort(newest/oldest/amount_asc/amount_desc), page≥1, per_page1–100(default20). Client scope is own claims; staff may query all. Response additionally includes stats{total,amount,approved_amount,by_status}; these cover the entire filtered set, not only the page.

GET /claims/unassigned and /claims/my-assignments are analyst aliases. GET /claims/{id} is allowed for owner or staff.

POST /claims (client): client_name,type,provider_name required strings≤255; amount>0≤99999999.99 with≤2 decimals; optional bpjs_number≤30, patient_date_of_birth/service_date≤today. Creates Pending + submitted history.

PUT /claims/{id} (owner): same fields, optional on update. Only Rejected/Needs Info/Partially Approved without payment may resubmit. Preserves assignment/current notes, snapshots previous data, resets approved_amount=null and status Pending.

POST /claims/{id}/assign (analyst): only unassigned Pending. Atomic; competing assignment receives conflict.

PATCH /claims/{id}/status (assigned analyst): status one of the five existing enum strings; notes≤4000 mandatory for Rejected/Needs Info; approved_amount mandatory for Partially Approved, >0 and≤claim amount. Approved copies full amount; other statuses clear approved_amount. Paid claims cannot change.

GET /claims/{id}/history: page,per_page1–100(default50),order asc/desc(defaultdesc). Entry: id,event,from_status,to_status,notes,approved_amount,metadata,created_at,actor{id,name,role}|null. Events include submitted,assigned,status_changed,resubmitted,document_uploaded,migrated_snapshot,message_added,document_requested,payment_paid,payment_settled.

GET /claims/export (staff): same filters as list, ignores pagination. Streams CSV with all matching rows, IDR values, formula-leading cells escaped. Frontend XLSX converts this full CSV; clients have no export endpoint.

## Documents and collaboration

| Method / path | Access, body and response |
|---|---|
| GET /claims/{id}/documents | Claim viewer → array of document resources |
| POST /claims/{id}/documents | Owner; assigned analyst only for own message attachment. multipart file, optional request_id/message_id. PDF/JPG/PNG/DOC/DOCX actual MIME and extension,1byte–10MB. Foreign request/message rejected. request_id fulfillment owner only. Returns document201. |
| GET /claims/{id}/documents/{documentId}/download | Claim viewer; private stream,no-store,nosniff. Does not accept another claim's document ID. |
| GET /claims/{id}/messages | Claim viewer; page/per_page≤100 → paginated {id,body,created_at,user{id,name,role}|null,documents:[]} |
| POST /claims/{id}/messages | Owner/assigned analyst; body1–4000 → {id,body,created_at}201. Attach file afterward with message_id. |
| GET /claims/{id}/document-requests | Claim viewer → [{id,claim_id,requested_by,title,instructions,status,fulfilled_at,...}] |
| POST /claims/{id}/document-requests | Assigned analyst; title≤255,instructions≤4000; status becomes Needs Info transactionally. |

Messages require FEATURE_MESSAGES. Document metadata and filenames are only returned to authorized claim viewers.

## Drafts, catalog and payment

- GET /drafts (client) → array owned drafts.
- POST /drafts, PUT /drafts/{id}: `{data:{client_name?,type?,provider_name?,amount?,bpjs_number?,patient_date_of_birth?,service_date?,step?:1..4}}`. Incomplete fields allowed; unknown keys rejected. Returns draft{id,user_id,data,created_at,updated_at}.
- DELETE /drafts/{id}: own draft only.
- GET /catalog: authenticated → {providers:[],categories:[],features:{messages,payments,email,realtime,retention},max_amount}. Active records only. Provider: id,name,code,address,is_active. Category: id,name,code,diagnosis_code,coverage_rules,coverage_limit,is_active.
- GET /claims/{id}/payment: viewer → {data:payment|null}, FEATURE_PAYMENTS required.
- POST /claims/{id}/payment: admin only; status paid/settled,amount>0≤approved amount,reference≤100,paid_at≤now. Claim must be Approved/Partially Approved. First write paid; next write settled must preserve reference/amount. No further rewrite. Returns payment{id,claim_id,recorded_by,amount,status,reference,paid_at,settled_at,...}. Manual record only.

## Notifications, analytics and administration

- GET /notifications: owned,page/per_page≤50.
- GET /notifications/unread-count → {count}.
- POST /notifications/{id}/read; POST /notifications/read-all. Foreign record returns404.
- GET /notifications/stream: FEATURE_REALTIME only, bearer header. SSE data:{count} roughly3seconds, connection closes after20seconds. Client reconnects; fallback polling30seconds.
- GET /analytics: staff; same claim filters → total,approved,approval_rate,average_decision_hours,by_status/by_provider/by_type arrays{label,count,amount}. See ADR for metric definitions.
- GET /admin/users: admin,page,q → user resources + claims_count,assignments_count,pending_assignments,overdue_assignments.
- PATCH /admin/users/{id}/active: is_active boolean. Cannot deactivate self/another admin; disabled user tokens revoked.
- POST /admin/invitations: email unique → {id,email,expires_at,invitation_url}. URL contains one-use secret, valid24hours, no-store; share only with intended recipient.
- GET /admin/catalog: all active/inactive catalog records.
- POST /admin/catalog/{kind}, PUT /admin/catalog/{kind}/{id}; kind=providers/categories; name,code required; is_active optional. Provider address optional. Category diagnosis_code≤30,coverage_rules≤4000,coverage_limit decimal>0≤max optional.
- GET /deletion-requests: own requests; admin sees all; page.
- POST /deletion-requests: reason≤2000 optional; one pending per user.
- PATCH /admin/deletion-requests/{id}: status approved/rejected,review_notes1–2000,confirm=true. Approval requires enabled retention and no open claims. See RETENTION.md.

Every API endpoint is throttled. Public login/register/reset endpoints additionally use named rate limits; exports limit5/minute. API token expiry default480minutes. Request ID response header is available for successful middleware traversal; no sensitive request body is logged.
