# YieldPilot AI

YieldPilot AI is an autonomous DeFi yield manager built for Wave 1. It helps users answer one hard question: where can I place capital for better yield without blindly chasing risky APY?

The app is simulation-first. It does not move real funds in Wave 1. Users can connect a wallet or use a simulation wallet, choose a strategy goal, scan live markets, review the AI allocation plan, activate a simulated rebalance, and test a protective exit.

## What It Does

- Discovers live DeFi yield pools from DefiLlama.
- Reads SoSoValue market intelligence for hot crypto news and BTC/ETH ETF flow signals.
- Reads SoDEX public spot ticker data from the testnet endpoint.
- Scores opportunities by APY, TVL depth, stablecoin exposure, impermanent-loss risk, prediction confidence, protocol reputation, and market volatility.
- Uses OpenAI Responses API to generate the strategy memo from the live market payload.
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
- OpenAI Responses API

## Environment

Create `.env.local` from `.env.example`:

```bash
SOSOVALUE_API_KEY=your_sosovalue_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
SODEX_ENV=testnet
SODEX_SPOT_ENDPOINT=https://testnet-gw.sodex.dev/api/v1/spot
```

Do not commit real API keys. SoSoValue and OpenAI keys are read only on the server inside `/api/yieldpilot/market`.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Wave Roadmap

### 01 - Wave 1

Concept and prototype.

Status: **Built**  
Target: **Ready for Wave 1 demo**

- Landing page and app console.
- Wallet connect plus simulation wallet.
- Live SoSoValue market intelligence.
- Live DefiLlama APY discovery.
- SoDEX public market pulse.
- OpenAI strategy memo, AI reasoning, and rebalance logs.

Primary demo action: open the app, analyze the market, activate the simulation, and test a protective exit.

### 02 - Wave 2

Functional MVP.

Status: **Next**  
Target: **Functional MVP**

- Portfolio tracking database.
- Real-time market updates.
- Notifications and alerts.
- Risk scoring history.
- Better analytics charts.
- More DeFi protocol coverage.
- Deeper OpenAI-assisted explanations.

Primary goal: make the portfolio and risk engine persistent, observable, and useful over time.

### 03 - Wave 3

Advanced product.

Status: **Vision**  
Target: **Production direction**

- Smart contract execution.
- Optional auto-rebalance approvals.
- AI chat assistant.
- Custom user rules.
- Strategy marketplace.
- Multi-chain expansion.
- Mobile polish.
- Security review and audits.

Primary goal: move from a safe simulation prototype toward a reviewed, user-approved autonomous DeFi wealth manager.

## Safety Note

YieldPilot AI is a hackathon prototype and educational simulation. It is not financial advice and does not execute real fund movement in Wave 1.
