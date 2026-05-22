# Billing & Plans

TruLoad charges organisations a platform subscription fee based on the modules and features enabled for their account. All billing is managed through the TruLoad platform — no billing setup is required per-station or per-operator.

## Platform Subscription

The platform subscription covers access to TruLoad for the organisation as a whole:

- Weighing operations (commercial or enforcement, based on tenant type)
- Reporting and analytics
- User and station management
- API access (if enabled on the plan)
- Transporter Portal access for connected transporters

### Viewing Your Subscription

Navigate to **Setup > Billing** to see:

- Current plan name and status
- Renewal date and payment history
- Active feature entitlements
- Upgrade or downgrade options

### Plan Status

| Status | Meaning |
|--------|---------|
| **Active** | Subscription is current and all features are available |
| **Trial** | Free trial period; full feature access until trial expires |
| **Grace** | Payment failed; 7-day grace period before access is restricted |
| **Suspended** | Access restricted to settings only until outstanding balance is paid |
| **None** | No active subscription — contact the platform administrator |

## Changing Plans

1. Navigate to **Setup > Billing**.
2. Click **Change Plan**.
3. Select the new plan from the list.
4. Upgrades take effect immediately (prorated charge applied).
5. Downgrades take effect at the end of the current billing period.

## Payment Methods

| Method | Supported |
|--------|-----------|
| M-PESA STK push | :material-check: |
| M-PESA paybill | :material-check: |
| Bank transfer | :material-check: |

Invoices are generated automatically and available under **Setup > Billing > History**.

Payment reminders are sent 3 days before the due date.

## Failed Payments

If a payment fails:

1. The account enters a **7-day grace period** with full access maintained.
2. A payment retry is attempted daily during the grace period.
3. If payment is not received within 7 days, the account is suspended (read-only access to settings only).
4. Paying the outstanding balance immediately restores full access.

## Subscription Bypass Modes (Platform Admin)

Certain organisations are exempt from standard subscription enforcement. These bypass modes are configured on the `Organization` record and embedded in JWT tokens, so no Redis or database lookup is needed per request.

### Service-Charge Billing (`billing_mode = "service_charge"`)

Organisations configured for service-charge billing pay per weighing transaction rather than via a platform subscription. The subscription gate is completely bypassed for all requests from these tenants.

**When to use:** Weighbridge operators who have a per-transaction commercial agreement with the platform — typically large government concessions billed via TruLoad Treasury.

**How to configure:**
1. In the admin database, set `Organization.BillingMode = "service_charge"` on the relevant org record.
2. The user must log out and back in to receive a new token with the `billing_mode` claim.

### Demo / Training Orgs (`is_demo = true`)

Demo organisations used for sales demonstrations or staff training bypass all subscription enforcement.

**When to use:** Demo tenants provisioned for sales or onboarding, or internal training orgs that should never hit a paywall.

**How to configure:**
1. Set `Organization.IsDemo = true` on the org record.
2. The user must log out and back in to receive a new token with the `is_demo` claim.

### Non-Commercial Tenants

Tenants whose `TenantType` is not `"CommercialWeighing"` (e.g., enforcement-only operators) are not subject to TruLoad's commercial subscription — enforcement is platform-funded. The `SubscriptionEnforcementMiddleware` passes these tenants through without checking subscriptions-api.

---

## Transporter Portal Subscriptions

Transporters accessing the self-service portal have their own separate subscription (Basic, Standard, or Premium). These are independent of the weighbridge operator's platform subscription.

See [Transporter Portal Subscriptions](../portal/subscriptions.md) for details.

## Contact

For billing queries, plan changes outside the self-service flow, or invoicing issues, contact your TruLoad account manager or the platform administrator.
