# Swagger UI

Swagger exposes every backend endpoint with request/response schemas and
an in-browser "Try it out" button.

<a class="md-button md-button--primary" href="https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html">:material-open-in-new: Open live Swagger (test)</a>
<a class="md-button" href="https://truloadapi.codevertexitsolutions.com/v1/docs/index.html">:material-open-in-new: Open live Swagger (production)</a>

## URLs

- Local: `http://localhost:4000/v1/docs/index.html`
- Test: <https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html>
- Production: <https://truloadapi.codevertexitsolutions.com/v1/docs/index.html>

## Authorising a request

1. Call `POST /api/v1/auth/login` with a valid account.
2. Copy the `accessToken` from the response.
3. Click **Authorize** at the top of Swagger.
4. Enter `Bearer <token>` and confirm.

## Endpoint exploration order

1. `auth/login` — token issuance
2. `weighing/*` — capture and decision
3. `cases/*`, `prosecution/*` — workflow continuity
4. `invoices/*`, `receipts/*` — financial flow
5. `payments/callback/*`, `webhook/*` — integration handling

## See also

- [OpenAPI](openapi.md)
