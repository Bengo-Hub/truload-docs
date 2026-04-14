# Live E2E Results

## Target hosts

- Backend: `https://kuraweighapitest.masterspace.co.ke`
- Frontend: `https://kuraweightest.masterspace.co.ke`

## Latest run — 2026-04-14

| Suite | Outcome | Evidence |
|---|---|---|
| Compliance E2E (14 steps) | Partial (12/19 steps pass) | `truload-backend/Tests/e2e/compliancee2e/TEST_RESULTS.md` |
| Pesaflow backend invoice E2E | Partial (push step pass) | `truload-backend/Tests/e2e/pesaflow_invoice_e2e.md` |
| Pesaflow callback / reconciliation probe | Pass | `truload-backend/Tests/e2e/pesaflow_callback_reconciliation_e2e.md` |
| Pesaflow direct API validation | Pass | `truload-backend/Tests/e2e/pesaflow_api_test.md` |

Notes:

- Login succeeds on every suite and reuses the cached JWT, so account
  lockout is no longer a blocker.
- Remaining compliance-runner failures are backend `500`s on scale-test
  and tag-creation endpoints. Tracked as a code defect.
- Pesaflow invoice E2E passed the push step; the status-polling step
  returned a validation `400` because the suite picked an already-paid
  invoice. Tracked as a code defect in the selector.
- Callback, reconciliation, and direct Pesaflow API probes passed end to
  end.

## Screenshots from the run

![Prosecution invoicing](../media/prosecution/prosecution-invoicing.png)
![eCitizen payment](../media/prosecution/prosecution-invoicing-ecitizen-payment.png)
![M-PESA STK prompt](../media/prosecution/stk-push-mpesa-prompt.jpeg)
![STK confirmation](../media/prosecution/stk-push-mpesa-confirm-message.jpeg)
![Payment success modal](../media/prosecution/payment-success-modal.png)
![Payment receipt](../media/prosecution/payment-receipt.png)
![Receipts page](../media/prosecution/reciepts-page.png)

## Reproducing the run

Live-run orchestration lives alongside the test scripts at
`truload-backend/Tests/e2e/compliancee2e/live/`. Operators with a
signed-off release window run `run_live_suite.py` against the test host;
the script redacts secrets from scenario output and emits a markdown block
that is appended to this page. See `live/README.md` in the backend repo
for the exact invocation.

## See also

- [Integrations and M-PESA](../technical/integrations-mpesa.md)
- [Existing Test Reports](reports.md)
- [Compliance Checklist](../testing/compliance-checklist.md)
