# Implementation Plan: Tenant Modules, Auth Routes, System Roles & 2FA Links

This document is the concrete plan for the requested features. It is based on an audit of the TruLoad frontend and backend.

---

## 1. Google Authenticator Links on 2FA Setup

**Goal:** When setting up 2FA, show the recommended authenticator app (Google Authenticator) with download links for Play Store and App Store.

**Current state:** Profile page `TwoFactorCard` shows QR code and “Enter the 6-digit code from your app” with no app download links.

**Implementation:**

| Step | Location | Action |
|------|----------|--------|
| 1.1 | `truload-frontend/src/app/profile/page.tsx` | In the 2FA setup step (when `step === 'setup'` and QR is shown), add a short “Recommended app” block above the QR: “Use Google Authenticator to scan the QR code.” |
| 1.2 | Same | Add two links: **Android**: `https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2`, **iOS**: `https://apps.apple.com/app/google-authenticator/id388497605`. Open in new tab. Use small button or icon links (e.g. “Get on Google Play”, “Get on App Store”). |
| 1.3 | Optional | Extract this “Recommended authenticator” (title + two links) into a small reusable component e.g. `components/auth/RecommendedAuthenticatorLinks.tsx` and use it on profile 2FA setup and anywhere else 2FA is explained. |

**Files to touch:** `src/app/profile/page.tsx`, optionally `src/components/auth/RecommendedAuthenticatorLinks.tsx`.

---

## 2. Move Auth Pages to `auth/` and Update References

**Goal:** All auth-related pages live under `auth/` (e.g. `auth/login`, `auth/forgot-password`). All `Link`/`href`/redirects must use the new paths.

**Current state:**

- Pages at root: `app/login/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/change-expired-password/page.tsx`.
- References: `LoginForm` → `/forgot-password`; `ProtectedRoute`, `AppSidebar`, `UserProfileDropdown` → `/login`; reset/change-expired pages → `/login`, `/forgot-password`; proxy.ts → `publicPaths`/`authPaths` with `/login`.

**Implementation:**

| Step | Location | Action |
|------|----------|--------|
| 2.1 | Frontend app | Create `app/auth/login/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/page.tsx`, `app/auth/change-expired-password/page.tsx` (move or copy content from current pages). |
| 2.2 | Frontend app | Remove or redirect old routes: delete `app/login/`, `app/forgot-password/`, `app/reset-password/`, `app/change-expired-password/` at root, OR add redirects from root to `auth/*` so old links still work. Prefer single source under `auth/`. |
| 2.3 | `LoginForm.tsx` | Replace `href="/forgot-password"` with `href="/auth/forgot-password"`. Replace `router.push(\`/change-expired-password?token=...\`)` with `router.push(\`/auth/change-expired-password?token=...\`)`. |
| 2.4 | `ProtectedRoute.tsx` | Replace redirect to `/login` with `/auth/login`. |
| 2.5 | `AppSidebar.tsx` | Replace `router.push('/login')` with `/auth/login`. |
| 2.6 | `UserProfileDropdown.tsx` | Replace redirect to `/login` with `/auth/login`. |
| 2.7 | `change-expired-password/page.tsx` (under auth) | Replace all `/login` links with `/auth/login`. |
| 2.8 | `reset-password/page.tsx` (under auth) | Replace `/login` and `/forgot-password` with `/auth/login` and `/auth/forgot-password`. |
| 2.9 | `forgot-password/page.tsx` (under auth) | Replace `/login` with `/auth/login`. |
| 2.10 | `proxy.ts` | Update `publicPaths` and `authPaths` to use `/auth/login` (and if you keep other auth pages public, add `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-expired-password`). |
| 2.11 | Backend | Forgot-password email reset URL: ensure `FrontendUrl` used in AuthController builds link to `/auth/reset-password` (e.g. `{frontendUrl}/auth/reset-password?email=...&token=...`). Check `AuthController.cs` ForgotPassword and any other place that generates reset links. |

**Note:** If tenant slug is implemented (section 6), auth routes become `/[orgSlug]/auth/login` etc.; the same link updates apply relative to that base.

---

## 3. Tenant Type and Module-Based Access (System Config)

**Goal:**  
- Two tenant types: **Commercial Weighing** (small/private; only relevant modules) and **Axle Load Enforcement / Government** (all modules).  
- System Config (and module toggles) is **superuser-only**.  
- Side menu and feature access respect RBAC **and** tenant-enabled modules.

**Current state:**  
- Organization has `Code`, `Name`, `OrgType` (Government/Private). No “tenant type” enum or “enabled modules” concept.  
- System Config page is under `setup/system-config`, protected by `system.security_policy` and `config.read`.  
- Sidebar filters by permissions and `isSuperUser` only; no org-level “enabled modules”.

**Implementation (backend):**

| Step | Location | Action |
|------|----------|--------|
| 3.1 | Organization model | Add optional `TenantType` (e.g. `"CommercialWeighing"` \| `"AxleLoadEnforcement"` \| null). Add `EnabledModules` (JSON array or separate table) listing module keys (e.g. `weighing`, `cases`, `prosecution`, `reporting`, `users`, `shifts`, `financial`, `setup_security`, `setup_axle`, `setup_weighing_metadata`, `setup_acts`, `setup_settings`, `setup_system_config`, `technical`). Alternatively, add a table `OrganizationModule` (OrganizationId, ModuleKey, IsEnabled). |
| 3.2 | Seed / migration | Default existing orgs to `AxleLoadEnforcement` with all modules enabled. New Commercial Weighing orgs get a restricted default set (e.g. weighing, reporting, users, setup_weighing_metadata, setup_settings only; no prosecution, case_management, financial, system_config). |
| 3.3 | API | Add GET/PUT `api/v1/organizations/{id}/modules` or PATCH organization to set `TenantType` and `EnabledModules` (superuser-only). Expose in GET organization by id (and in “current org” endpoint) the list of enabled module keys. |
| 3.4 | System Config access | Restrict **System Config** tab/page to **superuser only**: backend endpoint that returns “module config” or “system config” settings must check `IsInRole("Superuser")` (or equivalent); frontend already can restrict by role. |

**Implementation (frontend):**

| Step | Location | Action |
|------|----------|--------|
| 3.5 | System Config page | Change guard from `system.security_policy` + `config.read` to **superuser only** (e.g. `user.isSuperUser`). Non-superusers get 403 or redirect. |
| 3.6 | New “Module access” tab (System Config) | Add a tab (superuser-only) to set **Tenant Type** (Commercial Weighing vs Axle Load Enforcement) and optionally per-module toggles for current org. Call new backend API to save. |
| 3.7 | App sidebar | When building menu items, combine: (1) current permission-based visibility, (2) **enabled modules** for the current user’s organization. If a module is disabled for the org, hide that menu item even if the user has permission. Menu item ↔ module key mapping must be defined (e.g. “Weighing” → `weighing`, “Case Register” → `cases`, “System Config” → `setup_system_config`). |
| 3.8 | Data source for “enabled modules” | Current user’s organization and its enabled modules must be available (e.g. from auth profile or a small “organization settings” API). Extend login/profile response or add GET “my organization” to include `tenantType` and `enabledModules`. |

**Suggested module keys (align with sidebar):**  
`dashboard`, `weighing`, `cases`, `case_management`, `special_releases`, `prosecution`, `reporting`, `users`, `shifts`, `technical`, `financial_invoices`, `financial_receipts`, `setup_security`, `setup_axle`, `setup_weighing_metadata`, `setup_acts`, `setup_settings`, `setup_system_config`.

---

## 4. User Management: Hide System Users and Roles from Non-Superusers

**Goal:**  
- Users with **Superuser** or **Middleware Service** roles are “system” users: visible and manageable **only by superusers**.  
- Non-superusers do not see these users in the user list and cannot assign or view these roles/permissions.

**Current state:**  
- User list: `GET api/v1/user-management/users` returns all users (filtered by org/station/role etc.); no “hide system users” for non-superuser.  
- Roles: All roles are visible in Roles tab; no “system role” flag.  
- Permissions: All permissions visible to anyone with `system.manage_roles`.

**Implementation (backend):**

| Step | Location | Action |
|------|----------|--------|
| 4.1 | ApplicationRole | Add `IsSystemRole` (bool). Seed: set `IsSystemRole = true` for roles with Code `SUPERUSER` and `MIDDLEWARE_SERVICE`. Migration + seeder update. |
| 4.2 | UsersController (list) | For the GET list endpoint: if the current user is **not** a superuser, exclude users who have **any** system role (e.g. roles where `IsSystemRole == true`). Implement by loading role list for each user (or a join) and filtering out users that have Superuser or Middleware Service. |
| 4.3 | UsersController (get by id, update, delete, assign roles) | For non-superuser: if the target user has a system role, return 404 (get) or 403 (update/delete/assign). For superuser: allow all. |
| 4.4 | RolesController | When listing roles: if current user is **not** superuser, filter out roles where `IsSystemRole == true`. Do not return system roles at all to non-superusers. |
| 4.5 | Role assignment API | When a non-superuser assigns roles to a user, reject request if any of the roles to assign is a system role. When removing a role, non-superuser cannot remove system role from a user (or you may allow only superuser to assign/remove system roles). |

**Implementation (frontend):**

| Step | Location | Action |
|------|----------|--------|
| 4.6 | User list (AccountsTab or equivalent) | No change needed if backend already filters: non-superusers simply won’t receive system users. If frontend still shows “all” from a different API, switch to the filtered list. |
| 4.7 | Roles tab | When listing roles, backend will not return system roles to non-superusers; UI will show only non-system roles. Optionally show a badge “System” for roles that are system (for superuser view). |
| 4.8 | User create/edit (role picker) | For non-superuser, role dropdown must only contain non-system roles (backend can already restrict; frontend can also filter by `isSystemRole` if returned). |

---

## 5. Permissions and Roles Screen: System-Sensitive Permissions Only for Superuser

**Goal:**  
- Permissions like “delete user”, “manage roles”, “system admin”, “security policy”, etc. are **system-sensitive**: only **superuser** can see and assign them.  
- Non-superusers cannot assign these permissions to any role and ideally don’t see them in the permissions list for role editing.

**Current state:**  
- Permissions list and role–permission assignment are available to users with `system.manage_roles`. No distinction between “system-sensitive” and “normal” permissions.

**Implementation (backend):**

| Step | Location | Action |
|------|----------|--------|
| 5.1 | Permission model or seed | Add `IsSystemSensitive` (bool) to Permission (or a new table). Mark as system-sensitive at least: `user.delete`, `user.assign_roles`, `user.manage_permissions`, `system.admin`, `system.manage_roles`, `system.manage_organizations`, `system.manage_stations`, `system.security_policy`, `system.backup_restore`, `system.audit_logs`, `system.cache_management`, `system.integration_management`. Migration + seeder. |
| 5.2 | PermissionsController (list) | When listing permissions for role management: if current user is **not** superuser, exclude permissions where `IsSystemSensitive == true` (or return them with a flag and let frontend hide). Prefer excluding so non-superuser never sees them. |
| 5.3 | Assign permissions to role | When a non-superuser tries to assign a permission to a role, reject if that permission is system-sensitive. When removing, non-superuser cannot remove system-sensitive permission (or only superuser can change system-sensitive permissions). |

**Implementation (frontend):**

| Step | Location | Action |
|------|----------|--------|
| 5.4 | Permissions tab / role–permission UI | If backend excludes system-sensitive permissions for non-superuser, the permission list and checkboxes will automatically only show non-sensitive ones. Optionally for superuser view, show a “System” or “Sensitive” badge next to such permissions. |

---

## 6. Enforce Tenant Slug in Frontend Routes

**Goal:**  
- All frontend routes are under the tenant slug: `/{orgSlug}/...` (e.g. `http://localhost:3000/kura/auth/login`, `http://localhost:3000/kura/dashboard`).  
- The first path segment after the base URL is always the organization slug (e.g. `kura` from Organization.Code or a dedicated Slug field).

**Current state:**  
- Routes are flat: `/login`, `/dashboard`, `/setup/system-config`, etc. No tenant segment.  
- Organization has `Code` (e.g. KURA); can be used as slug (lowercase: `kura`) or add a dedicated `Slug` field.

**Implementation:**

| Step | Location | Action |
|------|----------|--------|
| 6.1 | Backend (optional) | If Organization has no slug: add `Slug` (unique) or document that `Code` is used as slug (e.g. lowercased). Ensure login/profile returns `organizationCode` or `organizationSlug` for the current user. |
| 6.2 | Frontend app structure | Introduce dynamic segment: move (or duplicate) routes under `app/[orgSlug]/...`. So: `app/[orgSlug]/auth/login/page.tsx`, `app/[orgSlug]/dashboard/page.tsx`, `app/[orgSlug]/setup/system-config/page.tsx`, etc. Layout at `app/[orgSlug]/layout.tsx` can read `orgSlug` and set context or validate that current user’s org matches. |
| 6.3 | Root redirect | Root page `app/page.tsx`: redirect to a “select org” or default org (e.g. `redirect to /kura` or to `/kura/dashboard` if logged in, `/kura/auth/login` if not). Alternatively show org picker if multiple orgs. |
| 6.4 | Auth flow | After login, redirect to `/{orgSlug}/dashboard` (or intended path). Org slug comes from user’s organization (Code or Slug). Store in auth state or read from profile. |
| 6.5 | All internal links | Update every `Link` and `router.push` to include `orgSlug`: e.g. `/${orgSlug}/dashboard`, `/${orgSlug}/auth/login`. Use a hook or context like `useOrgSlug()` that returns current org slug (from session/context or from path param). |
| 6.6 | Middleware (Next.js) | Add or update `middleware.ts` at project root: for protected paths (e.g. `/:orgSlug/dashboard`, `/:orgSlug/setup/*`), require auth and optionally validate that `orgSlug` matches the authenticated user’s org; redirect to `/{orgSlug}/auth/login` if unauthenticated. For `/:orgSlug/auth/*`, allow without auth but optionally validate org exists. |
| 6.7 | Proxy / public paths | Update `proxy.ts` (or Next middleware) so that public paths are under org slug, e.g. `/auth/login` becomes `/:orgSlug/auth/login` (match pattern). |

**Risks:**  
- Large refactor: every route and link changes.  
- Ensure 404 and not-found handling for invalid `orgSlug`.  
- Logout and “forgot password” links must still work (e.g. `/{orgSlug}/auth/forgot-password`); backend email link should use base URL + org slug if you want tenant-specific reset links.

---

## 7. Sidebar: Show Modules Based on RBAC + Permissions + Enabled Modules

**Goal:**  
- Side menu items are visible only if: (1) user has at least one of the required permissions for that item, **and** (2) the item’s module is **enabled** for the user’s organization.  
- Superuser can bypass (2) or see all modules; recommend still respecting (2) for consistency.

**Current state:**  
- `AppSidebar` filters by `user.permissions` and `user.isSuperUser`; no “enabled modules” check.

**Implementation:**

| Step | Location | Action |
|------|----------|--------|
| 7.1 | Menu definition | In `AppSidebar` (or a config file), assign each menu item a `moduleKey` (e.g. `weighing`, `cases`, `setup_system_config`). |
| 7.2 | Data | Ensure `enabledModules` (or equivalent) for the current org is available in the app (auth store, context, or API). |
| 7.3 | Filter logic | When computing `filteredSections`, besides permission check, filter out items whose `moduleKey` is not in `enabledModules` (unless superuser and you decide to show all). |
| 7.4 | Default for no list | If org has no “enabled modules” set (e.g. legacy), treat as “all modules enabled” so behavior stays backward compatible. |

---

## 8. Implementation Order (Suggested)

1. **2FA Google Authenticator links** (section 1) – small, isolated change.  
2. **Move auth pages to `auth/`** (section 2) – no tenant slug yet; paths become `/auth/login` etc.  
3. **System roles and hide system users** (section 4) – backend role flag, filter users/roles; then frontend.  
4. **System-sensitive permissions** (section 5) – backend permission flag, filter list and assign; then frontend.  
5. **System Config superuser-only + tenant type & modules** (section 3) – backend org model and APIs, then frontend System Config tab and sidebar module filtering (section 7).  
6. **Tenant slug in routes** (section 6) – large change; do after auth move and module logic. Then update all links and middleware to use `/[orgSlug]/auth/login` etc.
7. **Remaining: Currency/KES, courts seed, prosecution location** (section 10) – do after all above. See IMPLEMENTATION_PLAN_AUDIT_AND_FIXES.md §2–5.

---

## 9. Summary Checklist

- [ ] 2FA setup: Add Google Authenticator (Play + App Store) links on profile 2FA step.  
- [ ] Move login, forgot-password, reset-password, change-expired-password under `app/auth/` and update all references and backend reset link.  
- [ ] Backend: Organization tenant type and enabled modules (model + API); System Config endpoints superuser-only.  
- [ ] Backend: ApplicationRole.IsSystemRole; filter users and roles for non-superuser.  
- [ ] Backend: Permission.IsSystemSensitive; filter permissions list and assign for non-superuser.  
- [ ] Frontend: System Config page and “Module access” tab superuser-only; sidebar filtered by enabled modules.  
- [ ] Frontend: User list and role/permission UIs respect backend filters (no extra change if API is strict).  
- [ ] Frontend: Enforce tenant slug in all routes and links; middleware and redirects for `/[orgSlug]/auth/login` and protected paths.
- [ ] **Remaining (after above):** Currency/KES audit, courts seed, prosecution/case location integration (see IMPLEMENTATION_PLAN_AUDIT_AND_FIXES.md).

---

## 10. Remaining Plan: Currency/KES, Courts Seed, Prosecution Location

To be implemented once all tenant-module and auth-route changes are in place. See **IMPLEMENTATION_PLAN_AUDIT_AND_FIXES.md** for details:

- **Currency/KES (§2–3):** Analytics, reports, fee bands, and charge calculations default to KES; Traffic Act in KES; EACVL in USD with conversion where needed.
- **Courts seed (§4):** Seed courts with FKs to County and/or Subcounty; ensure relations are correct.
- **Prosecution/case location (§5):** Use prosecution defaults (court, complainant, county, subcounty, road) when creating/editing case register and prosecution; ensure court and location data are used in queries and display.
