# Multi-Tenancy Architecture

TruLoad is a multi-tenant platform. Each tenant maps to a single organisation (weighbridge operator or transporter). The backend uses two isolation strategies depending on the tenant.

## Isolation Strategies

| Tenant Type | Strategy | Example |
|-------------|----------|---------|
| **Dedicated database** | Each tenant gets its own PostgreSQL database | `kura` → `kuraweigh` |
| **Shared database** | All other tenants share the `truload` database, filtered by `organisation_id` | Default |

## How Tenant Routing Works

### Request Resolution

The `TenantContextMiddleware` runs on every request and populates `ITenantContext` with the resolved organisation code and station ID. Resolution order:

1. `X-Tenant-Slug` header (set by nginx or load balancer for subdomain routing)
2. JWT claim `org_code` (set at login time)
3. Default tenant (platform admin fallback)

### Database Connection Selection

`TenantConnectionStringProvider` holds a map of `slug → connectionString` loaded from configuration. The DbContext factory (scoped, registered in DI) calls `Resolve(tenantSlug)` on every request:

```
kura → TENANTDATABASES__KURA env var → kuraweigh database
truload, (default) → DefaultConnection → truload database
```

### Configuration

**Development** (`appsettings.Development.json`):
```json
"TenantDatabases": {
  "kura": "Host=localhost;Database=kuraweigh;..."
}
```

**Production** (K8s environment variable):
```
TENANTDATABASES__KURA=Host=pg-host;Database=kuraweigh;Username=...;Password=...
```

## Environment Switching (X-Env)

Some tenants (such as KURA) operate two frontend domains — one for live operations and one for testing — both pointing at the same backend. The `X-Env` HTTP header lets the frontend signal which database to use for the request.

### How it works

1. The frontend (`src/lib/api/client.ts`) adds `X-Env: live` or `X-Env: test` to every API request based on the current hostname:
   - `kuraweigh.kura.go.ke` → `X-Env: live`
   - `kuraweightest.masterspace.co.ke` → `X-Env: test`
   - `localhost` / TruLoad SaaS domains → `X-Env: test`

2. `TenantContextMiddleware` reads the header (or auto-detects from the `Origin`/`Host` header) and sets `ITenantContext.IsTestMode`.

3. `TenantConnectionStringProvider.Resolve(tenantSlug, isTestMode)` short-circuits to the default `truload` database when `isTestMode == true`, regardless of the tenant slug. This means a KURA user on the test domain always hits the shared truload DB, not the dedicated kuraweigh DB.

### CORS configuration

The NGINX ingress `cors-allow-headers` annotation must include `X-Env` so browsers do not block the header on cross-origin requests. This is configured in `devops-k8s/apps/truload-backend/values.yaml`.

### Security note

`X-Env: test` only bypasses the dedicated tenant DB selection — it does NOT bypass authentication, authorization, or subscription enforcement. A valid JWT is still required for every request.

## Startup: Auto-Migration

On startup, the app automatically migrates and seeds **every** configured database:

```csharp
// Program.cs
// 1. Migrate + seed the default (truload) database
await ApplyMigrationsAsync(defaultMigCs, "truload");
await SeedDatabaseAsync(defaultMigCs, "truload");

// 2. For each dedicated tenant database
foreach (var (slug, tenantCs) in tenantConnProvider.GetDedicatedTenantDatabases())
{
    await ApplyMigrationsAsync(tenantMigCs, slug);
    await SeedDatabaseAsync(tenantMigCs, slug);
}
```

A failed tenant DB migration logs the error and continues — it does not block the whole application startup.

## Row-Level Security (Shared Database)

For shared-database tenants, isolation is enforced at the ORM level. All models inheriting from `TenantAwareEntity` carry an `OrganisationId` foreign key. EF Core global query filters ensure tenants never see each other's data:

```csharp
// Applied automatically by DbContext — every LINQ query gets a WHERE clause
modelBuilder.Entity<WeighingTransaction>()
    .HasQueryFilter(e => e.OrganizationId == _tenantContext.OrganizationId);
```

`IgnoreQueryFilters()` is used only in specific service methods that need cross-tenant access (e.g., portal team membership lookup, background jobs).

## Adding a New Dedicated Tenant

1. Create the PostgreSQL database on the shared instance.
2. Add the connection string to the K8s secret:
   ```
   TENANTDATABASES__<SLUG>=Host=...;Database=...;Username=...;Password=...
   ```
3. Restart the pod — migrations and seeding run automatically.
4. Create the organisation record in the `truload` admin database linking to the new tenant slug.

## Subscription Enforcement and Bypass Rules

`SubscriptionEnforcementMiddleware` runs after authentication and checks whether a commercial tenant (`TenantType == "CommercialWeighing"`) has an active subscription before allowing the request.

### Enforcement Flow

```
authenticated request
  → check billing_mode JWT claim == "service_charge" → bypass ✅
  → check is_demo JWT claim == "true"                → bypass ✅
  → skip exempt paths (/auth, /portal, /health, /hangfire)
  → read Redis: sub:status:{orgId}
      cache hit  → ACTIVE / TRIAL → pass through ✅
               → EXPIRED / CANCELLED / NONE → 402 ❌
      cache miss → load org from DB
          org not found / not CommercialWeighing     → pass through ✅
          org.BillingMode == "service_charge"         → bypass ✅
          org.IsDemo == true                          → bypass ✅
          org.SsoTenantSlug empty                    → pass through ✅ (misconfigured)
          call subscriptions-api → cache 60 s → enforce
```

### Bypass Modes

| Mode | How to configure | Effect |
|------|-----------------|--------|
| **Service charge** | Set `Organization.BillingMode = "service_charge"` | Org pays per-transaction via treasury; subscription gating is completely bypassed |
| **Demo** | Set `Organization.IsDemo = true` | Demo/training org; subscription gating is completely bypassed |
| **Non-commercial** | `Organization.TenantType != "CommercialWeighing"` | Enforcement-mode orgs never pay a TruLoad subscription |

Both `BillingMode` and `IsDemo` are embedded in the access token by `JwtService.GenerateAccessToken`, so the middleware fast-path runs from JWT claims and avoids any DB or Redis lookup for bypass tenants.

### Redis Cache Key

```
sub:status:{orgId}   TTL: 60 seconds
```

The key is invalidated automatically by `SubscriptionCacheInvalidationService` (see [`BACKGROUND_JOBS.md`](BACKGROUND_JOBS.md)) when subscriptions-api publishes a `tenant.subscription.updated` NATS event.

---

## Background Jobs and Tenant Context

Background jobs (Hangfire) have no HTTP request context and therefore no `ITenantContext`. Services called from background jobs must either:

- Use `IgnoreQueryFilters()` when querying across tenants
- Pass the tenant slug explicitly to notification services (`tenantSlug: org.Code.ToLowerInvariant()`)

See [`BACKGROUND_JOBS.md`](BACKGROUND_JOBS.md) for job-specific details.
