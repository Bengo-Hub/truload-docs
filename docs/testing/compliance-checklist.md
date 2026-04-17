# Compliance checklist

Status of the acceptance items the platform is measured against.

## Production environment

- [x] Production URLs documented — see [Deployment](../technical/deployment-and-environments.md#hostnames).
- [x] Hosting captured — Contabo (Nuremberg), Kubernetes v1.30.14, Ubuntu 24.04, 12 vCPU, 47 GiB RAM.
- [x] Test vs production segregation documented.
- [x] Deploy and rollback procedures documented.

## Security

- [x] Controls documented — see [Security](../technical/security-assurance.md#controls).
- [x] Internal audit findings and closure status published.
- [x] All P0 security-impacting findings resolved.

## M-PESA integration

- [x] Integration flow documented — see [Integrations (M-PESA)](../technical/integrations-mpesa.md).
- [x] Happy-path run verified — see [Live End-to-End Results](live-e2e-results.md).
- [x] Callback success/failure/timeout handlers probed.
- [x] Reconciliation + idempotency covered by `pesaflow_callback_reconciliation_e2e.py`.
- [x] Direct Pesaflow API (OAuth, invoice, status) validated by `pesaflow_api_test.py`.

## Documentation and tests

- [x] User guide complete.
- [x] Operations guide complete.
- [x] Testing section with suite index and live results.
- [x] Traceability matrix present.
- [x] API reference — [Swagger](../technical/api/swagger.md), [OpenAPI](../technical/api/openapi.md),
      [live Swagger UI](https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html).
- [x] Production deployment evidence linked.
- [x] Release notes inside the docs — see [Releases](../release-notes/index.md).
- [x] PDFs available from the [home page](../index.md#downloads).
