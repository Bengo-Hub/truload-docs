# TruLoad — Remaining Work, Discovered Bugs & Detailed TODOs

Compiled 2026-06-25. Status of everything still open after the offline-mode / payments / infra session, with enough detail to execute. Companion to `offline-mode-implementation-plan.md`.

## Legend
- **[impl]** safely implementable build-/parity-verified · **[browser]** needs the running app (airplane test) · **[security]** needs security design/review · **[ops]** needs an ops action/permission I don't have.

!!! success "Section A shipped"
    All five items in section A below (A1-A5) were built in the same 2026-06-25 session this
    document was compiled from — they read as open TODOs because this page was compiled mid-session
    and never updated afterward. Each item is now marked done with its closing commit. See
    `offline-mode-implementation-plan.md` for the fuller writeup.

---

## A. Scoped-out offline features — ✅ all shipped 2026-06-25

### A1. Fee/charges TS port — ✅ DONE — [impl, money: parity-required]

**Shipped.** `computeProvisionalCharges` (fee bands + conviction tier from cached prior
convictions + two-party ×2 liability) is live in `src/lib/offline/compliance.ts`, parity-validated
5/5 against real `prosecution_cases` rows, plus 3 Jest tests. The offline engine now covers both
overload compliance and provisional charges; the server still reconciles on sync. Original scope
below kept as design reference.

Extend `src/lib/offline/compliance.ts` to compute **provisional charges** offline (overload already done & validated).
- Port `ProsecutionService.CalculateGvwFeeAsync` + `CalculateChargesAsync`:
  - GVW fee band lookup: `AxleFeeSchedule` where `LegalFramework + FeeType='GVW' + ConvictionNumber + overload∈[OverloadMinKg,OverloadMaxKg]`. Traffic Act → `FlatFeeKes` (KES-native); EAC → `FeePerKgUsd*overload + FlatFeeUsd`.
  - Conviction tier: `convictionNumber = priorCount>=1 ? 2 : 1` from the **cached recent-convictions** (per vehicle, 12-month) — endpoint already shipped (`GET /api/v1/prosecutions/recent-convictions`).
  - Two-party liability: `total = perParty × 2`. Best basis: `gvwFeeUsd >= axleFeeUsd ? gvw : axle` (Traffic Act has no axle fees). Forex: use last-cached USD↔KES (fallback 130) — **label provisional**.
  - **CAUTION**: there is a currency-handling subtlety in the backend (Traffic Act fee is KES-native while best-basis compares USD) — port carefully and **parity-test against stored `prosecution_cases.gvw_fee_kes/total_fee_kes`** before trusting offline charges. Do NOT ship unverified (fees = money).
- Add a parity case to `scripts/offline-compliance-parity.mjs` (compare engine fee vs stored prosecution fee) + Jest fixtures.
- Cache `AxleFeeSchedule` + `DemeritPointSchedule` (GET `/acts/fee-schedules`, `/acts/demerit-points`).

### A2. Reference-data caching service — ✅ DONE (`truload-frontend 2bb8545`) — [impl]

**Shipped.** `src/lib/offline/referenceCache.ts` warms axle configs + weight refs, tolerances, fee
schedules, demerit points, acts, and recent-convictions to IndexedDB with a 24h TTL, refreshed
whenever the app is online (`useWeighing`). Original scope below kept as design reference.

### A3. Capture-UI offline integration — ✅ DONE (`truload-frontend 2bb8545`, backend `2b44503`) — [browser]

**Shipped and airplane-tested.** `offlineCapture.ts` derives each axle's permissible weight and
grouping from the cached `AxleConfiguration` data and runs the validated engine to produce a
provisional `WeighingResult` entirely client-side. `useWeighing` queues the weighing offline
(`clientLocalId` doubles as the sync idempotency key) and `WeighingDecisionStep` shows an amber
"Provisional (offline)" banner, keyed off `useOnlineStatus`. The backend gained
`FlatFeeKes`/`ConvictionNumber` on `AxleFeeScheduleDto` (previously dropped, needed for offline
charge calc). All online paths are byte-unchanged behind the offline gate. Original scope below
kept as design reference.

### A4. Offline login — ✅ DONE (`truload-frontend 3c0b58c` Tier 1, `5d62e7b` Tier 2) — [security]

**Shipped as two tiers**, reviewed and built rather than deferred. Tier 1: session continuity — a
network error (or `navigator.onLine === false`) no longer wipes an already-persisted session; only
a genuine 401/403 while reachable does, fixing a bug where opening the app offline redirected to a
login page that itself needed network. Tier 2: an opt-in offline PIN
(`src/lib/offline/offlinePin.ts`) that decrypts a cached session (AES-GCM under a
PBKDF2-SHA256(210k) key derived from the PIN) rather than minting a new JWT — no plaintext token at
rest, wrong PIN fails GCM auth, 5 failed attempts wipes the cached blob and requires a fresh online
login. The server still re-verifies on reconnect via the 7-day refresh token. Original scope below
kept as design reference.

### A5. Headless background sync (tab closed) — ✅ DONE (`truload-frontend 37a38ba`) — [browser]

**Shipped.** `sync.ts` was refactored to inject an HTTP `Poster` so one dependency-ordered drain
engine serves both the open page (axios) and the service worker (`fetchPoster.ts`, which pulls
auth/tenant context from cookies via the Cookie Store API). The service worker's `sync`/
`periodicsync` handlers post a message to drain via the page when a window is open, or drain
headlessly themselves when it's genuinely closed. `registerBackgroundSync.ts` registers on going
offline (plus opt-in periodic sync); `useOnlineStatus` triggers registration. Verified against a
production PWA build (the dev build disables the service worker via `next-pwa`'s `disable: true`).
Original scope below kept as design reference.

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

### C3. Node CPU saturation (~99% requests) — capacity — ✅ RESOLVED

Truload was temporarily dropped to `minReplicas: 1` to fit a rollout during the node CPU
saturation incident. Verified directly against `devops-k8s/apps/truload-backend/values.yaml` and
`devops-k8s/apps/truload-frontend/values.yaml`: both are back at `minReplicas: 2` / `maxReplicas:
4`. No action needed.

### C4. Restore truload HA — ✅ DONE

Confirmed done as part of C3 above — both services already carry `autoscaling.minReplicas: 2`.

---

## D. Verification
- `npm run test:e2e` (truload-frontend) once `99b2bc8` is fully rolled out → expect 3/3 (weighing idempotency, case-from-weighing get-or-create, recent-convictions).
- `npx jest src/lib/offline` → compliance engine unit tests.
- `node scripts/offline-compliance-parity.mjs <data>` → live parity vs DB.
- Always delete E2E test data afterward (per [[e2e-testing-and-data-cleanup]]).
