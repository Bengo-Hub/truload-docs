# Setup & Configuration

This guide covers the configuration options specific to commercial weighing operations. For general station setup, user management, and TruConnect installation, see the [enforcement setup guide](../enforcement/setup-rbac-truconnect.md) and [TruConnect installation](../technical/truconnect-install.md) -- the process is identical.

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
    In enforcement mode, tolerances are defined by the Kenya Traffic Act and EAC regulations. In commercial mode, tolerances are business rules set by the site operator. Exceeding a tolerance generates a warning, not a legal case.

## Cargo Type Configuration

Cargo types determine the commodity-specific rules applied to each transaction.

Navigate to **Setup > Cargo Types**:

| Field | Description |
|-------|-------------|
| **Name** | Display name (e.g., "Maize", "Cement", "Ballast") |
| **Code** | Short code for tickets and reports (e.g., `MZ`, `CM`, `BL`) |
| **Default tolerance** | Override the global tolerance for this cargo type |
| **Moisture target %** | Target moisture content for deduction calculation |
| **Foreign matter limit %** | Threshold above which foreign matter deductions apply |
| **Grade rules** | Quality grade definitions and associated weight adjustments |
| **Active** | Enable/disable the cargo type |

### Adding a new cargo type

1. Click **Add Cargo Type**.
2. Fill in the name, code, and tolerance.
3. Configure quality parameters if deductions are enabled.
4. Click **Save**.
5. The cargo type is immediately available in the weighing capture screen.

## Origin and Destination Management

Origins and destinations are used for logistics tracking and reporting. They appear on weight tickets and can be filtered in reports.

Navigate to **Setup > Origins / Destinations**:

1. Click **Add Origin** or **Add Destination**.
2. Enter the name and optional code.
3. Assign to one or more cargo types (or leave as "all").
4. Click **Save**.

!!! tip "Route-based reporting"
    Configuring origins and destinations enables the **Tonnage by Route** report, which shows cargo flows between locations.

## Station Configuration

Each station (physical weighbridge site) has its own configuration:

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

### Grade adjustment

Grade adjustments are configured as percentage multipliers:

| Grade | Adjustment |
|-------|-----------|
| Grade 1 | 100% (no adjustment) |
| Grade 2 | 98% |
| Grade 3 | 95% |
| Reject | 0% (transaction flagged for supervisor review) |

## System Defaults

Navigate to **Setup > System Config** for global settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Tare validity (days) | How long a stored tare remains valid | 90 |
| Tare grace period (days) | Days past expiry before hard-blocking single-pass | 7 |
| Auto-store tare | Automatically save measured tare weights | Enabled |
| Require driver ID | Make driver identification mandatory on tickets | Disabled |
| Two-pass default direction | Default weighing direction for new transactions | Inbound |
| Ticket auto-print | Automatically print ticket on transaction completion | Enabled |
