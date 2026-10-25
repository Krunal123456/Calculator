<!-- GSD:project-start source:PROJECT.md -->

## Project

**Workspace + Gemini Quote Calculator**

A web app for Google Workspace partner and sales representatives to model a customer's current Workspace deployment, configure a proposed contract, compare Gemini attach-rate scenarios, and create a shareable investment proposal. The app will preserve pricing inputs and calculation results with each quote so a saved proposal remains stable when the catalog changes.

**Core Value:** Reps can produce a trustworthy, scenario-based Workspace + Gemini quote with transparent pricing math and without guessing at unconfirmed prices.

### Constraints

- **Tech stack**: Use the versions and libraries specified in the source prompt unless a verified blocker requires a change.
- **Pricing correctness**: Use Decimal.js for all monetary and percentage calculations; customer per-seat prices round to two decimals with ROUND_HALF_DOWN before multiplying by seats.
- **Catalog integrity**: Store flexible and fixed-term prices explicitly per term; never derive missing prices or currencies from a ratio or another currency.
- **Business policy**: Keep discount defaults, caps, rebates, and catalog values in configuration rather than UI components.
- **Quote stability**: Save the catalog version, inputs, scenarios, and computed results with each quote.
- **Sharing**: Quote URLs are public read-only links; the seven-day validity date is informational and does not disable link access.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js | 22.12+ | Runtime and CI | Meets the current Vitest and Prisma minimums while remaining in Playwright’s documented Node support. Keep app routes that use Prisma or Chromium on the Node runtime, not Edge. |
| Next.js | 15.5.28 | App Router web app | Latest 15.5 patch observed in registry metadata; pin the 15.x line because the project explicitly requires Next.js 15. Use React/React DOM 19.x, the v15 App Router baseline. |
| TypeScript | Current 5.x, `strict: true` | Application types | Matches the requested strict TypeScript stack. Keep pricing inputs and results typed independently of React and database models. |
| Tailwind CSS | 4.3.3 | Styling | Current Tailwind Next.js guide uses the PostCSS plugin setup; current shadcn Next guide supports the App Router workflow. |
| shadcn/ui + Radix primitives | Current CLI-generated components | Accessible UI primitives | Treat shadcn as source-owned component code, not a versioned runtime component library. Generate only the needed components and keep Radix dependencies in the lockfile. |
| `lucide-react` | Current stable | Icons | Use as specified; no runtime or framework compatibility blocker identified. |

### Forms, State, and Pricing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `react-hook-form` | 7.91.0 | Wizard forms | Supports typed form state and standard/custom controls. |
| `zod` | 4.6.7 | Input schemas | Pair with the Zod v4 resolver; validate client inputs and repeat the authoritative validation on the server. |
| `@hookform/resolvers` | 6.0.0 | RHF/Zod bridge | Its maintained resolver documents both `zod` and `zod/v4` imports with inferred input/output types. |
| `zustand` | 5.0.16 | Wizard draft state | Appropriate for resumable client-side wizard state. Keep the store request/component scoped for App Router; persist only the draft subset to localStorage. |
| `decimal.js` | 10.6.0 | Pricing arithmetic | Arbitrary-precision decimal arithmetic supports the required `ROUND_HALF_DOWN` behavior. Build Decimal values from strings and keep the pure engine in `src/lib/pricing/`. |

### Database and Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | Managed PostgreSQL (Neon or Supabase) | Durable quote storage | Fits the relational quote/owner model. Use a pooled connection URL for serverless deployments. |
| Prisma ORM + `@prisma/client` | 7.10.1 | Schema, migrations, data access | Current v7 documentation covers PostgreSQL and Vercel deployment. Prisma 7 uses explicit driver-adapter configuration for the `pg` driver; include matching `@prisma/adapter-pg` and `pg`. |
| `next-auth` (Auth.js) | 4.24.15 stable | Google SSO | Prefer the current stable v4 for this Next.js 15 app: its official docs cover App Router `getServerSession`, and its peer range includes Next 15 and React 19. Use `@next-auth/prisma-adapter` 1.0.7 if persisting OAuth identities. |

### PDF and Tests

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Playwright Test | 1.64.1 | End-to-end happy path | Official E2E framework with browser automation and CI browser installation. Install matching Chromium binaries and OS dependencies in CI. |
| Vitest | 5.0.5 | Pricing-engine unit tests | Fit for isolated TypeScript tests without loading the Next runtime. Current Vitest requires Node 22.12+ and Vite 6.4+ (or supported later versions). |
| Playwright Chromium **or** `@react-pdf/renderer` | Pin with chosen renderer | Proposal PDF | Chromium rendering best matches the print-styled HTML preview; React PDF is the simplest deployment fallback when bundling a browser is unsuitable. |

## Compatibility and Deployment Constraints

- **Use Node 22.12+ consistently** in local development, CI, and deployment. Next.js 15.5 itself accepts older Node versions, but current Vitest and Prisma 7 impose the higher floor; Playwright’s current docs list Node 22/24/26.
- **Pin Next.js to 15.5.x and React to 19.x.** Do not use `next@latest`, which can move the project off its requested major. Next 15 also makes request APIs such as `cookies()`, `headers()`, `params`, and `searchParams` asynchronous; account for that in strict TypeScript code.
- **Zustand + App Router:** do not define a shared mutable module-global store for server requests or read/write it from React Server Components. Create it through a provider/store factory. Since localStorage exists only in the browser, gate persistence hydration on the client (or use persist middleware’s hydration controls) to avoid server/client markup mismatches.
- **Prisma + Vercel:** use the Node runtime, Prisma’s PostgreSQL driver adapter, a pooled database URL, and a singleton Prisma client per warm instance. Run `prisma generate` during install/build (`postinstall` is Prisma’s documented Vercel option); run `prisma migrate deploy` as a controlled deployment step, not as an uncontrolled preview side effect. Use a separate preview database.
- **Browser PDF export is the deployment risk.** Playwright needs separately installed matching browser binaries; PDF generation is a Chromium workflow. Vercel documents a 250 MB default uncompressed function bundle limit (larger-function support is separately constrained/preview), so do not assume a full browser fits in a standard route bundle. For Vercel, first validate function size and cold starts; prefer the allowed React-PDF fallback if needed. If HTML-to-PDF fidelity is essential, place the renderer in a browser-capable Node/Cloud Run worker and keep the Next.js app on Vercel.
- **Keep PDF and Prisma routes on Node.js runtime.** Do not move those handlers to Edge; native/browser binaries and the standard PostgreSQL driver setup require Node-compatible execution.
- **Tests:** use Vitest in the Node environment for the framework-free pricing module; install Playwright’s exact Chromium build in CI (for example, `playwright install --with-deps chromium`). Keep the e2e happy path separate from the decimal golden-fixture unit tests.
- **Quote stability:** persist catalog version, exact inputs, and computed results with each quote. Do not serialize Decimal instances as if they were native JSON numbers; store canonical decimal strings or the final normalized numeric/string representation.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth.js API | Stable NextAuth v4.24.15 + Prisma adapter | NextAuth v5 beta.32 | Current package tags show v5 remains beta; v4 already documents App Router server-session usage and supports Next 15/React 19. Only move to v5 after explicit prerelease acceptance and adapter verification. |
| PDF in serverless | React-PDF fallback on Vercel, or isolated Chromium worker when HTML fidelity is required | Bundle full Playwright/Puppeteer Chromium into the default Vercel function | Browser binaries, installed OS dependencies, and the default 250 MB bundle ceiling make this deployment-sensitive; validate before committing to it. |
| Test runner for pricing | Vitest 5 | Playwright component/E2E tests for calculation rules | E2E is slower and couples arithmetic tests to browser/runtime behavior. Keep Playwright for the requested user-flow check. |
| Tailwind | Tailwind 4 + current shadcn CLI setup | Tailwind 3 legacy setup | No blocker found for the current setup; use the current Next/shadcn path rather than carrying forward older configuration without a project constraint. |

## Installation Baseline

# Runtime

# Development and tests

# Generate shadcn components with the CLI and install the Radix/icon packages

# those selected components require; commit the generated source and lockfile.

## Sources

- [Next.js 15 installation and system requirements](https://nextjs.org/docs/15/app/getting-started/installation) — official docs; Node 18.18+ floor.
- [Next.js 15 upgrade guide](https://nextjs.org/docs/15/app/guides/upgrading/version-15) — official React 19 minimum and async request API changes.
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next) and [Tailwind + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
- [React Hook Form](https://react-hook-form.com/get-started) and [official RHF resolvers](https://github.com/react-hook-form/resolvers) — schema integration and Zod v4.
- [Zustand Next.js guide](https://zustand.docs.pmnd.rs/learn/guides/nextjs) and [persist middleware reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist).
- [Decimal.js](https://github.com/MikeMcl/decimal.js) — arbitrary-precision decimal API and rounding modes.
- [Prisma PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql) and [Prisma Vercel deployment](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-vercel) — adapter/deployment and pooling guidance.
- [Auth.js Google provider](https://authjs.dev/getting-started/providers/google), [Auth.js Prisma adapter](https://authjs.dev/getting-started/adapters/prisma), and [NextAuth v4 App Router guidance](https://next-auth.js.org/configuration/nextjs).
- [Playwright installation](https://playwright.dev/docs/intro), [browser installation](https://playwright.dev/docs/browsers), and [Page PDF API](https://playwright.dev/docs/api/class-page#page-pdf).
- [Vitest guide](https://vitest.dev/guide/), [Vercel Function limits](https://vercel.com/docs/functions/limitations).
- Registry metadata checked via npm for `next@15.5.28`, `vitest@5.0.5`, `prisma@7.10.1`, `next-auth@4.24.15`, and the package versions listed above; see [Next](https://www.npmjs.com/package/next), [NextAuth](https://www.npmjs.com/package/next-auth), [Vitest](https://www.npmjs.com/package/vitest), and [Prisma](https://www.npmjs.com/package/prisma).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.github/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
