# Subscription (Feature Tier)

The Transporter Portal does not sell a separate subscription of its own. Your feature tier is
derived from the weighbridge operator(s) you weigh with: when you weigh at a commercial station,
the portal reads that operator's own TruLoad plan and reflects the matching tier back to you on
**Settings > Subscription**. There is nothing to purchase, upgrade, or cancel from the portal
itself.

## How your tier is determined

1. The portal looks at every organisation you have weighed at.
2. It resolves the plan of the organisation you most recently weighed with.
3. Your tier (Basic, Standard, or Premium) and feature flags are derived from that plan's name and
   entitlements.

If you weigh at more than one operator, your tier can change between visits depending on which
operator's plan was checked most recently. This is expected behaviour, not a billing event on your
side.

## What the tier controls

| Area | Effect |
|------|--------|
| Weighing history window | How far back your **Weighings** history and reports go (3/12/24 months depending on tier) |
| Vehicle and driver limits | Soft limits reflected in the dashboard, matching the operator's own plan |
| Feature flags | Multi-site access, data export, driver reports, vehicle trends, API access, analytics, consignment tracking - shown as badges on the Subscription page when enabled |

## If you need a higher tier

Since the tier comes from the weighbridge operator's own plan, there is no in-portal upgrade flow.
If you need access to features your current tier doesn't include:

- Ask the weighbridge operator you work with most to upgrade their own TruLoad plan, or
- Contact your CodeVertex account manager to discuss a dedicated billing arrangement for your
  transporter account.

## Paying for weighing fees

Subscription tier is separate from how you pay for the weighing fees themselves. On the
**Statement** page you can see your running balance, and a weighbridge operator can set your
account to either:

- **Pay per session** - settle the fee at the scale when you weigh, or
- **On account** - fees accrue against a credit limit the operator sets for you. Any unpaid
  invoice appears under **Statement > Outstanding Invoices** with a **Pay Now** button, so you can
  settle it yourself instead of waiting for the operator to chase it up.

An on-account balance at or near its credit limit switches new invoices back to pay-now
automatically until the balance is brought down - the weighing itself is never blocked by this.
