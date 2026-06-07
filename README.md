# YieldPilot AI

YieldPilot AI is a Wave 2 MVP for simulated DeFi yield management. It scans live yield markets, market intelligence, ETF flow signals, SoSoValue Indexes, and SoDEX ticker activity, then builds a transparent simulated allocation with risk scoring and AI-assisted reasoning.

The app is simulation-first. It never moves real funds. Wallet connection is approval-context only, and strategy activation writes local simulation logs instead of executing transactions.

## Core Features

- Live DeFi yield discovery from DefiLlama.
- SoSoValue hot news, BTC/ETH ETF flow intelligence, and SoSoValue Index snapshots.
- SoDEX public spot ticker pulse from the configured testnet or mainnet endpoint.
- OpenAI Responses API strategy memo with deterministic fallback reasoning when the model call is unavailable.
- Strategy modes for Safe Yield, Balanced Growth, Aggressive Yield, Stablecoin Only, and AI Custom Strategy.
- Custom constraints for max risk, max APY, min TVL, max positions, stablecoin-only mode, rebalance threshold, and alert threshold.
- Transparent scoring by yield, TVL, reputation, stability, prediction signal, and risk penalty.
- Local browser persistence for portfolio snapshots, scan risk history, and simulation activity.
- Source-health reporting for DefiLlama, SoSoValue, SoDEX, and OpenAI.
- Exportable strategy memo JSON for judge review or demo notes.

## Wave 2 Improvements

- Reworked the console into an app-style workspace with Strategy, Risk, Analytics, and Sources tabs.
- Added provider and route-level caching so repeated scans do not rapidly exhaust SoSoValue or OpenAI quota.
- Added `X-YieldPilot-Cache` response headers for local verification of cache hits and misses.
- Added Vercel function duration hardening for the market API route.
- Added real ESLint checks with Next.js core-web-vitals and TypeScript rules.
- Persisted real scan risk-history samples locally instead of only showing a synthetic response proxy.
- Sanitized external news links before rendering them in the browser.
- Redacted provider error messages before sending details to the UI.
- Added source health and alerts for missing keys, degraded providers, and provider failures.
- Updated public repository links through `NEXT_PUBLIC_REPOSITORY_URL`.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS / shadcn-style components
- lucide-react icons
- DefiLlama Yields API
- SoSoValue OpenAPI
- SoSoValue Index API
- SoDEX public market data
- OpenAI Responses API
- Vercel deployment target

## Environment

Create `.env.local` from `.env.example`:

```bash
SOSOVALUE_API_KEY=your_sosovalue_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
SODEX_ENV=testnet
SODEX_SPOT_ENDPOINT=https://testnet-gw.sodex.dev/api/v1/spot
NEXT_PUBLIC_REPOSITORY_URL=https://github.com/yournameishere/YIELDPILOT
```

Do not commit real API keys. `SOSOVALUE_API_KEY` and `OPENAI_API_KEY` are server-only and are read inside `/api/yieldpilot/market`. `NEXT_PUBLIC_REPOSITORY_URL` is intentionally public.

## Local Development

```bash
corepack pnpm install
corepack pnpm dev
```

Open `http://localhost:3000` unless the dev server chooses another free port.

Useful checks:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm audit --prod
```

## Deployment

The project is linked to Vercel through `.vercel/project.json`.

Required Vercel environment variables for production:

- `SOSOVALUE_API_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SODEX_ENV`
- `SODEX_SPOT_ENDPOINT`
- `NEXT_PUBLIC_REPOSITORY_URL`

Deploy with:

```bash
vercel --prod
```

After deployment, verify:

- The landing page renders without a framework error overlay.
- `/api/yieldpilot/market?goal=balanced&amount=1000` returns JSON.
- The first API call has `X-YieldPilot-Cache: MISS`.
- A repeated identical API call has `X-YieldPilot-Cache: HIT`.
- The Sources tab shows provider health for DefiLlama, SoSoValue, SoDEX, and OpenAI.

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

## Safety Model

YieldPilot AI is educational software and not financial advice. Wave 2 remains simulation-only. Real execution belongs in a later phase after smart contract design, explicit user approvals, security review, and compliance review.

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

### Wave 3 - Production Direction

- Smart contract execution.
- Optional auto-rebalance approvals.
- AI chat assistant.
- Custom user rules.
- Strategy marketplace.
- Multi-chain expansion.
- Mobile polish.
- Security audits.

## Documentation References

- SoSoValue API: https://sosovalue-1.gitbook.io/sosovalue-api-doc
- SoSoValue Indexes: https://ssi.sosovalue.com/en
- SoDEX documentation: https://sodex.com/documentation
