# Two-Pass Weighing

Two-pass weighing is the standard commercial workflow where a vehicle is weighed twice -- once loaded and once empty -- to determine the **net weight** of the cargo.

$$
\text{Net Weight} = \text{Gross Weight} - \text{Tare Weight}
$$

## Workflow Overview

```mermaid
flowchart TD
    A[Vehicle arrives at gate] --> B{First visit?}
    B -->|Yes| C[Capture first weight]
    B -->|No - returning| D[Capture second weight]
    C --> E[Print interim ticket]
    E --> F[Vehicle proceeds to load/unload]
    F --> D
    D --> G[System calculates net weight]
    G --> H{Quality deductions?}
    H -->|Yes| I[Apply deductions]
    H -->|No| J[Generate final ticket]
    I --> J
    J --> K[Print & release]
```

## Inbound Weighing (Gross First)

This is the most common pattern for **receiving** goods. The loaded vehicle arrives, is weighed (gross), unloads, then returns to the scale for the tare weight.

### Step-by-step

1. **Open the Weighing module** and confirm the station and shift are active.
2. **Start a new transaction** and choose **Gross** as the first weight type. There is no separate "Inbound/Outbound" toggle; the direction is expressed entirely by which weight you capture first.
3. **Enter vehicle details**:
    - Registration number (plate)
    - Transporter name (auto-populated if the vehicle is registered)
    - Driver name and ID
    - Cargo type (selects the applicable tolerance and deduction rules)
4. **Capture the gross weight**:
    - Direct the vehicle onto the scale
    - Wait for the TruConnect stable indicator
    - Click **Capture Weight** or let auto-weight trigger
    - Confirm the captured value
5. **Print the interim ticket** showing the gross weight and transaction reference.
6. **Release the vehicle** to the loading/unloading bay.
7. When the vehicle returns empty:
    - Open the pending transaction by scanning the ticket barcode or searching by plate
    - **Capture the tare weight**
    - System calculates net weight automatically
8. **Apply quality deductions** if applicable (moisture, foreign matter, grade).
9. **Review and confirm** the final ticket.
10. **Print the final weight ticket** and release the vehicle.

!!! tip "Stored tare shortcut"
    If the vehicle has a valid stored tare weight, you can skip the second pass entirely. See [Tare Management](tare-management.md) for details.

## Outbound Weighing (Tare First)

Used when **dispatching** goods. The empty vehicle arrives first (tare), loads up, then returns for the gross weight.

### Step-by-step

1. **Start a new transaction** and choose **Tare** as the first weight type.
2. **Enter vehicle details** (same fields as inbound).
3. **Capture the tare weight** (vehicle is empty).
4. **Print the interim ticket** and release the vehicle to the loading bay.
5. When the vehicle returns loaded:
    - Open the pending transaction
    - **Capture the gross weight**
    - Net weight is calculated automatically
6. **Apply any quality deductions** and **confirm the final ticket**.
7. **Print and release**.

## Single-Pass with Stored Tare

When a vehicle's tare weight is stored and still valid (not expired), operators can complete the transaction in a single visit:

```mermaid
flowchart LR
    A[Vehicle arrives loaded] --> B[Capture gross weight]
    B --> C[System applies stored tare]
    C --> D[Net weight calculated]
    D --> E[Print final ticket & release]
```

1. Start a new transaction.
2. Enter the vehicle registration -- the system auto-fills the stored tare.
3. Capture the gross (or tare, for outbound) weight.
4. The system immediately calculates the net weight.
5. Review, confirm, print, and release.

!!! warning "Tare expiry"
    If the stored tare has expired, the system will prompt for a fresh tare capture. The expiry period is configured in **Setup > System Config**.

## Transaction States

| State | Meaning |
|-------|---------|
| `Pending` | Transaction created, no weight captured yet |
| `FirstWeightCaptured` | First pass captured, awaiting second pass |
| `Complete` | Both passes captured, net weight calculated |
| `ToleranceExceeded` | Net discrepancy beyond the configured tolerance, needs supervisor approval before the ticket can be finalised |
| `Voided` | Transaction cancelled before completion |

These match the ticket status badge described in [Weight Tickets](weight-tickets.md#ticket-status)
exactly. There is a single set of transaction states used throughout the commercial module.

## Resume Flow (Returning Vehicle)

When an operator enters a vehicle registration number on the **Capture** screen:

1. TruLoad checks for any open (first-weight-only) transactions for that plate within the configured threshold (default **8 hours**).
2. If an open transaction is found, a **Resume Weighing** dialog appears showing the ticket number, first weight, and elapsed time.
3. The operator can:
    - **Resume** — the stepper jumps directly to the **Second Weight** step with the existing transaction pre-loaded.
    - **Start New** — dismisses the dialog and creates a fresh transaction (the old open transaction remains open; a supervisor may need to void it).

The resume dialog shows the most recent open transaction if multiple exist.

### Stale Transaction Notifications

If a first-weight-only transaction remains open past the threshold (default 8 hours) without a second weight being captured, TruLoad automatically emails the **Commercial Weighing Manager** and **Station Manager** assigned to that organisation. Notifications are sent once per transaction (tracked by the `StaleAlertSentAt` field). The threshold can be configured in **Setup > Settings > Weighing > Commercial Pending Weighing Threshold (hours)**.

## Handling Exceptions

### Vehicle leaves without second pass

Pending transactions remain open. A supervisor can:

- Void the transaction with a documented reason
- Allow the vehicle to return within the configured threshold — the Resume dialog will appear automatically when the plate is re-entered

### Weight discrepancy

If the net weight falls outside the tolerance for the selected cargo type:

1. The system flags the transaction `ToleranceExceeded` with a warning; the transaction still completes normally otherwise.
2. A supervisor with `weighing.override` can **Approve** the exception (unblocks final ticket generation) or **Reject** it (voids the transaction, requiring a fresh weighing).
3. The final ticket PDF cannot be generated while a `ToleranceExceeded` transaction is unapproved.
4. All decisions are recorded in the audit log.

### Scale fault during capture

If TruConnect loses the scale connection mid-capture:

1. The system preserves any already-captured values.
2. Reconnect the scale and retry the capture.
3. If the scale cannot be recovered, the supervisor can enter a manual weight with justification (requires the `manual_weight_override` permission).
