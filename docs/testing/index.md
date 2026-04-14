# Testing

## In this section

[Test suites](reports.md)
: Inventory of every automated and manual test suite in the three code
  repositories, with paths and scope.

[Live E2E results](live-e2e-results.md)
: Results from the most recent controlled run against the test host.

[Traceability](traceability-matrix.md)
: Mapping from each workflow to its source code, documentation page, and
  test evidence.

[Compliance checklist](compliance-checklist.md)
: Regulatory and acceptance items with owner and status for each.

## Suite categories

- **Unit and integration.** xUnit on the backend, Vitest on the frontend,
  Node test runner on TruConnect. Run on every CI build.
- **Compliance E2E.** Fourteen-step flow: login → autoweigh → case
  auto-creation → yard entry → prosecution → invoicing → payment →
  reweigh → auto-close. Source: `truload-backend/Tests/e2e/compliancee2e/`.
- **Pesaflow / M-PESA.** Three suites cover the direct Pesaflow API,
  backend-mediated invoice push and status, and callback + reconciliation
  handling. Source: `truload-backend/Tests/e2e/pesaflow_*.py`.
- **Playwright smoke.** Login, weighing capture, prosecution settlement,
  receipts. Source: `truload-frontend/e2e/`.

![Prosecution invoicing](../media/prosecution/prosecution-invoicing.png)
