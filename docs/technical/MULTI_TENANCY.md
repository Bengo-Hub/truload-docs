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

## Background Jobs and Tenant Context

Background jobs (Hangfire) have no HTTP request context and therefore no `ITenantContext`. Services called from background jobs must either:

- Use `IgnoreQueryFilters()` when querying across tenants
- Pass the tenant slug explicitly to notification services (`tenantSlug: org.Code.ToLowerInvariant()`)

See [`BACKGROUND_JOBS.md`](BACKGROUND_JOBS.md) for job-specific details.
