# Testing

## In this section

[Test suites](reports.md)
: Inventory of every automated and manual test suite in the three code
  repositories, with paths and scope.

[Live End-to-End Results](live-e2e-results.md)
: Results from the most recent controlled verification run.

[Traceability](traceability-matrix.md)
: Mapping from each workflow to its source code, documentation page, and
  test evidence.

[Compliance checklist](compliance-checklist.md)
: Regulatory and acceptance items with owner and status for each.

## Suite categories

- **Unit and integration.** xUnit on the backend, Vitest on the frontend,
  Node test runner on TruConnect. Run on every CI build.
- **Compliance end-to-end.** Fourteen-step flow: login, autoweigh, case
  auto-creation, yard entry, prosecution, invoicing, payment,
  reweigh, auto-close.
- **Pesaflow / M-PESA.** Three suites cover the direct Pesaflow API,
  backend-mediated invoice push and status, and callback plus reconciliation
  handling.
- **Browser smoke.** Login, weighing capture, prosecution settlement,
  receipts.

![Prosecution invoicing](../media/prosecution/prosecution-invoicing.png)
