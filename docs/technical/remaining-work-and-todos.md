# TruLoad — Remaining Work, Discovered Bugs & Detailed TODOs

Compiled 2026-06-25. Status of everything still open after the offline-mode / payments / infra session, with enough detail to execute. Companion to `offline-mode-implementation-plan.md`.

## Legend
- **[impl]** safely implementable build-/parity-verified · **[browser]** needs the running app (airplane test) · **[security]** needs security design/review · **[ops]** needs an ops action/permission I don't have.

---

## A. Scoped-out offline features

### A1. Fee/charges TS port — [impl, money: parity-required]
Extend `src/lib/offline/compliance.ts` to compute **provisional charges** offline (overload already done & validated).
- Port `ProsecutionService.CalculateGvwFeeAsync` + `CalculateChargesAsync`:
  - GVW fee band lookup: `AxleFeeSchedule` where `LegalFramework + FeeType='GVW' + ConvictionNumber + overload∈[OverloadMinKg,OverloadMaxKg]`. Traffic Act → `FlatFeeKes` (KES-native); EAC → `FeePerKgUsd*overload + FlatFeeUsd`.
  - Conviction tier: `convictionNumber = priorCount>=1 ? 2 : 1` from the **cached recent-convictions** (per vehicle, 12-month) — endpoint already shipped (`GET /api/v1/prosecutions/recent-convictions`).
  - Two-party liability: `total = perParty × 2`. Best basis: `gvwFeeUsd >= axleFeeUsd ? gvw : axle` (Traffic Act has no axle fees). Forex: use last-cached USD↔KES (fallback 130) — **label provisional**.
  - **CAUTION**: there is a currency-handling subtlety in the backend (Traffic Act fee is KES-native while best-basis compares USD) — port carefully and **parity-test against stored `prosecution_cases.gvw_fee_kes/total_fee_kes`** before trusting offline charges. Do NOT ship unverified (fees = money).
- Add a parity case to `scripts/offline-compliance-parity.mjs` (compare engine fee vs stored prosecution fee) + Jest fixtures.
- Cache `AxleFeeSchedule` + `DemeritPointSchedule` (GET `/acts/fee-schedules`, `/acts/demerit-points`).

### A2. Reference-data caching service — [impl]
`src/lib/offline/referenceCache.ts`: on login/online, fetch & store to IndexedDB (`referenceDataCache` store already exists; `useOfflineCache` is the read-through hook):
- `GET /api/v1/AxleConfiguration` (+ weight refs) — per-axle permissible + grouping
- `GET /api/v1/acts/tolerances|fee-schedules|demerit-points?legalFramework=TRAFFIC_ACT|EAC`, `GET /api/v1/acts`
- `GET /api/v1/prosecutions/recent-convictions?months=12`
Daily TTL; cold-start snapshot of me/station.

### A3. Capture-UI offline integration — [browser]
Wire the validated engine into the weighing capture (`src/hooks/useWeighing.ts`, capture components):
- Derive each captured axle's `permissibleWeightKg` + `axleGrouping` from the cached `AxleConfiguration` weight-refs (server does this in `WeighingService.CalculateComplianceAsync`).
- When offline: `computeProvisionalCompliance(...)` → show overload/status with a clear **"Provisional — confirmed on sync"** banner; no fake compliance.
- Offline-queue the full multi-step weighing (`initiate` payload + captured `axles`) into `offlineWeighings` (store + sync engine already replay create→capture-weights). Strictly gate behind `!isOnline` so the online path is unchanged.
- Must be **airplane-tested in the browser** (Playwright offline spec, mirror `pos-ui/e2e/offline-sync.spec.ts`).

### A4. Offline login — [security]
TruLoad is SSO/token-only; no offline auth today. To support cold-start offline (like POS PIN):
- Cache a per-user credential (bcrypt PIN hash) + permissions in IndexedDB on online login; verify offline; gate by device.
- Needs a **security review** (credential-at-rest, device binding, lockout). Do not implement ad hoc.

### A5. Headless background sync (tab closed) — [browser]
Service-worker `SyncManager` (`sync`/`periodicsync`) to drain the queue when no client is open — mirror `pos-ui/src/lib/sw/register-sync.ts` + `public/sw.js`. Verify SW registration on truload's `next-pwa` setup.

---

## B. Discovered bugs (status)

| Bug | Status |
|---|---|
| Invoice 422 BillRefNumber reuse (COUNT numbering) | **FIXED + deployed** (monotonic DocumentNumberService) |
| Reconcile 500 (LCM `IssuedById=Guid.Empty` FK) | **FIXED + deployed** (nullable + detach + migration) |
| Hangfire on pgbouncer (`jobparameter_pkey`, disabled jobs) | **FIXED + deployed** (direct connection) |
| Pre-existing `Program.cs` Hangfire `AutomaticRetryAttribute` build break | **FIXED** |
| Superuser weighing-create 500 (station-org under tenant filter) | **FIXED + deployed** (`IgnoreQueryFilters`) |
| Superuser case-from-weighing 500 (case org from tenant ctx) | **FIXED** (`99b2bc8`, deploying) — scope case to weighing's org |
| recent-convictions shadowed by `{id}` route | **FIXED + deployed** (`{id:guid}`) |
| Post-payment redirect 404 (app_base_url = API host) | **FIXED + deployed** (origin-based + data fix) |

---

## C. Infra / ops follow-ups — [ops]

### C1. Postgres `max_connections=300` — NOT applied
The configmap (`postgresql-configuration`) has 300 (ArgoCD-synced), but `$PGDATA/postgresql.conf` has `max_connections=200` baked in at init and its `include` of the mounted `override.conf` is **commented out**, so 300 never loads — a restart alone doesn't help. **Apply as DB superuser**:
```sql
ALTER SYSTEM SET max_connections = 300;
```
then `kubectl -n infra rollout restart statefulset/postgresql`. (Obtaining superuser creds was permission-denied for the agent.) Longer-term: fix the statefulset so PGDATA includes the mounted override, or run postgres with `-c config_file=` pointing at the mounted conf.

### C2. pgbouncer reload
Committed changes (`max_db_connections=30`, truload pool 40→15) need pgbouncer to reload its configmap (SIGHUP or pod restart) to take effect.

### C3. Node CPU saturation (~99% requests) — capacity
Truload temporarily at **`minReplicas: 1`** to fit the rollout. **Restore `minReplicas: 2`** (HA, per [[ha-min-2-pods-and-pdb]]) once node CPU capacity is added or per-service CPU requests are trimmed. No new service/replica can schedule until then.

### C4. Restore truload HA
After C3, set truload-backend/frontend `autoscaling.minReplicas: 2` and remove the temporary notes.

---

## D. Verification
- `npm run test:e2e` (truload-frontend) once `99b2bc8` is fully rolled out → expect 3/3 (weighing idempotency, case-from-weighing get-or-create, recent-convictions).
- `npx jest src/lib/offline` → compliance engine unit tests.
- `node scripts/offline-compliance-parity.mjs <data>` → live parity vs DB.
- Always delete E2E test data afterward (per [[e2e-testing-and-data-cleanup]]).
