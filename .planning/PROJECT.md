# Workspace + Gemini Quote Calculator

## What This Is

A web app for Google Workspace partner and sales representatives to model a customer's current Workspace deployment, configure a proposed contract, compare Gemini attach-rate scenarios, and create a shareable investment proposal. The app will preserve pricing inputs and calculation results with each quote so a saved proposal remains stable when the catalog changes.

## Core Value

Reps can produce a trustworthy, scenario-based Workspace + Gemini quote with transparent pricing math and without guessing at unconfirmed prices.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Representatives can enter customer and current Workspace deployment details in a validated, resumable quote wizard.
- [ ] Representatives can configure contract terms, Gemini attach scenarios, and discounts, with visible warnings for discounts above configured approval caps.
- [ ] A pure pricing engine calculates customer and partner amounts using Decimal arithmetic and the specified half-down rounding rules.
- [ ] Missing catalog prices are explicit; generating a quote with a selected SKU/term whose price is unknown is blocked with a clear error.
- [ ] Representatives can preview, save, and export an investment proposal, with its inputs, catalog version, and computed results snapshotted.
- [ ] Saved quotes have public read-only links; after the offer's seven-day validity date, the link remains viewable and the quote is marked expired.
- [ ] The app meets the specified accessibility, responsive-design, and test requirements.

### Out of Scope

- Estimating, interpolating, or silently substituting any unconfirmed catalog price — quote totals must never imply a price the business has not supplied.
- Inferring a new discount formula between the four specified attach-rate scenarios — non-standard attach rates require manually entered discounts.
- Treating the offer's validity date as a hard access cutoff — the chosen behavior is soft expiry, not link revocation.

## Context

- The project starts from an empty workspace and the supplied build prompt at `quote-calculator-build-prompt.md`.
- The intended users are partner/sales representatives quoting Google Workspace and Gemini deployments.
- The supplied prompt defines a four-screen workflow, a quote-options modal, a catalog, a pricing engine, saved quotes, Google SSO, and PDF export.
- The required stack is Next.js 15 App Router, strict TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, Zustand, Decimal.js, Prisma with PostgreSQL, Auth.js Google SSO, Playwright/Puppeteer PDF export, Vitest, and Playwright E2E.
- The golden pricing fixture and scenario examples in the supplied prompt are the behavioral reference for pricing calculations.
- The source prompt identifies internal prices and several business rules as unresolved. These must remain explicit configuration gaps, not be invented. In particular, known Workspace prices are limited to Business Starter, Standard, and Plus; Gemini Business has a specified fixed price but no flexible price; many other listed SKUs and terms are TODO.
- The input prompt also calls for a catalog completeness test while listing intentionally unpriced catalog entries. Validation must reconcile this by asserting that missing values are represented explicitly and block quoting, rather than allowing unknown values to become zero or NaN.

## Constraints

- **Tech stack**: Use the versions and libraries specified in the source prompt unless a verified blocker requires a change.
- **Pricing correctness**: Use Decimal.js for all monetary and percentage calculations; customer per-seat prices round to two decimals with ROUND_HALF_DOWN before multiplying by seats.
- **Catalog integrity**: Store flexible and fixed-term prices explicitly per term; never derive missing prices or currencies from a ratio or another currency.
- **Business policy**: Keep discount defaults, caps, rebates, and catalog values in configuration rather than UI components.
- **Quote stability**: Save the catalog version, inputs, scenarios, and computed results with each quote.
- **Sharing**: Quote URLs are public read-only links; the seven-day validity date is informational and does not disable link access.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep the full listed SKU catalog and block quote creation when a selected price is missing | The build prompt requires the complete SKU list, prohibits invented prices, and specifies a clear missing-price error | — Pending |
| Public quote links remain viewable after the seven-day offer-validity date, with expired status shown | A soft expiry preserves shareability while communicating that the offer is no longer current | — Pending |
| Keep pricing logic framework-free in `src/lib/pricing/` and use Decimal.js | Pricing must be independently testable and reproduce the golden fixture exactly | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-25 after initialization*
