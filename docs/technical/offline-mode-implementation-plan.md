# TruLoad Offline Mode — Implementation Plan

Status: **Shipped (2026-06-25)** · Author: engineering · Scope: `truload-frontend` + `truload-backend`

!!! success "Built, not just planned"
    Every phase below, including the two items originally listed as out of scope (offline login and
    background sync), shipped in a single 2026-06-25 session. The phase breakdown, file list, and
    design rationale below are kept as-written because they're still an accurate description of what
    was built — only the status/scope framing in this note and the "Out of scope" section further
    down have been corrected. See [Shipped scope](#shipped-scope-corrected-2026-06-25) for what
    actually landed and its commit references, and
    [TruConnect's separate offline system](#this-vs-truconnects-sqlite-offline-system) for how this
    fits alongside the other TruLoad offline mechanism.

## Goal

Make the full enforcement workflow usable with no connectivity — **weighing capture → case creation → prosecution → invoice generation** — queueing all writes locally and syncing them when back online with **exactly-once** semantics (no duplicate weighings, cases, invoices, or payments). Model the design on the proven `pos-ui` offline implementation.

## Why

Weighbridges frequently operate on intermittent/no connectivity. Today TruLoad has only *partial, generic* offline plumbing (Dexie `src/lib/offline/db.ts`, `next-pwa`, shared `OfflineBar`, a generic `useOfflineMutation` queue) with **no idempotency keys and no workflow-aware, dependency-ordered sync** — so it cannot safely queue the chained weighing→prosecution→invoice flow. Only the **payment/receipt** endpoint currently supports idempotency (`ReceiptDto.IdempotencyKey`, unique-indexed).

## Reference: how `pos-ui` does it (reuse this pattern)

- **IndexedDB (Dexie):** one store per queued entity; each row carries `local_id` (UUID), `synced`, `attempts`, `next_attempt_at`, `dead_letter`, `sync_error`.
- **Exactly-once:** `local_id` is generated offline and sent as **both** `client_reference` (body) and `Idempotency-Key` (header). The server get-or-creates on the key and returns the server id; dependent mutations then reference the resolved server id.
- **Dependency-ordered drain:** parent entities sync before children (POS: drawer → order → payment). On retry: exponential backoff + jitter, capped; 4xx (except 408/429) → dead-letter; 5xx/network → retry; max 8 attempts.
- **Service worker:** network-first for navigations (offline shell), cache-first for static assets, network-only for API (app owns offline via IndexedDB); background-sync wakes clients to drain.
- **Cold-start snapshots:** reference/catalog data cached so the shell is usable from a cold offline start.

Key POS files to mirror: `pos-ui/src/lib/db/pos-db.ts`, `pos-ui/src/hooks/use-sync-offline-orders.ts`, `pos-ui/src/hooks/use-offline-pos.ts`, `pos-ui/public/sw.js`, `pos-ui/src/lib/sw/register-sync.ts`.

---

## Phase 1 — Backend idempotency foundation (safe, additive)

Add idempotency to the four write endpoints that the offline flow chains through (receipt already has it). Pattern: accept an `Idempotency-Key` header (and/or `clientReference` field); before creating, look up an existing row by `(organization_id, idempotency_key)`; if found, return it (200/get-or-create) instead of creating a duplicate.

| Endpoint | Controller | Add |
|---|---|---|
| `POST /api/v1/weighing-transactions` | `WeighingController` | `idempotency_key` column + unique index; get-or-create |
| `POST /api/v1/case/cases` and `…/from-weighing/{id}` | `CaseRegisterController` | `from-weighing` is already naturally idempotent per weighing — enforce a unique index on `case_registers.weighing_id`; add `idempotency_key` to the generic create |
| `POST /api/v1/prosecutions` | `ProsecutionController` | reuse the existing one-pending-per-case guard; add `idempotency_key` |
| `POST /api/v1/prosecutions/{id}/invoices` | `InvoiceController` | invoice generation is already idempotent per prosecution (returns existing pending invoice) — confirm + add `idempotency_key` for safety |

- Add a nullable `idempotency_key` (uuid) column + **partial unique index** `(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL` on `weighing_transactions`, `case_registers`, `prosecution_cases`, `invoices`. EF migrations auto-apply on startup (direct connection).
- Reuse the existing `ReceiptDto.IdempotencyKey` approach as the template.
- **Verify:** POST each endpoint twice with the same key → second call returns the first row, no duplicate (curl + DB count).

## Phase 2 — Frontend offline data layer

Extend `truload-frontend/src/lib/offline/db.ts` (Dexie) with workflow stores mirroring POS:

```
offlineWeighings:   ++id, local_id, organization_id, station_id, synced, dead_letter, created_at
offlineCases:       ++id, local_id, local_weighing_id, server_weighing_id, synced, dead_letter
offlineProsecutions:++id, local_id, local_case_id, server_case_id, synced, dead_letter
offlineInvoices:    ++id, local_id, local_prosecution_id, server_prosecution_id, synced, dead_letter
referenceCache:     key, organization_id, cached_at      // acts, violation types, stations, officers, tolerance config
snapshots:          key, organization_id                 // me, station, shift cold-start
```

- Add `local_id` + sync-state fields and the `attempts/next_attempt_at/dead_letter/sync_error` helpers (copy `nextRetryState`, `pendingReady`, `getSyncStatusCounts` from `pos-db.ts`).
- Bump the Dexie version with a migration step (keep existing generic queue working).

## Phase 3 — Dependency-ordered sync engine

Rewrite `truload-frontend/src/lib/offline/sync.ts` from a generic queue into a typed, ordered drainer:

1. Weighings → POST with `Idempotency-Key = local_id`; store `server_weighing_id`, mark synced.
2. Cases → resolve `server_weighing_id` (or skip to next pass); POST; store `server_case_id`.
3. Prosecutions → resolve `server_case_id`; POST; store `server_prosecution_id`.
4. Invoices → resolve `server_prosecution_id`; POST.
- Exponential backoff + jitter, dead-letter on terminal 4xx, max attempts (align with POS = 8).
- Trigger on reconnect, on a `truload:sync-now` event, and via service-worker background-sync.

## Phase 4 — Capture surfaces + reference caching

- Wire the weighing-capture, case-creation, prosecution, and invoice-generation screens to write through `useOfflineMutation` (returning the `local_id` immediately) when offline.
- Cold-start cache reference data (acts, violation types, stations, tolerance config, officers) via React Query `persist` + `referenceCache`, so charges can be calculated offline.
- Confirm `OfflineBar` shows pending + dead-letter counts; add a dead-letter review/retry UI (mirror POS `sync-status-indicator`).
- Service worker: confirm `src/sw.ts` / `next-pwa` caches the app shell network-first; register background sync (`registerBackgroundSync`).

## Phase 5 — Hardening

- Idempotency-Key axios interceptor; ensure every queued POST carries it.
- E2E: airplane-mode run through weigh → case → prosecute → invoice; reconnect; assert exactly one of each on the server (DB counts) and correct linkage.
- Per the team rule, **delete all E2E test data** across affected DBs/streams afterward.

## Out of scope as originally planned — since shipped

This section is kept for its original design reasoning, but both items below were built in the
same 2026-06-25 session as everything else on this page. Neither is actually out of scope today.

- **Offline login.** Originally deferred because TruLoad auth is SSO/token-only (no cached PIN like
  POS) and offline requires a prior online session to hold tokens. Shipped as two tiers: Tier 1,
  session continuity (don't wipe an already-persisted session on a network error, only on a genuine
  401/403 while reachable); Tier 2, an opt-in offline PIN that decrypts a cached session
  (AES-GCM under a PBKDF2-SHA256 key derived from the PIN) rather than minting a new JWT — the PIN
  never authenticates by itself, and 5 wrong attempts wipes the cached blob.
- **Headless sync while the tab is closed.** Originally deferred; shipped via the Background Sync
  API. If an app window is open when connectivity returns, the service worker posts a message so
  the page drains the queue with the already-tested axios engine; if the app is genuinely closed,
  the service worker drains it itself via a fetch-based poster that pulls auth/tenant context from
  cookies.
- Offline **payment** capture beyond what the existing receipt idempotency already allows
  (eCitizen/Pesaflow checkout is inherently online) remains genuinely out of scope — this one was
  not built and is not planned.

## Shipped scope (corrected 2026-06-25)

| Area | What shipped | Commit(s) |
|---|---|---|
| Phase 1 — backend idempotency | Weighing create reuses the existing `ClientLocalId` get-or-create (no migration needed); case-from-weighing and prosecution-from-case converted from throw-on-duplicate to get-or-create; invoice/receipt were already idempotent | `truload-backend b04a11b`/`d1046fd`/`5cf6e16` |
| Phase 2/3 — Dexie stores + sync engine | Dexie v3 workflow stores (`offlineWeighings`/`offlineCases`/`offlineProsecutions`/`offlineInvoices`/reference cache) + a dependency-ordered, idempotent sync engine (`Idempotency-Key` headers, exponential backoff with jitter, dead-letter) in `src/lib/offline/{db,sync}.ts` | `truload-frontend 40b43d2` |
| Phase 4 — capture-UI integration | `referenceCache.ts` warms axle configs/weight refs/tolerances/fee schedules/demerit/acts/recent-convictions to IndexedDB; `offlineCapture.ts` runs a faithful, parity-validated port of the compliance engine (`compliance.ts`, 30/30 against real weighings) to produce a provisional `WeighingResult` entirely client-side; `useWeighing` queues the weighing offline and shows a "Provisional (offline)" banner; server reconciles on sync | `truload-frontend 2bb8545`, `truload-backend 2b44503` |
| Offline login | Tier 1 (session continuity) + Tier 2 (encrypted offline PIN) — see above | `truload-frontend 3c0b58c`, `truload-frontend 5d62e7b` |
| Background sync | Background Sync API wiring so the queue drains even with the app closed — see above | `truload-frontend 37a38ba` |
| Verification | Jest (12/12 offline unit tests) + Playwright `e2e/api-idempotency.spec.ts` against the live API, self-cleaning (creates then hard-deletes its own weighing+case) | `truload-frontend` (same commits above) |

## This vs. TruConnect's SQLite offline system

TruLoad has **two** separate offline mechanisms, built for two different deployment shapes. Both
solve "keep working when the network drops," but neither replaces the other:

| | This page (frontend PWA) | TruConnect's offline queue |
|---|---|---|
| Runs on | The browser, via IndexedDB (Dexie) + a service worker | The TruConnect Windows bridge, via a local SQLite `weighing_queue` table |
| Deployment shape | A browser-connected site with a `truload-frontend` install | A frontend-less site (TruConnect posts straight to `truload-backend`, no browser involved) |
| Covers | Full enforcement chain: weighing → case → prosecution → invoice | Weighing capture only (`autoweigh`/`complete`), dependency-chained |
| Built | June 2026, this initiative | A separate, later initiative (TruConnect Phase 3/4) — see that initiative's plan file for its own verification record |

If you're building for a site that has a local frontend install, this page's mechanism applies. If
you're building for a frontend-less TruConnect-only deployment, see
[Architecture](architecture.md#components) and TruConnect's own `src/backend/` module
(`SyncQueue.js`, `ConfigSyncService.js`) instead.

## Sequencing & PRs

1. PR1 — Phase 1 backend idempotency (+ migrations).
2. PR2 — Phase 2 Dexie stores.
3. PR3 — Phase 3 sync engine.
4. PR4 — Phase 4 capture surfaces + reference caching + dead-letter UI.
5. PR5 — Phase 5 hardening + E2E.

Each PR is independently shippable and build-verified before push.
