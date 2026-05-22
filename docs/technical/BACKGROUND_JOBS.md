# Background Jobs

TruLoad uses **Hangfire** with PostgreSQL storage for all background and recurring job processing.

## Dashboard

The Hangfire dashboard is accessible at `/hangfire` (admin cookie authentication required).

## Recurring Jobs

| Job Name | Class | Schedule | Queue | Retries | Description |
|----------|-------|----------|-------|---------|-------------|
| `pesaflow-invoice-sync` | `PesaflowInvoiceSyncJob` | `*/15 * * * *` | `payments` | 3 | Syncs pending invoice statuses from Pesaflow API |
| `exchange-rate-sync` | `ExchangeRateSyncJob` | `0 0 * * *` | `default` | 3 | Updates USD/KES exchange rates |
| `automated-database-backup` | `BackupScheduleJob` | `0 2 * * *` | `default` | 3 | Creates a PostgreSQL backup to local storage |
| `mv-refresh` | `MaterializedViewRefreshJob` | `*/30 * * * *` | `default` | 3 | Refreshes all PostgreSQL materialized views |
| `report-schedule-runner` | `ReportScheduleJob` | `*/5 * * * *` | `default` | 3 | Runs any scheduled report definitions that are due |
| `stale-weighing-alert` | `StaleWeighingNotificationJob` | `*/30 * * * *` | `default` | 3 | Emails station managers about open first-weight-only transactions past the configured threshold |
| `portal-daily-summary` | `PortalDailySummaryJob` | `0 4 * * *` | `default` | 2 | Emails each portal transporter their previous day's weighing summary (04:00 UTC = 07:00 EAT) |
| `portal-anomaly-alert` | `PortalAnomalyAlertJob` | `0 * * * *` | `default` | 1 | Detects transactions where actual net weight differs from expected by >5% and emails the transporter |

## Queues

| Queue | Purpose |
|-------|---------|
| `critical` | Reserved for time-sensitive system jobs |
| `payments` | Pesaflow and payment sync jobs (isolated from other work) |
| `default` | All other recurring and enqueued jobs |

Workers in production: **10**. Workers in non-production: **5** (configurable via `HANGFIRE_WORKER_COUNT` env var logic in Program.cs).

## On-Demand Jobs (Enqueued)

| Trigger | Job | Description |
|---------|-----|-------------|
| `POST /portal/weighings/bulk-download` (>50 tickets) | `BulkDownloadJob` | Generates a ZIP of ticket PDFs asynchronously. Poll `/portal/weighings/bulk-download/{jobId}/status` to check when ready. |

## Job Architecture

All jobs follow the `IServiceScopeFactory` pattern to avoid scoped-service lifetime issues:

```csharp
public class PortalDailySummaryJob
{
    private readonly IServiceScopeFactory _scopeFactory;

    public async Task ExecuteAsync()
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TruLoadDbContext>();
        // ...
    }
}
```

**Important**: Jobs have no `ITenantContext`. Any service call that depends on tenant context must use `IgnoreQueryFilters()` for DB queries and pass `tenantSlug` explicitly to notification services.

## ASP.NET Core Hosted Services (BackgroundService)

In addition to Hangfire jobs, TruLoad runs long-lived background services registered via `AddHostedService`. These are not visible in the Hangfire dashboard — they run as .NET `IHostedService` instances within the process.

### SubscriptionCacheInvalidationService

| Property | Value |
|----------|-------|
| Class | `Services.Background.SubscriptionCacheInvalidationService` |
| Trigger | NATS subject `tenant.subscription.updated` (event-driven, not scheduled) |
| Redis key invalidated | `sub:status:{orgId}` |
| Enabled by | `Nats:Enabled = true` in configuration |

**What it does:**

Whenever subscriptions-api publishes a `tenant.subscription.updated` event (on plan change or status change for any tenant), this service:

1. Parses the `tenant_slug` from the event payload
2. Resolves `tenant_slug → Organization.SsoTenantSlug → org.Id` via a scoped DB query
3. Deletes the `sub:status:{orgId}` Redis key

Without this, `SubscriptionEnforcementMiddleware` would continue serving the cached (potentially stale) status for up to 60 seconds. With it, the next request after a plan change hits subscriptions-api for a fresh status.

**Configuration:**

```json
"Nats": {
  "Url": "nats://localhost:4222",
  "Enabled": false
}
```

Set `Nats:Enabled = false` (the default) in development to prevent startup failures when NATS is not running locally. In production, override via:

```
NATS__URL=nats://nats.platform.svc.cluster.local:4222
NATS__ENABLED=true
```

**Why `sub:status:{orgId}` and not `tenant:{slug}`?**

All other BengoBox Go services use `tenant:{slug}` as their Redis subscription cache key. TruLoad predates the uniform pattern and uses `sub:status:{orgId}` (org UUID). The `SubscriptionCacheInvalidationService` handles the slug→UUID translation transparently.

---

## Stale Weighing Alert Flow

```mermaid
stateDiagram-v2
    [*] --> CheckThreshold: Every 30 min
    CheckThreshold --> FindStale: Query transactions in FirstWeightCaptured state
    FindStale --> Filter: Age > PendingWeighingThresholdHours (default 8h)
    Filter --> GroupByStation: Group by station
    GroupByStation --> EmailManagers: Send notification per station
    EmailManagers --> [*]
```

## Invoice Sync Flow

```mermaid
stateDiagram-v2
    [*] --> QueryPending: Every 15 min
    QueryPending --> CallPesaflow: For each pending/grace invoice
    CallPesaflow --> UpdateStatus: Map Pesaflow status to TruLoad status
    UpdateStatus --> SaveChanges
    SaveChanges --> [*]
```

## Job Retention

Completed and failed jobs are retained for **48 hours** (configured via `WithJobExpirationTimeout`), then auto-deleted by Hangfire's built-in cleanup.

## Monitoring

- View current job queue depth and failures in the Hangfire dashboard at `/hangfire`
- Failed jobs appear under the **Failed** tab and can be retried manually
- Worker health is visible under the **Servers** tab
