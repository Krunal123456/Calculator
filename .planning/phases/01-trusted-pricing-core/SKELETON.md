# Walking Skeleton — Workspace + Gemini Quote Calculator

**Phase:** 1  
**Generated:** 2026-10-25

## Target Capability — Not Yet Verified

**Status:** Planning contract only. The Walking Skeleton is incomplete until Plan `01-01` passes the production pricing/UI checks and dependent Plan `01-02` passes an actual PostgreSQL write/read-back against an operator-controlled service. The package legitimacy checkpoint and PostgreSQL/DATABASE_URL setup have not been completed. Do not report this capability as implemented or verified before both plans pass.

The intended end-to-end capability is for a representative to open a local Next.js page, enter explicit sample price, discount, and seat inputs, see the result from the shared pure Decimal pricing module, and use a separate development-only Prisma route to write a bounded probe record to PostgreSQL and read the same record back. Plan `01-01` delivers only the pricing/UI slice; Plan `01-02` is a required, blocking dependency for the complete outcome.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15.5.x App Router with strict TypeScript; React 19.x | Matches the locked project stack and supports a minimal routed local app. SUS candidates require individual human package verification before installation. |
| Pricing domain | Framework-independent TypeScript module under `src/lib/pricing/`, using `decimal.js` and decimal-string inputs | The same pure engine is the only pricing authority used by the app and later quote flows. |
| Data layer | PostgreSQL through Prisma ORM v7 and the PostgreSQL adapter | A real database read-write-read is a Phase 1 skeleton requirement; no SQLite or in-memory substitute is acceptable. |
| Database probe | One bounded development-only non-customer record, accessed through a Node-runtime server route | Proves server-side database wiring without introducing quote/customer persistence or a production-open write API. |
| Auth | None in Phase 1; auth approach remains for its later roadmap phase | Authentication is explicitly outside this skeleton's scope; record no auth architecture choice for later phases to inherit. |
| Deployment target | Local development run; no production deployment target selected | `npm run dev` exercises the complete local app. The PostgreSQL smoke path additionally requires operator provisioning and DATABASE_URL. |
| Directory layout | `src/app/` for App Router page/layout/API route; `src/lib/pricing/` for pure pricing; `src/lib/db/` for server-only Prisma; `prisma/` for the probe schema; `scripts/` for the database smoke check | Aligns with project instructions and the research-backed separation; no existing source-code analog was found. |
| Package gate | Verify all nine SUS package names and selected versions individually with a blocking human checkpoint before any install | Research flagged `next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `vitest`, and `vite`. Do not bypass an unsuccessful verification with package substitution. |

## Stack Touched in Phase 1

- [ ] Project scaffold — Next.js, strict TypeScript, and test runner, after the blocking package checkpoint
- [ ] Routing — root App Router page and development-only database route
- [ ] Database — actual Prisma write and read-back against operator-provisioned PostgreSQL
- [ ] UI — one manual-input interaction calling the pure pricing module
- [ ] Deployment/run mode — documented local full-stack run command; no remote production deployment selected

## Local Run and Database Gate

- App: from repository root run `npm run dev`.
  - **Fails when:** the package legitimacy checkpoint has not cleared, the app dependencies are unavailable, or Next.js cannot start the local App Router.
- Database: provide a development-only `DATABASE_URL` through server environment configuration; apply the Prisma schema with `npm exec -- prisma db push`, then run the smoke check directly with `node scripts/db-smoke.mjs` (no package-script registration is required).
  - **Fails when:** no real PostgreSQL endpoint or DATABASE_URL is available, remote-endpoint TLS/SSL requirements are unconfirmed or encrypted transport is not verified, schema push fails, the script cannot be invoked directly with Node, or the write is not read back identically.
- Never commit a database credential or expose it to client code. No substitute database counts as success.

## Pricing and Catalog Contract

- Use Decimal.js for monetary and percentage operations, passing decimal strings.
- Customer per-seat price is rounded to two decimal places using ROUND_HALF_DOWN before multiplication by seats.
- Partner line calculations keep the per-seat amount unrounded and round only at the final line boundary; the not-explicitly-specified final partner rounding details remain flagged for confirmation.
- Each listed SKU × term × currency cell remains explicitly known or missing. Missing selections block only calculations that select them and report the SKU and term.
- Source-listed USD monthly prices are Business Starter Flexible $8.40 / fixed 1Y $7.00; Business Standard Flexible $16.80 / fixed 1Y $14.00; Business Plus Flexible $26.40 / fixed 1Y $22.00. Their 2Y/3Y cells remain explicitly missing: the source's shared fixed-price example is an unresolved assumption, not permission to copy a 1Y value into another term.
- Gemini Business USD fixed 1Y sample price is $21.00 as seen in sample screens; Flexible and fixed 2Y/3Y cells remain missing. Any 2Y/3Y parity with 1Y remains unresolved. Enterprise, Frontline, Archived User, Google Voice, Assured Controls, and Gemini Enterprise prices remain missing where the source marks TODO.
- Every EUR, GBP, and INR price cell remains missing; formatting support is not evidence of catalog pricing or conversion.
- Preserve the complete source SKU inventory: Business Starter/Standard/Plus; Enterprise Starter/Standard/Plus; Frontline Worker Starter/Standard/Plus; Workspace Business Starter/Standard/Plus Archived User; Workspace Enterprise Standard/Plus Archived User; Google Voice Starter/Standard/Plus; Assured Controls Plus; Gemini Business; Gemini Enterprise Standard/Plus. `.planning/phases/01-trusted-pricing-core/01-01-PLAN.md` contains the row-by-row USD term register and the all-term non-USD missing-state rule.
- The golden-fixture values and all sample discount/margin/rebate amounts are regression inputs, not approved production policy. Catalog known/missing state remains distinct from owner-approval state.
- Keep unresolved prices, discount defaults, approval caps, partner margins, rebates, eligibility, and their provenance explicit. The 10% rebate examples remain provisional fixture data.
- Preserve the unresolved per-cell gap for missing flexible/fixed terms, non-USD currencies, Gemini Business flexible price, Gemini Enterprise prices/margins, and all other source-marked TODO rows. Never copy values from a different term or currency.

## Unresolved Probe and Business Assumptions

The following spec-less boundary results remain unresolved; no expected outputs are invented:

| Requirement | Unresolved result |
|---|---|
| PRICE-01 | Boundary (thresholds and one step either side); adjacency (equality/touching); empty/null (empty, single, null input); ordering (stable ties); precision (precision/overflow/rounding contract). |
| PRICE-02 | Boundary and precision. |
| PRICE-03 | Unclassified; manual review required. |
| PRICE-05 | Unclassified; manual review required. |
| PRICE-07 | Boundary and precision. |
| PRICE-08 | Boundary and precision. |
| PRICE-09 | Boundary and precision. |

All 15 probe results remain unresolved, including both unclassified items. Open business inputs include approved catalog sources and cell values, final partner rounding mode/precision, Gemini non-standard seat scaling, discount/cap/margin approvals, rebate percentage/eligibility, and confirmation of the customer-rounding source. Affected calculations cannot be represented as approved until their required inputs are confirmed.

## Out of Scope (Deferred to Later Slices)

- Full multi-screen quote wizard, quote options modal, and quote draft persistence.
- Authentication, identity, and owner-scoped quote management.
- Saved quote/customer persistence or snapshotting; Phase 1 database probe is unrelated to quote data.
- Public proposals, public links, and expiry behavior.
- PDF generation or production deployment.

These boundaries preserve Phase 1's approved scope; they do not authorize changing the chosen stack or substituting data.

## Subsequent Slice Plan

Each later roadmap phase builds on this skeleton while retaining its explicit pricing and server/client boundaries:

- Phase 2: authenticated quote wizard and scenario preview using this pure pricing contract.
- Phase 3: saved quotes and owner management, with stable snapshots in PostgreSQL.
- Phase 4: public read-only proposals with the approved soft-expiry behavior.
- Phase 5: PDF delivery and release readiness.
