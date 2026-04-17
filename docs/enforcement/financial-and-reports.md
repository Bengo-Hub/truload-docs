# Financial and Reporting Workflow

## Invoice-to-receipt operating flow

1. Open the prosecution/financial invoice list.
![Prosecution invoicing page](../media/prosecution/prosecution-invoicing.png)
2. Select target invoice and confirm:
   - invoice number
   - amount due
   - status
   - linked case/prosecution record
   ![Settle invoice action](../media/prosecution/prosecution-invoicing-settle-invpoice.png)
3. Start settlement.
![eCitizen payment initiation](../media/prosecution/prosecution-invoicing-ecitizen-payment.png)
4. Choose payment channel (eCitizen/M-PESA or approved alternative channel).
5. Confirm response and wait for final payment success indication.
![Payment success modal](../media/prosecution/payment-success-modal.png)
6. Open receipts and confirm receipt generation.
![Payment receipt](../media/prosecution/payment-receipt.png)
![Receipts page](../media/prosecution/reciepts-page.png)

## M-PESA/eCitizen operator checks

1. Confirm STK push prompt is presented.
![STK push prompt](../media/prosecution/stk-push-mpesa-prompt.jpeg)
2. Confirm user receives phone prompt and authorizes payment.
3. Verify success confirmation in UI.
4. Verify receipt and updated status in invoice/receipt modules.

![STK push confirmation](../media/prosecution/stk-push-mpesa-confirm-message.jpeg)
![eCitizen M-PESA push state](../media/prosecution/ecitizen-mpesa-stk-push.png)

## Dashboard

The dashboard is the landing view after login. It surfaces the station's
daily totals (vehicles weighed, compliant/overloaded split, open cases,
pending invoices) and the shift-level summary for the signed-in operator.
Use it to confirm the shift is active and nothing from the previous shift is
left un-closed before you start capturing new weighings.

![Dashboard](../media/dashboard/dashboard.png)

Typical start-of-shift checks from the dashboard:

1. Confirm your station and shift are shown in the header.
2. Check the "open cases" counter against the handover note; every open case
   should have an owner.
3. Check pending invoices; chase any with a payment retry flag before they
   time out the Pesaflow session.
4. Scan the weighing-hourly chart for any period with zero captures on a
   live lane — that usually means a scale-feed outage.

## Reporting flow

1. Open `Reporting`.
2. Select the report type — daily summary, overload detail, prosecution
   status, finance reconciliation, or shift performance.
3. Apply station/date/module filters. Dates default to the current shift; widen
   the range for end-of-month reports.
4. Validate the totals against the dashboard and the receipts page for the
   same period.
5. Export in PDF for sign-off or CSV for finance reconciliation.

![Reporting page](../media/reports/report-page.png)

Common reports and who reads them:

| Report | Primary audience | Frequency |
|---|---|---|
| Daily weighings summary | Station manager | End of each shift |
| Overload / prosecution register | Prosecution officer | Daily |
| Invoice & receipt reconciliation | Finance | Daily / monthly |
| Shift performance | Platform admin | Weekly |
| Compliance certificate log | Closure officer | As needed |

## Reconciliation checklist

- Invoice status is consistent with payment channel callback status.
- Receipt exists for settled invoices and is uniquely referenced.
- Case/prosecution progression aligns with payment completion.
- Any failed/pending payments are documented and retried per SOP.
