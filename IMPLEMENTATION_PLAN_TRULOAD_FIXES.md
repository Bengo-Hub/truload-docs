# TruLoad – Implementation Plan: Fixes, Gaps & Revamp

This document is the **detailed implementation plan** for the issues, gaps, and revamp items you reported. Each section includes **root cause**, **backend/frontend alignment**, and **step-by-step tasks**. Work is ordered so that foundational fixes (APIs, DTOs, 404s) come first, then workflows and UI.

---

## Implementation progress (summary)

- **Section 1 (API 404s & paths)**: Frontend already uses correct paths (`/case/taxonomy/release-types`, `/courts`, `/cases/{id}/hearings`, `/case/taxonomy/hearing-types`, etc.). Assignments/current and prosecution GET 404 are handled (return null / empty state). Backend has TaxonomyController and CaseManagementTaxonomySeeder for release_types; ensure DB seed is run so release-types return data.
- **Section 2 (Prosecution create)**: Backend expects ActId (Guid), optional ChargeCalculation, CaseNotes. Frontend uses GET /acts (useAllActs), sends actId + caseNotes on create; backend computes charges when omitted.
- **Section 3 (Reweigh ticket)**: Backend InitiateReweighRequest.ReweighTicketNumber is optional; WeighingService generates via IDocumentNumberService when empty. Frontend sends optional reweighTicketNumber.
- **Section 4 (Weighing stats)**: Backend GetStatistics uses MV for past days and **live query for today**; totals merge MV + today counts. No change needed.
- **Section 6 (JWT 24h)**: appsettings use ExpirationMinutes: 1440.
- **Section 7 (Yard release when case open)**: Backend ReleaseAsync checks case closed and returns 403-style error. Frontend YardListTab uses entry.isCaseClosed to enable/disable Release button.
- **Section 8–9 (Send to yard / Decision screen)**: DecisionPanel hides “Send to yard” when isSentToYard; shows “Vehicle has been sent to yard” and toast. Backend yard create now returns **409 Conflict** when a yard entry already exists for the weighing (per plan).
- **Section 20 (Integrations handleTestConnection)**: NotificationsTab defines handleTestConnection and passes it to IntegrationConfigForm.

- **Section 5 (Charts/reports)**: Dashboard chart endpoints and params documented in `truload-backend/docs/integrations/dashboard-charts-api.md`. Weighing stats already use live fallback for today.
- **Section 15 (Transporter)**: Backend already required only name and auto-generated code on create; **Update** now preserves existing code when frontend sends empty (name-only updates).
- **Section 16 (Driver)**: Backend Driver entity and controller already require only FullNames and Surname; other fields optional.
- **Section 19 (Calibration)**: **Done.** Calibration tab moved from Integrations (setup/settings) to **Technical** page.
- **Section 26 (Audit logs)**: **Done.** Backend `AuditLogDto` includes **UserEmail**; controller maps `log.User?.Email`. Repository already had `Include(a => a.User)`. Frontend `AuditLogDto` and Security page display use **userFullName \|\| userEmail \|\| userName**.

- **Section 17 (Driver/vehicle dropdown, setup tabs)**: **Done.** Backend `DriverRepository.SearchAsync` and `VehicleRepository.SearchAsync` now return all entities (up to 500) when query is empty, so Setup Drivers and Vehicles tabs and weighing dropdowns are populated. Empty-state copy in setup: "No drivers yet. Click Add to register a driver." / "No vehicles yet. Click Add to register a vehicle." when list is empty; "No drivers match your search." when search has no results. Driver create from weighing already refetches (invalidateQueries) and preselects the new driver. **Drivers are shared across the system (not tenant-aware)**; GET drivers correctly returns all drivers. Driver create already returns **400** for validation (missing FullNames/Surname), **409** for duplicate ID number or license; 500 only for unexpected server errors.

- **Section 18 (Document sequences)**: **Done.** Backend: DocumentSequenceController (GET list, GET by id, PUT), DocumentSequenceSeeder for weight_ticket/reweigh_ticket. Frontend: Document sequences tab moved to **System config** (with Document conventions in sub-tabs); new DocumentSequencesTab and API/hooks.
- **Section 12 (Special release page)**: **Done.** Dedicated page at `/cases/special-releases`: list pending special releases, Approve/Reject with modal for rejection reason; sidebar link added. Reject API sends `rejectionReason` to match backend DTO.
- **Section 10 (Case register vs Case management)**: **Done.** Separate routes: **Case register** at `/cases`; **Case management** at `/case-management` (list escalated cases only, filter `escalatedToCaseManager: true`). `/case-management/[id]` redirects to `/cases/[id]`. Sidebar: Case Register, Case management, Special releases.
- **Section 14 (Prosecution settings)**: **Done.** Backend: SettingKeys and seed for Prosecution category (default_court_id, default_complainant_officer_id, default_district). Frontend: **Prosecution** tab on System config page with ProsecutionSettingsTab (default court, complainant officer, district dropdowns/input; uses settings by category + batch update).

**Section 13 (Case management detail)**: **Done.** (1) **Register vs management**: Escalate and Create prosecution (and Request Release) are **Case register only**. When a case is opened from Case management (`/cases/[id]?from=case-management` or via `/case-management/[id]` redirect), the detail page hides Escalate button, EscalateCaseModal, Request Release, and ProsecutionSection shows read-only (no create prosecution, no Pay/Generate Invoice). Back link and badge "Case management" reflect the context. (2) **ProsecutionSection** has `readOnly` prop; when true it shows a message and link to Case register for create/pay. (3) **Case management list** links to `?from=case-management`; **case-management/[id]** redirects to `/cases/[id]?from=case-management`. (4) **Case diary**: New **Diary** tab on case detail with "Case diary & notes" card (key events, pointer to Hearings for minute sheets and Subfiles/Documents). (5) **Subfiles** tab label updated to "Subfiles (A–J)". Optional follow-ups: rich text editor for notes, full subfile A–J schema audit.

---

## 1. API 404s & Frontend Path Alignment

### Root cause
- Frontend calls **wrong base paths** for several case/prosecution endpoints. Backend uses mixed route prefixes: `api/v1/case/cases`, `api/v1/case/taxonomy/*`, but **courts/hearings/assignments** use `api/v1/cases/*` and `api/v1/courts` (no `case` prefix).
- **Release-types**: Frontend calls `/case/release-types`; backend serves at **`/case/taxonomy/release-types`**.
- **Courts**: Frontend calls `/case/courts`; backend serves at **`/courts`**.
- **Hearings**: Frontend calls `/case/cases/{id}/hearings`; backend serves at **`/cases/{id}/hearings`**.
- **Hearing-types / hearing-outcomes**: Frontend calls `/case/hearing-types` and `/case/hearing-outcomes`; backend serves at **`/case/taxonomy/hearing-types`** and **`/case/taxonomy/hearing-outcomes`**.
- **Assignments/current**: Backend returns 404 when there is **no current IO assignment** (NotFound("No current IO assignment")). Frontend should treat 404 as “no assignment” and not surface as a hard error.
- **Prosecution GET**: Returns 404 when no prosecution exists for the case; this is expected. Frontend should handle 404 and show “No prosecution” / create flow.

### Tasks
1. **Frontend – case/API path fixes**  
   - In `truload-frontend/src/lib/api/caseRegister.ts`: change `fetchReleaseTypes()` to use **`/case/taxonomy/release-types`**.  
   - In `truload-frontend/src/lib/api/courtHearing.ts`:  
     - `fetchCourts()` → **`/courts`**  
     - `getHearingsByCaseId()` / `scheduleHearing()` → **`/cases/{caseId}/hearings`**  
     - `fetchHearingTypes()` → **`/case/taxonomy/hearing-types`**  
     - `fetchHearingStatuses()` → **`/case/taxonomy/hearing-statuses`**  
     - `fetchHearingOutcomes()` → **`/case/taxonomy/hearing-outcomes`**  
   - Ensure `getHearingById`, `updateHearing`, `adjournHearing`, `completeHearing`, `deleteHearing`, `downloadCourtMinutesPdf` use **`/hearings/{id}`** (no `case` prefix) so they match backend.
2. **Backend – release types seed**  
   - Add or fix seed for **release_types** (e.g. in `CaseManagementTaxonomySeeder` or equivalent) so `GET /case/taxonomy/release-types` returns data. Add seed script/step in docs.
3. **Frontend – 404 handling**  
   - For **assignments/current**: on 404, treat as “no current assignment” and show empty state instead of error.  
   - For **GET prosecution**: on 404, show “No prosecution” and enable “Create prosecution” flow.

---

## 2. Prosecution Creation (400 – actId & request shape)

### Root cause
- Backend **CreateProsecutionRequest** expects: **`actId`** (Guid), optional **ChargeCalculation**, optional **CaseNotes**.  
- Frontend sends a **different shape**: e.g. `actId: "traffic-act-id"` (string), plus many pre-calculated fee fields. Backend validation fails on: (1) `actId` not a valid Guid, (2) “request”/body shape.

### Tasks
1. **Backend**  
   - Keep **CreateProsecutionRequest** as-is (ActId = Guid, optional ChargeCalculation, CaseNotes). Ensure charge calculation is done server-side when not provided.  
   - Add or verify **GET acts** endpoint (e.g. `GET /api/v1/acts` or under config) so frontend can fetch real act IDs.  
   - In prosecution create flow, if frontend sends only `actId` + `caseNotes`, backend computes charges (refer to compliance e2e and existing ProsecutionService).
2. **Frontend**  
   - **Fetch acts** from backend (e.g. acts list API) and populate a dropdown.  
   - On “Create prosecution”: send only **`{ actId: <selected Guid>, caseNotes?: string }`**. Remove sending of pre-calculated fee fields in the create payload; rely on backend calculation and response.

---

## 3. Reweigh – Ticket Number Mandatory (400)

### Root cause
- **InitiateReweighRequest.ReweighTicketNumber** is required and not marked optional. E2E/docs say reweigh ticket number should be **auto-generated** from document sequences.

### Tasks
1. **Backend**  
   - In **InitiateReweighRequest** (WeighingTransactionDto.cs): make **ReweighTicketNumber** optional (e.g. `string?`).  
   - In **WeighingService.InitiateReweighAsync**: if `ticketNumber` is null or empty, **generate** it via **IDocumentNumberService** (or existing document sequence for reweigh).  
   - Ensure document sequence for reweigh exists and is seeded/configured.
2. **Frontend**  
   - Stop sending **reweighTicketNumber** in the reweigh initiation request (or send only when user explicitly enters one). Backend will return the generated ticket number in the response.

---

## 4. Weighing Stats Wrong (e.g. 1 vehicle → 0, 2 → 1)

### Root cause
- Stats come from **materialized view** `mv_daily_weighing_stats`. If the view is **not refreshed** after each weighing (or on a short schedule), new weighings do not appear.  
- Possible time-window/date issue: default range might exclude “today” or current timezone so the latest weighing is not in the range.

### Tasks
1. **Backend**  
   - Ensure **mv_daily_weighing_stats** is refreshed: either trigger refresh after each weighing (or via a short-interval job), or add a **fallback in GetStatistics**: for “today” (or last N hours), aggregate from **weighing_transactions** directly and merge with MV data so stats are up-to-date.  
   - Verify MV column names match DB (e.g. `IsCompliant`, `IsSentToYard` if applicable).  
   - Confirm date range in GetStatistics uses correct timezone (UTC vs local) and includes the current day.
2. **Frontend**  
   - Ensure dashboard requests stats with a range that includes “today” (e.g. default last 7 days including today).  
   - If backend adds “live” fallback for today, no frontend change needed beyond correct date range.

---

## 5. Charts / Reports Not Reflecting Data

### Root cause
- Same as stats: reliance on **materialized views** or reporting queries that are not refreshed or that use wrong filters (date, station, tenant).  
- Possible wrong endpoint or wrong request params (e.g. stationId, dateFrom/dateTo).

### Tasks
1. **Backend**  
   - Audit **reports/analytics** endpoints: ensure they query the correct tables/views and apply tenant/station and date filters.  
   - Add or schedule refresh for all reporting MVs used by charts (or use live queries for recent data).  
   - Document which endpoints power which charts and expected query params.
2. **Frontend**  
   - Verify each chart calls the correct endpoint with **stationId** (if needed) and **dateFrom/dateTo**.  
   - Ensure response shape matches what the chart components expect (e.g. series names, counts).

---

## 6. JWT Token Lifetime (24 hours)

### Root cause
- Access token lifetime is driven by **Jwt:ExpirationMinutes** in config; **JwtService** uses it (default 60). So tokens expire after 1 hour unless configured otherwise.

### Tasks
1. **Backend**  
   - Set **Jwt:ExpirationMinutes** to **1440** (24 hours) in **appsettings.json** (and Production/appsettings.Production.json if used), or document that this key controls lifetime and recommend 1440 for 24h.  
   - No code change required if config is already read in JwtService.

---

## 7. Yard Release When Case Still Open (Workflow)

### Root cause
- Business rule: **release from yard** is only allowed when the **case is closed** (per FRD and E2E). Currently the UI shows “Release” even when the case is still open, and the backend may not enforce “case closed” before yard release.

### Tasks
1. **Backend**  
   - In **YardController** (or yard release action): before releasing, **check** that the linked **case** (via weighing → case register) has **status = Closed**. If not, return **403/400** with a clear message (e.g. “Case must be closed before yard release”).  
   - Optionally add a small “case status” check in YardService.ReleaseAsync.
2. **Frontend**  
   - **Hide** “Release” (or disable it) when the case is **not closed**. Use case status from case register (or from yard entry detail).  
   - Only show/enable “Release” when **case status = Closed** (or equivalent from API).

---

## 8. Duplicate “Send to Yard” and 500 When Entry Exists

### Root cause
- When a violation is detected, the backend **auto-creates a yard entry**. The UI still shows “Send to yard” and allows a manual **POST /yard-entries**, which triggers **YardService** to create a second entry → **InvalidOperationException: A yard entry already exists for this weighing transaction**.

### Tasks
1. **Backend**  
   - Keep the existing guard that throws when a yard entry already exists for the weighing. Optionally return **409 Conflict** with a clear message instead of 500, and document this in API docs.
2. **Frontend**  
   - After weight capture, if the backend has already created a yard entry (e.g. **IsSentToYard** or yard entry by weighing ID), **do not show** “Send to yard”.  
   - Show a **toast**: “Vehicle has been sent to yard” when **IsSentToYard** is true (or when yard entry exists).  
   - On decision screen, show only **Special release** (when applicable: overload ≤200 kg, or tag/permit not resolved) and **Finish / Start new session**. For **compliant** vehicles, show only **Finish / Exit**.

---

## 9. Decision Screen Buttons (Compliant vs Violation)

### Root cause
- Current UI does not fully reflect: (a) vehicle already sent to yard when violation detected, (b) compliant → only “Finish”; (c) violation → “Special release” (if within limits/tag/permit) + “Finish”.

### Tasks
1. **Frontend**  
   - If **IsSentToYard** (or yard entry exists): hide “Send to yard”, show toast “Vehicle sent to yard”.  
   - If **compliant**: show only **Finish / Start new weighing**.  
   - If **not compliant**: show **Special release** (when policy allows) and **Finish**.  
   - Ensure backend response for the weighing includes **IsSentToYard** and (if available) a flag or link to yard entry so the UI can branch correctly.

---

## 10. Case Register vs Case Management (Separate Pages & Workflows)

### Root cause
- FRD: **Case register** = entry point (initial case details, escalate to case manager or prosecution). **Case management** = separate flow for building subfiles A–J, hearings, closure checklist. Currently both may be mixed in one place; closure without meeting thresholds is possible.

### Tasks
1. **Frontend**  
   - **Separate** “Case register” and “Case management” into **two distinct pages/routes**:  
     - **Case register**: list/search cases, initial details, actions: Special release, Pay (prosecution), **Escalate to case manager** (open escalation modal).  
     - **Case management**: cases that are “escalated”; full subfiles (A–J), hearings, diary, closure checklist.  
   - **Escalate** button on case register opens a **modal with tabs**: e.g. Driver (full details), NTSA details (driver/owner, many-to-many as per FRD), Transporter, Investigating officer, Vehicle detention, etc. Only after filling required fields can the user “Escalate to case manager”.
2. **Backend**  
   - Support **escalation** with a payload that includes driver, owner, transporter, IO, detention place, etc. (endpoints or extend existing case/assignment APIs).  
   - **Close case**: enforce **closure checklist** (required subfiles/documents per disposition). Reject close request if checklist not met; return 400 with missing items.

---

## 11. Escalate Modal – Full Details (Driver, NTSA, Owner, Transporter, IO, Detention)

### Root cause
- Escalation to case manager must capture full details (driver, NTSA for driver/owner, transporter, investigating officer, vehicle detention) as per FRD. Backend must support many-to-many for driver/owner NTSA (e.g. new NTSAC per court summon).

### Tasks
1. **Backend**  
   - Add or extend endpoints for:  
     - Driver NTSA (many-to-many with driver).  
     - Owner NTSA (many-to-many with owner) when owner is charged.  
   - Escalate endpoint (or case update) must accept: investigating officer ID, detention location, transporter, driver, owner, NTSA references.  
   - Ensure **assignments** (e.g. IO) and **parties** (driver, owner, transporter) are persisted and linked to case.
2. **Frontend**  
   - **Escalate** opens a **modal with tabs**: Driver (full + NTSA), Owner (if charged, + NTSA), Transporter, Investigating officer, Vehicle detention, etc.  
   - Submit only when required fields per tab are filled. Call updated escalate API with full payload.

---

## 12. Special Release Page & Workflows

### Root cause
- Special release logic exists in backend but there is no dedicated **special release page** with clear workflow and modern UI.

### Tasks
1. **Backend**  
   - Expose existing special release APIs (create, approve, reject, list by case) and ensure they are documented and consistent with FRD.
2. **Frontend**  
   - Implement a **dedicated Special release** page: list of pending/eligible cases, request special release, approve/reject (with permissions). Use existing APIs; design consistent with the rest of the app.

---

## 13. Case Management – Detail (Subfiles, Hearings, Diary)

### Root cause
- Case management UI is not as detailed as required: subfiles A–J, hearings, case diary, etc. Reference: **Kenloadv2/KenloadAPIUpgrade** and **KenloadV2UIUpgrade** (and FRD B.3).

### Tasks
1. **Audit** Kenloadv2 case register and case management flows (APIs + UI) and list gaps vs TruLoad.  
2. **Backend**  
   - Ensure **subfiles**, **hearings**, **court diary** (e.g. minute sheets) endpoints are complete and return all needed fields.  
3. **Frontend**  
   - Build out **case management** page: subfile tabs/sections (A–J), hearings list/schedule, case diary, minute sheets. Use **embed React rich editor** for notes/description fields; **larger, well-designed modals** for forms; replace old textareas with the rich editor where appropriate.

---

## 14. Prosecution Settings Page (Courts, Defaults, Complainant, District)

### Root cause
- There is **no prosecution settings** page where courts, default court, complainant, district, and other case-related defaults are configured and linked to backend.

### Tasks
1. **Backend**  
   - Expose **courts** CRUD (already under `api/v1/courts`).  
   - Add **prosecution/default settings**: default court, default complainant, default district (or similar). Store in **ApplicationSettings** or a small “prosecution_settings” table and expose GET/PUT (or by key).  
   - Document which settings keys are used where (e.g. default court when creating a case).
2. **Frontend**  
   - Add **Prosecution settings** page (under Setup or System config): manage courts, set default court, complainant, district, etc. Wire to the new/updated backend endpoints.

---

## 15. Transporter Form – Only Name Mandatory; Code Auto-Generated

### Root cause
- Transporter form and backend require many fields (e.g. NTAC, etc.). Requirement: only **name** mandatory; **code** auto-generated from name + numbers.

### Tasks
1. **Backend**  
   - In **Transporter** entity and **CreateTransporterRequest**: make every field optional **except** name.  
   - On create, if **Code** is empty, **generate** it (e.g. from name + short random or sequence number).  
   - Adjust validation and any unique constraint on code.
2. **Frontend**  
   - Transporter form: only **name** required. Remove client-side required on NTAC and other fields. Code can be read-only (auto) or hidden.

---

## 16. Driver Form – Only Full Names and Surname Required

### Root cause
- Driver create/update requires too many fields; requirement is **only Full names and Surname** mandatory.

### Tasks
1. **Backend**  
   - In **Driver** entity and create/update DTOs: make **FullNames** and **Surname** required; all others (ID number, license, phone, email, etc.) optional.  
   - Fix any DB constraint or validation that forces other fields.
2. **Frontend**  
   - Driver form: only **Full names** and **Surname** required; other fields optional.  
   - When adding driver from weighing vehicle details: after successful create, **preselect** the new driver in the dropdown (or refetch list and select by ID). Ensure **weighing setup → Drivers** tab and **Vehicles** tab **fetch** from correct APIs (drivers list, vehicles list) so newly added drivers/vehicles appear.

---

## 17. Driver/Vehicle Save and Dropdown After Add (500/400, Empty Response, Setup Tabs Empty)

### Root cause
- **Driver POST** can return 500/400 (e.g. validation or server error).  
- After adding a driver from weighing screen, the new driver is not preselected or not visible in the dropdown.  
- Weighing setup **Drivers** and **Vehicles** tabs are empty: likely wrong API (e.g. wrong path or tenant/station filter) or no data returned.

### Tasks
1. **Backend**  
   - Fix **Driver** create validation and error handling so invalid payload returns **400** with clear errors; avoid 500 for validation.  
   - Ensure **GET drivers** and **GET vehicles** (used by setup and weighing) are **tenant/station-aware** and return the same entities that can be created from weighing (e.g. same org/station).
2. **Frontend**  
   - After **successful** driver create from weighing vehicle details: **refetch** drivers list and **set selected driver** to the newly created driver (by id).  
   - Weighing setup: ensure **Drivers** and **Vehicles** tabs call the **correct list APIs** (e.g. same as used elsewhere) and handle empty state.

---

## 18. Document Sequences (Seeds, Tab Location, CRUD)

### Root cause
- Document sequences seed **fails or is missing**, so the tab is empty. Tab is under Integrations; requirement is to move to **System config** and have full CRUD linked to backend.

### Tasks
1. **Backend**  
   - Fix or add **document sequence seed** so at least default sequences (e.g. for weighing ticket, reweigh ticket, case number) exist.  
   - Expose **CRUD** for document sequences (GET list, GET one, POST, PUT, maybe DELETE) under e.g. **api/v1/system/document-sequences**.
2. **Frontend**  
   - **Move** document sequences from **Integrations** to **System config** (new tab or section).  
   - Implement **list + create/edit** form and wire to backend CRUD. Ensure create/update sends correct payload (prefix, next number, etc.).

---

## 19. Calibration Move (Integration → Technical)

### Root cause
- Calibration is currently under Integrations; requirement is to move it under **Technical** (or equivalent) section.

### Tasks
1. **Frontend**  
   - Move **Calibration** link/route from Integrations to **Technical** (or the correct section in your nav). Update any nav config and breadcrumbs.

---

## 20. Integrations APIs Tab – handleTestConnection Not Defined & Duplicate Notifications

### Root cause
- **NotificationsTab** uses **IntegrationConfigForm** with **onTestConnection={handleTestConnection}**, but **NotificationsTab** does **not** define **handleTestConnection** (it is only defined in **PaymentGatewaysTab**). That causes **ReferenceError: handleTestConnection is not defined** on the Integrations/APIs or Notifications tab.  
- Duplicate notifications logic: two tabs (e.g. Notifications and APIs) may duplicate the same notification config; consolidate or clearly separate.

### Tasks
1. **Frontend**  
   - In **NotificationsTab** (settings page): define **handleTestConnection** the same way as in **PaymentGatewaysTab**, e.g. `const handleTestConnection = useCallback(async (providerName: string) => testIntegrationConnectivity(providerName), []);` and pass it to **IntegrationConfigForm**.  
   - Remove or deduplicate any duplicate notification configuration UI so one place controls notification providers.
2. **Backend**  
   - If “test connection” for a notification provider exists, ensure the endpoint (e.g. `POST /system/integrations/{provider}/test`) is implemented and returns a clear success/failure.

---

## 21. Ticket Tab – Map Missing Fields from Weighing Response

### Root cause
- Weight certificate and ticket tab show **N/A** for: Vehicle Make, Origin, Cargo, Vehicle Type, Axle Configuration, Transporter, Destination. These fields exist in the weighing transaction/response but are not mapped to the table/certificate.

### Tasks
1. **Backend**  
   - Ensure **weighing transaction** API (and any ticket/certificate payload) returns: **vehicle make**, **origin**, **destination**, **cargo**, **vehicle type**, **axle configuration**, **transporter** (and driver). Populate from related entities (vehicle, transporter, cargo type, origin/destination, axle config).
2. **Frontend**  
   - In **ticket tab** (and weight certificate if rendered in frontend): map **vehicle make**, **origin**, **destination**, **cargo**, **vehicle type**, **axle configuration**, **transporter** from the weighing response. Replace “N/A” with actual values when present.

---

## 22. Invoice / Document Redesign (No Repeated Header, One Page, Consistent Layout)

### Root cause
- Generated documents (invoice, weight ticket, etc.) **repeat the header on every page** and may have inconsistent layout or excessive spacing.

### Tasks
1. **Backend**  
   - In **QuestPDF** (or current PDF library) templates for **invoice**, **weight ticket**, and other generated documents:  
     - Use a **single header** (e.g. first page only or header that does not repeat on each page if possible).  
     - Optimize layout to **fit on one page** where possible; reduce unnecessary spaces.  
     - **Weight certificate**: resize **tenant logo (KURA)** to **match the size of the Judicial logo** (right side) for consistent design.
2. **Frontend**  
   - If any document is previewed or assembled in frontend, apply the same rules: single header, compact one-page layout where applicable.

---

## 23. Axle Configuration Sent to Middleware (Auto-Weigh)

### Root cause
- **Axle configuration** selected on the vehicle details screen is **not sent** to TruConnect middleware. Middleware then assumes a default (e.g. 3 axles) and can generate weight for a non-existent axle (e.g. axle 3 when configuration is 2A).

### Tasks
1. **Frontend**  
   - When registering or updating session with middleware (WebSocket or API): send **number plate** (from capture screen), **station code and name** (update middleware station settings), **axle configuration** (e.g. 2A, 3A), and **axle-by-axle capture** (already working).  
   - When user **changes axle configuration**, send an **update** to the middleware so it knows total axle count and does not generate weights for non-existent axles.  
   - Ensure that when the **last axle** is captured, the frontend sends all data needed for **auto-weigh** (plate, station, axle config, axle weights) so middleware can submit a correct auto-weigh record.
2. **Middleware (TruConnect)**  
   - Accept **axle configuration** (and optionally station, plate) from frontend and use it to **limit** how many axles are simulated or sent in auto-weigh. Do not generate weight for axle index beyond the configured count.

---

## 24. 2FA – Admin vs User, Login Flow

### Root cause
- **Security settings** page has 2FA “registration” logic; requirement is that **2FA registration** is done by **each user on their profile**. Admin page only **enables 2FA for the organization** (or turns it on for all users); if not enabled by admin, users must not see the 2FA button on their profile.  
   - When 2FA is enabled for an admin account, login does **not** trigger the 2FA frontend flow (e.g. TOTP step).

### Tasks
1. **Backend**  
   - **Auth**: after login, if user has 2FA enabled, return a response that indicates **2FA required** (e.g. `requiresTwoFactor: true` and a token or step identifier) and expose an endpoint to **submit TOTP** and complete login.  
   - **Settings**: support “2FA enabled for organization” (or “2FA required”) so that frontend can show/hide the “Enable 2FA” option on **user profile**.  
   - **User profile**: endpoint for user to **register** TOTP (generate secret, verify code) and enable 2FA for their account.  
   - Remove or repurpose any “2FA registration” from admin security page; admin only turns on “2FA available” or “2FA required” policy.
2. **Frontend**  
   - **Login**: if login response says 2FA required, **redirect** to 2FA step (TOTP input). On success, complete auth and store token.  
   - **Profile**: show “Enable 2FA” only when backend indicates 2FA is allowed for the org/user. Implement TOTP setup and verification flow.  
   - **Security settings (admin)**: remove 2FA registration; keep only “Enable 2FA for all users” (or similar) toggle and link to backend.

---

## 25. Shift Management – Backend Link & Scheduling

### Root cause
- Shift management is **not fully linked** to backend; **scheduling a shift for a user** is not possible in the UI.

### Tasks
1. **Backend**  
   - Expose **shift** and **user-shift** APIs: list shifts, create/update shift, **assign user to shift** (with date/time or recurrence). Ensure persistence and validation (e.g. no double-booking).  
   - Document endpoints for frontend.
2. **Frontend**  
   - Implement **shift management** UI: list shifts, create/edit shift, and **schedule user to shift** (e.g. calendar or list with “Assign user” and date). Wire to backend APIs.

---

## 26. Audit Logs – User Email / FullName in Response

### Root cause
- **Audit log** list returns **userName** and **userFullName** as null because the repository **does not Include(User)** when loading audit logs, so **log.User** is null.

### Tasks
1. **Backend**  
   - In **AuditLogRepository.GetPagedAsync** (and any other method used for list): add **.Include(a => a.User)** before **Skip/Take**. Ensure **ApplicationUser** has **Email** and **FullName** (and UserName if needed).  
   - In **AuditLogDto** and controller mapping: set **UserFullName** = `log.User?.FullName`, **UserName** or **Email** = `log.User?.Email` (or UserName). Per requirement, expose **user email** and **user full name**; you can deprecate or hide **username** in the API response if desired.
2. **Frontend**  
   - Audit logs UI: display **user full name** and **user email** (from response). **Remove** or hide **username** field from the table/detail.

---

## 27. Backup Fails in Production (Access Denied to /var/backups/truload)

### Root cause
- **BackupStoragePath** is set (e.g. in seed or settings) to **/var/backups/truload**. In production (e.g. K8s), the app process **does not have permission** to create or write to that path, or the path does not exist in the container.

### Tasks
1. **Backend**  
   - **BackupService**: when creating backup, **catch** “access denied” (or directory not found) and return a **400** or **503** with a clear message (e.g. “Backup storage path is not writable. Check permissions and path configuration.”).  
   - Document **BackupStoragePath**: must be a path **writable** by the app (e.g. a mounted volume in K8s with correct permissions, or a path under the app’s home).
2. **DevOps/K8s**  
   - In **devops-k8s** (or deployment config): add a **volume** for backup storage (e.g. **/var/backups/truload** or **/app/backups**) and set **volumeMount** so the app can write there. Set **securityContext** or **fsGroup** so the process has write permission.  
   - Set **BackupStoragePath** (env or ConfigMap) to that mounted path so production uses a writable directory.

---

## 28. 404 and Seed Summary (Release Types, Courts, Hearings, etc.)

### Summary of 404 fixes
- **Release types**: frontend → `/case/taxonomy/release-types`; backend → seed **release_types** table.  
- **Courts**: frontend → `/courts` (no `case` prefix).  
- **Hearings**: frontend → `/cases/{id}/hearings`.  
- **Hearing-types / hearing-outcomes**: frontend → `/case/taxonomy/hearing-types` and `/case/taxonomy/hearing-outcomes`.  
- **Assignments/current**: keep backend 404 when no assignment; frontend treat 404 as “no assignment”.  
- **Prosecution GET**: 404 when no prosecution; frontend show “No prosecution” and create flow.

---

## Suggested Implementation Order

1. **API path and 404 fixes** (Section 1) + **Release types seed**.  
2. **Prosecution create** (Section 2): backend acts API + frontend payload.  
3. **Reweigh ticket** (Section 3): optional ticket number + backend generation.  
4. **Stats and charts** (Sections 4–5): MV refresh or live fallback + frontend params.  
5. **JWT 24h** (Section 6): config change.  
6. **Yard release when case open** (Section 7): backend check + frontend hide release.  
7. **Send to yard / decision screen** (Sections 8–9): frontend logic + optional backend 409.  
8. **Driver/Transporter** (Sections 15–17): backend validation + frontend forms and dropdowns.  
9. **Audit log user** (Section 26): repository Include User + frontend display.  
10. **Integrations handleTestConnection** (Section 20): add handler in NotificationsTab.  
11. **Document sequences** (Section 18): seed + CRUD + move tab to System config.  
12. **Invoice/documents** (Section 22): PDF layout and logo sizing.  
13. **Case register vs case management** (Sections 10–13): separate pages, escalate modal, subfiles/hearings/diary.  
14. **Prosecution settings** (Section 14): backend settings + frontend page.  
15. **Special release page** (Section 12).  
16. **2FA** (Section 24): login flow + profile + admin settings.  
17. **Shift management** (Section 25).  
18. **Middleware axle config** (Section 23).  
19. **Ticket tab mapping** (Section 21).  
20. **Backup** (Section 27): error handling + K8s volume and permissions.

This order addresses **blocking** issues (404s, prosecution create, reweigh, stats) first, then **workflow and UX** (yard, decision screen, driver/transporter), then **configuration and documents**, and finally **larger features** (case management, 2FA, shifts, middleware).

---

## Appendix A: Case Management & Case Register Audit (FRD + Kenloadv2)

### FRD (Master-FRD-KURAWEIGH.md) – Summary

- **Case Register (B.1)**: Entry point; captures Subfile A (initial case details). Three paths: **Special Release**, **Pay Now** (prosecution), **Settle in Court** (escalate to Case Manager). Officer verifies/edits vehicle, driver, owner, prohibition id, location, time, officer. Manual special release requires supervisor signature; logged in Subfile I/J.
- **Prosecution (B.2)**: Charge sheet → Invoice (eCitizen) → Receipt → Load Correction memo → Compliance Certificate. Must verify case details before charge computation.
- **Case Management (B.3)**: Case Manager builds **Subfiles A–J**:
  - **A**: Initial case details (OB extract, crime/incident report, signal letters).
  - **B**: Document evidence (weight tickets, photos, ANPR, permit docs).
  - **C**: Expert reports (engineering/forensic).
  - **D**: Witness statements (inspector, driver, witnesses).
  - **E**: Accused statement / reweigh & compliance.
  - **F**: Investigation diary (steps, timelines).
  - **G**: Charge sheets, bonds, NTAC, arrest warrants (copies).
  - **H**: Accused records (prior offences, ID docs).
  - **I**: Covering report (prosecutorial memo).
  - **J**: Minute sheet & correspondences (court minutes, adjournments).
- **Closure checklist**: Depends on disposition (Withdrawn 87A/202/204, Discharged 35/210/215, Charged & Paid, Charged & Jailed). System must enforce and block closure until required subfiles exist.
- **Prosecution settings**: Default court, complainant, district/division, station (per user/base station).

### Kenloadv2 UI & API – What to adapt

| Area | Kenloadv2 | TruLoad gap / adaptation |
|------|-----------|---------------------------|
| **Case Register** | Separate page: list with status (Open/Paid/PBC), stats cards (Total, Pending, Released, In Court), filters (date, station, year), Add Record, Edit, Escalate, Finalise. Escalate opens OB details modal (full driver/owner/NTSA, complainant, etc.). | TruLoad: Keep case register as **entry point**; separate route from case management. Add escalate modal with tabs (driver, NTSA, owner, transporter, IO, detention). |
| **Case Management** | Main dashboard: case list (Case ID, OB, TCR, Court File No, Vehicle, Driver, Owner, Axle, Date, Offense, Prohibition, Outcome, Documents), Court hearings table, “Open Case Register” and “Master Diary” links. Case result filters (Finalised, Withdrawn 87A/202/204, Discharged, Charged & Paid/Jailed, PBC). Request Review / Review workflow. | TruLoad: Case management page = **escalated cases only**. Same table columns and filters; link to case detail (timeline). |
| **Case timeline / detail** | **caseTimeLine.vue**: Header (Vehicle Reg, OB Number, Case ID). Tab “Case Files & Logs”: **table of subfiles** with columns (name, completeness %, actions). Each row opens a **modal** (Subfile A = obdetails, B = evidence files, C = expert reports, D = witness statements, E = accused statements, F = diary, G = document files/charge/NTAC, H = parties involved, I = covering report, J = minute sheet). Progress bar per subfile. Case closed = view only. | TruLoad: Case detail page must show **subfile completion table** and **one modal per subfile** (A–J). Use **rich editor** for notes/description and **larger modals**. |
| **Case diary** | CaseDiaryController: byCaseOB returns diary + diaryEntries (IO, Description, Entrydate). Case diary extract (file) + entries. | TruLoad: Expose diary by case; diary entries with IO, date, description. |
| **Minute sheet (J)** | CaseMinuteSheet: Subject, Content (HTML), DateCreated, User (IO), MinuteFile attachment. Printed in consolidated report. | TruLoad: Minute sheet entries with subject, content (rich), date, author, attachment. |
| **Consolidated PDF** | Prints in order: Cover page → Minute sheet (J) → Covering report (I) → Parties (H) → Document files (G) → Diary (F) → Accused (E) → Witness (D) → Expert (C) → Evidence (B) → OB details (A). | TruLoad: Same ordering for “Consolidated case file” export. |
| **Prosecution settings** | Check before opening case timeline; show default division, province, station, court, complainant. Prompt to update if default. | TruLoad: **Prosecution settings page** (courts, default court, complainant, district); check on case open. |

### TruLoad backend alignment

- Subfiles: TruLoad has **CaseSubfileController**, **subfile types**; ensure A–J (or equivalent) are seeded and UI maps to them.
- Hearings: **CourtHearingController** under `api/v1/cases/{id}/hearings`; frontend must use `/cases/{id}/hearings` (no `case` prefix).
- Courts / taxonomy: **CourtController** at `api/v1/courts`; **TaxonomyController** at `api/v1/case/taxonomy` (release-types, hearing-types, etc.). Frontend paths must match (see Section 1).

---

## References

- **Backend FRD**: `truload-backend/docs/Master-FRD-KURAWEIGH.md`  
- **E2E plan**: `truload-backend/Tests/e2e/compliancee2e/e2e-plan.md`  
- **Compliance E2E scripts**: `truload-backend/Tests/e2e/compliancee2e/compliance_e2e_scenario_*.py`  
- **Kenloadv2**: `Kenloadv2/KenloadV2APIUpgrade`, `Kenloadv2/KenloadV2UIUpgrade` (for case register/management reference)
