# Axle Configuration Management - Frontend Integration Guide

## Overview

The TruLoad backend provides comprehensive REST APIs for managing axle configurations and their weight specifications. Axle configurations define the physical structure of vehicles (number of axles, weight limits), while weight references specify permissible weights and classifications for each axle position.

## Architecture

### Data Model Hierarchy

```
AxleConfiguration (parent)
    ├── Axle Code (unique identifier, e.g., "2A", "5*S|DD|DD|")
    ├── Axle Name (display name)
    ├── Axle Number (2-8, total count)
    ├── GVW Permissible (Gross Vehicle Weight limit in kg)
    ├── Legal Framework (EAC, TRAFFIC_ACT, or BOTH)
    ├── Is Standard (true = EAC-defined, false = user-created)
    │
    └── AxleWeightReferences[] (1-to-N relationship)
            ├── Axle Position (1, 2, 3, ... up to AxleNumber)
            ├── Axle Legal Weight (permissible weight in kg for this position)
            ├── Axle Grouping (A, B, C, or D classification)
            ├── Axle Group ID (FK → AxleGroup master data)
            └── Tyre Type ID (FK → TyreType master data, optional)
```

### Key Constraints

1. **Position Uniqueness**: Each AxleConfiguration can have at most one AxleWeightReference per position (1-to-1 mapping per position)
2. **Position Range**: Position must be between 1 and AxleNumber
3. **Weight Bounds**: AxleLegalWeightKg cannot exceed parent GvwPermissibleKg
4. **Grouping Format**: AxleGrouping must be one of: "A", "B", "C", "D"
5. **Code Uniqueness**: AxleCode must be unique across all configurations
6. **Standard Immutability**: Standard configurations (IsStandard=true) cannot be modified or deleted

---

## API Endpoints

### 1. AxleConfiguration Endpoints

#### Get All Configurations
```http
GET /api/v1/AxleConfiguration
Authorization: Bearer {token}

Query Parameters:
  ?isStandard={true|false}     // Filter by standard vs derived
  ?legalFramework={EAC|TRAFFIC_ACT|BOTH}  // Filter by framework
  ?axleCount={2-8}             // Filter by number of axles
  ?includeInactive={true|false} // Default: false
```

**Response**: `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "axleCode": "2A",
    "axleName": "Two Axle A Pattern",
    "description": "Standard two-axle configuration with A pattern",
    "axleNumber": 2,
    "gvwPermissibleKg": 18000,
    "isStandard": true,
    "legalFramework": "BOTH",
    "visualDiagramUrl": null,
    "notes": "Standard EAC configuration",
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "createdByUserId": null,
    "weightReferenceCount": 2
  }
]
```

#### Get Configuration by ID
```http
GET /api/v1/AxleConfiguration/{id}
Authorization: Bearer {token}

Query Parameters:
  ?includeWeightReferences={true|false}  // Default: false
```

**Response**: `200 OK` - Same structure as above

#### Get Configuration by Code
```http
GET /api/v1/AxleConfiguration/by-code/{code}
Authorization: Bearer {token}

Example: GET /api/v1/AxleConfiguration/by-code/2A
```

#### Create Configuration
```http
POST /api/v1/AxleConfiguration
Authorization: Bearer {token}
Content-Type: application/json

{
  "axleCode": "5*CUSTOM",
  "axleName": "Five Axle Custom",
  "description": "User-created custom configuration",
  "axleNumber": 5,
  "gvwPermissibleKg": 45000,
  "legalFramework": "EAC",
  "visualDiagramUrl": "https://example.com/diagrams/5-custom.png",
  "notes": "Custom configuration for special purposes"
}
```

**Response**: `201 Created` - Returns AxleConfigurationResponseDto

**Validation Rules**:
- `axleCode`: Required, 1-50 chars, alphanumeric + `*||-` only
- `axleName`: Required, 1-100 chars
- `axleNumber`: Required, 2-8 range
- `gvwPermissibleKg`: Required, 1-50,000 kg range
- `legalFramework`: Optional, must be EAC|TRAFFIC_ACT|BOTH (default: BOTH)

**Error Codes**:
- `400 Bad Request`: Validation failed (see errors array)
- `409 Conflict`: Code already exists

#### Update Configuration
```http
PUT /api/v1/AxleConfiguration/{id}
Authorization: Bearer {token}
Content-Type: application/json
Requires: Admin or Station Manager role

{
  "axleName": "Updated Name",
  "description": "Updated description",
  "gvwPermissibleKg": 50000,
  "legalFramework": "TRAFFIC_ACT",
  "visualDiagramUrl": "https://example.com/diagrams/updated.png",
  "notes": "Updated notes"
}
```

**Response**: `200 OK` - Returns updated AxleConfigurationResponseDto

**Note**: Cannot update AxleCode or IsStandard; cannot modify standard configurations

#### Delete Configuration (Soft Delete)
```http
DELETE /api/v1/AxleConfiguration/{id}
Authorization: Bearer {token}
Requires: Admin or Station Manager role
```

**Response**: `204 No Content`

**Note**: Standard configurations cannot be deleted

#### Get Legal Frameworks Lookup
```http
GET /api/v1/AxleConfiguration/lookup/legal-frameworks
```

**Response**: `200 OK`
```json
["EAC", "TRAFFIC_ACT", "BOTH"]
```

#### Get Configuration-Specific Lookup Data
```http
GET /api/v1/AxleConfiguration/{id}/lookup
Authorization: Bearer {token}

Returns available tyre types, axle groups, and valid positions for this configuration
```

**Response**: `200 OK`
```json
{
  "configuration": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "axleCode": "2A",
    "axleName": "Two Axle A Pattern",
    "axleNumber": 2,
    "gvwPermissibleKg": 18000,
    "legalFramework": "BOTH"
  },
  "tyreTypes": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "code": "S",
      "name": "Single Tyre",
      "typicalMaxWeightKg": 7500,
      "description": "One tyre per axle end"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "code": "D",
      "name": "Dual Tyres",
      "typicalMaxWeightKg": 10000,
      "description": "Two tyres per axle end"
    }
  ],
  "axleGroups": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440001",
      "code": "S1",
      "name": "Single Axle Front",
      "typicalWeightKg": 6000,
      "description": "Front single axle with 6t limit"
    }
  ],
  "axleGroupings": ["A", "B", "C", "D"],
  "axlePositions": [1, 2]
}
```

---

### 2. AxleWeightReference Endpoints

#### Get Weight Reference by ID
```http
GET /api/v1/AxleWeightReferences/{id}
Authorization: Bearer {token}
```

**Response**: `200 OK`
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "axleConfigurationId": "550e8400-e29b-41d4-a716-446655440000",
  "axlePosition": 1,
  "axleLegalWeightKg": 6000,
  "axleGrouping": "A",
  "axleGroupId": "770e8400-e29b-41d4-a716-446655440001",
  "axleGroupCode": "S1",
  "axleGroupName": "Single Axle Front",
  "tyreTypeId": "660e8400-e29b-41d4-a716-446655440001",
  "tyreTypeCode": "S",
  "tyreTypeName": "Single Tyre",
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### Get All Weight References for Configuration
```http
GET /api/v1/AxleWeightReferences/by-configuration/{configurationId}
Authorization: Bearer {token}

Returns all weight references ordered by axle position
```

**Response**: `200 OK` - Array of AxleWeightReferenceResponseDto objects

#### Create Weight Reference
```http
POST /api/v1/AxleWeightReferences
Authorization: Bearer {token}
Content-Type: application/json
Requires: Admin or Station Manager role

{
  "axleConfigurationId": "550e8400-e29b-41d4-a716-446655440000",
  "axlePosition": 1,
  "axleLegalWeightKg": 6000,
  "axleGrouping": "A",
  "axleGroupId": "770e8400-e29b-41d4-a716-446655440001",
  "tyreTypeId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response**: `201 Created` - Returns AxleWeightReferenceResponseDto

**Validation Rules**:
- `axleConfigurationId`: Required, must be valid GUID and exist
- `axlePosition`: Required, 1-8 range, must not exceed AxleNumber, must be unique per config
- `axleLegalWeightKg`: Required, > 0, ≤ 15,000 kg, cannot exceed parent GVW
- `axleGrouping`: Required, must be A|B|C|D
- `axleGroupId`: Required, must exist in AxleGroup master table
- `tyreTypeId`: Optional, if provided must exist in TyreType master table

**Error Codes**:
- `400 Bad Request`: Validation failed (see errors array)
- `404 Not Found`: Configuration not found
- `409 Conflict`: Position already exists for this configuration

#### Update Weight Reference
```http
PUT /api/v1/AxleWeightReferences/{id}
Authorization: Bearer {token}
Content-Type: application/json
Requires: Admin or Station Manager role

{
  "axlePosition": 1,
  "axleLegalWeightKg": 7000,
  "axleGrouping": "A",
  "axleGroupId": "770e8400-e29b-41d4-a716-446655440001",
  "tyreTypeId": "660e8400-e29b-41d4-a716-446655440002",
  "isActive": true
}
```

**Response**: `200 OK` - Returns updated AxleWeightReferenceResponseDto

#### Delete Weight Reference
```http
DELETE /api/v1/AxleWeightReferences/{id}
Authorization: Bearer {token}
Requires: Admin or Station Manager role
```

**Response**: `204 No Content`

---

## Frontend Implementation Examples

### Example 1: Loading Configuration Form

```typescript
// 1. Get configuration details
const config = await fetch(
  `/api/v1/AxleConfiguration/${configId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// 2. Get lookup data (tyre types, axle groups, positions)
const lookupData = await fetch(
  `/api/v1/AxleConfiguration/${configId}/lookup`,
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// 3. Get existing weight references
const weightRefs = await fetch(
  `/api/v1/AxleWeightReferences/by-configuration/${configId}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
).then(r => r.json());

// 4. Populate dropdowns
populateDropdowns({
  tyreTypes: lookupData.tyreTypes,
  axleGroups: lookupData.axleGroups,
  axleGroupings: lookupData.axleGroupings,  // ["A", "B", "C", "D"]
  availablePositions: lookupData.axlePositions  // [1, 2, ...]
});
```

### Example 2: Adding Weight Reference (as in the image)

```typescript
const formData = {
  axleConfigurationId: selectedConfig.id,
  axlePosition: parseInt(formInput.deckPosition),
  axleLegalWeightKg: parseInt(formInput.permissibleAxleKg),
  axleGrouping: formInput.permissibleGrouping,  // Selected from [A, B, C, D]
  axleGroupId: formInput.axleGroupId,           // Selected from dropdown
  tyreTypeId: formInput.tyreTypeId               // Selected from dropdown (optional)
};

const response = await fetch('/api/v1/AxleWeightReferences', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(formData)
});

if (response.status === 201) {
  const newRef = await response.json();
  updateWeightReferencesList(newRef);
  showSuccessMessage('Weight reference added');
} else if (response.status === 400) {
  const errors = await response.json();
  displayValidationErrors(errors.errors);
} else if (response.status === 409) {
  showErrorMessage('Position already has a weight reference');
}
```

### Example 3: Real-time Validation

```typescript
// Validate position before form submit
async function validatePosition(configId, position) {
  const refs = await fetch(
    `/api/v1/AxleWeightReferences/by-configuration/${configId}`
  ).then(r => r.json());
  
  const positionExists = refs.some(r => r.axlePosition === position);
  if (positionExists) {
    showError(`Position ${position} already has a specification`);
    return false;
  }
  return true;
}

// Validate weight against GVW
function validateWeight(axleWeightKg, gvwLimit) {
  if (axleWeightKg > gvwLimit) {
    showError(`Axle weight cannot exceed GVW limit of ${gvwLimit} kg`);
    return false;
  }
  return true;
}

// Validate position is within axle count
function validatePositionRange(position, axleNumber) {
  if (position < 1 || position > axleNumber) {
    showError(`Position must be between 1 and ${axleNumber}`);
    return false;
  }
  return true;
}
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request - Validation Failed
```json
{
  "message": "Validation failed",
  "errors": [
    "Axle position must be between 1 and 2",
    "Position 1 already has a weight reference",
    "Axle weight (8000 kg) cannot exceed GVW (7000 kg)"
  ]
}
```

#### 404 Not Found
```json
{
  "message": "Axle configuration not found"
}
```

#### 409 Conflict
```json
{
  "message": "Axle code '2A-CUSTOM' already exists"
}
```

#### 401 Unauthorized
```json
{
  "message": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "message": "User does not have permission to perform this action"
}
```

---

## Validation Flow - Backend

All endpoints perform the following validation:

1. **Request-level**: FluentValidation on DTOs (field presence, ranges, formats)
2. **Entity-level**: Business rule validation (position uniqueness, weight bounds, relationships)
3. **Authorization**: Role-based checks (Admin, Station Manager only for create/update/delete)
4. **Relationship checks**: Verify foreign key references exist
5. **Constraint checks**: Verify parent config exists and is compatible

---

## Security & Authorization

### Required Roles

| Operation | Required Role | Standard Config Allowed |
|---|---|---|
| GET all/by-id | Authenticated user | Yes |
| GET by-code | Authenticated user | Yes |
| POST (create) | Admin, Station Manager | No (only derived) |
| PUT (update) | Admin, Station Manager | No (only derived) |
| DELETE | Admin, Station Manager | No (only derived) |

### Important Notes

- **Standard configurations** (IsStandard=true, created_by_user_id=NULL) cannot be modified or deleted
- All endpoints require JWT bearer token in Authorization header
- Token must be valid and not expired
- User roles are checked against permissions defined in the Role table

---

## Performance Considerations

### Caching

- Axle configurations are cached in Redis (24-hour TTL for static, 1-hour for dynamic)
- Tyre types and axle groups cached with 24-hour TTL
- Clear cache after create/update operations

### Pagination

Current API does not support pagination. For large result sets, use filter parameters:
```http
GET /api/v1/AxleConfiguration?axleCount=2&isStandard=true
```

### Load Optimization

```typescript
// BAD: Fetches all relations
GET /api/v1/AxleConfiguration/123?includeWeightReferences=true

// GOOD: Use separate endpoint for weight references
GET /api/v1/AxleWeightReferences/by-configuration/123
```

---

## Testing Checklist

- [ ] Create new configuration with 2-8 axles
- [ ] Add weight references for each position (1 to N)
- [ ] Verify position uniqueness validation
- [ ] Verify weight bounds validation against GVW
- [ ] Test grouping dropdown (A, B, C, D)
- [ ] Test tyre type optional field
- [ ] Update configuration and weight references
- [ ] Delete weight references
- [ ] Soft delete configuration
- [ ] Verify standard configs cannot be modified
- [ ] Test with invalid JWT
- [ ] Test with insufficient role permissions

---

## References

- Backend API: http://localhost:4000/swagger (Swagger UI)
- Database Schema: See erd.md for AxleConfiguration, AxleWeightReference, AxleGroup, TyreType entities
- Audit: All operations logged via AuditMiddleware with user context
