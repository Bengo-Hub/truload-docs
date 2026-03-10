# TruLoad Implementation Plan – Audit and Fixes

## 1. Optional Next Steps (from previous work)

| Item | Status | Notes |
|------|--------|--------|
| Wire prosecution defaults into "create prosecution from case register" | Done | Backend: GET api/v1/prosecutions/defaults returns defaultCourtId, defaultComplainantOfficerId, defaultCountyId, defaultSubcountyId, defaultRoadId, defaultDistrict. Frontend can call this when opening create prosecution/case form to pre-fill. |
| Geographic seeder (counties/districts) | Done | KenyaCountiesDistrictsSeeder seeds 47 counties and districts (subcounties) with CountyId FK. Registered in DatabaseSeeder. |
| weighing-metadata open Roads tab from `?tab=roads` | Done | Frontend: searchParams.tab sets initial tab; valid tabs include "roads". |

---

## 2. Currency / KES Audit

- **Current currency**: KES (system default).
- **Rules**: All analytics, reports, compliance, and charge calculations must show/use KES by default. Only convert when the value is explicitly USD (e.g. EAC act). Traffic Act fee bands must be in KES.
- **Backend**:
  - `ActDefinition.ChargingCurrency`: Traffic = KES, EAC = USD.
  - `AxleFeeSchedule`: currently `FeePerKgUsd`, `FlatFeeUsd`. For Traffic Act use KES columns or a single currency + act-based conversion.
  - Prosecution/charge calculation: use act’s ChargingCurrency; if KES, use KES fee bands or convert from USD only when act is USD.
  - Analytics/reports: prefer KES; when displaying USD (e.g. EAC), label and optionally convert to KES using exchange rate.
- **Frontend**: Default display currency KES; show USD only when relevant (e.g. EAC) with clear labels.

---

## 3. Multicurrency (Traffic Act KES, EACVL USD)

- **Traffic Act**: Fee bands in KES; no conversion.
- **EACVL**: Fee bands in USD; convert to KES for reporting if needed using `CurrencyService.GetCurrentRateAsync("USD", "KES")`.
- **Fee schedule**: Either add KES columns for Traffic Act bands, or store one currency per row and tag by act (recommended: FeeCurrency + amount, or separate KES/USD columns).
- **Reports/analytics**: Sum/display by currency; dashboard default = KES; allow toggle or separate KES/USD views.

---

## 4. Seed Kenya Data (Counties, Subcounties, Courts)

- **Counties**: Seed all 47 Kenyan counties (Code, Name).
- **Subcounties (Districts)**: Seed subcounties per county; FK CountyId.
- **Courts**: Seed courts with FK to County and/or Subcounty where applicable.
- **Relations**: Counties → Districts (Subcounties); Courts → CountyId / SubCountyId (or DistrictId). Apply FKs in migrations if new columns added.

---

## 5. Prosecution and Case Management – Location and Court

- **CaseRegister**: Already has RoadId, CountyId, DistrictId, SubcountyId. Use prosecution defaults when creating/editing case register (default court, complainant, county, subcounty, road).
- **Prosecution create**: CreateProsecutionRequest does not include court/county; those live on CaseRegister/CourtHearing. When creating prosecution from case, case register may already have location; otherwise pre-fill from defaults when creating/editing case register.
- **API**: Add GET prosecution/defaults returning { defaultCourtId, defaultComplainantId, defaultCountyId, defaultSubcountyId, defaultRoadId } from ApplicationSettings.
- **Court hearings**: Ensure court and location (county/subcounty) are used where applicable in queries and display.

---

## 6. 2FA Login Flow

- **Issue**: Backend returns `{ requires2FA: true, twoFactorToken }` when 2FA is enabled, but frontend treats response as full login and does not show 2FA step.
- **Fix**:
  - Auth API: Detect `requires2FA` in login response; do not set tokens; return or expose `pending2FA: { twoFactorToken }`.
  - Auth store: Handle `pending2FA` state (e.g. set state so LoginForm can show 2FA step).
  - LoginForm: If login response is 2FA challenge, show TOTP (and recovery code) input; on submit call POST `/auth/login/2fa-verify` with twoFactorToken and code; then set tokens/user from verify response.
- **Shift 2FA**: When admin enables “shift login 2FA for all except excluded roles”, backend should set a flag (e.g. user must enable 2FA on next login). On login, if user has no 2FA and policy requires it, return a response forcing 2FA setup (e.g. `requires2FASetup: true`) and block full login until 2FA is enabled.

---

## 7. User Profile Revamp

- **Content**: Approval requests (by role), shift schedules, personal info, security (2FA, password). Modern, responsive layout.
- **2FA**: Move 2FA setup/disable and recovery codes to profile (already partially there); remove from security settings.
- **Approvals**: Integrate with approval workflows; show pending items for the logged-in user’s role.
- **Shifts**: Show user’s shift schedule (from user-shifts API).

---

## 8. Security Settings – Remove 2FA

- **Remove**: 2FA tab or 2FA registration from security settings page. Keep only org-level toggles (e.g. “2FA required for shift login”, “Excluded roles”).
- **Shift 2FA**: When “Require 2FA for shift actions” (or “shift login 2FA”) is on and user is not excluded, force user to enable 2FA on next login; thereafter require 2-step 2FA at login.

---

## 9. Password Policy and Expiry (Done)

- **Backend**: Policy enforced via `DynamicPasswordValidator`. Added `LastPasswordChangeAt`, `security.password_expiry_days`. Login returns 401 with `passwordExpired` + `changePasswordToken` when expired. `POST /auth/change-expired-password` and `GET /auth/password-policy` [AllowAnonymous]. Register/Reset/ChangePassword/ChangeExpiredPassword set `LastPasswordChangeAt`.
- **Frontend**: Login redirects to `/change-expired-password?token=...` on 401 passwordExpired. Public change-expired and reset-password use public policy; Security settings has Password Expiry (days).

---

## 10. Public Auth Pages and Reusable 2FA (Done)

- **Public pages**: Forgot/reset/change-expired-password and login (incl. 2FA step) are public; password policy via `GET /auth/password-policy`.
- **Reusable 2FA**: `TwoFactorCodeInput` used on login (2FA step) and profile (enable 2FA verify step).

---

## 11. Tenant Modules, Auth Routes, System Roles (Implemented / Plan)

See **[PLAN_TENANT_MODULES_AUTH_ROUTES.md](./PLAN_TENANT_MODULES_AUTH_ROUTES.md)** for the full plan. **Implemented:** 2FA Google Authenticator links, auth pages under `auth/`, backend tenant type + enabled modules + System Config superuser, IsSystemRole + user/role filtering, IsSystemSensitive + permission filtering, frontend System Config superuser guard + Module access tab, sidebar by enabled modules. **Still to do:** tenant slug in all routes (§6), then **Remaining (§10):** currency/KES, courts seed, prosecution location (see §2–5 below).

- Google Authenticator download links on 2FA setup
- Moving auth pages to `auth/` and updating all references
- Tenant type (Commercial Weighing vs Axle Load Enforcement) and module-based access; System Config superuser-only
- Hiding system users (Superuser, Middleware Service) and system roles from non-superusers
- Restricting system-sensitive permissions to superuser only
- Enforcing tenant slug in frontend routes (`/{orgSlug}/auth/login`, etc.)
- Sidebar visibility based on RBAC + permissions + enabled modules

---

## 12. Implementation Order

1. **2FA login flow** – Fix login + 2FA verify on frontend and auth store.
2. **Prosecution defaults API** – GET prosecution/defaults; frontend pre-fill when creating prosecution/case.
3. **weighing-metadata ?tab=roads** – URL tab handling.
4. **Currency/KES** – Fee bands and charge calculation: Traffic Act in KES; reports/analytics default KES.
5. **Multicurrency** – EAC USD conversion; report labels and optional KES view.
6. **Seed Kenya** – Counties, subcounties, courts with FKs.
7. **Prosecution/case location** – Use defaults in case register create/edit and court hearing.
8. **User profile revamp** – Layout, approvals, shifts, security (2FA).
9. **Security settings** – Remove 2FA UI; enforce shift 2FA on next login.
