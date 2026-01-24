# TruLoad Strategy Summary: Weighing & Prosecution

## Overview
This document summarizes the results of the "KenloadV2 vs. TruLoad" audit and defines the strategic path forward for the Weighing and Prosecution modules.

## 1. Compliance Gap Analysis
| Area | KenloadV2 Status | TruLoad Initial Status | **TruLoad Refined Strategy** |
| :--- | :--- | :--- | :--- |
| **Axle Grouping** | Validates individual axles but aggregates visually. | **Logic Gap Identified**: Missing group logic in initial plan. | **Implemented**: Backend `WeighingService` now aggregates groups (A-D) and applies 5% tolerance logic per group. |
| **Fee Calculation** | Hardcoded logic in controllers. | **Logic Gap Identified**: `FeeUsd` field was 0. | **Implemented**: Unified `AxleOverloadFeeSchedule` table handling generic fee tiers. Logic updated to calculate fee per group. |
| **Pavement Damage** | Calculated but visually hidden. | **Missing**: PDF field missing. | **Implemented**: `PavementDamageFactor` added to `WeighingAxle` model. Real-time calculation using 4th Power Law. |
| **Visual Interface** | Split tables (Group vs Axle) causes cognitive load. | **Undefined**: Initial specs vague. | **Defined**: "Dual Compliance View" in [WEIGHING_SCREEN_SPECIFICATION.md](../truload-frontend/docs/WEIGHING_SCREEN_SPECIFICATION.md). Unified hierarchical grid. |

## 2. The "Superior Approach"
TruLoad improves upon KenloadV2 by:
1.  **Unified Data Model**: Storing `AxleType`, `Spacing`, and `PDF` directly on the `WeighingAxle` entity (snapshot) rather than recalculating on read. This ensures historical immutability of legal/fee state.
2.  **Hierarchical UX**: The new Weighing Screen (Screen 3) presents a "Tree View" (Group -> Axle) rather than disjointed tables. This makes the "5% Group Tolerance" rule visually intuitive.
3.  **Real-Time Feedback**: Drivers/Officers see "Traffic Act Tolerance" warnings instantly via color-coded badges (Yellow = within tolerance, Red = Violation).

## 3. Documentation Updates
*   **Backend Plan**: Updated to reflect that Axle Grouping & Fee logic is `IMPLEMENTED`.
*   **Frontend Plan**: Updated to reference the new `WEIGHING_SCREEN_SPECIFICATION.md`.
*   **ERD**: Validated as consistent with the new strategy (support for PDF, Fees, and Grouping exists).

## 4. Next Steps
1.  **Frontend Implementation**: Build `WeighingScreen` components following the new spec.
2.  **Seed Data**: Populate `axle_overload_fee_schedules` with 2026/2027 fee structures.
3.  **Verification**: Run end-to-end test of "Weighing -> Compliance Check -> Fee Calculation" flow.
