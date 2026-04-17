# Traceability

Each workflow has a source of truth in code, a page that documents it, and
a test that exercises it. This matrix keeps the three in step.

| Workflow | Source | Documentation | Test evidence |
|---|---|---|---|
| Auth and RBAC | `truload-backend/Authorization/*`, `Models/Identity/ApplicationRole.cs` | [Auth & access](../enforcement/auth-and-access.md) · [Security](../technical/security-assurance.md) | RBAC guard tests; login E2E |
| Weighing capture | `truload-backend/Controllers/WeighingController.cs`, `TruConnect/src/` | [Weighing](../enforcement/weighing.md) · [Architecture](../technical/architecture.md) | Compliance E2E (14-step) |
| Case and prosecution | `Controllers/CaseRegisterController.cs`, `Controllers/CourtHearingController.cs` | [Cases & prosecution](../enforcement/case-and-prosecution.md) | Compliance E2E (case auto-create + prosecution) |
| Financial / Pesaflow | `Controllers/Financial/PaymentCallbackController.cs`, `Services/Implementations/Financial/ECitizenService.cs` | [Financial & reports](../enforcement/financial-and-reports.md) · [Integrations (M-PESA)](../technical/integrations-mpesa.md) | `pesaflow_api_test.py`, `pesaflow_invoice_e2e.py`, `pesaflow_callback_reconciliation_e2e.py` |
| Reporting | `Controllers/ReportController.cs`, `SupersetController.cs` | [Financial & reports](../enforcement/financial-and-reports.md) | Daily summary + reconciliation exports |
| API contract | `Controllers/*`, Swagger generator | [Swagger](../technical/api/swagger.md) · [OpenAPI](../technical/api/openapi.md) · [Live Swagger](https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html) | Contract diff on every release |
| Deployment | `devops-k8s/apps/truload-*`, `charts/app` | [Deployment](../technical/deployment-and-environments.md) | ArgoCD app health, `kubectl get ingress` |
| Security | `Authorization/*`, `Middleware/*`, `docs/AUDIT_SUMMARY_REPORT.md` | [Security](../technical/security-assurance.md) | Internal audit report, Sprint 11 closure |
| Backup and DR | `docs/BACKUP_STORAGE.md`, `truload-backups` PVC | [Backup, DR & troubleshooting](../technical/backup-dr-troubleshooting.md) | Monthly restore drill record |

## Screenshot coverage

Screenshots live under `docs/media/`
and are embedded inline in the user guide and operations chapters that
reference them. Folders: `auth`, `weighing`, `caseregister`,
`casemanagement`, `prosecution`, `reports`, `setup`, `truconnect`,
`user-rbac-shift`, `security`, `integrations`, `special-release`,
`dashboard`.
