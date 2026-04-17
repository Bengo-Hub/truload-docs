# Auth and Access

## Login procedure

1. Open the official frontend URL in your browser.
2. Confirm that the page title and branding match the expected environment.
3. Enter your assigned email and password.
4. Click `Login`.
5. Wait for redirect to the dashboard.
6. Verify your name, role, and station context.

![Login page](../media/auth/login_page.png)

## Mandatory post-login checks

1. Confirm the correct organization context (`orgSlug`) in the URL.
2. Confirm station context is set to your active duty station.
3. Confirm visible modules match your role scope:
   - Weighing
   - Case Register / Case Management
   - Prosecution
   - Financial (Invoices/Receipts)
   - Reporting
4. Open one module and verify `Create` actions are available where expected.

## Role and permission behavior

- Navigation items are shown or hidden based on JWT claims and backend RBAC policies.
- Action buttons (create, update, approve, close) are disabled/hidden for insufficient permissions.
- Cross-tenant data access is blocked by organization/station scoping.
- Platform-level setup pages are restricted to authorized admin roles.

## Password and session handling

1. Use strong passwords and avoid shared credentials.
2. If login fails repeatedly, stop retrying and request support to avoid lockout.
3. Always log out at end of shift on shared workstations.
4. Re-login when role/station assignments were recently changed.

## API access

Integrators obtain a token against the same `auth/login` endpoint the
frontend uses. Try it live in
[Swagger (test)](https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html),
then send `Authorization: Bearer <token>` on protected endpoints. See
[Swagger UI](../technical/api/swagger.md) for the full endpoint explorer.

## Common access issues and immediate actions

| Issue | Likely cause | Immediate action |
|---|---|---|
| Invalid credentials | Wrong email/password | Re-enter carefully, then request reset if needed |
| Account locked | Too many failed attempts | Contact admin to unlock account |
| Missing modules | Wrong role assignment | Ask admin to verify RBAC role mapping |
| Action buttons missing | Permission gap | Confirm exact permission required with admin |
