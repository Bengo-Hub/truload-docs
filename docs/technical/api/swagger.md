# Swagger UI - Interactive API Explorer

The TruLoad API provides an interactive Swagger UI for exploring and testing API endpoints in real-time.

## Accessing Swagger UI

### Development Environment
```
https://localhost:7001/swagger
```

### Production Environment
```
https://api.truload.example.com/swagger
```

## Features

### :material-book-open: API Documentation
- Complete endpoint documentation
- Request/response schemas
- Parameter descriptions
- Authentication requirements

### :material-test-tube: Interactive Testing
- Try out endpoints directly from the browser
- Automatic request formatting
- Response validation
- Error handling examples

### :material-download: Export Options
- Download OpenAPI specification
- Import into Postman
- Generate client SDKs

## Authentication

All API endpoints (except public health checks) require JWT authentication.

### Step 1: Obtain JWT Token

1. Navigate to the **Authentication** section in Swagger UI
2. Expand the `POST /api/auth/login` endpoint
3. Click **Try it out**
4. Enter your credentials:

```json
{
  "username": "your-username",
  "password": "your-password"
}
```

5. Click **Execute**
6. Copy the `token` from the response

### Step 2: Authorize Requests

1. Click the **Authorize** button at the top of Swagger UI
2. Enter your token in the format: `Bearer {your-token}`
3. Click **Authorize**
4. Click **Close**

All subsequent requests will include the authorization header.

## OpenAPI Specification

### Download OpenAPI JSON

The OpenAPI specification can be downloaded directly:

**Development:**
```bash
curl -o truload-openapi.json https://localhost:7001/swagger/v1/swagger.json
```

**Production:**
```bash
curl -o truload-openapi.json https://api.truload.example.com/swagger/v1/swagger.json
```

### Import into Postman

1. Download the OpenAPI specification (see above)
2. Open Postman
3. Click **Import** (top left)
4. Select **File** tab
5. Choose the downloaded `truload-openapi.json` file
6. Click **Import**

The entire TruLoad API collection will be imported with:
- All endpoints organized by module
- Request examples
- Environment variables
- Authentication setup

### Direct Import URL

Alternatively, import directly from URL:

1. In Postman, click **Import**
2. Select **Link** tab
3. Enter: `https://api.truload.example.com/swagger/v1/swagger.json`
4. Click **Continue** → **Import**

## API Endpoint Categories

### Authentication & Authorization
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/change-password` - Change password

### User Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/roles` - List roles
- `GET /api/shifts` - Manage shifts

### Weighing
- `POST /api/weighing/start` - Start weighing session
- `GET /api/weighing/weight` - Get current weight from TruConnect
- `POST /api/weighing/{id}/take-weight` - Take weight reading
- `POST /api/weighing/{id}/finalize` - Finalize weighing
- `GET /api/weighing/{id}/ticket` - Generate weigh ticket
- `GET /api/weighing/history` - View weighing history

### Prosecution
- `POST /api/prosecution/cases` - Create prosecution case
- `GET /api/prosecution/cases` - List cases
- `GET /api/prosecution/cases/{id}` - Get case details
- `PUT /api/prosecution/cases/{id}` - Update case
- `POST /api/prosecution/cases/{id}/escalate` - Escalate to court
- `GET /api/prosecution/documents/{id}` - Get case documents

### Yard Management
- `GET /api/yard/entries` - List yard entries
- `POST /api/yard/entries` - Add to yard
- `PUT /api/yard/entries/{id}/release` - Release from yard
- `GET /api/yard/prohibition-orders` - List prohibition orders

### Special Release
- `POST /api/special-release` - Create special release
- `GET /api/special-release` - List special releases
- `PUT /api/special-release/{id}/approve` - Approve release

### Reporting
- `GET /api/reports/daily` - Daily reports
- `GET /api/reports/monthly` - Monthly reports
- `GET /api/reports/custom` - Custom reports
- `POST /api/reports/export` - Export reports

### Settings
- `GET /api/settings/stations` - List stations
- `POST /api/settings/stations` - Create station
- `GET /api/settings/cameras` - List cameras
- `GET /api/settings/axle-configurations` - List axle configs
- `GET /api/settings/system` - Get system settings

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Request/Response Examples

### Example: Start Weighing Session

**Request:**
```http
POST /api/weighing/start
Content-Type: application/json
Authorization: Bearer {token}

{
  "registrationNumber": "KDQ123A",
  "axleConfigurationId": 5,
  "bound": "A",
  "cargoType": "Cement",
  "origin": "Nairobi",
  "destination": "Mombasa"
}
```

**Response:**
```json
{
  "id": 12345,
  "registrationNumber": "KDQ123A",
  "sessionStartTime": "2025-10-28T14:30:00Z",
  "status": "InProgress",
  "axleConfiguration": {
    "id": 5,
    "name": "3A",
    "permissibleGvw": 27000,
    "permissibleAxleWeights": [8000, 10000, 10000]
  },
  "bound": "A",
  "stationCode": "ISKA"
}
```

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Not Found",
  "status": 404,
  "detail": "Weighing session not found",
  "instance": "/api/weighing/99999",
  "traceId": "00-abc123-def456-00"
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Successful, no content returned |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Authenticated requests**: 1000 requests per hour per user
- **Public endpoints**: 100 requests per hour per IP

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 2025-10-28T15:00:00Z
```

## Best Practices

### 1. Use Appropriate HTTP Methods
- `GET` - Retrieve data
- `POST` - Create new resources
- `PUT` - Update entire resources
- `PATCH` - Partial updates
- `DELETE` - Remove resources

### 2. Handle Errors Gracefully
Always check response status codes and handle errors appropriately.

### 3. Respect Rate Limits
Implement exponential backoff for rate-limited requests.

### 4. Keep Tokens Secure
Never expose JWT tokens in client-side code or public repositories.

### 5. Use Pagination
For endpoints returning lists, use pagination parameters:
```
GET /api/weighing/history?page=1&pageSize=50
```

## Additional Resources

- [OpenAPI Specification](openapi.md) - Download and import specification
- [API Authentication](authentication.md) - Detailed authentication guide
- [Error Codes](../../support/error-codes.md) - Complete error code reference
- [Postman Collection](https://github.com/Bengo-Hub/truload-api-postman) - Pre-configured Postman collection

## Support

For API-related questions or issues:
- Email: [api-support@truload.example.com](mailto:api-support@truload.example.com)
- GitHub Issues: [github.com/Bengo-Hub/truload/issues](https://github.com/Bengo-Hub/truload/issues)
- API Status: [status.truload.example.com](https://status.truload.example.com)

---

!!! tip "Pro Tip"
    Use the **Try it out** feature in Swagger UI to test endpoints before implementing client code. This helps you understand request/response formats and catch issues early.

