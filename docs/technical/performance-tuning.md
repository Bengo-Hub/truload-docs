# Performance Tuning

This document covers the caching strategy, query optimisation, and scalability configuration for the TruLoad backend.

## Response Compression

All HTTP responses are compressed using Brotli (preferred) and Gzip (fallback). Compression is enabled for HTTPS (`EnableForHttps = true`) and covers:

- `application/json`
- `application/xml`
- `text/html`, `text/json`, `text/plain`, `text/xml`
- `application/pdf`
- `image/svg+xml`
- Excel and spreadsheet MIME types

Configuration: `Middleware/ResponseCompressionConfiguration.cs`.

## Redis Caching Strategy

TruLoad uses Redis distributed cache via `IDistributedCache` (StackExchange.Redis). The `CacheService` wraps serialise/deserialise and TTL management.

| Entity | Cache Key Pattern | TTL | Invalidation |
|--------|-------------------|-----|--------------|
| Permission set (per user) | `permissions:{userId}` | 1 hour | On role change or permission edit |
| NTSA vehicle lookup | `ntsa:vehicle:{reg}` | Configurable (default 24h) | On manual refresh |
| AxleConfiguration | `axle-config:{id}` | 24 hours | On `PUT /axle-configurations/{id}` |
| Superset guest token | `superset:guest:{userId}` | 300 minutes | On token fetch failure |
| Tenant branding | `branding:{slug}` | 1 hour | On branding update via auth-api |

### Cache Fallback

If Redis is unavailable, `CacheService` catches `RedisException` and falls through to the uncached path. This ensures partial Redis outages do not bring down the API, at the cost of higher DB load.

## Database Connection Pooling

The application uses Npgsql connection pooling with conservative limits for shared PostgreSQL instances:

| Parameter | Default | Config Key |
|-----------|---------|------------|
| MaxPoolSize | 6 | `Database:MaxPoolSize` |
| MinPoolSize | 2 | `Database:MinPoolSize` |
| ConnectionIdleLifetime | 60 s | `Database:ConnectionIdleLifetime` |

For dedicated tenant databases (e.g., kuraweigh), the same limits apply. Adjust via K8s env vars if the database can support more connections.

## Query Optimisation

### Pagination

All list endpoints enforce page size limits to prevent memory exhaustion:

- Default page size: 20
- Maximum page size on list endpoints: 500 (`Math.Clamp(pageSize, 1, 500)`)
- Analytics endpoints (aggregation over a date range): 365-day maximum date range guard

### Analytics Aggregation Endpoints

Analytics endpoints (trend charts, disposition breakdowns, yard analytics) load up to 10,000 records into memory for in-memory grouping. The 365-day date range cap prevents multi-year scans. Future work: push these aggregations to PostgreSQL `GROUP BY` queries.

### Materialized Views

Heavy reports run against PostgreSQL materialized views that are refreshed every 30 minutes by `MaterializedViewRefreshJob`. Views are also refreshed on application startup. If a refresh fails (e.g., no data yet), it logs a warning and retries on the next cycle.

## Index Coverage

Key indexes on high-traffic tables (managed via EF Core migrations):

| Table | Index | Purpose |
|-------|-------|---------|
| `weighing_transactions` | `(transporter_id, weighing_mode, control_status, weighed_at)` | Portal weighing history queries |
| `weighing_transactions` | `(organization_id, control_status, weighed_at)` | Commercial report queries |
| `case_registers` | `(organization_id, station_id, created_at, case_status)` | Case analytics |
| `portal_team_memberships` | `(transporter_id, user_id) WHERE is_active = true` (unique) | Team membership lookup |
| `portal_team_invitations` | `(token)` (unique) | Invite acceptance lookup |
| `users` | `(organization_id, is_active)` | User list queries |

## Horizontal Pod Autoscaling

The Kubernetes deployment includes HPA (Horizontal Pod Autoscaler):

| Setting | Value |
|---------|-------|
| Min replicas | 2 |
| Max replicas | 4 |
| CPU target | 60% |
| Memory target | 75% |

Configuration in `devops-k8s/truload-backend/values.yaml` under `autoscaling`.

## Rate Limiting

Rate limits are configured per endpoint category in the database and loaded at startup via `RateLimitingConfiguration.LoadRateLimitSettingsFromDbAsync`. Default policies:

| Policy | Endpoints | Limit |
|--------|-----------|-------|
| `auth` | Login, token refresh | 10 req / 1 min |
| `weighing` | Weighing capture, portal | 60 req / 1 min |
| `reports` | Report generation | 10 req / 5 min |
| `default` | All other endpoints | 100 req / 1 min |

Limits are adjustable via the admin API without redeployment.

## Background Worker Configuration

Hangfire worker count is set based on environment:

- **Production**: 10 workers
- **Non-production**: 5 workers

Workers serve three queues (`critical`, `payments`, `default`) with payments isolated to prevent slow payment sync from blocking other jobs. See [`BACKGROUND_JOBS.md`](BACKGROUND_JOBS.md) for the full job catalog.

## Recommendations for Scale-Up

1. **Move analytics aggregations to DB-level SQL GROUP BY** — reduces in-memory object allocation for trend/breakdown charts
2. **Implement read replicas** — route report and analytics queries to a replica to offload the primary
3. **Redis Cluster** — replace single Redis node with a cluster for HA caching
4. **Hangfire sharding** — split heavy queues to dedicated worker pods in high-volume tenants
