# TruLoad Offline Mode — Implementation Plan

Status: **Proposed (awaiting approval)** · Author: engineering · Scope: `truload-frontend` + `truload-backend`

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

## Out of scope (explicitly deferred)

- **Offline login.** TruLoad auth is SSO/token-only (no cached PIN like POS). Offline requires a prior online session to hold tokens; a PIN-based cold-start offline login is a separate effort.
- Headless sync while the tab is closed.
- Offline **payment** capture beyond what the existing receipt idempotency already allows (eCitizen/Pesaflow checkout is inherently online).

## Sequencing & PRs

1. PR1 — Phase 1 backend idempotency (+ migrations).
2. PR2 — Phase 2 Dexie stores.
3. PR3 — Phase 3 sync engine.
4. PR4 — Phase 4 capture surfaces + reference caching + dead-letter UI.
5. PR5 — Phase 5 hardening + E2E.

Each PR is independently shippable and build-verified before push.
