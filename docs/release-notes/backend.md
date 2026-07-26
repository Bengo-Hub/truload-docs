# Backend Releases

Source: `truload-backend` — continuous-release model; each merge to `main` is collected into a versioned release.

---

## v1.3.2 — 2026-05-22

### Subscription Uniform Integration

This release brings TruLoad's subscription enforcement to full parity with the uniform subscription workflow deployed across all other Codevertex platform services (ordering, POS, inventory, logistics, treasury, marketflow).

**Critical bug fix — subscription enforcement was non-functional**

`SubscriptionEnforcementMiddleware` was reading the `org_id` JWT claim but `JwtService.GenerateAccessToken` was emitting `organization_id`. These names never matched, so `orgIdClaim` was always `null` and enforcement was silently skipped for every commercial tenant. Fixed in this release:

- `JwtService.GenerateAccessToken` now emits `org_id`
- Middleware gains a backward-compat fallback to `organization_id` for sessions with tokens issued before this fix

**Organisation bypass fields (`billing_mode`, `is_demo`)**

New columns on the `organizations` table (migration `20260522000928_AddOrganizationBypassFields`):

| Column | Type | Purpose |
|--------|------|---------|
| `billing_mode` | `VARCHAR(50)` nullable | `"service_charge"` → bypass subscription gating; tenant is billed per-transaction instead of via subscription |
| `is_demo` | `BOOLEAN DEFAULT FALSE` | Demo/training orgs bypass all subscription enforcement |

Both values are now embedded as JWT claims by `JwtService.GenerateAccessToken` (no extra DB query — the `Organization` record is already loaded for `org_code`).

**Subscription enforcement middleware — bypass logic**

`SubscriptionEnforcementMiddleware` now has two fast-path bypasses before the Redis cache lookup:

1. JWT claim `billing_mode == "service_charge"` → pass through immediately
2. JWT claim `is_demo == "true"` → pass through immediately
3. Belt-and-suspenders: if neither claim is present (stale token), the org model `BillingMode`/`IsDemo` is checked after the DB load on a cache miss

**NATS subscription cache invalidation**

New `Services/Background/SubscriptionCacheInvalidationService` (ASP.NET Core `BackgroundService`):

- Subscribes to the `tenant.subscription.updated` NATS subject published by subscriptions-api on every plan or status change
- Extracts `tenant_slug` from the event payload (supports both flat `{ tenant_slug }` and nested `{ payload: { tenant_slug } }` formats)
- Resolves `tenant_slug → Organization.SsoTenantSlug → org.Id` via a scoped DB query
- Deletes `sub:status:{orgId}` from Redis — forces the next request to re-fetch from subscriptions-api rather than serving stale 60-second cached status
- Controlled by `Nats:Enabled` (defaults `false` — safe for dev without a NATS server)

NuGet added: `NATS.Net`.

New `appsettings.json` section:
```json
"Nats": {
  "Url": "nats://localhost:4222",
  "Enabled": false
}
```

Production K8s env override:
```
NATS__URL=nats://nats.platform.svc.cluster.local:4222
NATS__ENABLED=true
```

**Frontend — no changes required**

`truload-frontend` was already aligned with the uniform subscription pattern (v0.1.10 of shared-ui-lib). The `use-subscription` hook already reads `billing_mode` and `is_demo` from JWT claims and the `SubscriptionBanner` already passes `isServiceCharge` and `isDemo` to the shared component. These features activate automatically once the backend starts embedding the bypass claims in new tokens.

---

## v1.3.1 — 2026-05-21

### Tolerance Precedence Fix and Standard Config Updates

**Axle config tolerance now correctly takes precedence over global tolerance**

- `CalculateGroupToleranceAsync`: config-specific `ToleranceKg`/`TolerancePercentage` is now evaluated first (was priority #3, now priority #1), ensuring per-config overrides always win over Act-level global tolerance
- Weight tickets now display `Axle tolerance: X,XXX kg (config)` when a per-config override is active (was always showing `0% (strict)`)

**Standard axle config tolerance updates no longer blocked**

- `UpdateStandardConfigAsync` added to `AxleConfigurationRepository` — standard configurations can now have their `ToleranceKg` and notes updated via `PUT /api/v1/AxleConfiguration/{id}` without returning 400
- Previously all standard-config updates returned `400 Cannot modify standard EAC configurations`

**Tenant database auto-migration on startup**

- Backend now applies EF Core migrations and seeds all dedicated tenant databases (e.g. kuraweigh) automatically on startup — no manual migration job required
- `TenantConnectionStringProvider.GetDedicatedTenantDatabases()` added
- `Database:DirectHost` config controls PgBouncer bypass for migration advisory locks

---

## v1.3.0 — 2026-05-20

### Commercial Weighing Workflows, Subscriptions, and Cleanup

**Two-pass resume flow — pending-by-plate endpoint**

- `GET /api/v1/commercial-weighing/pending-by-plate/{regNo}` — returns open first-weight-only transactions for a vehicle within the configured threshold (default 8 h)
- `CommercialWeighingService.GetPendingByPlateAsync` added; respects tenant isolation and configurable hour threshold

**Stale transaction notifications**

- New Hangfire recurring job `StaleWeighingNotificationJob` runs every 30 minutes
- Finds commercial transactions stuck at `first_weight_captured` past the threshold and emails Commercial Weighing Managers and Station Managers
- Deduplication via `StaleAlertSentAt` column — one alert per transaction
- Migration `20260520174750_AddStaleAlertSentAtToWeighingTransaction` applied

**Configurable pending threshold setting**

- New system setting `commercial.pending_weighing_threshold_hours` (default 8) seeded in `SystemConfigurationSeeder`
- Constant `SettingKeys.CommercialPendingWeighingThresholdHours` added to `ApplicationSettings`

**Completion notifications**

- `CommercialWeighingService` now sends `truload/weight_ticket` email to the transporter on second-weight completion or stored-tare use
- Tolerance exception alerts (`truload/tolerance_exception_alert`) sent to station managers when net weight discrepancy exceeds configured tolerance band

**Subscription validation**

- `CommercialWeighingController.Initiate` checks subscription status before creating a transaction
- Returns HTTP 402 `{ code: "subscription_inactive" }` if the org's subscription is not ACTIVE or TRIAL
- Fail-open: if subscriptions-api is unreachable, the weighing proceeds

**Treasury pay portal URL from config**

- `Treasury:PayPortalBaseUrl` added to `appsettings.json` (default `https://books.codevertexafrica.com/pay`)
- Both `CommercialWeighingService` and `InvoiceService` now read this from `IConfiguration`; hardcoded URL removed

**Module visibility fixes**

- `TenantModules.SetupNotifications = "setup_notifications"` constant added
- `DefaultCommercialWeighingModules` now includes `setup_notifications` so commercial tenants see the Notifications setup page
- TRULOAD-DEMO org `EnabledModulesJson` updated to include `setup_notifications` and `billing`

**Notifications and Integrations page cleanup**

- `IntegrationConfigController` returns HTTP 400 for notification-managed providers (`sms_twilio`, `sms_africastalking`, `email_smtp`) — these are managed by notifications-service

---

## v1.2.0 — 2026-04-22

### Enforcement Fixes and Charge Accuracy

**Driver + owner joint-liability charge split (Cap 403 / EAC VLC)**

Under the Kenya Traffic Act Cap 403 and the EAC Vehicle Load Control Act, the registered owner and the driver are jointly and severally liable for overload penalties. The fee schedule gives the *per-party* amount; the billed total must therefore be doubled.

- `ProsecutionService.CalculateChargesAsync`: total fee is now `perPartyFee × 2`
- `ChargeCalculationResult` gains `PerPartyFeeKes` and `PerPartyFeeUsd` so ticket PDFs and downstream systems can show the split
- `ProsecutionCaseDto` gains the same two fields (derived as `TotalFee / 2` from stored data — no migration required)
- Repeat-offender handling is unchanged: conviction number 2 selects a higher fee band from the schedule; no blanket multiplier is applied on top

**Special releases — pending filter, search, and pagination**

The special-release approval queue previously returned all records (including already-approved and rejected releases), causing supervisors to see closed items in the pending list.

- `SpecialReleaseRepository.GetPendingApprovalsAsync`: filter changed to `!IsApproved && !IsRejected`
- Search params added: `caseNo`, `releaseType`, `from`, `to`
- Response shape changed from `IEnumerable<SpecialRelease>` to `(List<SpecialRelease> Items, int TotalCount)` for pagination
- `ISpecialReleaseService.GetPendingApprovalsAsync` returns `PagedResponse<SpecialReleaseDto>`

**Vehicle registration search — space normalization**

Kenyan plates are issued both with and without an internal space (e.g. `KCX091X` and `KCX 091X` are the same physical plate). All search paths now normalize spaces before comparing.

- `VehicleRepository.GetByRegNoAsync`: strips spaces before equality check using PostgreSQL `REPLACE()`
- `VehicleRepository.SearchAsync`: ILike + REPLACE on `RegNo`, `ChassisNo`, `EngineNo`
- `CaseRegisterRepository.SearchAsync`: vehicle reg filter added with the same ILike + REPLACE pattern (was declared but never wired into the WHERE clause)

**Vehicle makes — restore soft-deleted records on create**

When a make is soft-deleted (e.g. HOWO, MAZDA, TOYOTA from a data-cleanup run), users cannot see it in the select dropdown and attempt to recreate it. Previously this hit a DB unique-index constraint and returned a confusing 409. Now:

- `VehicleMakesRepository.GetByCodeIncludingDeletedAsync` added — queries without the `DeletedAt == null` filter
- `VehicleMakesController.Create`: checks for a soft-deleted entry by code before attempting an insert; if found, clears `DeletedAt`, restores `IsActive`, updates name/country/description, and returns the restored record

---

## v1.1.0 — 2026-04-21

### Commercial Weighing Polish

**Commercial Settings**

- `Organization` model gains `DefaultTareExpiryDays`, `CommercialWeighingFeeKes`, and `PaymentGateway` fields
- Migration `20260421064138_AddDefaultTareExpiryDaysToOrganization` applied
- `PATCH /api/v1/Organizations/current/commercial-settings` — update weighing fee and tare expiry per organisation

**Tolerance Management**

- `DELETE /api/v1/commercial-weighing/tolerance-settings/{id}` — remove a tolerance rule
- `CommercialWeighingService.DeleteToleranceSetting()` added

---

## v1.0.1 — 2026-04-18

### Commercial Weighing — Core

**New: `CommercialWeighingController`** — 13 endpoints under `api/v1/commercial-weighing`:

| Method | Path | Action |
|--------|------|--------|
| POST | `/` | Initiate transaction |
| GET | `/{id}` | Get transaction result |
| POST | `/{id}/first-weight` | Capture first pass |
| POST | `/{id}/second-weight` | Capture second pass |
| POST | `/{id}/use-stored-tare` | Apply stored tare |
| PUT | `/{id}/quality-deduction` | Apply quality deduction |
| GET | `/vehicles/{vehicleId}/tare-history` | Vehicle tare history |
| GET | `/{id}/ticket/pdf` | Final weight ticket PDF |
| GET | `/{id}/interim-ticket/pdf` | Interim ticket PDF (after first pass) |
| POST | `/{id}/approve-tolerance-exception` | Supervisor tolerance override |
| GET | `/tolerance-settings` | List tolerance settings |
| POST | `/tolerance-settings` | Create tolerance setting |
| PUT | `/tolerance-settings/{id}` | Update tolerance setting |

**New: `CommercialWeighingService`** (703 lines)

- Two-pass weighing flow: initiate → first weight → second weight → net calculation
- Stored tare support: apply pre-registered vehicle tare for single-pass operations
- Net weight calculation: `Net = Gross − Tare`; quality deduction: `AdjustedNet = Net − QualityDeduction`
- Tolerance exception approval (supervisor role required)
- Tare history recording per vehicle

**New: `CommercialWeightTicketDocument`** (QuestPDF)

- Weight summary hero: tare / gross / net prominently displayed
- Axle weights table via `ComposeAxleWeights()`
- Quality deduction section (conditional)
- Organisation logo, station header, operator signature line

**New: `CommercialReportGenerator`** — 10 report types:

1. Daily Weighing Summary
2. Tonnage by Transporter
3. Cargo Volume by Type
4. Weight Discrepancy Report
5. Revenue Summary
6. Throughput Analysis
7. Tare Audit
8. Fleet Utilisation
9. Driver Productivity
10. Quality / Commodity Report

**Database schema additions** (applied via EF Core migrations):

| Table | New columns |
|-------|-------------|
| `weighing.weighing_transactions` | `WeighingMode`, `FirstWeightKg`, `FirstWeightType`, `FirstWeightAt`, `SecondWeightKg`, `SecondWeightType`, `SecondWeightAt`, `TareWeightKg`, `TareSource`, `GrossWeightKg`, `NetWeightKg`, `ConsignmentNo`, `ExpectedNetWeightKg`, `WeightDiscrepancyKg`, `OrderReference`, `SealNumbers`, `TrailerRegNo`, `Remarks`, `QualityDeductionKg`, `AdjustedNetWeightKg`, `IndustryMetadata` (JSONB) |
| `weighing.vehicles` | `DefaultTareWeightKg`, `LastTareWeightKg`, `LastTareWeighedAt`, `TareExpiryDays` |
| `weighing.commercial_tolerance_settings` | New table: `Id`, `OrgId`, `CargoTypeId`, `TolerancePct`, `ToleranceKg`, `AppliesTo` |
| `weighing.vehicle_tare_history` | New table: `Id`, `VehicleId`, `TareWeightKg`, `WeighedAt`, `Source` |
| `weighing.drivers` | `LicenseExpiryDate` |
| `weighing.transporters` | `PortalAccountEmail`, `PortalAccountId` |

**`WeighingService`** — commercial mode bypass: skips compliance checks, enforcement fees, yard tracking, and prohibition logic when `WeighingMode == Commercial`.

---

## v1.0.0 — 2026-04-14

### Transporter Portal

**New: `TransporterPortalController`** — 9 endpoints under `api/v1/portal`:

- `POST /register` — create portal account linked to transporter record
- `GET /weighings` — paginated weighing history for the authenticated transporter
- `GET /weighings/{id}` — single transaction detail
- `GET /vehicles` — transporter's registered vehicle fleet
- `GET /weight-trends` — net weight trend data for charts
- `GET /drivers` — transporter's drivers
- `GET /driver-performance` — per-driver trip and tonnage statistics
- `GET /consignments` — consignment tracking with status
- `GET /subscription` — current plan and feature entitlements

**New: `TransporterPortalService`** (471 lines)

- Cross-tenant query using `IgnoreQueryFilters()` — a transporter can see weighings from any tenant they are linked to
- Feature gating via `ISubscriptionService.GetFeaturesAsync()`: `portal_access`, `ticket_download`, `multi_site_access`, `data_export`, `driver_reports`, `vehicle_trends`, `api_access`, `analytics`, `consignment_tracking`, `webhooks`

---

## v0.9.0 — 2026-03-15

Initial production release covering axle-load enforcement module, case management, prosecution, invoicing, and M-PESA integration.
