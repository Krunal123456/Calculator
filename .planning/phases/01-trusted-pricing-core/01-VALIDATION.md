---
phase: "01"
slug: "trusted-pricing-core"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-25"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (candidate version requires human verification before install) |
| **Config file** | `vitest.config.ts` (create during scaffold) |
| **Quick run command** | `npm exec -- vitest run` |
| **Full suite command** | `npm exec -- vitest run && npm exec -- tsc --noEmit && npm exec -- next build` |
| **Estimated runtime** | Establish after initial scaffold |

## Sampling Rate

- **After every task commit:** Run the focused Vitest test(s) for changed pricing behavior.
- **After every plan wave:** Run the full pricing suite and strict TypeScript check.
- **Before `/gsd-verify-work`:** Full suite must be green; run the PostgreSQL read/write/read-back check when `DATABASE_URL` is configured.
- **Max feedback latency:** Establish after initial scaffold.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PRICE-01 | — | Pure pricing module has no framework, network, or database imports | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | PRICE-02 | — | Customer unit price uses ROUND_HALF_DOWN before seat multiplication; partner line rounds only at final boundary | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | PRICE-03 | T-01-01 | Outputs match the golden fixture and all four supplied scenario values | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | PRICE-05 | T-01-01 | Policy and catalog configuration are explicit inputs; provisional fixtures are not production approvals | contract | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | PRICE-07 | T-01-01 | Selecting an unpriced SKU/term returns a named missing-price error and no numeric total | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | PRICE-08 | T-01-01 | Each catalog price cell is explicitly known or missing; no ratio or term inference occurs | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-07 | 01 | 1 | PRICE-09 | — | Catalog coverage, golden fixture, scenario outputs, and rounding boundaries are exercised | unit | `npm exec -- vitest run` | ❌ W0 | ⬜ pending |
| 01-01-08 | 01 | 1 | PRICE-01 | — | App shell builds and a real interactive pricing path calls the shared engine | integration | `npm exec -- next build` | ❌ W0 | ⬜ pending |
| 01-01-09 | 01 | 1 | PRICE-01 | T-01-02 | Database probe writes a bounded record and reads it back using a real configured PostgreSQL service | integration | `npm run db:smoke` | ❌ W0 | ⬜ pending |

## Wave 0 Requirements

- [ ] `package.json`, lockfile, strict TypeScript config, Next.js app shell, and Vitest config — establish only after human verification of dependencies flagged by Phase 1 research.
- [ ] `src/lib/pricing/` domain module plus fixtures and Vitest tests for PRICE-01 through PRICE-09.
- [ ] Minimal Prisma schema/migration and server-only database probe; never expose credentials in client code.
- [ ] One manual-input UI path wired to the pricing module, separate from the future multi-step quote wizard.
- [ ] Operator-provided PostgreSQL endpoint and `DATABASE_URL` — required to complete real database read/write validation; do not replace with an in-memory database.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Package legitimacy checkpoint | PRICE-01, PRICE-09 | Research flagged recent candidates for Next.js/React, Prisma/PostgreSQL, Vitest/Vite as SUS; the automated legitimacy gate requires human verification before installation. | Inspect the exact package names and selected versions against official package owners/releases; approve or choose verified versions before running install commands. |
| Real PostgreSQL provisioned endpoint | PRICE-01 | No PostgreSQL endpoint or `DATABASE_URL` was available during research. | Supply a development-only PostgreSQL URL through environment configuration, apply the migration, run `npm run db:smoke`, and confirm a successful write followed by read-back. |
| Commercial signoff | PRICE-03, PRICE-05 | Golden values and several discount, margin, rebate, and price inputs are examples or explicitly unresolved. | Confirm the authoritative price list and policy owner’s approval before treating example inputs as production configuration; keep unconfirmed cells missing. |

## Validation Sign-Off

- [ ] All plan tasks have automated verification or an explicit Wave 0 dependency.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test and environment references.
- [ ] No watch-mode flags are used in verification commands.
- [ ] `nyquist_compliant: true` set in frontmatter after implementation and validation.

**Approval:** Pending
