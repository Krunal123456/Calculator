# Project Research Summary

**Project:** Workspace + Gemini Quote Calculator  
**Domain:** Partner-facing B2B SaaS quoting and investment-proposal generation  
**Researched:** 2026-10-25  
**Confidence:** MEDIUM

## Executive Summary

This is a greenfield web application for partner/sales representatives to model a customer's Google Workspace deployment, compare Gemini attach scenarios, and share a saved investment proposal. Research recommends a modular monolith on the specified Next.js 15/strict TypeScript stack, with a framework-independent Decimal.js pricing package as the sole calculation authority. Build around explicit catalog and policy configuration, validated resumable drafts, server-side recomputation, and immutable quote snapshots; public proposal links are read-only and remain viewable after the seven-day validity date with an expired status.

The most important release risk is commercial correctness, not UI breadth: unresolved prices and policy must remain unknown and must never be filled by interpolation or plausible assumptions. A selected SKU/term/currency without a confirmed price must block quote generation with a clear error. Establish the exact rounding sequence, scenario defaults, warning behavior, and known-versus-missing catalog states before building dependent screens. Other material risks are owner/public access confusion, stale drafts, and production Chromium constraints for PDF export. Validate ownership and snapshot behavior server-side, and run a deployment-target PDF spike before committing to the final renderer.

## Key Findings

### Recommended Stack

Use the required stack, pinned to a compatible lockfile rather than floating `latest` tags. The research recommends Node.js 22.12+, Next.js 15.5.x with React 19, strict TypeScript, Tailwind 4 and shadcn/ui, React Hook Form + Zod, and provider-scoped Zustand draft state. Pricing belongs in a framework-free `src/lib/pricing/` module using Decimal.js; PostgreSQL with Prisma 7 and its PostgreSQL driver adapter supports durable quote storage. Use stable NextAuth/Auth.js v4 rather than adopting the v5 beta implicitly. Keep Prisma and PDF handlers on Node runtime.

**Core technologies:**
- **Next.js 15 App Router + React 19 + strict TypeScript:** requested web platform; pin the 15.x line and account for its asynchronous request APIs.
- **Node.js 22.12+:** shared local, CI, and deployment floor required by the researched Vitest/Prisma baseline.
- **Tailwind CSS 4 + shadcn/ui/Radix:** responsive styling and accessible, source-owned UI primitives.
- **React Hook Form + Zod:** typed multi-step forms and client/server validation.
- **Zustand 5:** request/component-scoped wizard draft state; persist only a validated, versioned subset in localStorage.
- **Decimal.js 10.6:** exact pricing and required `ROUND_HALF_DOWN` behavior; construct values from decimal strings.
- **PostgreSQL + Prisma 7:** relational ownership, migrations, and durable versioned quote snapshots; use the PostgreSQL adapter and pooled connection where applicable.
- **NextAuth v4 / Auth.js Google SSO:** stable App Router integration and authenticated rep identity; verify the adapter schema and user mapping.
- **Vitest + Playwright Test:** fast pricing-unit tests and browser end-to-end coverage.
- **Proposal PDF:** prefer the canonical HTML/print view rendered with Playwright only after a deployment spike; use a compatible isolated renderer if the chosen hosting target cannot run Chromium reliably. React-PDF is a fallback with a second layout to maintain.

The exact package versions and deployment limits in `STACK.md` are a research-date baseline, not a substitute for install/build verification against the committed lockfile. Prisma 7 needs its PostgreSQL adapter configuration; Auth.js persistence may need more adapter models than the simplified project schema. PDF packaging, cold starts, and memory/time limits remain hosting-specific.

### Expected Features

The core product is a four-step quote wizard: customer/current deployment, proposed contract and Gemini configuration, scenario adjustments, and proposal preview. It must validate and resume drafts; calculate customer and partner amounts accurately; compare 100%, 50%, 25%, and no-Gemini cases; show approval-cap warnings without blocking; and present detailed proposal economics. Saved quotes require Google SSO ownership, snapshot persistence, owner edit/duplicate actions, public read-only links, soft expiry, and PDF export. Accessibility and responsive behavior are acceptance criteria throughout, not a final polish phase.

**Must have (table stakes):**
- Validated, resumable wizard and quote-options modal.
- Explicit catalog states and a clear blocking error for any selected unknown price.
- Exact Decimal calculations, specified rounding order, supplied golden-fixture parity, and consistent seat counts.
- Supported scenario comparison, configurable exact defaults, and visible above-cap warnings (warning, not rejection).
- Preview with customer/partner amounts, rebates and policy warnings.
- Authenticated quote ownership and server-side recalculation; durable snapshot of inputs, prices/policy used, results, and versions.
- Public read-only proposal links that remain viewable after validity and show expired status; snapshot-backed PDF export.
- Accessible forms, modal, status/warning communication, and responsive layouts.

**Should have (competitive):**
- Anchor-led side-by-side scenarios with live totals.
- Catalog/policy version traceability and reproducible historical quotes.
- Owner shortcuts to edit or duplicate by creating a new draft/quote rather than mutating a published snapshot.
- Localized display for USD, EUR, GBP, and INR, strictly as formatting support and not as evidence of catalog prices in those currencies.

**Defer (v2+):**
- CRM pipelines, team collaboration/permissions, approval workflows, e-signature, payments, automated catalog ingestion, or other commercial features not in the prompt.
- Any unconfirmed prices, currencies, margins, rebates, discount formulas, or additional scenario defaults. These are business-input gaps, not features to approximate.

### Architecture Approach

Use a modular monolith. Keep the client wizard responsible for collecting validated drafts and displaying pure-engine results, while a server-only quote service validates again, authenticates/authorizes, recomputes, and atomically persists an immutable snapshot through scoped Prisma repository methods. The owner dashboard and public bearer-link page are distinct read paths: owner operations are session- and owner-scoped; public access exposes only a minimized read-only proposal view. Render preview, public proposal, and PDF from the same saved snapshot DTO, never from current catalog values. Treat localStorage as recoverable draft storage only.

**Major components:**
1. **Wizard and draft store** — RHF/Zod screens, client-only hydration, user-scoped/versioned draft recovery, accessible errors and modal behavior.
2. **Pricing domain package** — catalog/policy lookup, explicit missing-price errors, exact scenario defaults, Decimal math, rounding, caps/warnings, and typed results; no framework, UI, database, or network imports.
3. **Server quote service** — repeat validation, session/owner authorization, authoritative recomputation, snapshot construction, and atomic save.
4. **Auth.js and quote repository** — stable internal user identity; owner-scoped queries and separate token-scoped public reads.
5. **Snapshot persistence** — relational access/filter fields plus versioned snapshot data; serialize decimal amounts as canonical strings and preserve resolved values as well as revision identifiers.
6. **Owner dashboard and public proposal** — owner actions on owned records; high-entropy bearer token for read-only external access; soft-expiry presentation.
7. **Canonical print/PDF service** — snapshot-backed print document and Node-only PDF generation, verified in the actual deployment environment.

### Critical Pitfalls

1. **Wrong Decimal rounding sequence** — Implement the specified half-down rounding at the customer per-seat boundary before seat multiplication; retain Decimal values through arithmetic and test golden outputs and tie cases.
2. **Unknown price treated as zero, inferred, or mutable later** — Model known versus missing explicitly by SKU/term/currency; block only configurations requiring missing prices; snapshot exact values and render old quotes from the snapshot.
3. **Discount defaults and caps conflated** — Apply only the four specified scenario lookups; do not interpolate, clamp, or reject above-cap discounts. Preserve and display warnings through preview and saved proposal.
4. **Seat counts or custom anchor drift** — Have one pricing-engine seat result (including ceiling behavior) drive totals, labels, and rebates; clarify custom-anchor scaling rather than inventing a rule.
5. **Public access, ownership, and expiry confused** — Use separate owner-scoped and bearer-token read paths; ensure public links cannot mutate, are not sequential IDs, and remain viewable after the soft-expiry date.
6. **Ancillary but release-relevant risks:** drafts can leak stale customer details or fail hydration; PDF output can diverge from preview or fail on the hosting runtime; dynamic form warnings can be inaccessible. Version/scope/clear drafts, reuse the snapshot-backed print view, and test accessibility from the first form.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Domain Contracts, Catalog States, and Pricing Engine
**Rationale:** All UI totals, server saves, snapshots, and PDFs depend on a single correct pricing contract. Lock this down before building dependent workflow behavior.  
**Delivers:** Typed/versioned inputs and results, explicit known-or-missing price representation, confirmed configuration only, pure Decimal engine, structured validation/warning outputs, and golden/catalog-integrity tests.  
**Addresses:** Accurate transparent pricing, selected-price blocking, scenario rules, approval warnings.  
**Avoids:** Wrong rounding sequence; zero/inferred prices; invented discount formulas; inconsistent seat math.  
**Research flag:** Focused planning is needed for unresolved business rules, especially custom anchor scaling, uncertain caps/margins/rebates, and which catalog combinations have confirmed prices. Research must collect authoritative business inputs; it must not fill them by inference.

### Phase 2: App, Identity, Persistence, and Deployment Foundations
**Rationale:** The wizard and saved quote lifecycle require stable identity, data contracts, and storage boundaries. Start these once the quote DTO and pricing API are established; infrastructure work can proceed in parallel with the engine where interfaces are agreed.  
**Delivers:** Next.js app shell, Prisma/PostgreSQL schema and migrations, Auth.js Google SSO with stable internal user mapping, scoped repository/service boundaries, and versioned draft/snapshot serialization conventions. Run a small Chromium/PDF deployment feasibility spike now.  
**Uses:** Next.js, Prisma adapter, Auth.js, PostgreSQL, strict TypeScript.  
**Implements:** Server quote service, identity, repository, snapshot foundations.  
**Avoids:** Incomplete OAuth adapter schema, trusting browser totals, and discovering hosting incompatibility at the end.  
**Research flag:** Verify chosen Auth.js session/adapter schema and whether Google sign-in is domain-restricted; confirm deployment target and browser/runtime constraints. Do not infer an allowed domain policy.

### Phase 3: Accessible Wizard, Draft Recovery, and Scenario Preview
**Rationale:** With the pricing interface and identity/draft contracts established, implement data entry and live preview against the engine rather than duplicating rules in UI.  
**Delivers:** Four validated screens, options modal, resumable user-scoped draft, scenario controls, visible missing-price/approval feedback, and detailed proposal preview.  
**Addresses:** Table-stakes workflow, scenario comparison, editable discounts, responsive/accessibility requirements.  
**Uses:** RHF, Zod, Zustand, shadcn/Radix, pricing engine.  
**Avoids:** UI-calculated seat or pricing divergence, stale/shared-device drafts, inaccessible errors or warnings.  
**Research flag:** No broad technology research expected; focused product clarification is still needed for custom attach-rate/anchor behavior. Validate form persistence and assistive-technology behavior during planning/testing.

### Phase 4: Authoritative Save and Owner Quote Management
**Rationale:** Save only after wizard inputs and engine calculations are stable; server recomputation and immutable snapshots establish the source of truth for every later share/export feature.  
**Delivers:** Authenticated server-side validate/recompute, atomic quote snapshots, owner-scoped list/read actions, and edit/duplicate-as-new behavior.  
**Addresses:** Persistence, quote stability, ownership, edit/duplicate.  
**Uses:** Auth.js, Prisma/PostgreSQL, versioned snapshot DTOs, pricing engine.  
**Avoids:** Trusting client totals, cross-owner access, live-catalog recalculation, partial saves.  
**Research flag:** Standard persistence patterns are well documented; plan explicit authorization, snapshot round-trip, and catalog-change regression tests.

### Phase 5: Public Read-Only Proposals and Soft Expiry
**Rationale:** Public sharing depends on a persisted snapshot and reliable token lookup; implement it after ownership and quote immutability are proven.  
**Delivers:** High-entropy share token, minimized public DTO/page, read-only access, persisted seven-day validity, and visible expired status while keeping the link viewable.  
**Addresses:** Shareable proposal and recipient access.  
**Avoids:** Guessable IDs, accidental public mutation, owner-data disclosure, hard expiry, or changing historical offers.  
**Research flag:** No major external research expected. Confirm proposal fields and timezone/date presentation during product planning; do not change the soft-expiry rule.

### Phase 6: Snapshot-Backed PDF and End-to-End Release Verification
**Rationale:** PDF is downstream of saved proposal rendering and depends on deployment-specific browser capability. Reuse the canonical proposal rather than introducing a separate pricing/layout authority.  
**Delivers:** Print CSS, PDF output from the saved snapshot, production-path verification, and cross-flow tests for golden pricing, owner isolation, public expiry, accessibility, and export parity.  
**Addresses:** Portable investment proposal and launch-quality verification.  
**Uses:** Canonical snapshot-backed proposal view, Playwright/Chromium if validated.  
**Avoids:** Stale totals, layout drift, clipped pages, missing warnings, and runtime/package failures.  
**Research flag:** Requires focused deployment research/spike if Phase 2 has not confirmed the actual host's Chromium packaging, bundle, memory, and execution limits. Use the documented fallback/isolated renderer only after validation.

### Phase Ordering Rationale

- The pure pricing engine and explicit catalog/policy contracts are upstream of scenario UI, authoritative save, historical snapshots, and PDF; they must be established first.
- Authentication, ownership, and database boundaries precede owner actions and public share features. Save/recompute and immutable snapshots precede public links and PDF.
- Draft persistence is not quote persistence: recoverable client drafts and authoritative server snapshots need separate schemas and lifecycles.
- Public sharing is intentionally a read-only bearer-link capability; seven-day validity changes presentation state, not access.
- Accessibility is cross-cutting from the wizard phase onward; it should not be deferred to release polish.
- Business gaps stay visible as gaps. The MVP may quote configurations supported by confirmed data, while blocking only a selected unknown price; it must not imply unsupported totals.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Business-owner confirmation of price coverage, currencies/terms, policy defaults/caps, partner margins, rebates, and custom seat/attach rules. This is requirements validation, not permission to estimate.
- **Phase 2:** Auth.js/Prisma adapter models and user mapping; approved sign-in domain policy; actual deployment target and early PDF feasibility.
- **Phase 6:** Hosting-specific Playwright/Chromium packaging, resource limits, and fallback decision if no runtime has been selected and verified.

Phases with standard patterns (skip broad research-phase):
- **Phase 3:** RHF/Zod wizard, accessible components, and scoped Zustand draft patterns are established; validate project-specific behavior and accessibility.
- **Phase 4:** Relational persistence and server-side owner scoping are standard patterns; focus planning on this project's snapshot contract and authorization tests.
- **Phase 5:** Read-only route and soft-expiry logic are straightforward once token/snapshot contracts are set; verify exact disclosed fields and date display with product stakeholders.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | LOW | `STACK.md` explicitly rates confidence low despite official-document and registry cross-checks; exact versions are research-date observations and require lockfile/install/build verification. |
| Features | HIGH | First-party prompt and PROJECT scope define v1 workflow and behavior clearly; unconfirmed commercial inputs are intentionally excluded. |
| Architecture | MEDIUM | Modular boundaries and snapshot/access recommendations align across sources; production PDF hosting and some auth choices remain unverified. |
| Pitfalls | MEDIUM | Product-specific pricing, unknown-value, and soft-expiry constraints are explicit; external implementation references were classified low-confidence. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Catalog coverage and exact business policy:** Workspace/Gemini SKU prices by currency/term, Gemini Business flexible price, missing fixed-term values, non-USD rates, partner margins, rebates/eligibility, and uncertain discount caps are not resolved. Obtain approved inputs; keep missing values explicitly missing and quote-blocking only when selected.
- **Discount and attach semantics:** Do not infer a curve for non-standard attach rates. Confirm the custom-anchor scaling behavior and any associated seat-count rules before exposing custom scenario behavior.
- **Identity policy:** Confirm whether Google sign-in is open to any Google account or limited to a partner domain. Use stable internal user IDs either way.
- **Auth.js persistence:** Verify session strategy, adapter compatibility, and required Prisma models against the selected implementation.
- **PDF deployment:** No hosting target or production Chromium capability is established. Verify early; keep the renderer decision contingent on an actual deployment-target test.
- **Public proposal details:** Confirm which customer/account fields are appropriate to expose and the timezone/date presentation for expiry without changing the agreed public read-only/soft-expiry behavior.
- **Scope state check:** `.planning/STATE.md` is absent, so the requested active-state scope could not be independently checked. The synthesis is limited to this explicit request and `.planning/PROJECT.md`.

## Sources

### Primary (HIGH confidence for intended product behavior)
- `.planning/PROJECT.md` — product intent, active requirements, explicit pricing/snapshot/soft-expiry constraints.
- `/Users/krunal/Downloads/quote-calculator-build-prompt.md` — authoritative detailed workflow, pricing examples, fields, data model, and unresolved business inputs, as cited by the research documents.
- `.planning/research/FEATURES.md` — v1 feature classification, anti-features, dependencies, MVP sequencing.
- `.planning/research/ARCHITECTURE.md` — modular architecture, data flow, snapshot/access boundaries, and dependency-aware build order.
- `.planning/research/PITFALLS.md` — pricing, catalog, discount, seat, access, draft, PDF, and accessibility failure modes.

### Secondary (implementation references, confidence varies)
- `.planning/research/STACK.md` — stack recommendations, version baseline, deployment constraints, and linked official documentation/registry metadata.
- Official Next.js 15, Tailwind, shadcn/ui, React Hook Form, Zod, Zustand, Decimal.js, Prisma, Auth.js/NextAuth, Playwright, Vitest, Vercel, and W3C WAI documentation, listed individually in the source research files.
- `.planning/research/ARCHITECTURE.md` and `.planning/research/PITFALLS.md` source lists — official Auth.js, Prisma, Playwright, Next.js, WAI, and MDN implementation references; the source documents flag direct-fetch confidence as low.

---
*Research completed: 2026-10-25*  
*Ready for roadmap: yes*
