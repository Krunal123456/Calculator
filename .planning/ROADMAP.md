# Roadmap: Workspace + Gemini Quote Calculator

## Overview

Deliver a trustworthy quote workflow in dependency order: establish the pricing and catalog contract, let representatives build and compare validated quotes, persist authoritative owner-controlled snapshots, share stable read-only proposals, and finish with PDF export and release verification. The product must remain explicit wherever prices or commercial rules are unconfirmed: unknown selected prices block quote generation, while no catalog value, rate, or formula is inferred to fill a gap.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Trusted Pricing Core** - Establish exact pricing behavior, explicit catalog states, and verified calculation outputs.
- [ ] **Phase 2: Authenticated Quote Wizard & Scenario Preview** - Let representatives enter, resume, and compare validated quote configurations.
- [ ] **Phase 3: Saved Quotes & Owner Management** - Persist server-recomputed snapshots and provide private owner-scoped quote management.
- [ ] **Phase 4: Public Proposals & Soft Expiry** - Share saved proposals through public read-only links that remain viewable after expiry.
- [ ] **Phase 5: PDF Delivery & Release Readiness** - Export snapshot-backed proposals and verify/document the complete v1 workflow.

## Phase Details

### Phase 1: Trusted Pricing Core
**Goal**: Representatives get reproducible customer and partner pricing from explicit catalog and policy inputs, without totals based on unknown values.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PRICE-01, PRICE-02, PRICE-03, PRICE-05, PRICE-07, PRICE-08, PRICE-09
**Success Criteria** (what must be TRUE):
  1. For supported, fully priced inputs, customer per-seat rounding occurs with ROUND_HALF_DOWN before multiplying by seats, partner line totals follow the specified unrounded-per-seat sequence, and golden-fixture and rounding-edge outputs match exactly.
  2. Representatives can obtain the specified Workspace/Gemini annual and averaged monthly totals, scenario seat counts, attainment, and eligible rebates from the pricing contract, using only policy values confirmed and configured for those calculations.
  3. Every catalog SKU/term/currency combination is explicitly known or missing; selecting a missing price prevents a quote total and identifies the SKU and term rather than returning zero, NaN, or an inferred price.
  4. Catalog and pricing tests verify known-versus-missing coverage, the golden fixture, scenario outputs, and rounding edges.
**Plans**: TBD
**Decisions / dependencies**: Obtain authoritative prices and applicable policy inputs before enabling affected calculations. Keep unconfirmed prices, margins, rebates, and policy values explicitly unresolved; never estimate or derive them from another term, currency, or scenario.

### Phase 2: Authenticated Quote Wizard & Scenario Preview
**Goal**: A representative can enter a valid customer quote, compare configured scenarios, and recover the draft while seeing clear pricing and validation feedback.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, WIZ-06, WIZ-07, WIZ-08, PRICE-04, PRICE-06, PRICE-10, DEL-02
**Success Criteria** (what must be TRUE):
  1. A representative can enter the required customer/account details, Workspace rows, Gemini selection, and requested Gemini seats; invalid account IDs and incomplete step data produce associated inline errors and prevent forward navigation.
  2. Current deployment terms (Flexible/1Y/2Y/3Y) remain distinct from the proposed fixed 1Y/2Y/3Y term, eligible Enterprise licenses reflect catalog flags, and the signed-in representative’s SSO email is prefilled and read-only.
  3. A representative can complete the four quote screens and required options modal, compare the exact configured 100%, 50%, 25%, and no-Gemini defaults, and enter manual discounts for unsupported attach rates without an interpolated default.
  4. A valid in-progress draft survives browser refresh; above-cap discounts are visibly warned about in the scenario editor and proposal preview but do not block quote creation.
  5. The workflow is responsive and keyboard-accessible, with labels, visible focus, and programmatic validation errors; proposal amounts can be formatted for USD, EUR, GBP, and INR without implying catalog prices or currency conversion.
**Plans**: TBD
**UI hint**: yes
**Decisions / dependencies**: Google SSO is required for the read-only email identity; confirm whether sign-in is restricted to a partner domain before applying any domain allowlist. Currency display support is not evidence of non-USD catalog pricing. Do not supply defaults for unresolved caps or unsupported attach rates.

### Phase 3: Saved Quotes & Owner Management
**Goal**: Representatives can save authoritative, stable proposals and manage only quotes they own.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: QUOTE-01, QUOTE-02, QUOTE-03
**Success Criteria** (what must be TRUE):
  1. A representative can authenticate with Google SSO, and each saved quote is associated with the authenticated owner rather than a client-supplied identity.
  2. A saved quote persists in PostgreSQL with its inputs, selected scenarios, resolved catalog values and version, computed results, and validity date; later catalog changes do not change that saved proposal.
  3. The owner can view only their own quotes and can edit or duplicate by starting a new quote, while the original saved snapshot remains unchanged.
**Plans**: TBD
**UI hint**: yes
**Decisions / dependencies**: Confirm the Auth.js session/adapter schema and stable internal user mapping. Quote saves must be validated and recomputed server-side; only selected unknown prices block generation, and no unresolved price is substituted.

### Phase 4: Public Proposals & Soft Expiry
**Goal**: A saved proposal can be safely shared with a recipient as a stable, read-only view.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: QUOTE-04, QUOTE-05, QUOTE-06
**Success Criteria** (what must be TRUE):
  1. A saved quote has a unique public link that opens without sign-in, exposes only proposal data intended for the recipient, and offers no quote-editing operation.
  2. The proposal displays customer and partner pricing, per-term discounts and prices, monthly investment, net-to-Google cost, eligible annualized rebates, term, currency, and expiry metadata from the saved snapshot.
  3. After the seven-day validity date, the same link remains viewable and the proposal is visibly marked expired; expiry does not revoke access or recalculate the saved offer.
**Plans**: TBD
**UI hint**: yes
**Decisions / dependencies**: Confirm which customer/account fields may be shown publicly and the timezone/date presentation. Preserve the approved soft-expiry behavior; do not turn validity into link revocation.

### Phase 5: PDF Delivery & Release Readiness
**Goal**: Representatives can deliver a saved proposal as a faithful PDF, and the complete v1 workflow is verifiable and operable without relying on undocumented assumptions.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: DEL-01, DEL-03, DEL-04
**Success Criteria** (what must be TRUE):
  1. A representative can export a saved proposal as a PDF whose proposal content matches the snapshot-backed proposal preview.
  2. Automated checks include pricing unit tests, a Playwright happy-path quote workflow, and CI checks for lint, type errors, and tests.
  3. A developer can follow project setup and environment-variable documentation, find the environment example and seed script, and review three example quotes plus documented catalog/policy update instructions and unresolved business assumptions.
**Plans**: TBD
**UI hint**: yes
**Decisions / dependencies**: Validate PDF generation on the actual deployment target before committing to a renderer; use the specified compatible fallback or isolated renderer only if Chromium feasibility is disproven. Example quotes and seed data must use approved known inputs or be explicitly labeled as non-pricable examples—never fabricated commercial values.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Trusted Pricing Core | 0/TBD | Not started | - |
| 2. Authenticated Quote Wizard & Scenario Preview | 0/TBD | Not started | - |
| 3. Saved Quotes & Owner Management | 0/TBD | Not started | - |
| 4. Public Proposals & Soft Expiry | 0/TBD | Not started | - |
| 5. PDF Delivery & Release Readiness | 0/TBD | Not started | - |
