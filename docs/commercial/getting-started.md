# Getting Started with Commercial Weighing

This guide walks you through setting up a new commercial weighing site on TruLoad, from tenant creation to your first weigh transaction.

## Prerequisites

Before you begin, ensure you have:

- A TruLoad platform account with **tenant admin** privileges
- At least one weighbridge scale connected via [TruConnect](../technical/truconnect-install.md)
- Network connectivity between the scale workstation and the TruLoad backend

## Tenant Setup

### 1. Create or configure your tenant

Your TruLoad tenant is provisioned by the platform administrator with the **Commercial Weighing** module enabled. Once created, you receive:

- A tenant slug (used in URLs and API calls)
- An admin user account
- Access to the commercial weighing module

!!! info "Multi-site operations"
    If you operate multiple weighbridges, each physical site is configured as a **station** within your tenant. All stations share the same user directory but have independent scale configurations and shift schedules.

### 2. Configure your station

1. Navigate to **Setup > Stations** and create a station for each physical weighbridge location.
2. Set the station name, address, and operating hours.
3. Assign the default cargo types handled at this station.

### 3. Set up users and roles

1. Navigate to **Setup > Accounts** and create user accounts for operators, supervisors, and finance staff.
2. Assign roles:

| Role | Access |
|------|--------|
| **Operator** | Weighing capture, ticket printing |
| **Supervisor** | Weighing review, tolerance approval, tare management, reports |
| **Finance** | Invoice management, payment reconciliation |
| **Admin** | Full access including station setup, commercial settings, and user management |

### 4. Configure TruConnect

Install and configure [TruConnect](../technical/truconnect-install.md) on each workstation connected to a scale. Verify the live weight feed appears in the weighing screen before proceeding.

## Module Configuration

### Commercial settings

Navigate to **Setup > Settings > Commercial** and configure:

| Setting | What to set |
|---------|-------------|
| **Weighing fee (KES)** | Per-transaction fee if applicable |
| **Default tare expiry (days)** | How long stored tare weights remain valid (default: 90 days) |

### Tolerance settings

Navigate to **Setup > Tolerances** and define acceptable weight variances. Transactions that exceed a tolerance are flagged and require supervisor approval before the ticket is finalised. See [Setup & Configuration](setup.md#tolerance-settings) for field details.

### Configure cargo types

Navigate to **Setup > Weighing Metadata > Cargo Types** and define the commodities your site handles:

- Name and code (e.g., Maize / MZ)
- Default tolerance percentage or absolute weight
- Quality parameters (moisture target, foreign matter limit) if deductions are enabled

### Configure origins and destinations

Navigate to **Setup > Weighing Metadata > Origins/Dest.** and add the locations your vehicles travel between. These appear on weight tickets and enable route-based reporting.

### Register drivers and transporters

Navigate to **Setup > Weighing Metadata**:

- **Transporters** — register haulage companies. Enter the portal email address to invite them to the [transporter portal](../portal/index.md).
- **Drivers** — add driver names and licence numbers for fast lookup during capture.
- **Vehicles** — pre-register vehicle plates with known tare weights to enable stored-tare single-pass operations.

## First-Time Checklist

Use this checklist to confirm your site is ready for production weighing:

- [ ] Tenant created and accessible at your assigned URL
- [ ] Commercial weighing module confirmed active (weighing screen shows commercial stepper, not enforcement forms)
- [ ] At least one station configured with correct operating hours
- [ ] Weighing fee and tare expiry set under **Setup > Settings > Commercial**
- [ ] Users created with appropriate roles
- [ ] TruConnect installed, configured, and streaming live weights
- [ ] At least one cargo type configured under **Setup > Weighing Metadata > Cargo Types**
- [ ] Tolerance settings configured under **Setup > Tolerances**
- [ ] Key transporters and drivers registered under **Setup > Weighing Metadata**
- [ ] Test weighing completed end-to-end (capture → first weight → second weight → ticket printed)
- [ ] Transporter portal invitations sent to relevant haulers (if applicable)

## Next Steps

Once your site is configured, proceed to:

- [Two-Pass Weighing](two-pass-weighing.md) to learn the core weighing workflow
- [Tare Management](tare-management.md) to set up stored vehicle tare weights
- [Setup & Configuration](setup.md) for advanced configuration options
- [Reports](reports.md) for available reports and access by role
