# Frontend Releases

Source: `truload-frontend` — continuous-release model; each merge to `main` is collected into a versioned release.

---

## v1.2.0 — 2026-04-22

### Enforcement UX Fixes

**Special releases page**

- Search bar added: filter by case number, release type, and date range (from/to)
- Pagination controls added — results paged server-side
- Status badges: `Pending` (yellow), `Approved` (green), `Rejected` (red) shown on each row
- Approve and Reject action buttons are only rendered for records that are still pending (`!isApproved && !isRejected`); resolved records show status badge only
- Error messages from 409 / validation responses parsed from the API body and surfaced via toast

**Case register — vehicle reg search**

- Dedicated `Vehicle Reg` search field added alongside the existing general search
- Queries the backend with space-normalized matching: `KCX091X` matches `KCX 091X` and vice versa

**Sidebar — commercial-only module gating**

- `Tare Register`, `Tolerance Settings`, and `Billing` sidebar items now carry a `commercialOnly` flag
- Items with this flag are hidden for enforcement tenants; no config change required — derived from `isCommercial` org flag

**Setup → Weighing Metadata — Vehicles tab**

- Fleet list now loads immediately on tab open
- Previously required the user to type at least 2 characters before any results appeared; `enabled: query.length >= 2` guard removed

**Setup → Weighing Metadata — Vehicle Makes**

- Attempting to add a make that was previously soft-deleted (e.g. HOWO, MAZDA, TOYOTA) now silently restores it and returns the record — no error shown
- If a genuinely duplicate (active) make is submitted, a clear conflict message is displayed: `"A vehicle make with this code already exists. Use a different code."`

---

## v1.1.0 — 2026-04-21

### Commercial Mode UI Polish

**Weighing Metadata page**

- Drivers, Cargo Types, and Origins/Destinations tabs are now visible in commercial mode (were incorrectly hidden)
- Roads tab remains enforcement-only (road-act axle limits are not relevant to commercial operations)
- `COMMERCIAL_TABS` updated to `['transporters', 'drivers', 'vehicles', 'cargo-types', 'origins', 'makes']`

**Ticket Detail Drawer**

- Commercial mode shows structured sections: Weight Summary hero (tare / gross / net), Ticket Status badge, Vehicle Details, Consignment & Cargo, Parties & Route, Weighing Passes, Billing, Station & Officer
- Enforcement mode retains existing layout: compliance status, Vehicle & Weighing, Axle Weights, People & Route, Station & Officer
- Quality deduction and adjusted net weight displayed when non-zero
- Tolerance exception status shown inline on status badge row

**Ticket list & filters**

- Commercial status filter options: Pending / First Weight Done / Complete / Tolerance Exceeded
- Axle Type filter hidden in commercial mode
- Print button routes to `/api/v1/commercial-weighing/{id}/ticket/pdf` (was incorrectly calling enforcement endpoint)

**Dashboard filters**

- Status filter in commercial mode shows: All / Pending / First Weight Done / Complete / Tolerance Exceeded
- Enforcement mode retains: All / Legal / Warning / Overloaded

**Operations Tab — Today's Summary**

- Commercial: Vehicles Weighed, Completed, Total Net Tonnage, Tolerance Flags
- Enforcement: Total Weighings, Compliance Rate, Overloads, Warnings

**Settings page**

- Commercial Settings tab visible for commercial tenants only (**Setup > Settings > Commercial**)
- Fields: Weighing Fee (KES), Default Tare Expiry (days), Payment Gateway (read-only)

**Weighing page**

- Yard List and Tags tabs hidden for commercial tenants
- Page subtitle shows "TruLoad — Commercial Weighing" for commercial tenants

---

## v1.0.1 — 2026-04-18

### Commercial Weighing — Core UI

**`CommercialWeighingStepper`** — 4-step capture workflow:

1. **Capture** — vehicle plate scan / middleware lookup
2. **First Weight** — tare or gross pass; option to use stored tare
3. **Second Weight** — complementary pass; quality deduction input
4. **Ticket** — consignment details, cargo type, origin/destination, remarks; PDF generation and print

**`Sheet` UI component** — right-side sliding drawer used for all detail views (tickets, yard entries, tags, invoices, receipts, prosecution records). Composed of `SheetHeader`, `SheetBody`, `SheetFooter`.

**Commercial dashboard**

- KPI cards: Net Weight Today, Transactions Today, Pending (awaiting 2nd pass), Throughput (t/hr)
- Cargo volume chart (bar) by commodity
- Top transporters chart (horizontal bar)

**Type system**

- `WeighingTransaction` extended with 15+ commercial fields: `grossWeightKg`, `netWeightKg`, `firstWeightKg/Type/At`, `secondWeightKg/Type/At`, `orderReference`, `sealNumbers`, `trailerRegNo`, `qualityDeductionKg`, `adjustedNetWeightKg`, `toleranceExceeded`, `toleranceDisplay`, `toleranceExceptionApproved`, `weighingMode`
- `UpdateCommercialSettingsRequest` type and `updateCurrentCommercialSettings` API call added

**Report module selector**

- Commercial report types gated by `isCommercial`: Daily Summary, Tonnage by Cargo, Tonnage by Transporter, Fleet Utilisation, Quality Deductions, Pending Transactions, Monthly Reconciliation

---

## v1.0.0 — 2026-04-14

### Transporter Portal

7 portal pages under `app/portal/`:

| Page | Description |
|------|-------------|
| Dashboard | KPI summary, net weight trend chart |
| Weighings | Paginated weighing history with filters |
| Vehicles | Registered fleet with tare status |
| Drivers | Driver list with performance stats |
| Reports | Available reports gated by subscription tier |
| Subscription | Current plan, feature entitlements, upgrade prompt |
| Layout | Auth guard, sidebar nav, plan badge |

---

## v0.9.0 — 2026-03-15

Initial production release covering axle-load enforcement module, case management, prosecution, invoicing, yard management, and M-PESA payment integration.
