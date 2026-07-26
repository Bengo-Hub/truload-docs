# Operational Procedures

This document covers common operational tasks for the TruLoad platform.

## Kubernetes Pod Management

### Scale a Deployment

```bash
# Scale truload-backend to 3 replicas
kubectl scale deployment truload-backend -n truload --replicas=3

# Check rollout status
kubectl rollout status deployment/truload-backend -n truload
```

### View Pod Logs

```bash
# All pods in the namespace
kubectl logs -l app=truload-backend -n truload --tail=100

# Specific pod
kubectl logs truload-backend-<pod-id> -n truload

# Follow live
kubectl logs -f truload-backend-<pod-id> -n truload
```

### Restart Pods (Rolling Restart)

```bash
kubectl rollout restart deployment/truload-backend -n truload
```

## Hangfire Job Management

### Access the Dashboard

Navigate to `https://truloadapi.codevertexafrica.com/hangfire` and log in with an admin Identity cookie.

### Retry Failed Jobs

1. Open the Hangfire Dashboard → **Failed** tab
2. Click **Retry All** or retry individual jobs

### Clear a Hung Job Queue

```sql
-- Check the Hangfire queue in PostgreSQL
SELECT * FROM hangfire.job WHERE state_name = 'Processing' ORDER BY created_at DESC LIMIT 20;

-- Forcibly set a stuck job to failed (replace {job_id})
UPDATE hangfire.state
SET name = 'Failed', reason = 'Manually expired', created_at = NOW()
WHERE job_id = {job_id}
  AND name = 'Processing';
```

### Disable a Recurring Job Temporarily

In the Hangfire Dashboard → **Recurring Jobs** tab, find the job and click **Disable**.

Re-enable by clicking **Enable** or triggering it manually with **Trigger Now**.

## Database

### Check Pending Migrations

```bash
# From the truload-backend directory
dotnet ef migrations list --connection "<connection-string>"
```

### Apply Migrations Manually

Migrations run automatically on startup. To apply manually:

```bash
cd truload-backend
dotnet ef database update
```

### Run a Materialized View Refresh

```sql
SELECT refresh_all_materialized_views();
```

### Connection Pool Status

```sql
SELECT datname, count(*) AS connections, state
FROM pg_stat_activity
GROUP BY datname, state
ORDER BY connections DESC;
```

## Redis

### Flush a Specific Cache Key

```bash
kubectl exec -it redis-<pod-id> -n truload -- redis-cli DEL "truload:permissions:{userId}"
```

### Check Redis Memory Usage

```bash
kubectl exec -it redis-<pod-id> -n truload -- redis-cli INFO memory | grep used_memory_human
```

### Clear All TruLoad Cache Keys (Emergency Only)

```bash
kubectl exec -it redis-<pod-id> -n truload -- redis-cli FLUSHDB
```

!!! danger "Cache flush side effects"
    Flushing the cache clears all cached permissions, NTSA lookups, and branding data. All users will experience a brief slowdown on the next request while the cache warms up.

## Deployment

### Deploy a New Image

Image tags are set automatically by `build.sh` in `devops-k8s`. Do NOT edit `values.yaml` manually.

```bash
# From devops-k8s/
./build.sh truload-backend
kubectl rollout status deployment/truload-backend -n truload
```

### Rollback a Deployment

```bash
kubectl rollout undo deployment/truload-backend -n truload
```

## Media Storage

Media files (logos, branding images) are stored at the path configured in `Media:StoragePath` (or `MEDIA_STORAGE_PATH` env var). In production this is mounted via a PersistentVolumeClaim.

To verify the media directory is writable:

```bash
kubectl exec -it truload-backend-<pod-id> -n truload -- ls -la /mnt/truload-backend-media
```
