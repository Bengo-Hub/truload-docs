# Backend Releases

Source: `truload-backend` — continuous-release model; each merge to `main` is collected into a versioned release.

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
