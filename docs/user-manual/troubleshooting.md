# User Troubleshooting

## Common operational issues and actions

| Symptom | Likely cause | Operator action | Escalation trigger |
|---|---|---|---|
| No live weight updates | TruConnect disconnected or wrong input source | Check TruConnect running state and input source mapping | Escalate if no data after restart/config check |
| Cannot create weighing | Missing role permission or station context | Re-login and verify role + station assignment | Escalate when role appears correct but API still rejects |
| Scale test fails unexpectedly | Backend/runtime error | Retry once and capture exact error response | Escalate with trace/request ID and timestamp |
| Invoice not moving to paid | Callback delay, invalid payload, or pending payment | Check payment prompt completion and retry status check | Escalate if still pending/failed beyond SLA |
| Payment status returns validation error | Missing required reference parameter | Re-open invoice and confirm reference fields | Escalate to technical team for endpoint behavior |
| Case not closing after compliant reweigh | Missing payment/memo/reweigh linkage | Verify every prerequisite object is present | Escalate when all prerequisites are complete |

## Quick diagnosis by module

### Weighing

1. Confirm scale connection.
2. Confirm station and shift context.
3. Confirm vehicle metadata is valid.

![Weighing page](../media/weighing/weighing_screen.png)
![Take weight modal](../media/weighing/take-weight-modal.png)

### Case and prosecution

1. Confirm case exists and status is correct.
2. Confirm prosecution record is linked.
3. Confirm invoice exists before settlement attempt.

![Case register page](../media/caseregister/case-register-page.png)
![Prosecution page](../media/prosecution/prosecution-page.png)

### Payments and receipts

1. Confirm payment prompt reached user.
2. Confirm success modal displayed.
3. Confirm receipt record exists in receipts page.

![STK push prompt](../media/prosecution/stk-push-mpesa-prompt.jpeg)
![Payment success modal](../media/prosecution/payment-success-modal.png)
![Receipts page](../media/prosecution/reciepts-page.png)

## Escalation package (always include)

1. Screenshot of failing screen/modal.
2. Module name and exact action performed.
3. Station, user, and timestamp (UTC).
4. Request/correlation/trace ID from response where available.
5. Last successful step before failure.
