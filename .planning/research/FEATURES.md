# Feature Landscape

**Domain:** Partner-facing Google Workspace + Gemini quote calculator  
**Researched:** 2026-10-25  
**Scope authority:** `quote-calculator-build-prompt.md`; `.planning/PROJECT.md` confirms the active requirements and resolves public-link expiry and unknown-price behavior.  
**Confidence:** HIGH for the specified v1 behavior; business inputs explicitly marked unresolved remain configuration gaps.

## Table Stakes

Features users expect. Missing or incorrect behavior would make the quote workflow incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Dependencies / v1 notes |
|---------|--------------|------------|-------------------------|
| Four-step quote creation flow | The rep needs a guided path from customer’s current deployment through configuration, scenario adjustment, and a proposal preview. | High | Implement the prompt’s four screens and quote-options modal. Screen 1 captures rep email (read-only from SSO), customer domain, required validated account ID, currency, country, language, new-business/resold flags, current Workspace SKUs, and Gemini interest. |
| Validated, resumable customer and quote inputs | Reps enter multi-field, multi-screen quote data; losing or accepting invalid inputs undermines usability. | Medium | Use the prescribed form validation and Zustand draft persistence to localStorage. Keep inline errors and disable Next until the current step is valid. The required account ID pattern is `^001[A-Za-z0-9]{15}$`. |
| Workspace and Gemini configuration | A quote must represent current Workspace seats, a proposed fixed-term contract, Gemini seats, and discounts. | High | Current-state term can be Flexible, 1Y, 2Y, or 3Y; proposal term is fixed 1Y/2Y/3Y. Preserve the prompt’s distinctions and catalog eligibility flags. |
| Accurate, transparent pricing | The product’s core value is a quote that does not imply unsupported prices and that matches the supplied pricing examples. | High | Use the specified Decimal-based engine, half-down rounding, per-seat/customer and partner-total rules, rebate eligibility, and golden fixture. Keep pricing logic separate from UI. Do not treat unresolved prices or assumptions as confirmed data. |
| Explicit missing-price validation | Reps must not generate a quote whose selected SKU/term has no confirmed price. | Medium | Block quote creation when a selected price is missing and show `Price missing for {SKU} / {term}`. Represent missing catalog values explicitly (not zero/NaN); test catalog completeness as explicit known-or-missing coverage, not as a requirement to fabricate every price. |
| Scenario comparison with live results | The rep needs to compare attach-rate alternatives before selecting an offer. | High | Present the required 100%, 50%, 25%, and no-Gemini options, with 100% as Anchor and 50%/25% optional by default. Update customer annual price and Workspace/Gemini attainment live. Support the prompt’s specific Gemini seat-count input and use it for the 100% anchor. |
| Editable scenario discounts and approval warnings | Reps need to tune discounts while seeing policy boundaries and consequences. | High | Show year-by-year Workspace discounts and Gemini bundle/Googler discounts as specified; show computed averages/totals. Over-cap discounts trigger red styling and a preview warning, but do not block quote creation. Policy values belong in configuration, not UI components. |
| Proposal preview with pricing detail | A preview is necessary for review before sharing or export. | High | Include proposal metadata, per-scenario customer and partner pricing tables, monthly investment, net-to-Google cost, annualized rebates, and year-one net annual cost. Make any approval warning visible on preview. |
| Shareable read-only proposal | A proposal must be available to its recipient without granting editing access. | Medium | Save the quote and provide a unique `/q/[shortId]` public read-only link. Access is link-based; validity is informational, not an access cutoff. |
| PDF export | A partner-facing investment proposal needs a portable deliverable. | Medium–High | Export the proposal using a print-styled quote page and server-side Playwright/Puppeteer (or the prompt’s PDF fallback). PDF content should reflect the saved quote snapshot. |
| Google SSO and quote ownership | The rep’s email is used in the workflow, and saved quotes need an owner for dashboard actions. | Medium–High | Use Google SSO; prefill “Your Email” read-only. Associate saved quotes with the signed-in user; dashboard edit/duplicate actions are for the owner. Public recipient links remain read-only. |
| Persistence and stable historical quotes | Reps need to resume drafts and retrieve proposals; catalog updates must not rewrite existing offers. | High | Draft state persists in localStorage. Store saved quotes in PostgreSQL via Prisma, including full inputs, scenarios, results, and catalog version snapshot. Saved quote rendering/export uses stored snapshot values, not recalculation against the current catalog. |

## Differentiators

Valuable capabilities that strengthen the product’s partner workflow, explicitly within the supplied scope.

| Feature | Value Proposition | Complexity | Notes / dependencies |
|---------|-------------------|------------|----------------------|
| Exact, reproducible pricing with a golden fixture | Builds partner confidence that totals and rebates match the agreed reference calculations, including rounding edge cases. | High | Implement as a pure pricing module with unit tests. The supplied fixture and scenario outputs are behavioral references, not permission to generalize unconfirmed business rules. |
| Anchor-led scenario comparison | Makes the 100% attach case a clear reference while letting reps compare lower attach and no-Gemini cases side by side. | Medium | Anchor badge and initial selection are specified. Keep scenario cards’ live summaries aligned with their detailed configuration. |
| Explicit configurable approval policy | Lets policy owners adjust defaults and caps without embedding business rules in presentation code. | Medium | Keep discount defaults, max-approved caps, rebate values, and other confirmed policy values in configuration. Highlight over-cap values rather than silently correcting or blocking them. |
| Quote snapshot and catalog version traceability | Keeps old proposals auditable and stable after catalog changes. | Medium–High | Persist inputs, selected scenarios, computed results, and catalog version together. Necessary for correct public views and repeat PDF exports. |
| Rep workflow shortcuts: edit and duplicate | Reduces repeated data entry when preparing revisions or similar customer proposals. | Medium | Dashboard behavior is specified for the quote owner; do not broaden into team collaboration or quote pipelines without requirements. |
| Localized currency formatting | Makes proposal amounts legible for the configured currencies. | Medium | Format with `Intl.NumberFormat`; support at least USD, EUR, GBP, and INR. This is formatting support, not evidence that non-USD catalog prices or conversion rules are defined. |
| Accessible, responsive quote workflow | Enables use across device sizes and accessible input/navigation patterns. | Medium | Labels, keyboard navigation, focus rings, `aria-invalid`, responsive layout, and visible validation are required non-functional behaviors, not optional polish. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Estimating, interpolating, or substituting missing prices | Creates misleading totals and directly violates the project’s pricing-integrity requirement. | Keep unknown prices explicitly missing; block a quote only when a selected SKU/term needs an unknown price and explain which one. |
| Treating a missing price as zero or allowing NaN into a quote | Produces plausible-looking but invalid customer and partner totals. | Validate price availability before calculation/quote creation; test missing values as a first-class catalog state. |
| Inventing currencies, term ratios, margins, rebates, or discount policy | The prompt lists these as unresolved business assumptions. | Keep them configurable and clearly marked as needing confirmation. Never derive flexible prices from fixed prices or assume non-USD catalog pricing from formatting support. |
| Inferring a discount curve for non-standard attach rates | The prompt says the four sample attach rates are non-linear and explicitly prohibits interpolation. | Use exact configured lookup only for 100%, 50%, 25%, and 0%. For other attach rates/custom seat counts, leave discount fields empty for manual entry and retain approval warnings. |
| Blocking a quote solely because a discount exceeds its cap | The specified behavior is a warning, not a hard stop. | Show red field/card styling and a warning banner on preview; allow the rep to continue. |
| Enforcing seven-day expiry as link revocation | Conflicts with the project’s chosen soft-expiry behavior and damages ongoing shareability. | Keep the saved link viewable after `validUntil`; clearly mark the proposal expired. |
| Requiring authentication from public-link recipients | The requested link is public and read-only by anyone with the link. | Authenticate the rep for ownership/dashboard actions, but leave the recipient view read-only and link-accessible. |
| Recomputing old proposals against the live catalog | Catalog changes would silently alter existing customer offers. | Render, share, and export from each quote’s saved input/result/catalog-version snapshot. |
| Broad quote-management or commercial features not specified | CRM pipelines, approvals/workflows, team permissions, e-signature, payments, or automatic catalog ingestion expand scope without prompt support. | Limit v1 to saved quote ownership, edit/duplicate, public read-only sharing, and PDF export as specified. |

## Feature Dependencies

```text
Catalog with explicit per-SKU/per-term known-or-missing prices
  → current-state price display and proposal-price validation
  → quote creation may proceed only when selected prices are known

Validated customer/configuration inputs
  → selected quote term and scenario configuration
  → pure pricing engine and live scenario comparison
  → preview (including approval warnings and rebates)
  → save quote snapshot
      → public read-only link and soft-expiry status
      → owner dashboard edit/duplicate
      → PDF export from saved snapshot

Google SSO
  → read-only rep email prefill and quote ownership
  → owner-only dashboard actions
     (public quote recipient access does not depend on SSO)

Discount-policy configuration
  → exact defaults for the four supported attach scenarios
  → max-approved warning display
```

## MVP Recommendation

Prioritize:

1. **Explicit catalog states and quote validation** — configure confirmed prices only, represent TODO values as missing, and prevent a selected unknown price from yielding a quote.
2. **Validated four-screen quote flow with resumable draft** — capture the prompt’s inputs and preserve them across refreshes.
3. **Pure pricing engine and scenario comparison** — implement exact specified calculations, rounding, scenario defaults, and golden tests before relying on proposal totals.
4. **Approval warnings and complete proposal preview** — make over-cap discounts visible without blocking and show the detailed customer/partner economics.
5. **Snapshot persistence, public read-only sharing, and PDF export** — make saved quotes stable across catalog changes and keep expired links viewable with an expired marker.
6. **Google SSO and owner dashboard actions** — support rep identity, ownership, edit, and duplicate within the stated scope.

**Defer or gate on business confirmation:** unpriced SKU/term combinations; Gemini Business flexible price; all non-USD catalog rates; 2Y/3Y prices where not confirmed; non-3Y partner margins and Gemini Enterprise margins; rebate rates/eligibility beyond the prompt’s illustrative configurable 10% values; and any standard discounts beyond the four exact attach-rate cases. Do not seed these as guessed production facts.

**V1 acceptance implications:**
- A quote’s selected SKUs/terms must all have explicit prices or quote generation fails with a clear missing-price error.
- Golden fixture and all supplied scenario totals must match to the cent using the specified half-down rules.
- Over-cap discounts produce visible warnings in adjustment and preview screens, but do not disable quote creation.
- Non-standard attach rates receive no inferred defaults; discount values are manually supplied.
- Public links remain readable after seven days and show expired status; they do not permit editing.
- Saved proposal and exported PDF use the saved snapshot and are not changed by subsequent catalog edits.

## Sources

- `/Users/krunal/Downloads/quote-calculator-build-prompt.md` — authoritative v1 workflow, fields, scenario behaviors, pricing rules, data model, deliverables, and open assumptions.
- `/Users/krunal/Downloads/calculator/.planning/PROJECT.md` — active requirements, constraints, and explicit decisions on missing prices, snapshots, and soft expiry.
- `.planning/STATE.md` — checked as requested; file is not present in the workspace. Scope cross-check therefore uses `PROJECT.md` and the supplied authoritative prompt.
