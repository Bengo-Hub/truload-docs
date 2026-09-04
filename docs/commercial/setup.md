# Setup & Configuration

This guide covers the configuration options specific to commercial weighing operations. For general station setup, user management, and TruConnect installation, see the [enforcement setup guide](../enforcement/setup-rbac-truconnect.md) and [TruConnect installation](../technical/truconnect-install.md) — the process is identical.

## Commercial Settings

Navigate to **Setup > Settings > Commercial** to configure organisation-wide commercial parameters.

| Setting | Description | Default |
|---------|-------------|---------|
| **Weighing Business Model** | `Third-Party Weighbridge` (charges transporters per transaction) or `Facility-Owned Scale` (no per-transaction fee, internal use only) | — |
| **Weighing fee (KES)** | Fallback per-transaction fee, used only when no tariff rule (see below) matches a weighing. Only applies when model is `Third-Party Weighbridge`. Leave at 0 for facility-owned scales. | — |
| **Default tare expiry (days)** | Number of days a stored tare weight remains valid before re-verification is required | 90 |
| **Payment gateway** | Integrated payment provider (read-only; configured by platform admin) | — |

!!! info "Business model"
    Set the **Weighing Business Model** before going live. When set to `Facility-Owned Scale`, the system skips invoice creation and payment collection for every transaction. See [Business Models](business-models.md) for a full comparison.

## Tariff Rules

Navigate to **Setup > Tariffs** to configure how commercial weighing fees are calculated. This is
the primary billing mechanism for `Third-Party Weighbridge` organisations — the flat **Weighing
fee (KES)** above only applies when a weighing matches no tariff rule.

Each rule has:

| Field | Description |
|-------|-------------|
| **Label** | Optional display name, e.g. "Heavy trucks (5+ axles)" or "Acme Transporters contract rate" |
| **Transporter Contract Rate** | Optional. When set, the rule applies only to that transporter's weighings and ignores the bracket fields below. Takes priority over every bracket rule. |
| **Vehicle Type / Min-Max Axle Count / Min-Max Gross Weight (kg)** | Optional bracket-matching fields, used when no transporter is selected. Leave any field blank to match any value; the most specific matching bracket wins. |
| **Fee (KES)** | The amount, interpreted according to Rate Basis below |
| **Rate Basis** | `Per tonne` (fee × net weight in tonnes — the default), `Per kg` (fee × net weight in kg), or `Flat fee` (a fixed amount per matching weighing) |
| **Invoiced** | `Per transaction` (invoice immediately on completion — the original behaviour) or `Daily`/`Weekly`/`Monthly` (roll every matching weighing in that period into one invoice) |

Resolution order for a completed weighing: a matching transporter contract rule always wins;
otherwise the most specific matching bracket rule applies; if nothing matches, the organisation's
flat Weighing fee (KES) applies. Rules with a non-immediate billing period don't invoice right
away — they accrue, and the `commercial-periodic-billing` background job (see
[Background Jobs](../technical/BACKGROUND_JOBS.md)) rolls up every accrual for the same
organisation, transporter, and period into one invoice once that period has fully elapsed.

!!! info "Tare expiry"
    When a stored tare expires, the system prevents single-pass operations on the affected vehicle and prompts the operator to capture a fresh tare weight. The tare expiry period can be overridden per vehicle in the tare register.

## Tolerance Settings

Tolerances define the acceptable variance between expected and actual net weight. They apply per cargo type and are business rules set by the site operator — not legal compliance limits (those belong to the enforcement module).

Navigate to **Setup > Tolerances** to configure:

| Field | Description | Example |
|-------|-------------|---------|
| **Cargo type** | Apply this rule to a specific commodity, or leave blank for a global rule | Maize |
| **Tolerance type** | `Percentage` or `Absolute (kg)` | Percentage |
| **Tolerance value** | Numeric value (% or kg) | 2.0 |
| **Maximum tolerance (kg)** | Cap applied when using percentage mode — the discrepancy will not be flagged as exceeded beyond this kg ceiling | 2,000 kg |
| **Description** | Label for operators (e.g. "Maize moisture variance") | — |

### How tolerance is evaluated

1. Operator enters **Expected Net Weight** in the Ticket step.
2. After both weights are captured and net is calculated, TruLoad compares the actual net weight against the expected.
3. If the discrepancy exceeds the configured tolerance, the transaction is flagged **Tolerance Exceeded**.
4. The ticket cannot be finalised until a supervisor with `weighing.override` permission approves the exception.

```
Discrepancy (kg) = |Actual Net Weight − Expected Net Weight|

For percentage tolerance:  Threshold = ExpectedNetWeight × ToleranceValue / 100
                            Cap applied: min(Threshold, MaxToleranceKg)
For absolute tolerance:     Threshold = ToleranceValue (kg)

Flag if: Discrepancy > Threshold
```

!!! warning "Expected net weight required"
    Tolerance is only evaluated when the operator provides an **Expected Net Weight** in the Ticket step. If omitted, no tolerance check runs.

!!! info "Tolerances vs. enforcement limits"
    In enforcement mode, axle-load limits are defined by the Kenya Traffic Act. In commercial mode, tolerances are business rules you configure. Exceeding a tolerance generates a supervisor approval gate on the transaction — not a legal case or prosecution record.

## Cargo Type Configuration

Cargo types determine the commodity-specific rules applied to each transaction.

Navigate to **Setup > Weighing Metadata > Cargo Types**:

| Field | Description |
|-------|-------------|
| **Name** | Display name (e.g., "Maize", "Cement", "Ballast") |
| **Code** | Short code for tickets and reports (e.g., `MZ`, `CM`, `BL`) |
| **Moisture target %** | Target moisture content for deduction calculation |
| **Foreign matter limit %** | Threshold above which foreign matter deductions apply |
| **This organisation only** | When checked, this cargo type is only visible and usable within your organisation. Unchecked (default) makes it a shared entry visible to every tenant on the platform, which is how every pre-existing cargo type behaves today. |
| **Active** | Enable/disable the cargo type |

!!! info "Tolerance override lives on the Tolerances page, not here"
    There is no tolerance field on the Cargo Type form itself. To override the global tolerance
    for a specific commodity, create a rule scoped to that cargo type on
    **[Setup > Tolerances](#tolerance-settings)**. See [Tolerance Settings](#tolerance-settings)
    above for the exact fields.

### Adding a new cargo type

1. Click **Add Cargo Type**.
2. Fill in the name and code.
3. Check **This organisation only** if this cargo type should not be visible to other tenants (leave unchecked to add it as a shared/global entry, the default and most common case).
4. Configure quality parameters if deductions are enabled for this commodity.
5. Click **Save**.

The cargo type is immediately available in the weighing capture screen.

## Origin and Destination Management

Origins and destinations are used for logistics tracking and reporting. They appear on weight tickets and can be filtered in reports.

Navigate to **Setup > Weighing Metadata > Origins/Dest.**:

1. Click **Add Location**.
2. Enter the name, code, country, and location type. This describes the *kind* of place (city, town, port, border crossing, warehouse), not whether it's used as an origin or a destination. The same location can be selected as either an origin or a destination during capture; there is no separate origin/destination role flag.
3. Check **This organisation only** if this location should not be visible to other tenants (default: shared/global, same convention as Cargo Types above).
4. Click **Save**.

!!! tip "Route-based reporting"
    Configuring origins and destinations enables the **Tonnage by Route** report, which shows cargo flows between locations.

## Driver and Transporter Management

Drivers and transporters are pre-registered for fast lookup during weighing capture.

Navigate to **Setup > Weighing Metadata**:

- **Transporters** tab: add hauling companies with contact details and portal email (for transporter portal access)
- **Drivers** tab: add drivers with licence number and expiry date
- **Vehicles** tab: register vehicle plates with default tare weight and tare expiry override

## Station Configuration

Each station (physical weighbridge site) has its own configuration. Navigate to **Users & Roles > Stations** (station and user/role management are managed together on this screen, not under Setup):

| Setting | Description |
|---------|-------------|
| **Station name** | Display name in the UI and on tickets |
| **Station code** | Short code for ticket numbering |
| **Address** | Physical location |
| **Operating hours** | Define shift boundaries (start/end time) |
| **Default weighing mode** | `Enforcement` or `Commercial`, **informational and for reporting only**. The mode a station actually operates in is still determined by your organisation's tenant type; this field does not change routing behaviour. |
| **Printer configuration** | Free-text/JSON printer details (name, model, connection), **metadata only today**. TruLoad does not yet drive an 80mm thermal printer directly from this configuration (see [Weight Tickets > Printing](weight-tickets.md#printing)) |
| **Ticket template** | Free-text label for the ticket layout you intend this station to use (commercial or enforcement format) |

## Quality Deduction Rules

When quality deductions are enabled, the system applies deductions based on measured quality parameters:

### Moisture deduction

$$
\text{Moisture Deduction (kg)} = \text{Net Weight} \times \frac{\text{Actual Moisture \%} - \text{Target Moisture \%}}{100}
$$

- Only applied when actual moisture exceeds the target
- Target moisture is configured per cargo type

### Foreign matter deduction

$$
\text{FM Deduction (kg)} = \text{Net Weight} \times \frac{\text{Actual FM \%}}{100}
$$

- Applied when foreign matter exceeds the configured limit
- The full percentage is deducted (not just the excess)

### Adjusted net weight

After all deductions, the system computes:

$$
\text{Adjusted Net (kg)} = \text{Net Weight} - \text{Quality Deduction}
$$

The adjusted net is the billable weight shown on the final ticket.
