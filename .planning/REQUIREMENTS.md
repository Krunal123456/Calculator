# Requirements: Workspace + Gemini Quote Calculator

**Defined:** 2026-10-25
**Core Value:** Reps can produce a trustworthy, scenario-based Workspace + Gemini quote with transparent pricing math and without guessing at unconfirmed prices.

## v1 Requirements

### Customer and Wizard

- [ ] **WIZ-01**: A representative can enter customer domain, account ID, currency, country, quote language, new-business status, and resold status; the account ID is validated against `^001[A-Za-z0-9]{15}$`.
- [ ] **WIZ-02**: A signed-in representative sees their SSO email prefilled and read-only in the quote wizard.
- [ ] **WIZ-03**: A representative can add and remove current Workspace SKU rows and enter each row's term, license count, customer discount, and partner discount when applicable.
- [ ] **WIZ-04**: A representative can select a Gemini edition and optionally specify the customer-requested Gemini seat count.
- [ ] **WIZ-05**: The wizard distinguishes the current deployment's Flexible/1Y/2Y/3Y term from the proposed fixed 1Y/2Y/3Y contract term.
- [ ] **WIZ-06**: A representative can navigate the four quote screens and required quote-options modal, with step validation, inline errors, and navigation disabled until required data is valid.
- [ ] **WIZ-07**: A representative can recover a valid in-progress quote draft after refreshing the browser.
- [ ] **WIZ-08**: The current Workspace configuration displays total eligible Google Enterprise licenses using catalog eligibility flags.

### Pricing and Policy

- [ ] **PRICE-01**: A framework-independent pricing module uses Decimal arithmetic for all monetary and percentage calculations.
- [ ] **PRICE-02**: Customer per-seat prices round to two decimal places using ROUND_HALF_DOWN before multiplying by seats; partner line totals follow the specified unrounded-per-seat calculation and final rounding.
- [ ] **PRICE-03**: The pricing engine calculates Workspace annual and averaged monthly totals, Gemini compounded discounts and seats, customer investment, partner costs, attainment, and eligible rebates according to the supplied rules.
- [ ] **PRICE-04**: The 100%, 50%, 25%, and no-Gemini scenarios use exact configured defaults; unsupported attach rates do not interpolate defaults and require manual discount entry.
- [ ] **PRICE-05**: Discount defaults, approval caps, partner margins, rebate percentages, and SKU eligibility are supplied by configuration rather than UI components.
- [ ] **PRICE-06**: Discounts exceeding configured approval caps produce visible warnings in the scenario editor and proposal preview without blocking quote creation.
- [ ] **PRICE-07**: Selecting a SKU/term with an unknown catalog price blocks quote creation and identifies the missing SKU and term; unknown prices are never represented as zero or NaN.
- [ ] **PRICE-08**: The catalog stores separate explicit flexible and fixed-term prices and does not infer one term's price from another term or a percentage ratio.
- [ ] **PRICE-09**: Unit tests cover catalog completeness as explicit known-or-missing entries, the supplied golden fixture, and the scenario outputs and rounding edge cases.
- [ ] **PRICE-10**: Customer proposal amounts can be formatted for USD, EUR, GBP, and INR without treating display support as evidence of non-USD catalog prices.

### Quotes, Identity, and Sharing

- [ ] **QUOTE-01**: A representative can authenticate with Google SSO and saved quotes are associated with the signed-in owner.
- [ ] **QUOTE-02**: A saved quote persists in PostgreSQL and snapshots its inputs, selected scenarios, resolved catalog values/version, computed results, and validity date so later catalog changes do not alter it.
- [ ] **QUOTE-03**: A representative can view and manage only their own quotes in the owner dashboard and can edit or duplicate a quote.
- [ ] **QUOTE-04**: A saved proposal receives a unique public read-only link that can be viewed without signing in and does not expose quote-editing operations.
- [ ] **QUOTE-05**: A quote remains viewable through its public link after the seven-day validity date and is visibly marked expired rather than having access disabled.
- [ ] **QUOTE-06**: The proposal preview presents customer and partner pricing, per-term discounts and prices, monthly investment, net-to-Google cost, eligible annualized rebates, term, currency, and expiry metadata from the saved quote data.

### Delivery and Quality

- [ ] **DEL-01**: A representative can export a saved proposal as a PDF whose content matches the proposal preview.
- [ ] **DEL-02**: The quote workflow is responsive and accessible with associated labels, keyboard navigation, visible focus, and programmatic validation errors.
- [ ] **DEL-03**: Automated verification includes pricing unit tests, a Playwright happy-path E2E flow, and CI checks for lint, type errors, and tests.
- [ ] **DEL-04**: Project documentation explains setup, environment variables, catalog and policy updates, and unresolved business assumptions; the repository includes an environment example, seed script, and three example quotes.

## v2 Requirements

No v2 features are committed yet. Team collaboration, approval workflows, CRM pipelines, e-signature, payments, and automated catalog ingestion are deferred unless separately prioritized.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Invented, interpolated, or silently substituted catalog prices | Pricing integrity requires confirmed values; selected unknown values must block quoting. |
| Interpolated default discounts for unsupported attach rates | The sample points are explicitly non-linear and the source prompt requires manual entry for other rates. |
| Hard-expiring public quote links | The chosen behavior is soft expiry; links stay viewable and display expired status. |
| CRM, team collaboration, e-signature, or payments | Not included in the supplied v1 prompt and not needed for the core quoting workflow. |

## Open Business Inputs

These are unresolved commercial inputs, not values the implementation may invent:

- Flexible and fixed prices for Enterprise, Frontline, Archived User, Google Voice, Assured Controls, and Gemini Enterprise SKUs.
- Gemini Business flexible price; whether 2Y and 3Y fixed prices match 1Y for each SKU.
- Currency-specific catalog pricing and whether the USD catalog applies to non-USD quotes.
- Confirmation of the half-down rounding source and owner.
- Gemini partner margins for 1Y/2Y and Gemini Enterprise editions.
- Rebate percentages and eligibility rules; the 10% examples remain provisional.
- Whether non-standard Gemini attach/seat scenarios should keep manual discounts or gain approved defaults.
- Whether the proposal's “Prepared for” value should be a customer name or domain.

## Traceability

Phase mapping is populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WIZ-01–WIZ-08 | Pending | Pending |
| PRICE-01–PRICE-10 | Pending | Pending |
| QUOTE-01–QUOTE-06 | Pending | Pending |
| DEL-01–DEL-04 | Pending | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-10-25*
*Last updated: 2026-10-25 after initial definition*
