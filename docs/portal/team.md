# Team Management

The Transporter Portal supports multi-user access. The account owner can invite colleagues and assign them roles that control what they can see and do in the portal.

## Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — billing, team management, fleet, history, exports |
| **Manager** | Fleet management, weighing history, ticket downloads, reports |
| **Viewer** | Read-only access to weighing history and vehicle list |

The account owner (the user who registered and linked the transporter) always has Admin-level access and cannot be removed by other members.

## Inviting a Team Member

1. Navigate to **Settings > Team**.
2. Click **Invite Member**.
3. Enter their email address and select a role.
4. Click **Send Invite**.

The invited user receives an email with a link to accept the invitation. The link is valid for **7 days**.

!!! note "Invitation prerequisites"
    The invitee must already have a TruLoad Portal account (or create one at registration) before they can accept the invite. The invite acceptance page handles both cases.

## Accepting an Invitation

See [Invite Acceptance](invite.md) for the flow a new team member follows.

## Managing Team Members

Navigate to **Settings > Team** to:

- View all active team members and their roles
- Remove a member (Admin only)
- Re-invite a member whose invitation expired

!!! warning "Only the account owner can remove members"
    Team members with the Admin role can invite others but cannot remove existing members. Only the original account owner (the transporter owner user) can remove team members.

## API Endpoints

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/portal/team` | List active team members | Any |
| `POST` | `/api/v1/portal/team/invite` | Invite a new member by email | Owner only |
| `DELETE` | `/api/v1/portal/team/{userId}` | Remove a team member | Owner only |
| `POST` | `/api/v1/portal/team/accept` | Accept an invitation token | Any authenticated user |

### Invite request body

```json
{
  "email": "colleague@example.com",
  "role": "manager"
}
```

### Accept invite request body

```json
{
  "token": "<64-char hex token from the invite email>"
}
```

## Data Isolation

Team members can only access data for the transporter they are linked to. Weighing history, vehicles, and drivers from other transporters are not visible regardless of role.
