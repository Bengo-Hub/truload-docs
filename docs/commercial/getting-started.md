# Getting Started with Commercial Weighing

This guide walks you through setting up a new commercial weighing site on TruLoad, from tenant creation to your first weigh transaction.

## Prerequisites

Before you begin, ensure you have:

- A TruLoad platform account with **tenant admin** privileges
- At least one weighbridge scale connected via [TruConnect](../technical/truconnect-install.md)
- Network connectivity between the scale workstation and the TruLoad backend

## Tenant Setup

### 1. Create or configure your tenant

Your TruLoad tenant is provisioned by the platform administrator. Once created, you receive:

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
| **Supervisor** | Weighing review, tare approval, reports |
| **Finance** | Invoice management, payment reconciliation |
| **Admin** | Full access including station and user setup |

3. Create shift rotations and assign users to shifts.

### 4. Configure TruConnect

Install and configure [TruConnect](../technical/truconnect-install.md) on each workstation connected to a scale. Verify the live weight feed appears in the weighing screen.

## Module Configuration

### Enable commercial weighing features

Navigate to **Setup > System Config** and configure:

- **Weighing mode**: Set to `Commercial` (disables enforcement-specific fields like violation codes)
- **Two-pass default**: Choose whether new transactions default to inbound-first or outbound-first
- **Tare expiry**: Set the number of days before a stored tare weight must be re-verified
- **Quality deductions**: Enable if your operation applies moisture, foreign-matter, or grade deductions

### Configure cargo types

Navigate to **Setup > Cargo Types** and define the commodities your site handles:

- Name and code
- Default tolerance (percentage or absolute weight)
- Quality parameters (if deductions are enabled)
- Associated origin/destination pairs

## First-Time Checklist

Use this checklist to confirm your site is ready for production weighing:

- [ ] Tenant created and accessible at your assigned URL
- [ ] At least one station configured with correct operating hours
- [ ] Users created with appropriate roles
- [ ] Shift schedule published for the current period
- [ ] TruConnect installed, configured, and streaming live weights
- [ ] At least one cargo type configured
- [ ] Tolerances and quality deduction rules set (if applicable)
- [ ] Test weighing completed end-to-end (capture, ticket, report)
- [ ] Transporter portal invitations sent (if applicable)

## Next Steps

Once your site is configured, proceed to:

- [Two-Pass Weighing](two-pass-weighing.md) to learn the core weighing workflow
- [Tare Management](tare-management.md) to set up stored vehicle tare weights
- [Setup & Configuration](setup.md) for advanced configuration options
