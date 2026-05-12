import type {
  DataSourceStatus,
  EtfFlowPoint,
  MarketPulse,
  NewsItem,
  OpenAiInsight,
  RiskEvent,
  SourceStatus,
  SodexTicker,
  StrategyAllocation,
  StrategyGoal,
  YieldOpportunity,
  YieldPilotMarketResponse,
  YieldPilotStrategy,
} from "@/lib/yieldpilot/types";

const SOSOVALUE_BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

const SODEX_ENDPOINTS = {
  testnet: {
    spot: "https://testnet-gw.sodex.dev/api/v1/spot",
    perps: "https://testnet-gw.sodex.dev/api/v1/perps",
  },
  mainnet: {
    spot: "https://mainnet-gw.sodex.dev/api/v1/spot",
    perps: "https://mainnet-gw.sodex.dev/api/v1/perps",
  },
};

const GOAL_CONFIG: Record<
  StrategyGoal,
  {
    label: string;
    stableOnly: boolean;
    maxRisk: number;
    maxApy: number;
    minTvlUsd: number;
    yieldBias: number;
    riskPenalty: number;
    allocationPower: number;
  }
> = {
  safe: {
    label: "Safe Yield",
    stableOnly: true,
    maxRisk: 40,
    maxApy: 16,
    minTvlUsd: 20_000_000,
    yieldBias: 0.75,
    riskPenalty: 1.25,
    allocationPower: 0.9,
  },
  balanced: {
    label: "Balanced Growth",
    stableOnly: true,
    maxRisk: 58,
    maxApy: 26,
    minTvlUsd: 5_000_000,
    yieldBias: 1,
    riskPenalty: 0.9,
    allocationPower: 1,
  },
  aggressive: {
    label: "Aggressive Yield",
    stableOnly: false,
    maxRisk: 74,
    maxApy: 48,
    minTvlUsd: 1_500_000,
    yieldBias: 1.35,
    riskPenalty: 0.55,
    allocationPower: 1.2,
  },
  stablecoin: {
    label: "Stablecoin Only",
    stableOnly: true,
    maxRisk: 46,
    maxApy: 20,
    minTvlUsd: 10_000_000,
    yieldBias: 0.9,
    riskPenalty: 1.05,
    allocationPower: 0.95,
  },
  custom: {
    label: "AI Custom Strategy",
    stableOnly: true,
    maxRisk: 54,
    maxApy: 24,
    minTvlUsd: 4_000_000,
    yieldBias: 1.05,
    riskPenalty: 0.85,
    allocationPower: 1.05,
  },
};

const PREFERRED_CHAINS = new Set([
  "Ethereum",
  "Arbitrum",
  "Base",
  "Optimism",
  "Polygon",
  "Avalanche",
  "Solana",
]);

const REPUTATION_BONUS: Record<string, number> = {
  "aave-v3": 12,
  "aave-v2": 10,
  compound: 9,
  "compound-v3": 10,
  spark: 9,
  morpho: 7,
  pendle: 5,
  ethena: 5,
  "ethena-usde": 5,
  makerdao: 7,
  sky: 7,
  "curve-dex": 6,
  "convex-finance": 5,
  yearn: 4,
  fluid: 4,
};

interface DefiLlamaPool {
  chain?: string;
  project?: string;
  symbol?: string;
  tvlUsd?: number;
  apyBase?: number | null;
  apyReward?: number | null;
  apy?: number;
  pool?: string;
  apyPct1D?: number | null;
  apyPct7D?: number | null;
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  predictions?: {
    predictedClass?: string;
    predictedProbability?: number;
    binnedConfidence?: number;
  } | null;
  sigma?: number | null;
  outlier?: boolean;
}

interface DefiLlamaPoolsResponse {
  status?: string;
  data?: DefiLlamaPool[];
}

interface SosoEnvelope<T> {
  code?: number;
  message?: string;
  msg?: string;
  data?: T;
}

interface SosoNewsRaw {
  id?: string | number;
  source_link?: string;
  release_time?: string | number;
  create_time?: string | number;
  title?: string;
  content?: string;
}

interface SosoNewsPage {
  page?: number;
  page_size?: number;
  total?: string | number;
  list?: SosoNewsRaw[];
}

interface SosoEtfRaw {
  date?: string;
  total_net_inflow?: number;
  total_net_assets?: number;
}

interface SodexEnvelope<T> {
  code?: number;
  timestamp?: number;
  data?: T;
}

interface SodexTickerRaw {
  symbol?: string;
  lastPx?: string;
  changePct?: number | string;
  quoteVolume?: string;
}

interface OpenAiResponsePayload {
  model?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
}

interface OpenAiDecisionJson {
  headline?: string;
  summary?: string;
  recommendation?: string;
  riskNote?: string;
  nextAction?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function displayName(value: string | undefined) {
  if (!value) return "Unknown";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripHtml(input: string | undefined) {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSummary(input: string | undefined, max = 190) {
  const text = stripHtml(input);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function compactLine(input: string | undefined, fallback: string, max = 170) {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length <= max ? text : `${text.slice(0, max).trim()}...`;
}

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function scoreRisk(pool: DefiLlamaPool) {
  const apy = asNumber(pool.apy);
  const tvlUsd = asNumber(pool.tvlUsd);
  const sigma = asNumber(pool.sigma);
  const project = pool.project ?? "";
  const prediction = pool.predictions?.predictedClass?.toLowerCase() ?? "";

  let risk = 16;

  if (!pool.stablecoin) risk += 18;
  if (pool.outlier) risk += 10;
  if (pool.ilRisk && pool.ilRisk !== "no") risk += 12;

  if (apy > 35) risk += 26;
  else if (apy > 24) risk += 18;
  else if (apy > 15) risk += 9;

  if (tvlUsd < 1_000_000) risk += 30;
  else if (tvlUsd < 5_000_000) risk += 20;
  else if (tvlUsd < 20_000_000) risk += 10;
  else if (tvlUsd > 250_000_000) risk -= 6;

  if (sigma > 0.5) risk += 16;
  else if (sigma > 0.2) risk += 10;
  else if (sigma > 0.08) risk += 5;

  if (prediction.includes("down")) risk += 8;
  if (prediction.includes("stable") || prediction.includes("up")) risk -= 4;
  risk -= REPUTATION_BONUS[project] ?? 0;

  return clamp(Math.round(risk), 4, 92);
}

function riskLevel(score: number): YieldOpportunity["riskLevel"] {
  if (score < 34) return "Low";
  if (score < 62) return "Medium";
  return "High";
}

function buildNotes(pool: DefiLlamaPool, riskScore: number) {
  const notes: string[] = [];
  const tvlUsd = asNumber(pool.tvlUsd);

  if (pool.stablecoin) notes.push("Stablecoin pool");
  if (tvlUsd >= 250_000_000) notes.push("Deep TVL");
  if ((pool.predictions?.predictedProbability ?? 0) >= 65) {
    notes.push(`${pool.predictions?.predictedClass ?? "Model"} confidence`);
  }
  if ((REPUTATION_BONUS[pool.project ?? ""] ?? 0) > 0) notes.push("Recognized protocol");
  if (riskScore >= 62) notes.push("Position capped by risk engine");

  return notes.length > 0 ? notes : ["Live APY and TVL scanned"];
}

function opportunityScore(pool: DefiLlamaPool, riskScore: number, goal: StrategyGoal) {
  const config = GOAL_CONFIG[goal];
  const apy = asNumber(pool.apy);
  const tvlUsd = asNumber(pool.tvlUsd);
  const tvlScore = clamp(Math.log10(Math.max(tvlUsd, 1)) * 4, 0, 36);
  const reputation = REPUTATION_BONUS[pool.project ?? ""] ?? 0;
  const stableBonus = pool.stablecoin ? 7 : 0;
  const predictionBonus = pool.predictions?.predictedClass?.includes("Stable") ? 3 : 0;
  return round(
    apy * config.yieldBias + tvlScore + reputation + stableBonus + predictionBonus - riskScore * config.riskPenalty,
    3,
  );
}

function normalizeOpportunities(pools: DefiLlamaPool[], goal: StrategyGoal) {
  const config = GOAL_CONFIG[goal];

  return pools
    .filter((pool) => {
      const apy = asNumber(pool.apy);
      const tvlUsd = asNumber(pool.tvlUsd);
      if (!pool.project || !pool.symbol || !pool.chain || !pool.pool) return false;
      if (!PREFERRED_CHAINS.has(pool.chain)) return false;
      if (config.stableOnly && !pool.stablecoin) return false;
      if (tvlUsd < config.minTvlUsd) return false;
      if (apy <= 0.15 || apy > config.maxApy) return false;
      if (pool.outlier) return false;
      return true;
    })
    .map((pool): YieldOpportunity => {
      const riskScore = scoreRisk(pool);
      const score = opportunityScore(pool, riskScore, goal);

      return {
        id: pool.pool ?? `${pool.project}-${pool.chain}-${pool.symbol}`,
        protocol: displayName(pool.project),
        chain: pool.chain ?? "Unknown",
        asset: pool.symbol ?? "Unknown",
        apy: round(asNumber(pool.apy), 2),
        tvlUsd: Math.round(asNumber(pool.tvlUsd)),
        riskScore,
        riskLevel: riskLevel(riskScore),
        score,
        stablecoin: Boolean(pool.stablecoin),
        ilRisk: pool.ilRisk ?? "unknown",
        exposure: pool.exposure ?? "unknown",
        confidence: Math.round(asNumber(pool.predictions?.predictedProbability, 50)),
        notes: buildNotes(pool, riskScore),
      };
    })
    .filter((opportunity) => opportunity.riskScore <= config.maxRisk)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function buildAllocation(opportunities: YieldOpportunity[], amountUsd: number, goal: StrategyGoal) {
  const selected = opportunities.slice(0, goal === "aggressive" ? 4 : 3);
  const config = GOAL_CONFIG[goal];
  const scoreBase = selected.map((opportunity) =>
    Math.max(1, Math.pow(Math.max(opportunity.score + 50, 1), config.allocationPower)),
  );
  const totalScore = scoreBase.reduce((sum, value) => sum + value, 0) || 1;

  let allocated = 0;
  return selected.map((opportunity, index): StrategyAllocation => {
    const rawWeight = (scoreBase[index] / totalScore) * 100;
    const weight = index === selected.length - 1 ? round(100 - allocated, 1) : round(rawWeight, 1);
    allocated += weight;

    const reasonParts = [
      `${opportunity.apy}% live APY`,
      `${opportunity.riskLevel.toLowerCase()} risk`,
      opportunity.tvlUsd > 100_000_000 ? "deep TVL" : "risk-adjusted fit",
    ];

    return {
      protocol: opportunity.protocol,
      chain: opportunity.chain,
      asset: opportunity.asset,
      weight,
      amountUsd: round((amountUsd * weight) / 100, 2),
      apy: opportunity.apy,
      riskScore: opportunity.riskScore,
      reason: reasonParts.join(", "),
    };
  });
}

function sentimentFromNews(news: NewsItem[]) {
  const positive = [
    "surge",
    "inflow",
    "record",
    "launch",
    "approval",
    "rally",
    "strong",
    "growth",
    "bullish",
    "adoption",
    "mainnet",
    "partnership",
  ];
  const negative = [
    "hack",
    "exploit",
    "outflow",
    "lawsuit",
    "decline",
    "crash",
    "liquidation",
    "bearish",
    "selloff",
    "investigation",
    "risk",
    "withdrawal",
  ];

  let score = 0;
  for (const item of news) {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    for (const word of positive) if (text.includes(word)) score += 1;
    for (const word of negative) if (text.includes(word)) score -= 1;
  }

  return clamp(score * 12, -100, 100);
}

function normalizeNews(rawPage: SosoNewsPage | undefined): NewsItem[] {
  return (rawPage?.list ?? []).slice(0, 8).map((item) => {
    const timestamp = asNumber(item.release_time ?? item.create_time, Date.now());

    return {
      id: String(item.id ?? item.title ?? timestamp),
      title: item.title ?? "Untitled SoSoValue item",
      sourceLink: item.source_link ?? "https://sosovalue.com",
      releaseTime: new Date(timestamp).toISOString(),
      summary: compactSummary(item.content, 220),
    };
  });
}

function normalizeEtfFlows(symbol: string, rawRows: SosoEtfRaw[] | undefined): EtfFlowPoint[] {
  return (rawRows ?? []).slice(0, 5).map((row) => ({
    symbol,
    date: row.date ?? "unknown",
    netInflowUsd: round(asNumber(row.total_net_inflow), 2),
    totalAssetsUsd: round(asNumber(row.total_net_assets), 2),
  }));
}

function normalizeSodexTickers(rows: SodexTickerRaw[] | undefined): SodexTicker[] {
  return (rows ?? [])
    .map((row) => ({
      symbol: row.symbol ?? "UNKNOWN",
      lastPrice: asNumber(row.lastPx),
      changePct: round(asNumber(row.changePct), 3),
      quoteVolume: round(asNumber(row.quoteVolume), 2),
    }))
    .filter((ticker) => ticker.lastPrice > 0)
    .sort((a, b) => b.quoteVolume - a.quoteVolume)
    .slice(0, 8);
}

function unwrapSoso<T>(payload: SosoEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const envelope = payload as SosoEnvelope<T>;
    if (typeof envelope.code === "number" && envelope.code !== 0) {
      throw new Error(envelope.message ?? envelope.msg ?? "SoSoValue request failed");
    }
    return envelope.data as T;
  }
  return payload as T;
}

async function getDefiLlamaOpportunities(goal: StrategyGoal) {
  const payload = await fetchJson<DefiLlamaPoolsResponse>(DEFILLAMA_POOLS_URL, undefined, 15_000);
  return normalizeOpportunities(payload.data ?? [], goal);
}

async function getSosoMarket(apiKey: string | undefined) {
  const source: DataSourceStatus = {
    name: "SoSoValue",
    status: "missing_key",
    detail: "Set SOSOVALUE_API_KEY to enable live news and ETF flow intelligence.",
  };

  if (!apiKey) {
    return {
      source,
      news: [] as NewsItem[],
      etfFlows: [] as EtfFlowPoint[],
    };
  }

  try {
    const headers = { "x-soso-api-key": apiKey };
    const [newsPayload, btcPayload, ethPayload] = await Promise.all([
      fetchJson<SosoEnvelope<SosoNewsPage>>(
        `${SOSOVALUE_BASE_URL}/news/hot?page=1&page_size=8&language=en`,
        { headers },
        12_000,
      ),
      fetchJson<SosoEnvelope<SosoEtfRaw[]>>(
        `${SOSOVALUE_BASE_URL}/etfs/summary-history?symbol=BTC&country_code=US&limit=5`,
        { headers },
        12_000,
      ),
      fetchJson<SosoEnvelope<SosoEtfRaw[]>>(
        `${SOSOVALUE_BASE_URL}/etfs/summary-history?symbol=ETH&country_code=US&limit=5`,
        { headers },
        12_000,
      ),
    ]);

    const news = normalizeNews(unwrapSoso(newsPayload));
    const etfFlows = [
      ...normalizeEtfFlows("BTC", unwrapSoso(btcPayload)),
      ...normalizeEtfFlows("ETH", unwrapSoso(ethPayload)),
    ];

    return {
      source: {
        name: "SoSoValue",
        status: "live" as const,
        detail: "Hot crypto news plus BTC/ETH ETF flow summaries are live.",
        updatedAt: new Date().toISOString(),
      },
      news,
      etfFlows,
    };
  } catch (error) {
    return {
      source: {
        name: "SoSoValue",
        status: "error" as const,
        detail: error instanceof Error ? error.message : "SoSoValue request failed.",
      },
      news: [] as NewsItem[],
      etfFlows: [] as EtfFlowPoint[],
    };
  }
}

async function getSodexTickers() {
  const env = process.env.SODEX_ENV === "mainnet" ? "mainnet" : "testnet";
  const configuredEndpoint = process.env.SODEX_SPOT_ENDPOINT;
  const spotEndpoint = configuredEndpoint ?? SODEX_ENDPOINTS[env].spot;

  try {
    const payload = await fetchJson<SodexEnvelope<SodexTickerRaw[]>>(`${spotEndpoint}/markets/tickers`, undefined, 12_000);
    if (payload.code !== 0) throw new Error("SoDEX ticker request returned a non-zero code.");

    return {
      source: {
        name: "SoDEX",
        status: "live" as const,
        detail: `${env} public spot ticker feed is live.`,
        updatedAt: new Date(payload.timestamp ?? Date.now()).toISOString(),
      },
      tickers: normalizeSodexTickers(payload.data),
    };
  } catch (error) {
    return {
      source: {
        name: "SoDEX",
        status: "error" as const,
        detail: error instanceof Error ? error.message : "SoDEX ticker request failed.",
      },
      tickers: [] as SodexTicker[],
    };
  }
}

function buildMarketPulse(news: NewsItem[], etfFlows: EtfFlowPoint[], sodexTickers: SodexTicker[]): MarketPulse {
  const newsSentiment = sentimentFromNews(news);
  const latestBySymbol = new Map<string, EtfFlowPoint>();
  for (const point of etfFlows) {
    if (!latestBySymbol.has(point.symbol)) latestBySymbol.set(point.symbol, point);
  }

  const etfNetFlowUsd = Array.from(latestBySymbol.values()).reduce((sum, item) => sum + item.netInflowUsd, 0);
  const etfFlowDirection =
    etfFlows.length === 0 ? "unknown" : etfNetFlowUsd > 2_000_000 ? "inflow" : etfNetFlowUsd < -2_000_000 ? "outflow" : "flat";

  const sodexAverageMovePct =
    sodexTickers.length === 0
      ? 0
      : sodexTickers.reduce((sum, ticker) => sum + ticker.changePct, 0) / sodexTickers.length;
  const averageAbsoluteMove =
    sodexTickers.length === 0
      ? 0
      : sodexTickers.reduce((sum, ticker) => sum + Math.abs(ticker.changePct), 0) / sodexTickers.length;

  const moodScore = clamp(
    50 +
      newsSentiment * 0.22 +
      clamp(etfNetFlowUsd / 100_000_000, -16, 16) +
      clamp(sodexAverageMovePct * 2.2, -12, 12),
    0,
    100,
  );

  const moodLabel =
    moodScore >= 78 ? "Bullish" : moodScore >= 60 ? "Constructive" : moodScore >= 42 ? "Neutral" : "Risk-Off";
  const volatilityLabel = averageAbsoluteMove >= 6 ? "Elevated" : averageAbsoluteMove >= 2.5 ? "Active" : "Calm";

  return {
    moodLabel,
    moodScore: Math.round(moodScore),
    volatilityLabel,
    newsSentiment: Math.round(newsSentiment),
    etfNetFlowUsd: round(etfNetFlowUsd, 2),
    etfFlowDirection,
    sodexAverageMovePct: round(sodexAverageMovePct, 3),
    news,
    etfFlows,
    sodexTickers,
  };
}

function buildRiskEvents(
  market: MarketPulse,
  opportunities: YieldOpportunity[],
  sources: DataSourceStatus[],
): RiskEvent[] {
  const events: RiskEvent[] = [];
  const topRisk = opportunities.find((opportunity) => opportunity.riskScore >= 55);

  if (market.etfFlowDirection === "outflow") {
    events.push({
      level: "watch",
      title: "ETF flow pressure",
      detail: `BTC/ETH ETF net flow is ${Math.round(market.etfNetFlowUsd).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })}. YieldPilot reduces exposure to higher beta pools.`,
    });
  }

  if (market.volatilityLabel === "Elevated") {
    events.push({
      level: "warning",
      title: "SoDEX volatility spike",
      detail: `Average tracked SoDEX move is ${market.sodexAverageMovePct}%. Rebalance simulation is ready to exit unstable legs.`,
    });
  }

  if (topRisk) {
    events.push({
      level: "watch",
      title: "Allocation cap active",
      detail: `${topRisk.protocol} is attractive but risk score ${topRisk.riskScore} caps its allocation.`,
    });
  }

  for (const source of sources) {
    if (source.status === "error" || source.status === "missing_key") {
      events.push({
        level: source.status === "error" ? "warning" : "info",
        title: `${source.name} source ${source.status === "missing_key" ? "not configured" : "degraded"}`,
        detail: source.detail,
      });
    }
  }

  if (events.length === 0) {
    events.push({
      level: "info",
      title: "No critical exits",
      detail: "Live APY, TVL, ETF flow, news, and SoDEX checks do not require an emergency rebalance.",
    });
  }

  return events.slice(0, 5);
}

function deterministicInsight(
  strategy: YieldPilotStrategy,
  market: MarketPulse,
  opportunities: YieldOpportunity[],
  status: SourceStatus,
  detail: string,
  model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini",
): OpenAiInsight {
  const top = strategy.allocation[0];
  const headline = top
    ? `${strategy.goalLabel}: lead with ${top.protocol} ${top.asset}`
    : `${strategy.goalLabel}: waiting for qualified pools`;
  const bestPool = opportunities[0];

  return {
    provider: "OpenAI",
    model,
    status,
    headline,
    summary: top
      ? `YieldPilot found ${opportunities.length} live pools and built a ${strategy.estimatedApy}% APY simulation with ${strategy.riskScore}/100 blended risk.`
      : "YieldPilot did not find enough qualified live pools for the selected risk profile.",
    recommendation: top
      ? `Keep the current simulated allocation led by ${top.protocol}; it has ${top.apy}% APY, ${top.riskScore}/100 risk, and fits the ${strategy.goalLabel.toLowerCase()} profile.`
      : "Refresh the market scan or choose a less restrictive goal before activating a strategy.",
    riskNote: bestPool
      ? `Market mood is ${market.moodLabel.toLowerCase()}, SoDEX volatility is ${market.volatilityLabel.toLowerCase()}, and the top watched pool risk is ${bestPool.riskScore}/100.`
      : `Market mood is ${market.moodLabel.toLowerCase()} with ${market.volatilityLabel.toLowerCase()} volatility, but no allocation passed filters.`,
    nextAction: detail,
  };
}

function extractOpenAiText(payload: OpenAiResponsePayload) {
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text) return part.text;
    }
  }
  return "";
}

function parseOpenAiDecision(raw: string): OpenAiDecisionJson {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(trimmed) as OpenAiDecisionJson;
  return parsed;
}

async function getOpenAiInsight(
  strategy: YieldPilotStrategy,
  market: MarketPulse,
  opportunities: YieldOpportunity[],
): Promise<{ source: DataSourceStatus; insight: OpenAiInsight }> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

  if (!apiKey) {
    return {
      source: {
        name: "OpenAI",
        status: "missing_key",
        detail: "Set OPENAI_API_KEY to enable model-generated strategy reasoning.",
      },
      insight: deterministicInsight(
        strategy,
        market,
        opportunities,
        "missing_key",
        "OpenAI key missing; deterministic live-data explanation is active.",
        model,
      ),
    };
  }

  const promptPayload = {
    strategy: {
      goal: strategy.goalLabel,
      estimatedApy: strategy.estimatedApy,
      blendedRisk: strategy.riskScore,
      dailyYieldUsd: strategy.dailyYieldUsd,
      allocation: strategy.allocation,
    },
    market: {
      mood: market.moodLabel,
      moodScore: market.moodScore,
      volatility: market.volatilityLabel,
      etfFlowDirection: market.etfFlowDirection,
      etfNetFlowUsd: market.etfNetFlowUsd,
      sodexAverageMovePct: market.sodexAverageMovePct,
      latestNews: market.news.slice(0, 3).map((item) => item.title),
      topSodexTickers: market.sodexTickers.slice(0, 4),
    },
    topOpportunities: opportunities.slice(0, 5),
  };

  try {
    const response = await fetchJson<OpenAiResponsePayload>(
      `${OPENAI_BASE_URL}/responses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions:
            "You are YieldPilot AI, an autonomous DeFi yield risk analyst. Use only the supplied JSON. Do not invent protocols, APYs, prices, or news. This is simulation-only and not financial advice. Return strict JSON only with keys: headline, summary, recommendation, riskNote, nextAction.",
          input: `Create a concise strategy explanation from this live payload:\n${JSON.stringify(promptPayload)}`,
          max_output_tokens: 420,
          temperature: 0.2,
        }),
      },
      20_000,
    );

    if (response.error?.message) throw new Error(response.error.message);

    const text = extractOpenAiText(response);
    const parsed = parseOpenAiDecision(text);
    const resolvedModel = response.model ?? model;

    return {
      source: {
        name: "OpenAI",
        status: "live",
        detail: `Responses API generated strategy reasoning with ${resolvedModel}.`,
        updatedAt: new Date().toISOString(),
      },
      insight: {
        provider: "OpenAI",
        model: resolvedModel,
        status: "live",
        headline: compactLine(parsed.headline, deterministicInsight(strategy, market, opportunities, "live", "", resolvedModel).headline, 90),
        summary: compactLine(parsed.summary, deterministicInsight(strategy, market, opportunities, "live", "", resolvedModel).summary),
        recommendation: compactLine(
          parsed.recommendation,
          deterministicInsight(strategy, market, opportunities, "live", "", resolvedModel).recommendation,
        ),
        riskNote: compactLine(parsed.riskNote, deterministicInsight(strategy, market, opportunities, "live", "", resolvedModel).riskNote),
        nextAction: compactLine(
          parsed.nextAction,
          "Activate the simulation only after reviewing the allocation and source health.",
          150,
        ),
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "OpenAI request failed.";
    return {
      source: {
        name: "OpenAI",
        status: "error",
        detail,
      },
      insight: deterministicInsight(
        strategy,
        market,
        opportunities,
        "error",
        `OpenAI unavailable; deterministic live-data explanation is active. ${detail}`,
        model,
      ),
    };
  }
}

function buildStrategy(
  goal: StrategyGoal,
  amountUsd: number,
  opportunities: YieldOpportunity[],
  market: MarketPulse,
): YieldPilotStrategy {
  const allocation = buildAllocation(opportunities, amountUsd, goal);
  const estimatedApy =
    allocation.length === 0 ? 0 : allocation.reduce((sum, item) => sum + (item.apy * item.weight) / 100, 0);
  const riskScore =
    allocation.length === 0 ? 0 : allocation.reduce((sum, item) => sum + (item.riskScore * item.weight) / 100, 0);
  const dailyYieldUsd = (amountUsd * estimatedApy) / 100 / 365;

  const rationale = [
    `Goal profile: ${GOAL_CONFIG[goal].label}.`,
    `Market mood is ${market.moodLabel.toLowerCase()} with ${market.volatilityLabel.toLowerCase()} volatility.`,
    `Allocation favors live APY after TVL, protocol reputation, and instability penalties.`,
  ];

  if (market.etfFlowDirection !== "unknown") {
    rationale.push(`ETF flow is ${market.etfFlowDirection}, net ${Math.round(market.etfNetFlowUsd).toLocaleString("en-US")} USD.`);
  }

  return {
    goal,
    goalLabel: GOAL_CONFIG[goal].label,
    estimatedApy: round(estimatedApy, 2),
    riskScore: Math.round(riskScore),
    dailyYieldUsd: round(dailyYieldUsd, 2),
    allocation,
    rationale,
    rebalanceActions: allocation.map(
      (item) => `Allocate ${item.weight}% to ${item.protocol} ${item.asset} on ${item.chain} because ${item.reason}.`,
    ),
  };
}

export function normalizeGoal(value: string | null): StrategyGoal {
  if (value === "safe" || value === "balanced" || value === "aggressive" || value === "stablecoin" || value === "custom") {
    return value;
  }
  return "balanced";
}

export function normalizeAmount(value: string | null) {
  const amount = asNumber(value, 1_000);
  return clamp(Math.round(amount * 100) / 100, 100, 1_000_000);
}

export async function buildYieldPilotMarket(goal: StrategyGoal, amountUsd: number): Promise<YieldPilotMarketResponse> {
  const sourceStatuses: DataSourceStatus[] = [];

  const [opportunitiesResult, sosoResult, sodexResult] = await Promise.allSettled([
    getDefiLlamaOpportunities(goal),
    getSosoMarket(process.env.SOSOVALUE_API_KEY),
    getSodexTickers(),
  ]);

  let opportunities: YieldOpportunity[] = [];
  if (opportunitiesResult.status === "fulfilled") {
    opportunities = opportunitiesResult.value;
    sourceStatuses.push({
      name: "DefiLlama Yields",
      status: "live",
      detail: `${opportunities.length} risk-filtered yield pools are available.`,
      updatedAt: new Date().toISOString(),
    });
  } else {
    sourceStatuses.push({
      name: "DefiLlama Yields",
      status: "error",
      detail: opportunitiesResult.reason instanceof Error ? opportunitiesResult.reason.message : "Yield fetch failed.",
    });
  }

  const soso =
    sosoResult.status === "fulfilled"
      ? sosoResult.value
      : {
          source: {
            name: "SoSoValue",
            status: "error" as const,
            detail: sosoResult.reason instanceof Error ? sosoResult.reason.message : "SoSoValue request failed.",
          },
          news: [] as NewsItem[],
          etfFlows: [] as EtfFlowPoint[],
        };

  const sodex =
    sodexResult.status === "fulfilled"
      ? sodexResult.value
      : {
          source: {
            name: "SoDEX",
            status: "error" as const,
            detail: sodexResult.reason instanceof Error ? sodexResult.reason.message : "SoDEX request failed.",
          },
          tickers: [] as SodexTicker[],
        };

  sourceStatuses.push(soso.source, sodex.source);

  const market = buildMarketPulse(soso.news, soso.etfFlows, sodex.tickers);
  const strategy = buildStrategy(goal, amountUsd, opportunities, market);
  const openAi = await getOpenAiInsight(strategy, market, opportunities);
  sourceStatuses.push(openAi.source);
  const riskEvents = buildRiskEvents(market, opportunities, sourceStatuses);

  return {
    generatedAt: new Date().toISOString(),
    mode: "simulation",
    inputs: {
      amountUsd,
      goal,
    },
    portfolio: {
      totalValueUsd: amountUsd,
      estimatedApy: strategy.estimatedApy,
      dailyYieldUsd: strategy.dailyYieldUsd,
      riskScore: strategy.riskScore,
      marketMood: market.moodLabel,
      aiStatus: opportunities.length > 0 ? "Active" : "Waiting for live yield data",
      activeStrategies: strategy.allocation.length,
    },
    strategy,
    ai: openAi.insight,
    opportunities,
    market,
    riskEvents,
    sources: sourceStatuses,
  };
}
