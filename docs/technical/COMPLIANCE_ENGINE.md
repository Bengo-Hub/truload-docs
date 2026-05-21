# Compliance Engine

The compliance engine determines whether a vehicle is overloaded and by how much. It runs for every enforcement weighing transaction that has axle data.

## Overview

The core service is `AxleGroupAggregationService` in `Services/Implementations/Weighing/`. It:

1. Groups individual axle readings into axle groups (A, B, C, D)
2. Calculates the permissible weight for each group
3. Applies regulatory tolerance to each group
4. Calculates total GVW and applies GVW-level tolerance
5. Returns a compliance result with per-group and GVW status

## Axle Group Classification

Axles are grouped by their `AxleGroup` property (assigned during vehicle classification):

| Group | Description |
|-------|-------------|
| A | Steering axle(s) — front |
| B | First drive axle group |
| C | Second drive axle group (if applicable) |
| D | Trailer axle group |

Axles with no group assignment fall through to single-axle treatment.

## Tolerance Precedence

### GVW Tolerance

The GVW tolerance determines whether the total vehicle weight exceeds the permissible limit:

1. **AxleConfiguration.ToleranceKg** — if ≥ 1,000 kg, used as a direct GVW tolerance override for this vehicle class. This is a **GVW-level** override only and does NOT apply to axle group checks.
2. **Act-specific GVW tolerance** — e.g., `EAC_GVW_TOLERANCE` or `TRAFFIC_ACT_GVW_TOLERANCE` from the `Tolerances` table
3. **Standard GVW tolerance** — `STANDARD_LAW_GVW` tolerance from the DB
4. **Strict (0 kg)** — if no tolerance is configured

### Axle Group Tolerance (per group)

Per-group tolerance is calculated by `CalculateGroupToleranceAsync`:

1. **Act-specific axle tolerance** — `AXLE` category tolerance for the current legal framework (e.g., `EAC_AXLE_TOLERANCE = 5%`)
2. **Standard law by axle type**:
   - Single axle (steering or single drive): `STANDARD_LAW_SINGLE` (default 5%)
   - Grouped axles (tandem, tridem, quad): `STANDARD_LAW_GROUP` (default 0%)
3. **Strict (0%)** — if neither is configured

!!! warning "AxleConfiguration.ToleranceKg is GVW-only"
    `AxleConfiguration.ToleranceKg` applies **only** to the GVW compliance check. It does NOT affect per-axle-group tolerance calculations. Axle group tolerances are always governed by regulatory settings in the `Tolerances` table.

## Legal Framework Switching

The legal framework is selected per organisation in Setup > System Config:

| Framework | Code | Notes |
|-----------|------|-------|
| EAC Vehicle Load Control Act 2016 | `EAC` | Regional standard; 5% axle tolerance |
| Kenya Traffic Act | `TRAFFIC_ACT` | Stricter; 0% axle tolerance by default |

The framework is passed as `legalFramework` to all tolerance lookup calls.

## Operational Allowance

Separate from regulatory tolerance, TruLoad supports an **operational allowance** (`operationalToleranceKg`, default 200 kg). This is a practical buffer applied at the station level to account for scale calibration variance. It affects the `WARNING` threshold but not the legal compliance determination.

| Status | Condition |
|--------|-----------|
| `LEGAL` | Overload ≤ 0 kg |
| `WARNING` | 0 < Overload ≤ operationalToleranceKg |
| `OVERLOADED` | Overload > operationalToleranceKg |

## Compliance Result Structure

```json
{
  "gvwWeightKg": 48500,
  "gvwPermissibleKg": 46000,
  "gvwToleranceKg": 2300,
  "gvwEffectiveLimitKg": 48300,
  "gvwOverloadKg": 200,
  "gvwStatus": "WARNING",
  "gvwToleranceDisplay": "5% (EAC Act)",
  "axleGroups": [
    {
      "groupLabel": "A",
      "axleCount": 1,
      "weightKg": 7200,
      "permissibleKg": 7000,
      "toleranceKg": 350,
      "overloadKg": 0,
      "status": "LEGAL"
    }
  ]
}
```

## Caching

`AxleConfiguration` objects are cached in Redis with a 24-hour TTL. Cache is invalidated on `PUT /api/v1/axle-configurations/{id}`. This means tolerance changes to an axle config take effect within 24 hours in production (or immediately after a cache flush).

## Key Files

| File | Purpose |
|------|---------|
| `Services/Implementations/Weighing/AxleGroupAggregationService.cs` | Core compliance logic |
| `Services/Implementations/Weighing/WeighingService.cs` | Enforcement weighing flow |
| `Repositories/Weighing/ToleranceRepository.cs` | DB lookups for regulatory tolerances |
| `Models/Weighing/AxleConfiguration.cs` | Vehicle type definition with GVW limit and ToleranceKg override |
