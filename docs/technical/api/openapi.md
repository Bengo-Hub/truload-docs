# OpenAPI Specification

The TruLoad API is documented using the OpenAPI 3.0 specification, providing a machine-readable format for API definition.

## Download OpenAPI Specification

### :material-download: Direct Downloads

=== "Production"
    ```bash
    curl -o truload-openapi.json \
      https://api.truload.example.com/swagger/v1/swagger.json
    ```

=== "Staging"
    ```bash
    curl -o truload-openapi.json \
      https://api-staging.truload.example.com/swagger/v1/swagger.json
    ```

=== "Development"
    ```bash
    curl -o truload-openapi.json \
      https://localhost:7001/swagger/v1/swagger.json
    ```

### :material-github: GitHub Releases

Pre-generated OpenAPI specifications are available as release artifacts:

```bash
# Latest release
wget https://github.com/Bengo-Hub/truload-backend/releases/latest/download/openapi.json

# Specific version
wget https://github.com/Bengo-Hub/truload-backend/releases/download/v1.0.0/openapi.json
```

## Import into Tools

### Postman

#### Method 1: Import from URL

1. Open Postman
2. Click **Import** (top left)
3. Select **Link** tab
4. Enter the OpenAPI URL:
   ```
   https://api.truload.example.com/swagger/v1/swagger.json
   ```
5. Click **Continue**
6. Review import settings
7. Click **Import**

#### Method 2: Import from File

1. Download the OpenAPI JSON file (see above)
2. Open Postman
3. Click **Import**
4. Select **File** tab
5. Drag and drop `truload-openapi.json` or click **Choose Files**
6. Click **Import**

#### Configure Environment

After importing, set up your Postman environment:

1. Click **Environments** (left sidebar)
2. Click **+** to create new environment
3. Name it "TruLoad Production"
4. Add variables:

| Variable | Initial Value | Current Value |
|----------|--------------|---------------|
| `baseUrl` | `https://api.truload.example.com` | `https://api.truload.example.com` |
| `token` | (leave empty) | (your JWT token) |
| `username` | `your-username` | `your-username` |
| `password` | (leave empty) | `your-password` |

5. Click **Save**
6. Select the environment from the dropdown (top right)

#### Get JWT Token

1. Navigate to **Authentication** → **Login**
2. Update request body with your credentials
3. Click **Send**
4. Copy the `token` from the response
5. Open **Environments**
6. Paste token into `token` variable's **Current Value**
7. Click **Save**

All subsequent requests will automatically use this token.

### Insomnia

1. Open Insomnia
2. Click **Create** → **File**
3. Select the downloaded `truload-openapi.json`
4. Choose **OpenAPI 3** as import type
5. Click **Import**

### Swagger Editor

1. Go to [editor.swagger.io](https://editor.swagger.io)
2. Click **File** → **Import URL**
3. Enter: `https://api.truload.example.com/swagger/v1/swagger.json`
4. Click **OK**

### VS Code REST Client

Create a `.http` file in VS Code:

```http
### Variables
@baseUrl = https://api.truload.example.com
@token = your-jwt-token-here

### Login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}

### Start Weighing Session
POST {{baseUrl}}/api/weighing/start
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "registrationNumber": "KDQ123A",
  "axleConfigurationId": 5,
  "bound": "A"
}

### Get Weighing History
GET {{baseUrl}}/api/weighing/history?page=1&pageSize=20
Authorization: Bearer {{token}}
```

## Generate Client SDKs

Use OpenAPI Generator to create client SDKs in your preferred language.

### Install OpenAPI Generator

=== "npm"
    ```bash
    npm install -g @openapitools/openapi-generator-cli
    ```

=== "Homebrew (macOS)"
    ```bash
    brew install openapi-generator
    ```

=== "Docker"
    ```bash
    docker pull openapitools/openapi-generator-cli
    ```

### Generate TypeScript/JavaScript Client

```bash
openapi-generator-cli generate \
  -i https://api.truload.example.com/swagger/v1/swagger.json \
  -g typescript-axios \
  -o ./truload-client-ts \
  --additional-properties=npmName=@truload/api-client,npmVersion=1.0.0
```

### Generate C# Client

```bash
openapi-generator-cli generate \
  -i https://api.truload.example.com/swagger/v1/swagger.json \
  -g csharp-netcore \
  -o ./TruLoad.ApiClient \
  --additional-properties=packageName=TruLoad.ApiClient,targetFramework=net8.0
```

### Generate Python Client

```bash
openapi-generator-cli generate \
  -i https://api.truload.example.com/swagger/v1/swagger.json \
  -g python \
  -o ./truload-client-py \
  --additional-properties=packageName=truload_client,projectName=truload-client
```

### Generate Java Client

```bash
openapi-generator-cli generate \
  -i https://api.truload.example.com/swagger/v1/swagger.json \
  -g java \
  -o ./truload-client-java \
  --additional-properties=artifactId=truload-client,groupId=com.truload,artifactVersion=1.0.0
```

## OpenAPI Specification Structure

The TruLoad OpenAPI specification follows this structure:

```yaml
openapi: 3.0.1
info:
  title: TruLoad API
  version: v1
  description: Intelligent Weighing and Enforcement Solution API
  contact:
    name: TruLoad Support
    email: support@truload.example.com
    url: https://docs.truload.example.com

servers:
  - url: https://api.truload.example.com
    description: Production
  - url: https://api-staging.truload.example.com
    description: Staging
  - url: https://localhost:7001
    description: Development

paths:
  /api/auth/login:
    post:
      tags: [Authentication]
      summary: User login
      description: Authenticate user and return JWT token
      requestBody: ...
      responses: ...
  
  /api/weighing/start:
    post:
      tags: [Weighing]
      summary: Start weighing session
      security:
        - Bearer: []
      requestBody: ...
      responses: ...

components:
  securitySchemes:
    Bearer:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    StartWeighingRequest:
      type: object
      properties:
        registrationNumber:
          type: string
        axleConfigurationId:
          type: integer
        bound:
          type: string
      required:
        - registrationNumber
        - axleConfigurationId
```

## Validation

Validate your OpenAPI specification:

### Using Swagger Editor
1. Go to [editor.swagger.io](https://editor.swagger.io)
2. Import your OpenAPI JSON
3. Check for validation errors in the right panel

### Using OpenAPI CLI

```bash
# Install
npm install -g @apidevtools/swagger-cli

# Validate
swagger-cli validate truload-openapi.json
```

### Using Spectral

```bash
# Install
npm install -g @stoplight/spectral-cli

# Validate
spectral lint truload-openapi.json
```

## CI/CD Integration

### Generate and Publish on Release

Add to your backend CI/CD pipeline:

```yaml
# .github/workflows/release.yml
- name: Generate OpenAPI Spec
  run: |
    dotnet run --project ./truload-backend &
    sleep 10
    curl -o openapi.json http://localhost:8080/swagger/v1/swagger.json
    killall dotnet

- name: Upload OpenAPI Spec
  uses: actions/upload-release-asset@v1
  with:
    upload_url: ${{ steps.create_release.outputs.upload_url }}
    asset_path: ./openapi.json
    asset_name: openapi.json
    asset_content_type: application/json
```

### Automated Client Generation

Generate and publish clients automatically:

```yaml
- name: Generate TypeScript Client
  run: |
    openapi-generator-cli generate \
      -i openapi.json \
      -g typescript-axios \
      -o ./client-ts

- name: Publish to npm
  run: |
    cd client-ts
    npm publish
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Management

Track API versions in the OpenAPI specification:

```json
{
  "info": {
    "version": "1.2.0",
    "x-api-version": "v1",
    "x-changelog": "https://docs.truload.example.com/release-notes/changelog/"
  }
}
```

Access versioned specifications:

- **Latest**: `https://api.truload.example.com/swagger/v1/swagger.json`
- **Specific**: `https://api.truload.example.com/swagger/v1.2.0/swagger.json`

## Additional Resources

- [Swagger UI](swagger.md) - Interactive API explorer
- [API Authentication](authentication.md) - Authentication guide
- [API Reference](index.md) - Complete endpoint documentation
- [OpenAPI Specification](https://spec.openapi.org/oas/v3.0.0) - Official spec
- [OpenAPI Generator](https://openapi-generator.tech) - Client generation tool

## Downloadable Files

| File | Description | Size | Download |
|------|-------------|------|----------|
| **openapi.json** | OpenAPI 3.0 specification | ~250 KB | [:material-download: Download](https://api.truload.example.com/swagger/v1/swagger.json) |
| **openapi.yaml** | YAML format | ~180 KB | [:material-download: Download](https://api.truload.example.com/swagger/v1/swagger.yaml) |
| **postman-collection.json** | Postman collection | ~300 KB | [:material-download: Download](https://github.com/Bengo-Hub/truload-backend/releases/latest/download/postman-collection.json) |

## Support

Need help with the OpenAPI specification?

- :material-email: Email: [api-support@truload.example.com](mailto:api-support@truload.example.com)
- :material-github: GitHub: [github.com/Bengo-Hub/truload/issues](https://github.com/Bengo-Hub/truload/issues)
- :material-chat: Discord: [discord.gg/truload](https://discord.gg/truload)

---

!!! info "Auto-Generated"
    The OpenAPI specification is automatically generated from the backend code using Swashbuckle. Any changes to API endpoints are immediately reflected in the specification.

