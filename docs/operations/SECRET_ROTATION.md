# Secret Rotation

This document describes how to rotate each category of secret in the TruLoad platform.

!!! danger "Security requirement"
    Never commit actual secrets to git. Use Kubernetes Secrets or environment variables. See `SECURITY.md` in the backend repository for the full policy.

## JWT Secret Key

The JWT secret signs all authentication tokens. Rotating it immediately invalidates all active sessions.

**Steps:**
1. Generate a new 256-bit random secret:
   ```bash
   openssl rand -base64 32
   ```
2. Update the Kubernetes Secret:
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"JWT__SECRETKEY": "<new-secret>"}}'
   ```
3. Rolling restart:
   ```bash
   kubectl rollout restart deployment/truload-backend -n truload
   ```
4. All existing tokens are immediately invalid — users must log in again.

## Pesaflow API Keys

Used for M-PESA STK push integration.

**Steps:**
1. Generate new API credentials in the Pesaflow merchant portal.
2. Update the K8s secret:
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"PESAFLOW__CONSUMERKEY": "<new-key>", "PESAFLOW__CONSUMERSECRET": "<new-secret>"}}'
   ```
3. Restart pods to reload configuration.
4. Verify payment flow with a test STK push.

## NTSA API Token

Used for vehicle registration lookups.

**Steps:**
1. Obtain new credentials from NTSA integration portal.
2. Update the integration config via the TruLoad admin API:
   ```
   PATCH /api/v1/system/integrations/ntsa
   Body: { "apiKey": "<new-key>", "clientSecret": "<new-secret>" }
   ```
   (Integration configs are stored encrypted in the database by `AesGcmEncryptionService`.)
3. The new credentials are active immediately — no restart required.

## Superset Password

Used for embedded analytics dashboard access.

**Steps:**
1. Update the Superset admin password in the Superset UI.
2. Update the K8s secret:
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"SUPERSET__PASSWORD": "<new-password>"}}'
   ```
3. Restart pods. The startup guard will reject default passwords (`admin123`, `changeme`, etc.).

## Database Password

**Steps:**
1. Update the PostgreSQL user password:
   ```sql
   ALTER USER truload_user WITH PASSWORD '<new-password>';
   ```
2. Update the K8s secret:
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"CONNECTIONSTRINGS__DEFAULTCONNECTION": "Host=...;Password=<new-password>;..."}}'
   ```
3. For dedicated tenant databases (e.g., kuraweigh):
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"TENANTDATABASES__KURA": "Host=...;Password=<new-password>;..."}}'
   ```
4. Rolling restart.

## Internal Service Key (S2S)

Used for service-to-service calls (`X-API-Key` header).

**Steps:**
1. Generate a new key:
   ```bash
   openssl rand -hex 32
   ```
2. Update `INTERNAL_SERVICE_KEY` in all affected services simultaneously (truload-backend, notifications-api, treasury-api, subscriptions-api) to avoid a window of rejected calls.
3. Rolling restart all affected services.

## Redis Password

If Redis is password-protected:

1. Update Redis config with the new password.
2. Update the connection string:
   ```bash
   kubectl patch secret truload-backend-secrets -n truload \
     -p '{"stringData": {"REDIS__CONNECTIONSTRING": "redis-host:6379,password=<new-password>"}}'
   ```
3. Rolling restart.
