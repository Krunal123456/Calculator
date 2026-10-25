# Architecture Patterns

**Domain:** Google Workspace + Gemini quote calculator (Next.js App Router, authenticated quote authoring, bearer-link read-only proposals)
**Researched:** 2026-10-25
**Confidence:** MEDIUM overall — product constraints are explicit in the project prompt; framework guidance was checked against official documentation, but the research-provider confidence seam classifies direct web fetches as LOW. Production PDF hosting remains unverified.

## Recommended Architecture

Build a modular monolith in the requested Next.js 15 application. Treat the browser wizard as an editable draft, the pricing package as the only calculation authority, and each persisted quote as an immutable proposal snapshot. Keep authenticated ownership and public bearer-link access as distinct read paths over the same snapshot. No pricing, catalog selection, or snapshot calculation should live in route/UI components.

```text
                         ┌───────────────────────────────┐
                         │ Next.js App Router             │
                         │                               │
 Rep / Wizard ──────────►│ RHF + Zod + Zustand draft     │
                         │        │ live calculation      │
                         │        ▼                       │
                         │ framework-free pricing engine │
                         │        │                       │
                         │        ▼ save input            │
                         │ authenticated quote service   │
                         │   ├─ Auth.js session/owner     │
                         │   ├─ validate + recompute      │
                         │   └─ Prisma repository         │
                         └──────────────┬────────────────┘
                                        ▼
                              PostgreSQL quote snapshot
                                 │                 │
                owner dashboard │                 │ bearer-link GET
                                 ▼                 ▼
                     owner-only views      public read-only view
                                                   │
                                      canonical print document
                                                   │
                                       Playwright PDF route
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Wizard client (`app` screens, RHF/Zod, Zustand) | Collect and validate editable form state; persist a versioned draft in localStorage; request live totals from the pure pricing package; never decide access or persist authoritative quote results | Pricing package; authenticated save action/route |
| `src/lib/pricing/` | Framework-free domain rules: catalog lookups, missing-price failures, scenario defaults, caps/warnings, Decimal arithmetic, rounding, and typed calculation output | Immutable catalog/policy inputs; wizard and server quote service |
| Server quote service (`server-only`) | Validate the request again, obtain the current immutable catalog/policy revision, recompute totals, construct the quote snapshot, and apply the owner/public authorization policy | Auth.js session, Zod/domain schemas, repository |
| Auth.js integration | Establish Google identity and a server-verifiable session; map the identity to a stable internal `User.id` used by quote ownership | Google OAuth; Prisma user/account/session records |
| Quote repository (`server-only`, Prisma) | Persist and retrieve quotes; expose separate owner-scoped and share-token-scoped read functions; prevent routes from issuing unscoped quote queries | PostgreSQL |
| Owner dashboard and saved-quote actions | List only the signed-in owner’s quotes; open/edit by creating a new quote from copied inputs rather than mutating a published snapshot | Auth.js, quote service |
| Public quote pages (`/q/[shareToken]`) | Render only the proposal fields intentionally disclosed to a link holder; support read-only viewing after soft expiry | Public snapshot retrieval; print view |
| Print document and PDF route | Render the persisted snapshot as the canonical print layout; generate a PDF without invoking current pricing rules | Snapshot retrieval; Node.js Playwright/Chromium runtime |

Keep Prisma and OAuth secrets out of client bundles. Route handlers/server actions are transport boundaries, not the location for pricing or ownership policy. Make repository functions accept an owner ID or a validated share token explicitly; avoid a generic `getQuote(id)` API that callers can accidentally use without scoping.

### Data Flow

1. **Draft and live preview:** RHF/Zod validates each wizard step. Zustand owns the multi-step draft and writes a versioned representation to localStorage. The UI passes typed draft inputs and an explicit catalog/policy revision to `src/lib/pricing/`; it receives calculated values and validation issues. A missing price is an error state, never a zero-price fallback.
2. **Create/save:** The client submits inputs and chosen scenarios, not trusted totals. A server action or `POST` route requires a valid Auth.js session, validates the payload again, confirms a resolved price exists for every selected SKU/term/currency, and recomputes using the same pricing module. The service creates the quote and its full snapshot in one database transaction. Return the public link only after the transaction succeeds.
3. **Owner view/duplicate:** Dashboard queries include `ownerId = session.user.id` in the database lookup. “Edit” or “duplicate” copies saved inputs into a new draft; saving creates a new quote using a selected catalog revision. Do not silently recalculate or overwrite an already shared proposal.
4. **Public view:** `GET /q/[shareToken]` resolves a high-entropy bearer token to one saved snapshot and returns a deliberately limited read-only view model. It does not require a Google session, expose owner/dashboard controls, or offer mutation methods. Show `Expired` when `now > validUntil`, but keep the view available: `validUntil` is proposal status, not an access-control deadline.
5. **Print/export:** The print view and PDF use the same persisted result snapshot as the public proposal. They must not look up today’s prices or rerun the current catalog. This guarantees a download agrees with the proposal originally sent.

### Persistence and Snapshot Model

Use the supplied `User` and `Quote` models as a base, retaining relational columns for identity, access, and common filters while storing the versioned quote payload in JSON:

- **Relational/indexed fields:** internal `id`, unique share-token hash, `ownerId`, customer domain/account ID, currency/country/language, new-business/resold flags, term, `createdAt`, and `validUntil`. Index owner + creation date and enforce uniqueness for the token hash.
- **Snapshot JSON:** complete validated inputs, selected scenarios and manual overrides, per-line resolved catalog prices, computed customer/partner/rebate results, and discount/policy values used. Keep the explicit catalog revision and pricing/schema revision alongside the snapshot.
- **Exact numeric encoding:** serialize Decimal amounts and percentages as decimal strings in JSON (not JavaScript numbers or serialized Decimal instances). Define a versioned DTO and parser/validator for reading old snapshots.
- **Catalog reproducibility:** a version label alone is only useful if that version remains immutable and retrievable. Either preserve every published catalog/policy revision or copy all resolved prices and applicable policy values into each quote snapshot. Prefer both revision identifiers and resolved values, so historical quotes remain explainable even if configuration storage changes.
- **Immutability:** after creation, the original quote snapshot is read-only. A revised offer is a new quote with a new token and snapshot; the prior URL continues to represent the original offer and can show its expired status.
- **Drafts:** localStorage is for incomplete wizard recovery, not the authoritative quote store. Include a draft schema/version and migration/discard path. Since the draft contains customer/account details, key it to the signed-in user, clear it on sign-out or explicit reset, and do not put OAuth/session credentials in it.

Treat snapshot creation as an atomic operation: validate and calculate first, then insert quote metadata and JSON snapshot together. A failed insert must not expose a partial quote or link. Use a database unique constraint to resolve token collisions rather than assuming randomness makes collisions impossible.

### Authentication and Public Read-Only Access

- Use Auth.js Google SSO for quote creation, owner dashboard, and all owner actions. Resolve a stable internal user ID from the authenticated identity; do not make an email address the ownership key.
- The prompt’s `User(id, email, name)` is a starting point, not necessarily the complete Auth.js persistence schema. If using the Prisma adapter/database sessions, add the adapter’s required account/session models; otherwise document and test the chosen session strategy and the reliable mapping from Google identity to `User.id`. Do not expand OAuth scopes to Workspace APIs: the described app only needs sign-in identity.
- Require a session and perform an owner-scoped database check on every owner mutation/read. Hiding controls in the client is not authorization. In particular, update/duplicate/delete endpoints must verify quote ownership server-side.
- Treat the public URL as a **bearer capability**: generate an independent cryptographically random token with at least 128 bits of entropy, use it instead of a sequential database ID, and store a hash for lookup. The link intentionally grants read access to its proposal to anyone who receives it. Do not claim that SSO protects public quote contents.
- Public routes expose only proposal fields meant for the customer, perform no writes, and remain usable after `validUntil`. Display soft-expiry prominently; do not turn it into token expiry. If later product policy needs revocation, implement an explicit revoked state/token rotation rather than changing the agreed seven-day behavior.
- Use non-indexing and conservative cache/referrer behavior for bearer-link pages and PDF responses; avoid third-party analytics/assets that could receive the token. Keep error responses generic so token probing does not disclose whether a quote exists.

### Pricing-Engine Isolation

`src/lib/pricing/` is a standalone TypeScript domain module with no React, Next.js, Prisma, browser storage, or network imports. Its public API should accept validated, plain inputs plus an explicit catalog/policy version and return typed totals, resolved price lines, and structured validation errors. Make all money/percentage operations use Decimal.js and keep the supplied rounding order as part of the calculation contract.

The wizard may call the same pure function for responsive previews, but saving must recalculate on the server. The client result is display-only and must never be accepted as the source of persisted amounts. Configuration owns all prices and policy values; unresolved business values stay explicitly missing and block only quote configurations that depend on them. Unit tests for catalog completeness should check that missing prices are represented and surfaced as errors, not require invented prices for intentionally unresolved entries. Preserve the golden fixture as the compatibility test for both client previews and server recomputation.

Recommended dependency direction:

```text
pricing types + catalog/policy ──► pricing engine ──► server quote service
             │                           │                   │
             └──► wizard UI ──────────────┘                   ├──► Prisma snapshot
                                                             └──► print/public DTOs
```

The pricing package must not import back from the UI, database, or quote service. Put Decimal-to-JSON-string conversion in a snapshot/serialization boundary, not inside UI components.

### Print/PDF Generation

Build one proposal document component and one print stylesheet, fed only with the saved snapshot DTO. Use it for the on-screen quote preview, `/q/[shareToken]/print`, and the Playwright PDF output; this is the strongest way to prevent layout/content drift. Print styling should define page size/margins, repeat table headers where supported, avoid splitting critical totals across pages, and include backgrounds only where the proposal design requires them.

Keep Playwright behind a Node.js-only server route/service (not Edge), validate the public share token or owner session before generating a file, and set PDF filename/content headers explicitly. The browser worker should load only the canonical print page, wait for fonts and document readiness, then call `page.pdf()` with print CSS enabled. Always close browser/page resources in `finally`; do not accept an arbitrary URL from a request or let the renderer browse user-supplied destinations.

The requested Playwright/Puppeteer approach is not blocked by the research. However, Chromium packaging, cold-start/memory/time limits, and deployment compatibility are hosting-specific and were not verified here. Before building the complete export flow, run a small production-target spike that launches Chromium, loads the print route, and returns a multi-page PDF. Keep the stated Next.js/Playwright stack; use the prompt’s Cloud Run option or a dedicated compatible renderer only if the verified Vercel runtime constraints make the route infeasible. `@react-pdf/renderer` remains the stated fallback, not the default, because a second layout system would duplicate the proposal rendering contract.

### Dependency-Aware Build Order

1. **Freeze domain contracts and configuration seams.** Define validated input/snapshot DTO versions, catalog/policy revision shape, explicit missing-price representation, and ownership/share-token semantics. Do not populate unresolved business values by inference.
2. **Implement the pure pricing package first.** Add Decimal.js math, catalog lookup, scenario defaults, structured missing-price/approval issues, and golden-fixture/catalog-integrity tests. This unblocks UI preview and authoritative server recomputation.
3. **Stand up the app’s persistence and identity boundary.** Add Prisma/PostgreSQL schema/migrations, Auth.js Google SSO and stable user mapping, quote repository methods, and owner-scoped tests. These can proceed in parallel with engine work once DTOs are agreed.
4. **Build the wizard and draft lifecycle.** Connect RHF/Zod screens and Zustand/localStorage to the pricing API. Keep draft persistence separate from published quote persistence; verify refresh/resume and unknown-price errors.
5. **Add authenticated save and immutable snapshots.** Server-validate and recalculate, atomically store snapshot/version metadata, then implement owner dashboard retrieval and duplicate-as-new behavior.
6. **Add public sharing and soft-expiry behavior.** Implement high-entropy bearer URLs, minimized read-only DTOs, token lookup, non-owner GET tests, owner isolation tests, and post-validity-date view tests. This depends on stable snapshot persistence.
7. **Add print and PDF.** First complete the canonical printable view from snapshots, then perform the hosting spike, then add the protected/bearer-authorized Playwright PDF route. This depends on saved data and public/owner retrieval rules.
8. **Close with production-path verification.** Exercise Google sign-in, ownership separation, save/reload, shared-link access after expiry, exact golden results, and PDF output in the deployment target.

**Critical dependency rule:** never build persistence or PDF around UI-calculated totals. Both require the final domain input contract and the authoritative server-side calculation/snapshot boundary.

## Anti-Patterns to Avoid

### Recalculating a saved quote from the live catalog
**What:** Public pages, dashboard cards, or PDF generation calculate results using current prices or policy.
**Why bad:** A previously sent proposal changes silently when catalog or policy configuration changes.
**Instead:** Read the complete immutable quote snapshot. Any revised quote is a new saved record.

### Treating the public short ID as a database identifier
**What:** Sequential IDs or low-entropy slugs are used in share URLs.
**Why bad:** URLs become enumerable and expose other customers’ proposal data.
**Instead:** Use an independent high-entropy bearer token, hash it at rest, and expose only the intended read-only DTO.

### Trusting client totals or client-only ownership checks
**What:** Save accepts browser totals, or dashboard APIs rely on hidden UI controls.
**Why bad:** A modified request can store incorrect prices or access another owner’s quote.
**Instead:** Revalidate, reauthorize, and recompute on the server for every write; scope owner queries in the repository.

### Maintaining a second PDF layout
**What:** Independently recreate the proposal in a PDF library while the app has a separate HTML preview.
**Why bad:** Columns, rounding displays, scenario labels, and footnotes drift.
**Instead:** Render the same snapshot-backed document with print CSS and use Playwright for PDF.

### Persisting mutable UI state as the quote record
**What:** Zustand/localStorage is treated as a saved proposal or source of truth.
**Why bad:** It is user-editable, browser-local, and cannot preserve an authoritative shareable result.
**Instead:** Use localStorage only for draft recovery; create server-validated immutable snapshots in PostgreSQL.

## Sources

- Next.js 15, [Authentication guide](https://nextjs.org/docs/15/app/guides/authentication) — official documentation; the research confidence seam classified the direct web fetch as **LOW**. Used for the distinction between authentication/session/authorization and the recommendation to authorize before mutation.
- Next.js 15, [Route Handlers](https://nextjs.org/docs/15/app/api-reference/file-conventions/route) — official documentation; direct web fetch **LOW**. Used to ground the separate GET/read and mutation transport boundaries.
- Auth.js, [Google provider](https://authjs.dev/getting-started/providers/google) — official provider documentation; direct web fetch **LOW**. Checked provider setup and the `email_verified` signal; no internal-domain access policy is specified by the project.
- Prisma ORM, [Working with JSON fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields) — official documentation; direct web fetch **LOW**. Confirms JSON persistence support; relational indexes/immutability are architecture recommendations, not Prisma guarantees.
- Playwright, [Page.pdf API](https://playwright.dev/docs/api/class-page#page-pdf) — official documentation; direct web fetch **LOW**. Supports browser-page PDF generation; does not establish compatibility with this project’s eventual hosting limits.
- Project constraints and requirements: `.planning/PROJECT.md` and `/Users/krunal/Downloads/quote-calculator-build-prompt.md` — direct user-provided requirements (**HIGH** for intended behavior).

## Scope and Open Checks

- `.planning/STATE.md` was not present, so the requested state-file scope check could not be completed; this architecture follows the explicit current user request and `.planning/PROJECT.md`.
- Confirm whether Google sign-in is restricted to an approved partner domain before enforcing a domain allowlist.
- Verify the selected Auth.js session/Prisma adapter strategy and required models during implementation; no evidence requires changing the requested stack.
- Verify production Chromium availability and resource limits on the selected deployment target before scheduling the full PDF implementation.
- Keep open catalog/currency prices, partner margins, and discount/rebate assumptions in configuration contracts; resolving those business inputs is not an architectural license to invent values.
