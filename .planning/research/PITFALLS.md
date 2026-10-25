# Domain Pitfalls

**Domain:** Google Workspace + Gemini partner quote calculator  
**Researched:** 2026-10-25  
**Scope:** Concrete failure modes requested for pricing, catalog, discount policy, seats, quote sharing, Auth.js ownership, draft persistence, PDF export, and accessibility.

## Critical Pitfalls

### 1. Correct Decimal arithmetic, wrong rounding sequence
**What goes wrong:** Monetary values are converted through JavaScript `number`, rounded half-up, rounded at the wrong stage, or averaged from rounded discounts instead of yearly line totals. The output can look plausible while disagreeing with the supplied examples by cents or more.

**Why it happens:** “Use Decimal” is mistaken for a complete rounding policy. The business rule is specifically asymmetric: round each customer per-seat price to two decimals with `ROUND_HALF_DOWN` before multiplying by seats; do not round partner per-seat values before multiplication; round the partner line result only at the end. A generic currency formatter or a different intermediate rounding point silently changes that order.

**Prevention:**
- Keep price, discount, percentage, seat multiplication, and rebate calculations in Decimal.js from validated decimal strings; do not convert through `Number` for calculations. Use `Intl.NumberFormat` only for presentation.
- Put rounding decisions in the pure pricing module, not UI components. Make the specified rounding mode and per-operation sequence explicit at each calculation boundary.
- Compute each year's customer per-seat price, then its line total; average the yearly line totals. Compute partner line totals from the customer line totals and partner discount without first rounding the displayed partner per-seat amount.
- Add exact-cent tests for the supplied golden fixture and all four scenario examples, plus tie cases (including `$4.025 → $4.02` and `$5.775 → $5.77`), fractional rates, negative adjustments if ever supported, and large seat counts.
- Keep the golden values as a fixed regression oracle; do not “fix” a mismatch by altering a business input or rounding mode without approval.

**Early warning signs:** A cents-only mismatch between the fixture and UI/PDF; totals change when only display formatting changes; results differ between client and server; test code uses floats or checks only approximate equality.

**Phase implication:** Establish and verify the pure pricing engine before building scenario UI, persistence, or PDF totals. Treat golden-fixture parity as a release gate for every later phase that reuses the engine.

### 2. Unknown catalog prices turn into zero, inferred prices, or mutable historic quotes
**What goes wrong:** Missing prices are treated as zero/empty numeric values, inferred from another term/currency or an apparent percentage relationship, or a saved quote is recalculated from today's catalog and changes after it was shared.

**Why it happens:** An incomplete catalog is represented with a numeric field that cannot distinguish “unknown” from a valid zero. The prompt also asks for a completeness test while intentionally listing TODO prices; a test that requires every cell to be populated can tempt someone to invent values. Storing only a catalog version label without preserving the values used is not a reproducible snapshot.

**Prevention:**
- Model price availability explicitly (known amount versus unknown), per SKU, currency, and term. Do not encode unknown as `0`, `NaN`, empty string, or an inferred ratio.
- Keep fixed-term prices as separate term entries and currencies as explicit dimensions. Do not derive flexible prices, other fixed-term prices, or local-currency values from known USD values.
- Allow the catalog to display an unknown item if required, but block quote calculation/save whenever a selected SKU/term/currency lacks a confirmed value; return the clear SKU/term error required by the prompt.
- Make catalog tests assert both that expected known prices are present and that intentionally unknown combinations remain explicitly unknown and unquotable. This resolves the completeness-test tension without fabricated prices.
- Persist a self-contained snapshot of the exact relevant catalog values/version, input values, policy version, scenario calculations, and final results. Validate snapshot shape/version on read; render old quotes from the saved snapshot rather than current configuration. Save the mutually dependent snapshot fields atomically.
- Keep unresolved price cells and pricing dimensions as explicit business-owner questions. Do not populate them until a source list is supplied.

**Early warning signs:** Missing values silently display as `$0.00`; a TODO is replaced by an assumption; a quote changes after a catalog edit; a saved row has only a version string and no reconstructible input values; “catalog complete” tests pass only after unknowns are filled.

**Phase implication:** Catalog schema, unknown-price blocking, and snapshot semantics belong in the foundation/data-model phase. Do not enable quote creation for unresolved combinations. Add snapshot round-trip and catalog-change regression tests before sharing and PDF work.

### 3. Discount defaults, approval caps, and editable overrides are conflated
**What goes wrong:** Sample discounts are treated as a universal formula, a default is silently clamped to its cap, a warning becomes an undocumented rejection, or a value above the cap is shown without a warning in the preview.

**Why it happens:** The sample points suggest a shared discount budget, but the prompt explicitly says the formula is unknown and non-linear. It distinguishes defaults from max-approved warning thresholds; for example, the 100% scenario's Year 1 Workspace default is 60% while its cap is 50%, intentionally producing a warning rather than an automatic correction. The 50% Gemini cap is marked uncertain.

**Prevention:**
- Use the supplied exact lookup values only for the named 100%, 50%, 25%, and no-Gemini scenarios. For non-standard attach rates/custom seat counts, leave scenario discount defaults blank for rep entry as specified; never interpolate.
- Keep defaults, caps, term-specific partner margins, rebates, and eligibility in configuration/policy code, not visual components. Keep unknown or unconfirmed rules explicitly pending rather than supplying plausible values.
- Treat caps as warning thresholds, not hard validation limits: do not silently clamp, rewrite, or block an above-cap value. Preserve the entered amount and visibly identify the affected discount and cap.
- Carry warnings through all steps and into the final proposal/preview; do not let a warning disappear when data is saved or rendered elsewhere.
- Keep customer discounts, compounded Gemini discounts, partner discounts, and rebate calculations as distinct inputs/results. Do not compare an unrelated effective/combined rate to a cap unless the policy explicitly says to.
- Obtain business confirmation for the uncertain 50%-scenario Gemini cap and any TBD term margins, discount rules, or rebate inputs before representing them as approved policy.

**Early warning signs:** A discount changes when the scenario changes without a visible rule; defaults are silently rewritten; the 60% Year 1 default fails validation instead of warning; the UI/PDF omits the warning; code or tests describe an inferred “formula.”

**Phase implication:** Build the configurable policy model and warning semantics before the adjustment UI. Add boundary tests for values below, at, and above each confirmed cap. Keep the unresolved cap and other policy gaps as explicit launch blockers or visible configuration gaps until approved.

### 4. Gemini seat rounding or the 100% anchor is applied inconsistently
**What goes wrong:** A fractional seat count is rounded down, rounded to nearest instead of ceiling, rounded after scenario totals are combined, or a requested specific anchor count is ignored/double-counted. The resulting quote totals, rebates, and attachment labels no longer describe the same seat count.

**Why it happens:** Seat counts are integers but attach rates produce fractions (e.g. 110 × 25% = 27.5). A customer-requested count changes the stated 100% anchor, and custom attach rates are allowed, so separate UI and pricing calculations can diverge.

**Prevention:**
- Sum the validated Workspace license counts once; calculate scenario seats using the specified ceiling rule (`ceil(attachRate × totalWorkspaceLicenses)`) and use that integer consistently in customer totals, partner totals, preview, and rebates.
- Apply the customer-requested Gemini seat count as the 100% anchor exactly as specified. Preserve it as an input; do not also add it to the calculated workforce count.
- Keep the calculation in Decimal until the ceiling/integer boundary. Validate licenses and any explicit seat count as whole, non-negative values; define and test behavior for zero seats and rates at scenario boundaries.
- Test 110-seat 100%/50%/25% cases (110/55/28) and custom anchor counts/rates. Confirm with the product owner how attach-rate scenarios scale from a custom anchor if that behavior is not explicitly specified; do not guess a separate formula.
- Make the displayed seat count the same canonical pricing-engine result, not an independently rounded UI estimate.

**Early warning signs:** UI says 27 seats while totals use 28; 25% case differs from the sample; totals/rebates use pre-rounded fractions; custom anchor creates more than one 100% Gemini quantity.

**Phase implication:** Implement seat normalization with the pricing engine and test it before scenario cards. Clarify custom-anchor behavior during requirements/discussion before adding arbitrary attach-rate modes.

### 5. Public quote links expose edit access, become guessable, or expire contrary to policy
**What goes wrong:** A public `/q/[shortId]` link can mutate a quote, IDs are enumerable, validity is treated as access revocation, or date/status changes on each view.

**Why it happens:** Public read access is confused with authorization, internal database IDs are reused as share tokens, or “valid until” is treated as a security control. In this product the link is deliberately a bearer-style public read-only link and expiry is soft: the quote remains viewable and is marked expired.

**Prevention:**
- Generate opaque, high-entropy public identifiers independent from sequential database IDs; enforce uniqueness and retry on collision. Do not expose internal IDs as the public token.
- Keep the public route strictly read-only. Make all edit, delete, duplicate, and owner-dashboard actions go through authenticated server-side authorization.
- Persist `createdAt` and the seven-day `validUntil` when the quote is saved. Compute the expired label from those persisted timestamps using a consistent timezone rule; never reset validity on page view or silently revoke the link.
- Treat the public URL as a bearer secret: minimize customer-sensitive details shown, avoid including the token in analytics/error logs where possible, and avoid reusing the public token in unrelated endpoints.
- Confirm the intended timezone/date display and public proposal fields with the product owner; do not reinterpret soft expiry as a hard cutoff.

**Early warning signs:** Sequential short IDs; public route supports PATCH/POST; expired quote returns 404/403; link's date moves forward on refresh; private dashboard data is returned from public endpoints.

**Phase implication:** Decide the identifier and route-access boundary in the persistence/API phase. Test unauthenticated read-only access, expired-but-viewable behavior, non-enumerability assumptions, and unauthorized mutation attempts before sharing links broadly.

## Moderate Pitfalls

### 6. Auth.js sign-in is mistaken for quote ownership authorization
**What goes wrong:** Any signed-in Google user can edit another rep's quote by changing an ID, or ownership is inferred from a client-supplied email rather than the authenticated session.

**Prevention:** Resolve the current user from the server-side Auth.js session and map it to a stable application `User.id`. On every private read or mutation, scope the database operation by both quote ID and that authenticated owner ID; never accept `ownerId` from the form/body as authority. Keep the public `GET` path explicitly read-only. Test owner, non-owner, anonymous, and altered-ID cases for every server action/API route, not just page navigation.

**Early warning signs:** Ownership checks only in React or middleware; server action accepts an owner ID; data lookup fetches by quote ID and checks nothing else; email changes break ownership linkage.

**Phase implication:** Implement Auth.js user mapping and server-side ownership checks alongside database/API foundations, before dashboard, edit, duplicate, or save operations. The public read-only path must remain a distinct policy.

### 7. Local draft persistence leaks stale customer details or loses work at the wrong time
**What goes wrong:** A shared browser shows a prior customer's account ID/deployment/discounts, a refresh loses an unsaved draft, stale or malformed stored data crashes the wizard, or server rendering/hydration disagrees with browser state.

**Why it happens:** Zustand persistence is enabled without considering that localStorage is durable, origin-scoped browser storage and may be unavailable under browser policy. The draft includes sensitive commercial/customer details, and a single unversioned key can outlive the intended user or schema.

**Prevention:**
- Treat draft contents as sensitive customer/commercial data. Do not store session secrets or more customer data than the wizard needs. Make the required local persistence behavior visible and clear drafts after successful save and sign-out; consider shared-device use explicitly.
- Use a versioned, user-scoped draft key where an authenticated identity is available; validate and migrate stored data on hydration, and discard invalid/obsolete versions safely.
- Handle blocked/quota-limited storage with a clear non-fatal fallback. Hydrate only on the client so the initial server-rendered wizard does not assume browser storage exists.
- Avoid races between autosave and route changes; test refresh at each wizard screen and immediately after edits/save/clear.

**Early warning signs:** Draft data survives sign-out; two test accounts see the same draft; hydration warnings; JSON parse errors blank the wizard; private browsing or blocked storage breaks navigation.

**Phase implication:** Design draft schema, identity scoping, and lifecycle before shipping wizard persistence. Include refresh, sign-out, malformed storage, and storage-unavailable tests in the wizard phase.

### 8. PDF output is stale, incomplete, or differs from the saved proposal
**What goes wrong:** The exported PDF recalculates using current catalog/policy, omits a warning, clips a long proposal across page boundaries, uses missing fonts, or fails only in the deployed Vercel/Cloud Run runtime because the browser binary/runtime is unavailable.

**Why it happens:** Browser-based PDF generation depends on a real rendering environment and print-specific layout. The screen's current state may differ from the persisted snapshot, and waiting for the page to load does not by itself prove that fonts, calculations, or images are ready.

**Prevention:**
- Render from the saved quote snapshot and shared presentation components; do not independently recalculate or fetch current catalog values for PDF output.
- Verify the actual deployment target, compatible browser binary, packaging, memory, and execution-time limits early. Treat the `@react-pdf/renderer` fallback as a separate rendering implementation, not a zero-effort switch.
- Add print CSS for paper size/margins, repeated table headers where supported, and deliberate page-break behavior. Wait for data and fonts to be ready before PDF generation.
- Test output visually and by extracting/checking text for the golden quote, long SKU/scenario tables, warning banners, multiple pages, and non-USD formatting. Confirm cents, validity date, currency, and warning visibility match the saved preview.
- Escape/safely render customer-provided strings; never assume data inserted into the print page is trusted markup.

**Early warning signs:** PDF totals differ from preview; last rows are clipped; browser works locally but route times out in deployment; font fallback changes line wrapping; PDF omits expired/warning state.

**Phase implication:** Prove the browser/PDF path against the chosen deployment target during infrastructure planning, not at final polish. Build snapshot-based output and PDF regression checks after quote persistence is stable.

### 9. Accessibility fails in the dynamic wizard, warnings, or quote-options modal
**What goes wrong:** Keyboard or assistive-technology users cannot identify fields/errors, reach scenario controls, understand a disabled Next button, or operate the modal. Red-only approval warnings and visual-only updates hide important business state.

**Why it happens:** Dynamic forms, repeated SKU rows, live recalculation, and modals add state changes that a static label check does not cover. Inline red styling alone does not communicate the error or the action needed.

**Prevention:**
- Give every input a persistent programmatic label; associate help/error text with the field; set invalid state on errors; provide a concise error summary linked to fields and move focus to the first invalid field after attempted progression.
- Because the prompt asks for Next to be disabled until valid, keep visible, understandable validation feedback available before the button becomes actionable; do not make the disabled state the only explanation.
- Ensure the quote-options modal has dialog semantics, keyboard operation, sensible focus entry/containment, and focus restoration on close. Verify repeated-row add/remove buttons have names and context.
- Do not convey discount-cap, expired, or missing-price state by color alone. Announce important dynamic validation/status changes without making every keystroke or recalculated amount excessively noisy.
- Run keyboard-only and screen-reader checks through all four screens, modal, validation failures, and public read-only quote. Test responsive layouts and focus visibility.

**Early warning signs:** Error messages are not associated with inputs; focus disappears after adding/removing a SKU; a dialog cannot be dismissed by keyboard; a warning is only a red border; changing a scenario silently changes totals.

**Phase implication:** Accessibility is cross-cutting from the first form and component phase; add keyboard/assistive-technology checks to wizard and modal acceptance criteria. Do not defer an end-to-end accessibility pass until the PDF or final UI phase.

## Minor Pitfalls

### 10. Formatted display values are reused as data
**What goes wrong:** Currency symbols, grouping separators, locale decimal commas, or rounded presentation strings are parsed back into calculation inputs.

**Prevention:** Keep canonical decimal strings and currency codes separate from localized display formatting. Test USD, EUR, GBP, and INR display without letting locale alter saved numeric values or arithmetic.

**Early warning signs:** Switching language/currency changes raw totals; commas fail validation; a displayed rounded value becomes the next calculation's input.

**Phase implication:** Define input/display boundaries in the pricing and form schemas before adding international formatting.

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Mitigation |
|-------------|---------------|------------|
| Pricing engine | Correct Decimal type but wrong half-down/operation order | Implement the required order once; use all supplied golden outputs and tie-case tests as gates. |
| Catalog and configuration | TODO values silently become prices; uncertain discount/rebate rules are treated as facts | Represent unknowns explicitly; block affected quotes; require the business owner to supply/confirm values. |
| Scenario UI | Seat ceiling, custom anchor, or warning state differs between UI and engine | Display engine outputs only; test 110/55/28 and custom-anchor clarification before custom rates. |
| Persistence and Auth.js | Public token, session identity, and owner permission are conflated | Separate public read-only lookup from server-side owner-scoped mutations; add authorization tests before dashboard actions. |
| Draft wizard | Persistent customer data leaks across users or hydration fails | Version and scope drafts; handle storage failures and clear on sign-out/save; test shared-browser cases. |
| PDF/proposal | PDF uses live rules or differs from preview; deployed browser runtime fails | Freeze data in quote snapshot; test deployed runtime and long print layouts before feature completion. |
| Accessibility and responsive UI | Visual styling hides errors or warnings from keyboard/screen-reader users | Test every wizard step and modal with keyboard and assistive technology; do not rely on color or disabled controls alone. |

## Confidence and Open Business Rules

- **High confidence in the product-specific constraints:** the supplied `.planning/PROJECT.md` and build prompt define the required rounding sequence, known-versus-unknown price behavior, warning semantics, snapshot intent, public read-only link, soft expiry, and specified scenario seat examples. These are treated as requirements, not independently verified market facts.
- **Low confidence in external implementation references:** direct documentation lookups were classified LOW by the research confidence seam. They are included as implementation pointers only; they do not establish or override a business rule.
- No list prices, local-currency equivalents, missing term prices, discount formula, partner margins, rebate policy, expiry access rule, or behavior beyond the stated custom-seat anchor has been inferred. Any unresolved item remains a product-owner confirmation, not an implementation default.

## Sources

- `.planning/PROJECT.md` — first-party project scope and decisions: unknown prices block quoting; saved quote snapshot; public links remain viewable after seven-day validity; rounding/catalog constraints.
- `/Users/krunal/Downloads/quote-calculator-build-prompt.md` — first-party detailed pricing rules, fixture, policy sample, persistence, Auth.js, PDF, localStorage, and accessibility requirements.
- Decimal.js README: https://github.com/MikeMcl/decimal.js — implementation reference on decimal arithmetic, precision, rounding, and string inputs. **Confidence: LOW per source-classification seam.**
- Auth.js session management: https://authjs.dev/getting-started/session-management/get-session — server-side session access reference. **Confidence: LOW per source-classification seam.**
- Prisma JSON fields: https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields and transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions — persistence implementation references. **Confidence: LOW per source-classification seam.**
- Playwright Page API: https://playwright.dev/docs/api/class-page#page-pdf — PDF-generation implementation reference. **Confidence: LOW per source-classification seam.**
- W3C WAI Forms Tutorial, validation: https://www.w3.org/WAI/tutorials/forms/validation/ and notifications: https://www.w3.org/WAI/tutorials/forms/notifications/ — form error and notification implementation references. **Confidence: LOW per source-classification seam.**
- MDN `localStorage`: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage — browser storage lifecycle and exceptions reference. **Confidence: LOW per source-classification seam.**
