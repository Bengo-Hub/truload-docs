# OpenAPI

The backend serves its OpenAPI 3 document on every environment.

<a class="md-button md-button--primary" href="https://kuraweighapitest.masterspace.co.ke/v1/docs/v1/swagger.json">:material-download: Test host</a>
<a class="md-button" href="https://truloadapi.codevertexitsolutions.com/v1/docs/v1/swagger.json">:material-download: Production</a>

## Uses

- Import into Postman or Insomnia for exploratory testing.
- Generate typed clients with OpenAPI Generator.
- Diff against the previous release to flag breaking contract changes.

## Contract governance

Before cutting a backend release:

1. Export the current spec.
2. Diff against the spec archived with the last approved release.
3. Flag removed fields or endpoints as breaking.
4. Align frontend callers before deploy.
5. Archive the new spec alongside the release tag.

## See also

- [Swagger UI](swagger.md) · [live Swagger (test)](https://kuraweighapitest.masterspace.co.ke/v1/docs/index.html)
