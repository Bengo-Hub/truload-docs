# Plan: Platform vs Tenant Routes, Auth at Root, Org/Station Branding

## Goals

1. **Auth pages at root** – `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/change-expired-password` are public; not under `[orgSlug]`. Same pages for platform and tenant users.
2. **Platform section** – `/platform/*` for superuser-only: dashboard, tenant registration, platform users (system roles), platform roles (system-sensitive permissions). Not under `[orgSlug]`.
3. **Tenant section** – `/[orgSlug]/*` (dashboard, weighing, cases, setup, profile, etc.) for tenant users.
4. **Redirect after login** – Platform users (superuser) → `/platform`. Tenant users → `/[orgSlug]/dashboard`.
5. **Login page** – Public org/station APIs for branding; show org/station on login for personalized UX.
6. **Remove redundant** – No duplicate auth under `[orgSlug]`; root auth pages are the only auth pages.
7. **Audit links** – All `Link` and `router` use `/auth/*` for auth, `/[orgSlug]/*` for tenant, `/platform/*` for platform.

---

## Current State

- `app/auth/login` (and forgot, reset, change-expired) **redirect** to `/kura/auth/...` but **no pages exist** under `app/[orgSlug]/auth/` → 404.
- LoginForm uses `useOrgSlug()` (expects tenant route); used nowhere in app routes (only in components).
- OrganizationsController and StationsController are `[Authorize]` with permissions – no public list for login branding.
- No `/platform` routes.

---

## Implementation Steps

### Phase 1: Backend – Public org/station for login branding

| Step | Action |
|------|--------|
| 1.1 | Add `[AllowAnonymous] GET api/v1/organizations/public` (or `api/v1/auth/organizations`) returning minimal list: `{ id, code, name }` for login page dropdown/branding. |
| 1.2 | Add `[AllowAnonymous] GET api/v1/stations/public?organizationId=...` (or by org code) returning minimal list for login page. Optional: only if we show station on login. |

### Phase 2: Auth pages at root (real content, no redirect)

| Step | Action |
|------|--------|
| 2.1 | `app/auth/login/page.tsx`: Render full login layout + `<LoginForm />`. Optional: fetch public orgs and pass `orgSlug` from query `?org=kura` or selector. |
| 2.2 | `app/auth/forgot-password/page.tsx`: Real page with form (email submit → API `/auth/forgot-password`). Link back to `/auth/login`. |
| 2.3 | `app/auth/reset-password/page.tsx`: Real page with form (token + new password from query). Link to `/auth/login`. |
| 2.4 | `app/auth/change-expired-password/page.tsx`: Real page with form (token from query). Link to `/auth/login`. |
| 2.5 | Remove any redirect from auth pages to `/kura/auth/...`. |

### Phase 3: LoginForm and redirect logic

| Step | Action |
|------|--------|
| 3.1 | LoginForm: support no-orgSlug context (used at `/auth/login`). Get org from `searchParams.get('org')` or `user?.organizationCode` after login; default `kura`. |
| 3.2 | After login success: if `user.isSuperUser` → `router.push('/platform')`; else → `router.push(\`/${orgSlug}/dashboard\`)` (orgSlug from user.organizationCode or default). |
| 3.3 | If `requires2FASetup`: redirect to `/${orgSlug}/profile` (tenant profile). |
| 3.4 | Forgot-password link in LoginForm: `href="/auth/forgot-password"`. Change-expired redirect: `router.push('/auth/change-expired-password?token=...')`. |

### Phase 4: Platform section (superuser only)

| Step | Action |
|------|--------|
| 4.1 | `app/platform/layout.tsx`: Client layout; guard: if not authenticated redirect to `/auth/login`; if not superuser redirect to `/${orgSlug}/dashboard` or 403. |
| 4.2 | `app/platform/page.tsx`: Platform dashboard (redirect to `app/platform/dashboard` or render dashboard content). |
| 4.3 | `app/platform/dashboard/page.tsx`: Dashboard – tenant stats, quick links to tenants, platform users, roles. |
| 4.4 | `app/platform/tenants/page.tsx`: Tenant registration / list – use existing org APIs (superuser has permission). Reuse org table/form components. |
| 4.5 | `app/platform/users/page.tsx`: Platform users – list including system users; create/edit; assign system roles. Reuse user table; show system roles. |
| 4.6 | `app/platform/roles/page.tsx`: Platform roles – list including system roles; assign system-sensitive permissions. Reuse roles UI; show all permissions. |
| 4.7 | Platform sidebar/nav: links to `/platform/dashboard`, `/platform/tenants`, `/platform/users`, `/platform/roles`. |

### Phase 5: Root and tenant redirects

| Step | Action |
|------|--------|
| 5.1 | `app/page.tsx`: Redirect to `/auth/login` (or show landing with “Tenant login” / “Platform admin” links). |
| 5.2 | `app/[orgSlug]/page.tsx`: If authenticated tenant (has orgSlug match) → dashboard; else → `/auth/login?org={orgSlug}`. |
| 5.3 | Require2FASetupGuard: when `requires2FASetup`, redirect to `/${orgSlug}/profile` (tenant profile). |

### Phase 6: Link and router audit

| Step | Action |
|------|--------|
| 6.1 | ProtectedRoute: unauthenticated → `/auth/login` (no orgSlug). Optional: preserve `?from=...` for return URL. |
| 6.2 | AppSidebar: logout → `/auth/login`. Links to tenant pages → `/${orgSlug}/...`. If platform user, show link to “Platform admin” → `/platform`. |
| 6.3 | UserProfileDropdown: profile → `/${orgSlug}/profile`; logout → `/auth/login`. |
| 6.4 | All auth links in app: `/auth/login`, `/auth/forgot-password`, etc. (no orgSlug). |
| 6.5 | Tenant-only pages: use `useOrgSlug()` and prefix with `/${orgSlug}/`. Fix hardcoded `/cases`, `/weighing`, etc. in cases, weighing, prosecution. |
| 6.6 | Proxy/middleware: public paths include `/auth/*` at root. |

### Phase 7: Login page org/station branding

| Step | Action |
|------|--------|
| 7.1 | Login page: call public org list on load. If `?org=code` in URL, resolve org and show name/logo. |
| 7.2 | Optional: show station selector by org for tenant users (if multiple stations). |
| 7.3 | Style login card with org name/logo when org is known. |

---

## File Checklist

- Backend: new or modified controller for public org (and optional station) list.
- Frontend: `app/auth/login/page.tsx` (real), `app/auth/forgot-password/page.tsx` (real), `app/auth/reset-password/page.tsx` (real), `app/auth/change-expired-password/page.tsx` (real).
- Frontend: `app/platform/layout.tsx`, `app/platform/page.tsx`, `app/platform/dashboard/page.tsx`, `app/platform/tenants/page.tsx`, `app/platform/users/page.tsx`, `app/platform/roles/page.tsx`.
- Frontend: LoginForm redirect logic; useOrgSlug fallback; ProtectedRoute; AppSidebar; UserProfileDropdown; internal links in cases, weighing, prosecution, setup.
- Frontend: API client for public org/station; login page fetch.
- Remove: no `app/[orgSlug]/auth` (already missing); ensure no duplicate auth routes.

---

## Execution order

1. Backend public org (and optional station) endpoints.
2. Auth pages at root with real content; remove redirects to /kura/auth/*.
3. LoginForm redirect (platform vs tenant) and auth links to /auth/*.
4. Platform layout and dashboard; then tenants, users, roles.
5. Root page redirect; [orgSlug] page redirect.
6. Full link/router audit and fixes.
7. Login page branding (org/station fetch and UI).
