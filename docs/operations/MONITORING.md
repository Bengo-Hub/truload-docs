# Monitoring

This document describes what to watch in production, alert thresholds, and how to investigate common issues.

## Key Metrics

### Application

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|--------|
| HTTP 5xx error rate | < 0.1% | > 1% over 5 min | Check pod logs, recent deployments |
| P95 response latency | < 500 ms | > 2 s | Check DB query times, cache hit rate |
| Active Hangfire jobs | < 50 queued | > 200 queued | Check worker health, inspect stuck jobs |
| Failed Hangfire jobs | 0 | > 5 in 1 hour | Investigate via dashboard |
| JWT auth failures | < 5/min | > 50/min | Possible brute-force — check rate limiting |

### Database

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|--------|
| Active connections | < 30 | > 50 | Check for connection leaks |
| Query P95 latency | < 100 ms | > 500 ms | Run `EXPLAIN ANALYZE` on slow queries |
| Replication lag | N/A (single) | > 60 s (if replica) | Check replica health |
| Dead tuples | Routine autovacuum | `pg_stat_user_tables.n_dead_tup` > 1M | Run `VACUUM ANALYZE` |

### Redis

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|--------|
| Cache hit rate | > 85% | < 60% | Investigate cache key expiry, Redis health |
| Used memory | < 80% of `maxmemory` | > 90% | Increase memory or reduce TTLs |
| Connected clients | < 30 | > 80 | Check for connection leaks |

### Infrastructure

| Metric | Normal Range | Alert Threshold | Action |
|--------|-------------|-----------------|--------|
| Pod CPU | < 60% | > 80% for 10 min | HPA should scale up; investigate if not |
| Pod memory | < 75% | > 90% | Possible memory leak; rolling restart |
| Disk (media PVC) | < 70% | > 85% | Archive old media or expand PVC |
| Node disk | < 70% | > 85% | Clean old images, expand node |

## Health Checks

The health endpoint is available at:

```
GET /health
```

Checks: PostgreSQL (primary DB) and Redis. Returns `200 Healthy` if all checks pass, `503 Unhealthy` if any check fails.

Used by Kubernetes liveness and readiness probes.

## Investigating Issues

### High Error Rate

```bash
# View recent errors
kubectl logs -l app=truload-backend -n truload --tail=200 | grep '"level":"Error"'

# Check if a bad deployment triggered it
kubectl rollout history deployment/truload-backend -n truload
```

### Slow Queries

```sql
-- Find queries running > 5 seconds
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state = 'active';
```

### Redis Cache Miss Spike

```bash
kubectl exec -it redis-<pod-id> -n truload -- redis-cli INFO stats \
  | grep -E "keyspace_hits|keyspace_misses"
```

### Hangfire Queue Depth

Open `/hangfire` in the browser. If the `default` queue is backed up:

1. Check if all workers are alive under **Servers**
2. Look for recurring jobs taking longer than expected under **Processing**
3. Check for any failed job that is blocking enqueued work

## Alerts (Recommended)

Configure these alerts in your monitoring system (Prometheus/Grafana or similar):

| Alert Name | Condition | Severity |
|------------|-----------|---------|
| `HighErrorRate` | HTTP 5xx > 1% for 5 min | Critical |
| `SlowResponses` | P95 latency > 2 s for 5 min | Warning |
| `HangfireQueueDepth` | Queued jobs > 200 | Warning |
| `HangfireFailedJobs` | Failed jobs > 5 in 1 h | Error |
| `DatabaseConnectionHigh` | Active connections > 50 | Warning |
| `PodCpuHigh` | CPU > 80% for 10 min | Warning |
| `PodMemoryHigh` | Memory > 90% | Critical |
| `RedisMemoryHigh` | Redis memory > 90% | Warning |
| `DiskSpaceHigh` | Disk > 85% | Warning |
