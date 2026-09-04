# Traceability

Each workflow has a source of truth in code, a page that documents it, and
a test that exercises it. This matrix keeps the three in step.

| Workflow | Source | Documentation | Test evidence |
|---|---|---|---|
| Auth and RBAC | `truload-backend/Authorization/*`, `Models/Identity/ApplicationRole.cs` | [Auth & access](../enforcement/auth-and-access.md) · [Security](../technical/security-assurance.md) | RBAC guard tests; login verification |
| Weighing capture | `truload-backend/Controllers/WeighingController.cs`, `TruConnect/src/backend/` (frontend-less) | [Weighing](../enforcement/weighing.md) · [Architecture](../technical/architecture.md) — now documents both the browser-mediated and TruConnect-direct-to-backend paths | Compliance end-to-end (14-step) |
| Case and prosecution | `Controllers/CaseRegisterController.cs`, `Controllers/CourtHearingController.cs` | [Cases & prosecution](../enforcement/case-and-prosecution.md) | Compliance end-to-end (case auto-create + prosecution) |
| Commercial weighing / tariffs & billing | `Models/Financial/CommercialTariffRule.cs`, `CommercialTariffAccrual.cs`, `Controllers/Financial/CommercialTariffController.cs`, `Services/BackgroundJobs/CommercialPeriodicBillingJob.cs`, `truload-frontend/src/app/[orgSlug]/setup/tariffs/page.tsx` | [Business models](../commercial/business-models.md) · [Setup](../commercial/setup.md) · [Background jobs](../technical/BACKGROUND_JOBS.md) | `commercial-role-permissions.spec.ts` (blocked live — see the audit initiative's CRITICAL PATH Blocker 1); no dedicated backend unit test yet for `RateBasis`/`BillingPeriod` resolution |
| Offline capture / sync (frontend PWA) | `truload-frontend/src/lib/offline/{db,sync,compliance,offlineCapture}.ts` | [Offline mode implementation](../technical/offline-mode-implementation-plan.md) | `src/lib/offline/__tests__/compliance.test.ts` (7/7), `scripts/offline-compliance-parity.mjs` (30/30), `scripts/offline-charges-parity.mjs` (5/5), `e2e/api-idempotency.spec.ts` |
| Offline capture / sync (TruConnect, frontend-less) | `TruConnect/src/backend/{SyncQueue,ConfigSyncService,BackendClient}.js` | [Architecture](../technical/architecture.md#components) · [Offline mode implementation](../technical/offline-mode-implementation-plan.md#this-vs-truconnects-sqlite-offline-system) | `TruConnect/tests/sync-queue-and-config-sync-test.js` (19/19 real-transport behaviours, section (e)) |
| Demo tenant (`codevertex-demo`) | `Services/Background/AuthDemoSyncService.cs`, `Constants/CommercialVerticals.cs` | [Background jobs](../technical/BACKGROUND_JOBS.md#authdemosyncservice) | None live yet — service has never executed in production (`Nats:Enabled=false`, no override); see that page's note and the audit initiative's CRITICAL PATH Blocker 2 |
| Financial / Pesaflow | `Controllers/Financial/PaymentCallbackController.cs`, `Services/Implementations/Financial/ECitizenService.cs` | [Financial & reports](../enforcement/financial-and-reports.md) · [Integrations (M-PESA)](../technical/integrations-mpesa.md) | `pesaflow_api_test.py`, `pesaflow_invoice_e2e.py`, `pesaflow_callback_reconciliation_e2e.py` |
| Reporting | `Controllers/ReportController.cs`, `SupersetController.cs` | [Financial & reports](../enforcement/financial-and-reports.md) | Daily summary + reconciliation exports |
| API contract | `Controllers/*`, Swagger generator | [Swagger](../technical/api/swagger.md) · [OpenAPI](../technical/api/openapi.md) · [Live Swagger](https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html) | Contract diff on every release |
| Deployment | `devops-k8s/apps/truload-*`, `charts/app` | [Deployment](../technical/deployment-and-environments.md) | ArgoCD app health, `kubectl get ingress` |
| Security | `Authorization/*`, `Middleware/*`, `docs/AUDIT_SUMMARY_REPORT.md` | [Security](../technical/security-assurance.md) | Internal audit report, all P0 findings resolved |
| Backup and DR | `docs/BACKUP_STORAGE.md`, `truload-backups` PVC | [Backup, DR & troubleshooting](../technical/backup-dr-troubleshooting.md) | Monthly restore drill record |

## Screenshot coverage

Screenshots live under `docs/media/`
and are embedded inline in the user guide and operations chapters that
reference them. Folders: `auth`, `weighing`, `caseregister`,
`casemanagement`, `prosecution`, `reports`, `setup`, `truconnect`,
`user-rbac-shift`, `security`, `integrations`, `special-release`,
`dashboard`.
