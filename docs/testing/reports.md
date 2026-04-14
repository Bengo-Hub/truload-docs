# Existing Test Reports

## Suites on disk

### Backend — `truload-backend/`

| Suite | Path | Scope |
|---|---|---|
| Unit + integration | `Tests/` | Controllers, services, fee computation, axle grouping, RBAC guards, callback handlers |
| Compliance E2E | `Tests/e2e/compliancee2e/` | 14-step flow: login → autoweigh → case auto-create → yard → prosecution → invoice → payment → reweigh → auto-close |
| Pesaflow direct API | `Tests/e2e/pesaflow_api_test.py` | OAuth, invoice iframe POST, payment status query against `pesaflow.ecitizen.go.ke` |
| Pesaflow invoice E2E | `Tests/e2e/pesaflow_invoice_e2e.py` | Backend login, unpaid-invoice selection, push to Pesaflow, status poll |
| Callback / reconciliation | `Tests/e2e/pesaflow_callback_reconciliation_e2e.py` | `api/v1/payments/callback/{success,failure,timeout}` plus `webhook/ecitizen-pesaflow` idempotency |

### Frontend — `truload-frontend/`

| Suite | Path | Scope |
|---|---|---|
| Component + hook | `src/**/__tests__/` | React Query hooks, stores, permission-gated navigation, weighing grid |
| Playwright smoke | `e2e/` | Login, weighing capture, prosecution settlement, receipts |

### TruConnect — `TruConnect/`

| Suite | Path | Scope |
|---|---|---|
| Parser + I/O | `test/` | ZM, Cardinal, I1310, Mobile, Custom parsers; serial/TCP/UDP/API inputs; WebSocket/API/RDU outputs |
| Simulation | `src/simulation/` | Scripted scale feeds for regression runs without hardware |

## Requirement mapping

| Client requirement | Suites |
|---|---|
| Production environment | Backend deploy workflow logs + compliance runner smoke calls |
| Security assurance | Backend RBAC + audit-log tests; frontend permission-gated render tests |
| M-PESA validation | `pesaflow_api_test.py`, `pesaflow_invoice_e2e.py`, `pesaflow_callback_reconciliation_e2e.py` |
| Reconciliation + idempotency | Callback / reconciliation suite + auto-close cascade in the compliance runner |

## Raw artifacts

- `truload-backend/Tests/e2e/compliancee2e/TEST_RESULTS.md`
- `truload-backend/Tests/e2e/pesaflow_invoice_e2e.md`
- `truload-backend/Tests/e2e/pesaflow_callback_reconciliation_e2e.md`
- `truload-backend/Tests/e2e/pesaflow_api_test.md`

## Quality gates

Test host promotion requires:

1. `dotnet test` green.
2. Frontend `pnpm test` + Playwright smoke green.
3. TruConnect `npm test` green.
4. Compliance E2E runner: fresh 14-step pass against a clean test
   database.
5. Pesaflow direct API probe: pass against the eCitizen sandbox.

Production promotion additionally requires:

6. Controlled live E2E run against the test host (see
   [Live E2E Results](live-e2e-results.md)).
7. Release-manager sign-off recorded against the git tag.

## Open defects

Tracked on [Live E2E Results](live-e2e-results.md):

- Compliance runner reports partial on a small number of backend-mediated
  steps (scale-test creation and tag creation returning `500`).
- `pesaflow_invoice_e2e.py` needs a filter fix to skip already-paid
  invoices.

Both are code defects, not documentation gaps.
