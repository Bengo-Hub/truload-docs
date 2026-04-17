# Reports

TruLoad provides a comprehensive set of reports for commercial weighing operations. All reports support date-range filtering, station selection, and export to PDF or CSV.

## Available Reports

### 1. Daily Weighing Summary

Overview of all transactions for a selected date, grouped by shift.

| Metric | Description |
|--------|-------------|
| Total transactions | Count of completed weighing transactions |
| Total net weight | Sum of all net weights (tonnes) |
| Average net weight | Mean net weight per transaction |
| Vehicles weighed | Distinct vehicle count |
| Pending transactions | Two-pass transactions awaiting second pass |

### 2. Tonnage by Cargo Type

Breakdown of total net weight by commodity over a selected period.

- Bar chart visualization by cargo type
- Drill-down to individual transactions
- Useful for inventory reconciliation and procurement planning

### 3. Tonnage by Transporter

Net weight totals grouped by transporter/hauler for a selected period.

- Supports billing reconciliation
- Compares actual vs. contracted volumes
- Exportable for accounts payable/receivable

### 4. Vehicle Utilization

Per-vehicle statistics over a selected period:

- Number of trips
- Total net weight carried
- Average payload per trip
- Payload efficiency (actual vs. vehicle capacity)

### 5. Tare Verification

Status of stored tare weights across the fleet:

- Vehicles with valid stored tare
- Vehicles with expiring tare (within 14 days)
- Vehicles with expired tare
- Tare drift alerts (measured vs. stored variance)

### 6. Quality Deductions

Summary of all quality deductions applied over a selected period:

- Deductions by type (moisture, foreign matter, grade)
- Deductions by cargo type
- Total weight deducted vs. total gross weight
- Trend analysis (increasing/decreasing deduction rates)

### 7. Shift Performance

Operator and shift-level statistics:

- Transactions per operator per shift
- Average processing time (gate-to-gate)
- Void/adjustment rate per operator
- Scale utilization (active capture time vs. shift duration)

### 8. Transaction Audit Log

Detailed log of all actions taken on weighing transactions:

- Weight captures, edits, voids, and adjustments
- Tare approvals and overrides
- Manual weight entries
- Filtered by user, date, or transaction reference

### 9. Pending Transactions

List of all two-pass transactions awaiting their second pass:

- Age of pending transaction (hours/days)
- Vehicle and transporter details
- Assigned operator
- Useful for end-of-day reconciliation

### 10. Monthly Reconciliation

Comprehensive month-end summary:

- Total transactions and tonnage
- Revenue by cargo type (if pricing is configured)
- Comparison with previous month
- Anomaly summary (voids, adjustments, tare overrides)
- Designed for finance and management sign-off

## Generating Reports

1. Navigate to **Reports** from the main menu.
2. Select the type from the dropdown.
3. Set the date range, station, and any additional filters.
4. Click **Generate**.
5. Review on screen.
6. Click **Export PDF** for formal distribution or **Export CSV** for data analysis.

!!! tip "Scheduled delivery"
    Ask your platform administrator to configure automated delivery. Daily summaries and monthly reconciliation can be emailed to designated recipients on a schedule.

## Access by Role

| Type | Operator | Supervisor | Finance | Admin |
|------|----------|------------|---------|-------|
| Daily Weighing Summary | :material-check: | :material-check: | :material-check: | :material-check: |
| Tonnage by Cargo Type | | :material-check: | :material-check: | :material-check: |
| Tonnage by Transporter | | :material-check: | :material-check: | :material-check: |
| Vehicle Utilization | | :material-check: | | :material-check: |
| Tare Verification | | :material-check: | | :material-check: |
| Quality Deductions | | :material-check: | :material-check: | :material-check: |
| Shift Performance | | :material-check: | | :material-check: |
| Transaction Audit Log | | | | :material-check: |
| Pending Transactions | :material-check: | :material-check: | | :material-check: |
| Monthly Reconciliation | | | :material-check: | :material-check: |
