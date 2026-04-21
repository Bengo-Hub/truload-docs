# Setup & Configuration

This guide covers the configuration options specific to commercial weighing operations. For general station setup, user management, and TruConnect installation, see the [enforcement setup guide](../enforcement/setup-rbac-truconnect.md) and [TruConnect installation](../technical/truconnect-install.md) — the process is identical.

## Commercial Settings

Navigate to **Setup > Settings > Commercial** to configure organisation-wide commercial parameters.

| Setting | Description | Default |
|---------|-------------|---------|
| **Weighing fee (KES)** | Per-transaction fee charged for commercial weighing | — |
| **Default tare expiry (days)** | Number of days a stored tare weight remains valid before re-verification is required | 90 |
| **Payment gateway** | Integrated payment provider (read-only; configured by platform admin) | — |

!!! info "Tare expiry"
    When a stored tare expires, the system prevents single-pass operations on the affected vehicle and prompts the operator to capture a fresh tare weight. The tare expiry period can be overridden per vehicle in the tare register.

## Tolerance Settings

Tolerances define the acceptable variance between expected and actual weights. They are configured per cargo type and apply to anomaly detection, not legal compliance (that is the enforcement module's domain).

Navigate to **Setup > Tolerances** to configure:

| Setting | Description | Example |
|---------|-------------|---------|
| **Gross tolerance %** | Acceptable variance on gross weight for flagging | 2.0% |
| **Tare drift threshold** | Maximum difference between stored and measured tare before flagging | 200 kg |
| **Net weight tolerance** | Acceptable variance on net weight for the cargo type | 1.5% |
| **Minimum capture weight** | Weights below this value are rejected as invalid | 500 kg |

!!! info "Tolerances vs. enforcement limits"
    In enforcement mode, tolerances are defined by the Kenya Traffic Act and EAC regulations. In commercial mode, tolerances are business rules set by the site operator. Exceeding a tolerance generates a warning flag on the transaction, not a legal case. Flagged transactions require supervisor approval before the ticket is finalised.

## Cargo Type Configuration

Cargo types determine the commodity-specific rules applied to each transaction.

Navigate to **Setup > Weighing Metadata > Cargo Types**:

| Field | Description |
|-------|-------------|
| **Name** | Display name (e.g., "Maize", "Cement", "Ballast") |
| **Code** | Short code for tickets and reports (e.g., `MZ`, `CM`, `BL`) |
| **Default tolerance** | Override the global tolerance for this cargo type |
| **Moisture target %** | Target moisture content for deduction calculation |
| **Foreign matter limit %** | Threshold above which foreign matter deductions apply |
| **Active** | Enable/disable the cargo type |

### Adding a new cargo type

1. Click **Add Cargo Type**.
2. Fill in the name, code, and tolerance override (leave blank to use the global default).
3. Configure quality parameters if deductions are enabled for this commodity.
4. Click **Save**.

The cargo type is immediately available in the weighing capture screen.

## Origin and Destination Management

Origins and destinations are used for logistics tracking and reporting. They appear on weight tickets and can be filtered in reports.

Navigate to **Setup > Weighing Metadata > Origins/Dest.**:

1. Click **Add Location**.
2. Enter the name, code, country, and location type (Origin / Destination / Both).
3. Click **Save**.

!!! tip "Route-based reporting"
    Configuring origins and destinations enables the **Tonnage by Route** report, which shows cargo flows between locations.

## Driver and Transporter Management

Drivers and transporters are pre-registered for fast lookup during weighing capture.

Navigate to **Setup > Weighing Metadata**:

- **Transporters** tab — add hauling companies with contact details and portal email (for transporter portal access)
- **Drivers** tab — add drivers with licence number and expiry date
- **Vehicles** tab — register vehicle plates with default tare weight and tare expiry override

## Station Configuration

Each station (physical weighbridge site) has its own configuration. Navigate to **Setup > Stations**:

| Setting | Description |
|---------|-------------|
| **Station name** | Display name in the UI and on tickets |
| **Station code** | Short code for ticket numbering |
| **Address** | Physical location |
| **Operating hours** | Define shift boundaries |
| **Default weighing mode** | `Enforcement` or `Commercial` |
| **Printer configuration** | Thermal printer model and connection |
| **Ticket template** | Select the ticket layout (commercial or enforcement format) |

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
