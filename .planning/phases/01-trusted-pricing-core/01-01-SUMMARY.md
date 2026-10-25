---
phase: 01-trusted-pricing-core
plan: 01
status: complete
completed: 2026-10-25
requirements:
  - PRICE-01
  - PRICE-02
  - PRICE-03
  - PRICE-05
  - PRICE-07
  - PRICE-08
  - PRICE-09
commit: 0a1c9b4
---

# Plan 01-01 Summary: Trusted Pricing Slice

## Delivered

- Created a Next.js 15 app shell with an accessible manual price, discount, and seat-count interaction wired to the shared Decimal pricing function.
- Added a framework-independent pricing engine using decimal-string inputs. Customer unit prices use `ROUND_HALF_DOWN` before seat multiplication; partner line calculations preserve the unrounded per-seat value until final output formatting.
- Added Workspace annual-price averaging, compounded Gemini discounts, ceiling-based attach-rate seats, partner attainment, fixture rebate calculations, approval-cap warnings, and the requested 100% custom-seat anchor.
- Added a complete 21-SKU x 4-term x 4-currency catalog grid (336 cells). Only the seven exact USD source cells are known; all others remain explicitly missing, and the known prices remain unconfirmed.
- Added scenario-policy and golden-fixture modules. Example prices, discounts, caps, partner discounts, and rebates remain explicitly provisional and are not represented as production approvals.
- Added test coverage for catalog completeness, both sourced half-down ties, malformed and bounded inputs, the golden fixture, all four scenario totals, missing prices, partner precision, custom Gemini seats, provisional cap warnings, and rebate eligibility.
- Added React and Node type packages after individual user approval. Added the TypeScript build cache pattern to `.gitignore`.

## Verification

- `npm exec -- vitest run` — 19 tests passed.
- `npm exec -- tsc --noEmit` — passed.
- `npm exec -- next build` — passed.
- Browser verification — entered `$7.00`, `42.5%`, and `100` seats and observed `$4.02` per seat and `$402.00` total.
- `git diff --check` — passed.

## Boundaries and Remaining Work

- The sample catalog and commercial policy values remain unapproved. Missing SKU/term/currency prices have not been inferred.
- All 15 unresolved pricing probes remain unresolved; no outcomes were assigned to the unclassified PRICE-03/PRICE-05 probes.
- Plan 01-01 completes only the pricing/UI slice. Plan 01-02 remains blocked until an operator supplies a real development PostgreSQL endpoint and server-side `DATABASE_URL`; no mock or in-memory substitute was used.
