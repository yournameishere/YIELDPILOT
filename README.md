# YieldPilot AI

YieldPilot AI is a Wave 3 production simulation app for DeFi yield management. It scans live yield markets, SoSoValue hot news, ETF flow history, SoSoValue Index snapshots, SoSoValue macro events, SoDEX ticker activity, and optional OpenAI reasoning, then builds a transparent simulated allocation with risk scoring and source health.

The app is simulation-first. It never moves real funds. Wallet connection is approval-context only, and strategy activation writes local simulation logs instead of executing transactions.

## Production Status

YieldPilot AI Wave 3 is complete, production-ready, and deployed on Vercel.

- Production URL: https://yieldpilot-ai.vercel.app
- Latest deployment URL: https://yieldpilot-4azupkdnq-nikkus-projects-d0d225f5.vercel.app
- Vercel deployment ID: `dpl_Cq725FoTYak4uxdMkTac9BZTgVcR`
- Deployment target: production
- Deployment state: ready
- Final verification date: July 19, 2026

Final live checks passed after deployment:

- Landing page returns `200`.
- `/api/yieldpilot/market?goal=balanced&amount=1000` returns `200` JSON.
- API cache behavior works: first request `X-YieldPilot-Cache: MISS`, repeated request `X-YieldPilot-Cache: HIT`.
- Response includes `mode: simulation`, 4 source-health entries, 8 live opportunities, risk history, and macro events.
- Browser smoke passed on the production alias: one page `h1`, console tabs work, Sources panel opens, live watchlist loads, and no browser console errors.

## Core Features

- Live DeFi yield discovery from DefiLlama.
- SoSoValue hot news, BTC/ETH ETF flow intelligence, SoSoValue Index snapshots, and macro calendar events.
- Macro risk overlay that adjusts market mood, confidence, stress-loss proxy, alerts, and protective-hold logic.
- SoDEX public spot ticker pulse from the configured testnet or mainnet endpoint.
- OpenAI Responses API strategy memo with deterministic fallback reasoning when the model call is unavailable.
- Strategy modes for Safe Yield, Balanced Growth, Aggressive Yield, Stablecoin Only, and AI Custom Strategy.
- Custom constraints for max risk, max APY, min TVL, max positions, stablecoin-only mode, rebalance threshold, and alert threshold.
- Transparent scoring by yield, TVL, reputation, stability, prediction signal, and risk penalty.
- Local browser persistence for portfolio snapshots, scan risk history, and simulation activity.
- Source-health reporting for DefiLlama, SoSoValue, SoDEX, and OpenAI.
- Exportable Wave 3 strategy memo JSON for judge review, demos, or audit notes.
- Accessibility hardening for console tabs, toggle state, mobile navigation, status updates, and reduced-motion users.
- Live metrics section backed by the same market API instead of static APY/protection placeholders.
- Protocol watchlist backed by live market opportunities and SoDEX fallback rows instead of static risk-map values.

## Wave 3 Final Touches

- Added a real SoSoValue `/macro/events` integration and a new Macro tab in the app console.
- Added `macroRiskLabel`, `macroRiskScore`, and typed `macroEvents` to the market response.
- Folded macro risk into market mood, risk events, alerts, confidence scoring, stress-loss estimates, rebalance reasoning, and OpenAI prompt payloads.
- Renamed the app response namespace from `wave2` to `wave3`.
- Added optional HTTPS server-side endpoint overrides for China/restricted-network deployments:
  `SOSOVALUE_BASE_URL`, `OPENAI_BASE_URL`, and `DEFILLAMA_POOLS_URL`.
- Switched from Google font fetching to the local `geist` font package for China-friendlier builds and runtime.
- Added `turbopack.root` to remove Next.js workspace-root inference warnings.
- Tightened mobile layout polish: root `overflow-x: clip`, safer display line-height, and breakpoint-based display type.
- Updated all visible Wave 2/MVP copy to Wave 3 production simulation language.
- Added bounded in-memory caches, transient OpenAI retry behavior, accessible tab/toggle state, reduced-motion support, live metrics, and focused engine tests.
- Deployed the final production version to Vercel and verified the live production alias end to end.

## Resolved Wave 3 Audit Issues

- Automated tests: added Vitest and focused engine tests for input normalization, constraint clamping, and secret-bearing error redaction.
- Heading semantics: the hero now has one real `h1` instead of separate heading elements for each animated line.
- Console accessibility: tabs expose `tablist`/`tab`/`tabpanel` semantics; goal/live polling/stable-only controls expose pressed state; analysis errors use an alert/live region.
- Mobile navigation: closed mobile links are removed from keyboard focus and the menu button exposes expanded/controlled state.
- Reduced motion: CSS animations and JavaScript animation loops now respect `prefers-reduced-motion`.
- Cache safety: API-route and engine caches now prune expired entries and enforce maximum sizes.
- OpenAI retry behavior: transient OpenAI failures are no longer cached as 60-second error responses.
- China/restricted-network readiness: SoSoValue, OpenAI, DefiLlama, and SoDEX can all use HTTPS regional proxy/base URLs from server environment variables.
- Production metrics: the metrics band now reads APY, confidence, source health, custody-risk mode, and risk trend from `/api/yieldpilot/market`.
- Production watchlist: the protocol risk map now derives rows, risk scores, and source status from `/api/yieldpilot/market`.
- Vercel deployment: added `vercel.json`, pinned pnpm through `packageManager`, and documented production verification.

## SoSoValue Integration Notes

Checked against the current SoSoValue docs:

- Base URL: `https://openapi.sosovalue.com/openapi/v1`
- Auth header: `x-soso-api-key: YOUR_API_KEY`
- Rate limit: 20 requests per minute per API key, 100,000 requests per month
- Hot news: `GET /news/hot`
- ETF flow history: `GET /etfs/summary-history`
- Index list: `GET /indices`
- Index market snapshot: `GET /indices/{index_ticker}/market-snapshot`
- Macro events: `GET /macro/events`

The server caches SoSoValue market bundles for 75 seconds and the API route response for 20 seconds to stay below the documented 20 requests/minute limit during normal polling. Both caches are bounded and prune expired entries to avoid unbounded per-process growth.

## Environment

Create `.env.local` from `.env.example`:

```bash
SOSOVALUE_API_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
SODEX_ENV=testnet
# Can be the official SoDEX base or an HTTPS regional proxy ending at the spot API base.
SODEX_SPOT_ENDPOINT=https://testnet-gw.sodex.dev/api/v1/spot
# Optional public README/source link used by the footer and developer panel.
NEXT_PUBLIC_REPOSITORY_URL=

# Optional server-side endpoint overrides for restricted networks or regional proxies.
SOSOVALUE_BASE_URL=https://openapi.sosovalue.com/openapi/v1
OPENAI_BASE_URL=https://api.openai.com/v1
DEFILLAMA_POOLS_URL=https://yields.llama.fi/pools
```

Do not commit real API keys. `SOSOVALUE_API_KEY` and `OPENAI_API_KEY` are server-only and are read inside `/api/yieldpilot/market`. `NEXT_PUBLIC_REPOSITORY_URL` is optional and intentionally public.

## China Readiness

- Runtime fonts are self-hosted through the `geist` package; the browser does not need Google Fonts.
- SoSoValue, OpenAI, DefiLlama, and SoDEX server endpoints can be changed through HTTPS-only environment variables for regional proxies.
- If an endpoint override is invalid, the app falls back to the documented default and reports that notice in source health.
- Missing or blocked providers degrade gracefully with visible source-health statuses instead of fake replacement data.

## Local Development

```bash
corepack pnpm install
corepack pnpm dev
```

Open `http://localhost:3000` unless the dev server chooses another free port.

Useful checks:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit --prod
```

## API Route

`GET /api/yieldpilot/market`

Common query params:

- `goal`: `safe`, `balanced`, `aggressive`, `stablecoin`, or `custom`
- `amount`: simulated capital in USD
- `stableOnly`: `true` or `false`
- `maxRisk`: risk ceiling from 15 to 90
- `maxApy`: APY ceiling from 3 to 80
- `minTvlUsd`: TVL floor from 500,000 to 500,000,000
- `maxPositions`: 1 to 6
- `rebalanceThresholdPct`: 2 to 30
- `alertRiskScore`: 20 to 95

Example:

```bash
curl "http://localhost:3000/api/yieldpilot/market?goal=custom&amount=1000&maxRisk=54&minTvlUsd=4000000&maxApy=24&stableOnly=true"
```

Response highlights:

- `portfolio`: simulated portfolio totals and current market mood
- `strategy`: allocation, rationale, rebalance actions, and rebalance decisions
- `market`: news, ETF flows, SoDEX tickers, SoSoValue Indexes, macro events, and macro risk
- `wave3`: snapshots, risk history, alerts, and analytics
- `sources`: provider health for DefiLlama, SoSoValue, SoDEX, and OpenAI

## Deployment

Current production deployment:

- Production URL: https://yieldpilot-ai.vercel.app
- Deployment URL: https://yieldpilot-4azupkdnq-nikkus-projects-d0d225f5.vercel.app
- Deployment ID: `dpl_Cq725FoTYak4uxdMkTac9BZTgVcR`

Required production environment variables:

- `SOSOVALUE_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SODEX_ENV`
- `SODEX_SPOT_ENDPOINT`

Optional production environment variables:

- `SOSOVALUE_BASE_URL`
- `OPENAI_BASE_URL`
- `DEFILLAMA_POOLS_URL`
- `NEXT_PUBLIC_REPOSITORY_URL`

This repo includes `vercel.json` with deterministic pnpm install/build commands and conservative response headers. The Next.js App Router market route keeps its own `export const maxDuration = 60`, which is the documented configuration path for Next.js route handlers on Vercel.

Deploy with:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
vercel --prod --yes
```

After deployment, verify:

- The landing page renders without a framework error overlay.
- `/api/yieldpilot/market?goal=balanced&amount=1000` returns JSON.
- The first API call has `X-YieldPilot-Cache: MISS`.
- A repeated identical API call within 20 seconds has `X-YieldPilot-Cache: HIT`.
- The Macro tab shows live macro events when `SOSOVALUE_API_KEY` is configured.
- The Sources tab shows provider health for DefiLlama, SoSoValue, SoDEX, and OpenAI.
- The Metrics section loads live values from `/api/yieldpilot/market` instead of static showcase values.
- The Risk Map/Protocol Watchlist section loads live opportunity rows from `/api/yieldpilot/market`.
- Browser smoke on the production alias shows zero console errors.

## Final Production Checklist

- [x] Final Vercel production deployment is live at https://yieldpilot-ai.vercel.app.
- [x] Production alias and generated deployment URL return `200`.
- [x] Production API route returns `200` and expected Wave 3 JSON.
- [x] Production API cache headers verify `MISS` then `HIT` behavior.
- [x] Production browser smoke verifies tab navigation, source panel rendering, live watchlist loading, one `h1`, and zero console errors.
- [x] Lint passes with zero warnings.
- [x] Vitest engine tests cover request normalization, constraint clamps, and secret redaction.
- [x] TypeScript typecheck passes.
- [x] Production build passes.
- [x] Next.js workspace-root warning fixed with `turbopack.root`.
- [x] SoSoValue docs checked for base URL, auth header, rate limit, Index endpoints, and Macro endpoints.
- [x] SoSoValue rate-limit protection kept through server-side caching.
- [x] Secrets stay server-side; no API keys are exposed to client components.
- [x] External news links are sanitized to HTTPS before rendering.
- [x] Provider failures degrade through source health instead of crashing the app.
- [x] China-ready font path uses local package fonts instead of Google-hosted runtime fonts.
- [x] Regional endpoint overrides are HTTPS-only and server-side.
- [x] SoDEX endpoint override supports HTTPS regional proxies for restricted-network deployments.
- [x] In-memory route and provider caches are bounded and prune expired entries.
- [x] OpenAI transient errors degrade gracefully without being cached as stale error payloads.
- [x] Console tabs, toggles, mobile menu, and status/error updates expose accessible state.
- [x] Reduced-motion users receive static canvas/section states instead of continuous animation loops.
- [x] Metrics section uses live API data rather than hardcoded APY/protection values.
- [x] Protocol watchlist uses live opportunity/source data rather than hardcoded risk-map rows.
- [x] Vercel production config added with deterministic pnpm commands and security headers.
- [x] Wave 3 macro risk feature is wired end to end through API, strategy engine, UI, alerts, analytics, and memo export.
- [x] Exported strategy memos include the live `market` bundle with SoSoValue macro events and source-backed signals.
- [x] User-facing app copy reflects the Wave 3 production simulation version.
- [x] Mobile console tabs wrap into a compact grid so every view is reachable without horizontal scrolling.
- [x] Mobile overflow hardening applied to the root layout.

## Safety Model

YieldPilot AI is educational software and not financial advice. Wave 3 remains simulation-only. Real execution belongs in a later phase after smart contract design, explicit user approvals, security review, and compliance review.

## Wave Roadmap

### Wave 1 - Prototype

- Landing page and initial app console.
- Wallet connect and simulation wallet.
- Live market intelligence and yield discovery.
- Simulated rebalance reasoning.

### Wave 2 - Functional MVP

- Persistent local snapshots and risk history.
- Manual and 45-second local polling.
- Alerts from source health, TVL, ETF flow, risk thresholds, and SoDEX volatility.
- Better analytics for projected yield, stress-loss proxy, confidence, and diversification.
- SoSoValue, SoSoValue Indexes, SoDEX, DefiLlama, and OpenAI represented in the engine.
- Provider quota protection and production deployment hardening.

### Wave 3 - Final Production Simulation

- Live SoSoValue macro calendar integration.
- Macro-aware risk events, alerts, analytics, and OpenAI reasoning payload.
- Dedicated Macro tab and macro source panel in the console.
- China-ready local fonts and endpoint override configuration.
- Response namespace updated to `wave3`.
- Final UI and README production-readiness pass.

### Later - Real Execution Direction

- Smart contract execution.
- Optional auto-rebalance approvals.
- AI chat assistant.
- Custom user rules.
- Strategy marketplace.
- Multi-chain expansion.
- External security audits.

## Documentation References

- SoSoValue API Introduction: https://sosovalue-1.gitbook.io/sosovalue-api-doc
- SoSoValue Rate Limit: https://sosovalue-1.gitbook.io/sosovalue-api-doc/rate-limit
- SoSoValue Index API: https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/index
- SoSoValue Macro API: https://sosovalue-1.gitbook.io/sosovalue-api-doc/8.-macro/macro
- SoSoValue Hot News: https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/hot-news
- SoSoValue ETF Summary History: https://sosovalue-1.gitbook.io/sosovalue-api-doc/2.-etf/summary-history
- SoDEX documentation: https://sodex.com/documentation
- Vercel `vercel.json` project configuration: https://vercel.com/docs/project-configuration/vercel-json
- Vercel function duration for Next.js App Router: https://vercel.com/docs/functions/configuring-functions/duration
