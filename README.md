# YieldPilot AI

YieldPilot AI is an autonomous DeFi yield manager built for Wave 1. It helps users answer one hard question: where can I place capital for better yield without blindly chasing risky APY?

The app is simulation-first. It does not move real funds in Wave 1. Users can connect a wallet or use a simulation wallet, choose a strategy goal, scan live markets, review the AI allocation plan, activate a simulated rebalance, and test a protective exit.

## What It Does

- Discovers live DeFi yield pools from DefiLlama.
- Reads SoSoValue market intelligence for hot crypto news and BTC/ETH ETF flow signals.
- Reads SoDEX public spot ticker data from the testnet endpoint.
- Scores opportunities by APY, TVL depth, stablecoin exposure, impermanent-loss risk, prediction confidence, protocol reputation, and market volatility.
- Builds a portfolio allocation for Safe Yield, Balanced Growth, Aggressive Yield, Stablecoin Only, or AI Custom Strategy.
- Explains why each allocation was chosen.
- Simulates strategy activation and protective exits without custody risk.

## Why It Matters

Most crypto users compare APY manually and often miss risk signals like thin TVL, volatile markets, negative news, or whale-style exits. YieldPilot acts like a transparent AI fund manager: it finds yield, filters danger, explains decisions, and keeps the user in control.

## How It Works

1. User enters simulated capital and chooses a goal.
2. The Next.js API route calls live data sources.
3. The market engine filters and scores yield pools.
4. The app builds a risk-adjusted allocation.
5. The UI displays portfolio metrics, AI rationale, market intelligence, SoDEX pulse, source health, and risk events.
6. The user can activate the strategy in simulation mode and test a protective exit.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS / shadcn-style components
- lucide-react icons
- DefiLlama Yields API
- SoSoValue OpenAPI
- SoDEX public market data

## Environment

Create `.env.local` from `.env.example`:

```bash
SOSOVALUE_API_KEY=your_sosovalue_api_key_here
SODEX_ENV=testnet
SODEX_SPOT_ENDPOINT=https://testnet-gw.sodex.dev/api/v1/spot
```

Do not commit real API keys. The SoSoValue key is read only on the server inside `/api/yieldpilot/market`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Wave Roadmap

### Wave 1 - Concept and Prototype

- Landing page with preserved animated hero style.
- Live app control room.
- Wallet connect plus simulation wallet fallback.
- Live DefiLlama APY discovery.
- Live SoSoValue news and ETF flow integration.
- Live SoDEX public market pulse.
- AI-style scoring, recommendation, reasoning, and simulated rebalancing.
- README and setup documentation.

### Wave 2 - Functional MVP

- Persist user portfolios in a database.
- Add historical APY, risk, and allocation charts.
- Stream real-time updates through WebSockets or server events.
- Add alerts for TVL drops, volatility spikes, and negative sentiment.
- Expand protocol coverage and strategy constraints.
- Add optional OpenAI-powered natural-language explanations.
- Add stronger testing around the scoring engine.

### Wave 3 - Advanced Product

- Smart contract integration for approved execution.
- User-defined rules such as max drawdown, stablecoin only, and blocked protocols.
- AI chat assistant for questions like "Why did you exit Pendle?"
- Strategy marketplace for shared AI strategies.
- Multi-chain support.
- Mobile responsive polish.
- Security review, audits, and guarded production rollout.

## Safety Note

YieldPilot AI is a hackathon prototype and educational simulation. It is not financial advice and does not execute real fund movement in Wave 1.
