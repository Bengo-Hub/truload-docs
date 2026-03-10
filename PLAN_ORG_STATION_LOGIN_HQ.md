# Strategic Plan: Org-Slug Login, Station Resolution, HQ Branch & Shared Auth

## Objectives

1. **Login under org slug** – Tenant login at `/[orgSlug]/auth/...` so org slug is available for branding and backend can resolve organisation (details, logo).
2. **Station resolution** – Decide how to resolve “current station” for branding and data filtering: pre-login station selection vs nested route; handle HQ.
3. **HQ branch** – Seed a default HQ station per tenant; users assigned to HQ can log in to any station and access data across stations (no station filter); station-linked users are restricted to their station.
4. **Backend tenant/station context** – Enforce filtering by station when `X-Station-ID` is set; when not set (HQ or platform user), do not filter by station. Platform users (superuser, middleware) skip tenant context.
5. **Station mandatory** – Require station when creating tenant users.
6. **Shared login form** – Single reusable component for tenant login (`/[orgSlug]/auth/login`) and platform login (`/auth/login` or `/platform/login`).
7. **Public shared auth pages** – Forgot password, reset password, change-expired-password remain public and shared at `app/auth/*` (root); fix all links.

---

## Current State (Audit Summary)

### Backend

- **TenantContext** (`Middleware/TenantContext.cs`): Resolves org/station from (1) headers `X-Org-ID`, `X-Station-ID`, (2) JWT claims `organization_id`, `station_id`, (3) hostname, (4) default KURA. Station in context is validated to belong to org. `IsStationAccessAllowed`: when station comes from header, user must have matching station claim or be Superuser/System Admin.
- **Auth/login**: `LoginRequest` has Email, Password only. No org/station in request. Login does not validate org or station.
- **JWT**: Adds `organization_id` and `station_id` from `user` (ApplicationUser.OrganizationId, StationId). No “is HQ” or “can access all stations” flag.
- **Station model**: Has `Code`, `Name`, `OrganizationId`, `IsDefault`. **No `IsHq`**.
- **User create** (`CreateUserRequest`): `StationId` is optional; backend falls back to default station if null.
- **API client (frontend)**: After login, `setTenantContext({ organizationId, stationId })` from response user; every request sends `X-Org-ID` and `X-Station-ID` when present. No “don’t send station for HQ” logic.

### Frontend

- **Auth routes**: Both `app/auth/*` (login, forgot, reset, change-expired) and `app/[orgSlug]/auth/*` exist (duplicate). Root auth has real content; [orgSlug]/auth has similar content (login with LoginForm).
- **LoginForm**: Single component; accepts optional `orgSlugOverride`; used on root `/auth/login` and could be used on `/[orgSlug]/auth/login`. No station in flow.
- **Token storage**: `setTenantContext` stores org and station from login response; client sends both on every request. No HQ handling (no “omit station” for HQ users).

### Gaps

- No HQ concept (Station.IsHq, or role-based “can access all stations”).
- No “login to this station” validation (user can log in and then see data; station is from user profile only).
- Pre-login station selection: user selects station on a page (no nested `[stationCode]` in the route); selection is passed via query/state to login.
- Station optional on user create.
- Duplicate auth pages (root vs [orgSlug]); shared public pages (forgot/reset/change-expired) should live only at root with consistent links.

---

## Strategic Decisions

### 1. Tenant login URL shape

- **Use** `/[orgSlug]/auth/login` (and optionally `/[orgSlug]/auth` for station selection) so that:
  - Org slug is in the path for branding and for passing to APIs (e.g. GET org by slug for logo/details).
  - No need to nest `[stationCode]` in the path if we use a **pre-login station step** (see below).

### 2. Station resolution: pre-login selection (recommended)

- **Pre-login flow**:
  1. User opens `/[orgSlug]` or `/[orgSlug]/auth` → show org branding (from GET org by slug).
  2. **Station selection**: Load stations for org (public endpoint by org slug/id). User picks a station (including “HQ” if present). If only one station (e.g. HQ only), skip selection.
  3. Navigate to `/[orgSlug]/auth/login?station=CODE` (or store selected station in state and pass in login request).
  4. **Login request** includes optional `organizationCode` (or orgSlug) and `stationCode` (or stationId). Backend validates:
     - User belongs to org (user.OrganizationId matches org).
     - Either user’s station matches selected station, or user is an “HQ user” (see below) and can choose any station.
  5. If validation fails (e.g. station-linked user chose another station): 403 with clear message.

- **Alternative (nested route)** `/[orgSlug]/[stationCode]/auth/login`: Possible but forces a convention for HQ (e.g. `stationCode = "hq"`). Pre-login selection is more flexible and works with one or many stations.

### 3. HQ definition and behaviour

- **Model**: Add `IsHq` (bool) to **Station**. One station per tenant (e.g. Code `"HQ"`) is the HQ branch; seed it for all tenants.
- **User semantics**:
  - If **user.StationId** is an HQ station → treat as “HQ user”: can log in to any station (for branding/context); **do not** send `X-Station-ID` by default so backend does not filter by station. Frontend can send `X-Station-ID` when user explicitly “switches station” for analytics/dashboards.
  - If **user.StationId** is not HQ → “station-linked user”: must log in to that station only; frontend **always** sends `X-Station-ID` (and backend enforces).
- **Platform users** (Superuser, Middleware): No tenant/station context; backend already allows them to bypass station checks in `IsStationAccessAllowed`. Frontend should not set org/station for platform users (or backend ignores them).

### 4. Backend context rules (summary)

- **Platform users** (Superuser, Middleware): Tenant context not applied (or applied but not used for filtering). No station filter.
- **Tenant HQ user**: Resolve org from user; do not set station in context unless explicitly selected (e.g. from header). When `X-Station-ID` is missing, data APIs should not filter by station (user sees all stations’ data within org).
- **Tenant station-linked user**: Set org and station from user (and send in headers). Data filtered by station.
- **Login**: Accept optional `organizationCode` and `stationCode` (or ids); validate user belongs to org and is allowed to use chosen station (same station or HQ user).

### 5. Public shared auth pages

- **Keep** forgot-password, reset-password, change-expired-password **only at root**: `app/auth/forgot-password`, `app/auth/reset-password`, `app/auth/change-expired-password`. No duplicates under `[orgSlug]/auth/`.
- All links (from tenant login, platform login, emails) point to `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-expired-password` (and back to `/auth/login` or `/[orgSlug]/auth/login` as appropriate).

### 6. Shared login form

- **Single component** `LoginForm` (or `SharedLoginForm`) used in:
  - **Tenant**: `app/[orgSlug]/auth/login/page.tsx` – receives orgSlug from route, optional station from query/state; calls login with org + station when provided.
  - **Platform**: `app/auth/login/page.tsx` (or `/platform/login`) – no org/station; platform users hit same login API but without org/station; redirect to `/platform` after success.
- Form props: `mode: 'tenant' | 'platform'`, `orgSlug?: string`, `stationCode?: string` (or stationId), and any branding (org name/logo) passed from the page.

---

## Implementation Plan (Phased)

### Phase 1: Backend – HQ and org/station on login

| Step | Location | Action |
|------|----------|--------|
| 1.1 | `Station` model | Add `IsHq` (bool, default false). Migration. |
| 1.2 | Seed / data | For each organisation, ensure one station with Code `"HQ"` (or `"HEADQUARTERS"`) and `IsHq = true`. Create in org seed or dedicated seeder. |
| 1.3 | `LoginRequest` | Add optional `OrganizationCode` (string) and `StationCode` (string) or `StationId` (Guid?). |
| 1.4 | `AuthController.Login` | After password check: if `OrganizationCode` provided, resolve org by code; ensure `user.OrganizationId` matches; else skip. If `StationCode`/`StationId` provided: resolve station; if user has a station and it’s not HQ, require `user.StationId == selectedStationId`; if user’s station is HQ, allow any station. Return 403 with message if validation fails. |
| 1.5 | Login response / profile | Include `isHqUser: bool` (true when user.StationId is an HQ station). Frontend uses this to decide whether to send `X-Station-ID`. |
| 1.6 | `CreateUserRequest` | Make `StationId` required for tenant users (validation attribute or business rule). Platform/superuser creating user may still set station. |
| 1.7 | `UsersController.Create` | Enforce StationId required (return 400 if null for non–platform context). |

### Phase 2: Backend – Tenant context and headers

| Step | Location | Action |
|------|----------|--------|
| 2.1 | `TenantContextMiddleware` | Document/support: when user is Superuser or Middleware, do not apply tenant filtering (or set context but APIs ignore station). Already partially true via `IsStationAccessAllowed`. |
| 2.2 | Frontend token/context | When storing tenant context after login: if `isHqUser` true, do **not** store stationId (or store but do not send `X-Station-ID` in requests). So backend sees no station header → no station filter. |
| 2.3 | Frontend “switch station” | For HQ users, allow UI to pick a “current station” for analytics/dashboards; when selected, send that station id in `X-Station-ID` for relevant API calls (e.g. reports). Optional: store “selected station” in context/localStorage. |
| 2.4 | Data APIs | Ensure all tenant data APIs use `_tenantContext.StationId` only when non-null to filter; when null (HQ user, no header), do not add station predicate. Audit WeighingController, CaseRegisterController, YardController, etc. |

### Phase 3: Frontend – Org-slug login and pre-login station selection

| Step | Location | Action |
|------|----------|--------|
| 3.1 | Public API | Ensure GET org by slug/code (for branding) is available unauthenticated (e.g. existing public controller or new endpoint). Return id, code, name, logoUrl (if any). |
| 3.2 | Public API | GET stations by org (by org slug or id) unauthenticated for pre-login list. Return id, code, name; mark HQ (e.g. `isHq: true`). |
| 3.3 | Route structure | Tenant login: `app/[orgSlug]/auth/page.tsx` (optional) → station selection + link to login. `app/[orgSlug]/auth/login/page.tsx` → login form. Fetch org by slug for logo/branding. |
| 3.4 | Pre-login page | `[orgSlug]/auth/page.tsx`: Fetch org by slug; fetch stations; show org name/logo; list stations (or single “Continue to login” if one/HQ only). On select, go to `/[orgSlug]/auth/login?station=CODE` or pass in state. |
| 3.5 | Tenant login page | `[orgSlug]/auth/login/page.tsx`: Read orgSlug from params, station from query/state. Use shared LoginForm with `mode="tenant"`, orgSlug, stationCode. On submit, call login(email, password, organizationCode, stationCode). Handle 403 (wrong station) with message. |
| 3.6 | Root auth/login | Keep `app/auth/login/page.tsx` for **platform** login (no org/station). Use same shared LoginForm with `mode="platform"`. Redirect to `/platform` on success. |
| 3.7 | Remove duplicate auth | Remove `app/[orgSlug]/auth/forgot-password`, `reset-password`, `change-expired-password` (if they duplicate root). Keep only root `app/auth/forgot-password`, etc. |

### Phase 4: Shared login form and links

| Step | Location | Action |
|------|----------|--------|
| 4.1 | `LoginForm` (shared) | Refactor to accept `mode: 'tenant' | 'platform'`, `orgSlug?: string`, `stationCode?: string`, and optional branding (orgName, logoUrl). When mode is tenant and orgSlug/stationCode present, include them in login API payload. |
| 4.2 | Auth API (frontend) | Extend `login()` to accept optional `organizationCode`, `stationCode`; send in request body. |
| 4.3 | Auth API response | Map backend `isHqUser` into profile/store. When setting tenant context, if `isHqUser` do not set stationId (or set but instruct client not to send header). |
| 4.4 | Forgot / reset / change-expired links | Everywhere: link to `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-expired-password`. “Back to login” from those pages: for tenant flow use `/[orgSlug]/auth/login` when orgSlug is known; otherwise `/auth/login`. |
| 4.5 | Email templates | Backend reset/change-expired links: use base URL + `/auth/reset-password?...` and `/auth/change-expired-password?...` (no org slug in path for these public pages). |

### Phase 5: User create – station required

| Step | Location | Action |
|------|----------|--------|
| 5.1 | Backend `CreateUserRequest` | Add `[Required]` for `StationId` when creating tenant user (or validate in controller: if not superuser and org context is tenant, StationId required). |
| 5.2 | Frontend user form | In tenant user create (e.g. AccountsTab under `[orgSlug]/users`): make Station a required field; list stations for current org (HQ + branches). |
| 5.3 | Backend create | Reject with 400 if StationId is null and context is tenant. |

### Phase 6: HQ user – station switcher (optional but recommended)

| Step | Location | Action |
|------|----------|--------|
| 6.1 | Store/context | Add “selectedStationId” for HQ users (null = “all stations”). When set, send as `X-Station-ID` for dashboard/analytics/reporting APIs. |
| 6.2 | UI | In dashboard or layout, for HQ users show a station dropdown (list stations of org); on change update selectedStationId and refetch data. Station-linked users see no switcher (fixed station). |

---

## File and Route Summary

### Backend

- `Models/Infrastructure/Station.cs` – add `IsHq`.
- `Migrations` – add column `is_hq` (or similar).
- Seed: ensure HQ station per org (e.g. in organization/station seed).
- `DTOs/Auth/LoginRequest.cs` – add `OrganizationCode`, `StationCode` (or ids).
- `Controllers/Auth/AuthController.cs` – login validation for org/station; return `isHqUser` in response.
- `Services/Implementations/Auth/JwtService.cs` – optionally add claim `is_hq_user` if needed.
- `Controllers/UserManagement/UsersController.cs` – require StationId on create for tenant.
- `DTOs/User/UserDto.cs` or Auth DTO – `CreateUserRequest.StationId` required (or validated in controller).

### Frontend

- **Tenant auth**: `app/[orgSlug]/auth/page.tsx` (station selection), `app/[orgSlug]/auth/login/page.tsx` (login with org + station).
- **Platform auth**: `app/auth/login/page.tsx` (shared form, mode platform).
- **Public shared**: `app/auth/forgot-password`, `app/auth/reset-password`, `app/auth/change-expired-password` – keep only these; remove duplicates under `[orgSlug]/auth/`.
- **Shared component**: `components/forms/auth/LoginForm.tsx` (or `SharedLoginForm`) – mode, orgSlug, stationCode, branding.
- **API**: `lib/auth/api.ts` – login(..., organizationCode?, stationCode?); map `isHqUser` from response.
- **Token/context**: `lib/auth/token.ts` and API client – when `isHqUser`, do not set/send station id by default; support “selected station” for HQ for reporting.
- **User form**: Tenant user create – station dropdown required; list stations for org.

### Links to update

- Forgot password: `/auth/forgot-password`.
- Reset/change-expired: `/auth/reset-password`, `/auth/change-expired-password`.
- Back to login from tenant: `/[orgSlug]/auth/login`; from platform: `/auth/login`.
- Root redirect: `/` → e.g. show org selector or redirect to `/auth/login` (platform) and tenant entry e.g. `/kura/auth` (or keep current behaviour).

---

## Execution Order

1. **Phase 1** – Backend HQ (Station.IsHq, seed), login request/validation, isHqUser in response, StationId required on create.
2. **Phase 2** – Frontend tenant context: omit station when isHqUser; ensure backend APIs treat null station as “no filter” for tenant users.
3. **Phase 3** – Frontend routes: [orgSlug]/auth (station selection), [orgSlug]/auth/login; root auth/login for platform; remove duplicate auth pages under [orgSlug] for forgot/reset/change-expired.
4. **Phase 4** – Shared LoginForm, login API params, all auth links and email links.
5. **Phase 5** – User create station required (backend + frontend form).
6. **Phase 6** – HQ station switcher (optional).

---

## Risks and Notes

- **Backend auth path**: Ensure `/api/v1/auth/*` is skipped by tenant resolution or works without org/station (login is AllowAnonymous; org/station in body, not headers). Current middleware runs for all non-skip paths; for login request there is no JWT so only headers would set context. Sending org/station in body is fine; no change to middleware required for login itself.
- **Platform vs tenant entry**: Clear entry points: platform users go to `/auth/login`; tenant users go to `/[orgSlug]/auth` or `/[orgSlug]/auth/login`. Root `/` can redirect to a landing that links to both or default to one.
- **Existing users**: Existing users without station: migration or seed should assign them to HQ station (or default station) so they remain valid; then require station for new creates only if desired.
