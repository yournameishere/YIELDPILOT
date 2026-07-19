import type {
  DataSourceStatus,
  EtfFlowPoint,
  MacroEvent,
  MarketPulse,
  NewsItem,
  OpenAiInsight,
  RebalanceDecision,
  RiskEvent,
  SourceStatus,
  SosoIndexSnapshot,
  SodexTicker,
  StrategyAllocation,
  StrategyAlert,
  StrategyAnalytics,
  StrategyConstraints,
  StrategyGoal,
  YieldOpportunity,
  YieldPilotMarketResponse,
  YieldPilotStrategy,
} from "@/lib/yieldpilot/types";

const DEFAULT_SOSOVALUE_BASE_URL = "https://openapi.sosovalue.com/openapi/v1";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_DEFILLAMA_POOLS_URL = "https://yields.llama.fi/pools";

const SOSOVALUE_CONFIG = resolveConfiguredHttpsUrl(
  process.env.SOSOVALUE_BASE_URL,
  DEFAULT_SOSOVALUE_BASE_URL,
  "SOSOVALUE_BASE_URL",
);
const OPENAI_CONFIG = resolveConfiguredHttpsUrl(process.env.OPENAI_BASE_URL, DEFAULT_OPENAI_BASE_URL, "OPENAI_BASE_URL");
const DEFILLAMA_POOLS_CONFIG = resolveConfiguredHttpsUrl(
  process.env.DEFILLAMA_POOLS_URL,
  DEFAULT_DEFILLAMA_POOLS_URL,
  "DEFILLAMA_POOLS_URL",
);

const SOSOVALUE_BASE_URL = SOSOVALUE_CONFIG.url;
const OPENAI_BASE_URL = OPENAI_CONFIG.url;
const DEFILLAMA_POOLS_URL = DEFILLAMA_POOLS_CONFIG.url;

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

const CACHE_TTL = {
  defillamaPools: 45_000,
  sosoMarket: 75_000,
  sodexTickers: 15_000,
  openAiInsight: 60_000,
};

const MAX_MEMORY_CACHE_ENTRIES = 128;
const memoryCache = new Map<string, { expiresAt: number; promise: Promise<unknown> }>();

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
    maxPositions: number;
    rebalanceThresholdPct: number;
    alertRiskScore: number;
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
    maxPositions: 3,
    rebalanceThresholdPct: 7,
    alertRiskScore: 45,
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
    maxPositions: 3,
    rebalanceThresholdPct: 10,
    alertRiskScore: 58,
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
    maxPositions: 4,
    rebalanceThresholdPct: 14,
    alertRiskScore: 72,
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
    maxPositions: 3,
    rebalanceThresholdPct: 8,
    alertRiskScore: 50,
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
    maxPositions: 4,
    rebalanceThresholdPct: 10,
    alertRiskScore: 60,
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

interface SosoIndexRaw {
  price?: number | string;
  "24h_change_pct"?: number | string;
  change_pct_24h?: number | string;
  "7day_roi"?: number | string;
  roi_7d?: number | string;
  "1month_roi"?: number | string;
  roi_1m?: number | string;
  "3month_roi"?: number | string;
  roi_3m?: number | string;
  "1year_roi"?: number | string;
  roi_1y?: number | string;
  ytd?: number | string;
}

interface SosoMacroEventRaw {
  date?: string;
  events?: unknown[];
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
  reasoning?: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatUsdForText(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function hashText(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

async function withTtlCache<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  pruneMemoryCache(now);
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise as Promise<T>;

  const rawPromise = factory();
  const cachedPromise = rawPromise.catch((error) => {
    const current = memoryCache.get(key);
    if (current?.promise === cachedPromise) memoryCache.delete(key);
    throw error;
  });

  memoryCache.set(key, { expiresAt: now + ttlMs, promise: cachedPromise });
  pruneMemoryCache();
  return cachedPromise;
}

function pruneMemoryCache(now = Date.now()) {
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }

  while (memoryCache.size > MAX_MEMORY_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }
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

function safeHttpsUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
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

export function sanitizeSecretBearingError(detail: string, service = "Data source") {
  if (/incorrect api key|invalid api key|401/i.test(detail)) {
    return `${service} authentication failed. Check the local server environment value without exposing it in the UI.`;
  }

  return detail
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/(x-soso-api-key["'\s:=]+)[A-Za-z0-9._-]+/gi, "$1[redacted]")
    .replace(/(api[_-]?key["'\s:=]+)[A-Za-z0-9._-]{16,}/gi, "$1[redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted_openai_key]")
    .replace(/SOSO-[A-Za-z0-9_-]+/g, "[redacted_sosovalue_key]");
}

function asBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return fallback;
}

function goalConstraints(goal: StrategyGoal): StrategyConstraints {
  const config = GOAL_CONFIG[goal];
  return {
    stableOnly: config.stableOnly,
    maxRisk: config.maxRisk,
    maxApy: config.maxApy,
    minTvlUsd: config.minTvlUsd,
    maxPositions: config.maxPositions,
    rebalanceThresholdPct: config.rebalanceThresholdPct,
    alertRiskScore: config.alertRiskScore,
  };
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
      const retryAfter = response.headers.get("retry-after");
      const retryNotice = retryAfter ? ` retry-after=${retryAfter}s` : "";
      throw new Error(`HTTP ${response.status}${retryNotice}: ${body.slice(0, 180)}`);
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

function opportunityScoring(pool: DefiLlamaPool, riskScore: number, goal: StrategyGoal): YieldOpportunity["scoring"] {
  const config = GOAL_CONFIG[goal];
  const apy = asNumber(pool.apy);
  const tvlUsd = asNumber(pool.tvlUsd);
  const tvlScore = clamp(Math.log10(Math.max(tvlUsd, 1)) * 4, 0, 36);
  const reputation = REPUTATION_BONUS[pool.project ?? ""] ?? 0;
  const stableBonus = pool.stablecoin ? 7 : 0;
  const predictionBonus = pool.predictions?.predictedClass?.includes("Stable") ? 3 : 0;
  const riskPenalty = riskScore * config.riskPenalty;
  const sourceSignals = [
    "DefiLlama APY/TVL",
    pool.predictions ? "DefiLlama prediction class" : "Live pool metadata",
    pool.stablecoin ? "Stablecoin exposure" : "Volatile asset exposure",
    (REPUTATION_BONUS[pool.project ?? ""] ?? 0) > 0 ? "Protocol reputation map" : "Protocol reputation neutral",
  ];

  return {
    yieldComponent: round(apy * config.yieldBias, 3),
    tvlComponent: round(tvlScore, 3),
    reputationComponent: reputation,
    stabilityComponent: stableBonus,
    predictionComponent: predictionBonus,
    riskPenalty: round(riskPenalty, 3),
    sourceSignals,
  };
}

function opportunityScore(pool: DefiLlamaPool, riskScore: number, goal: StrategyGoal) {
  const scoring = opportunityScoring(pool, riskScore, goal);
  return round(
    scoring.yieldComponent +
      scoring.tvlComponent +
      scoring.reputationComponent +
      scoring.stabilityComponent +
      scoring.predictionComponent -
      scoring.riskPenalty,
    3,
  );
}

function normalizeOpportunities(pools: DefiLlamaPool[], goal: StrategyGoal, constraints: StrategyConstraints) {

  return pools
    .filter((pool) => {
      const apy = asNumber(pool.apy);
      const tvlUsd = asNumber(pool.tvlUsd);
      if (!pool.project || !pool.symbol || !pool.chain || !pool.pool) return false;
      if (!PREFERRED_CHAINS.has(pool.chain)) return false;
      if (constraints.stableOnly && !pool.stablecoin) return false;
      if (tvlUsd < constraints.minTvlUsd) return false;
      if (apy <= 0.15 || apy > constraints.maxApy) return false;
      if (pool.outlier) return false;
      return true;
    })
    .map((pool): YieldOpportunity => {
      const riskScore = scoreRisk(pool);
      const score = opportunityScore(pool, riskScore, goal);
      const scoring = opportunityScoring(pool, riskScore, goal);

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
        scoring,
      };
    })
    .filter((opportunity) => opportunity.riskScore <= constraints.maxRisk)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function buildAllocation(opportunities: YieldOpportunity[], amountUsd: number, goal: StrategyGoal, constraints: StrategyConstraints) {
  const selected = opportunities.slice(0, constraints.maxPositions);
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
      evidence: [
        `${opportunity.apy}% APY after ${opportunity.riskScore}/100 risk penalty`,
        `${formatUsdForText(opportunity.tvlUsd)} TVL depth`,
        opportunity.notes.slice(0, 2).join("; "),
      ],
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
      sourceLink: safeHttpsUrl(item.source_link, "https://sosovalue.com"),
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

function firstNumber(row: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row?.[key], Number.NaN);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function normalizeSosoIndex(ticker: string, row: SosoIndexRaw | undefined): SosoIndexSnapshot {
  const record = row as Record<string, unknown> | undefined;

  return {
    ticker,
    price: round(asNumber(row?.price), 4),
    change24hPct: round(firstNumber(record, ["24h_change_pct", "change_pct_24h"]) * 100, 3),
    roi7d: round(firstNumber(record, ["7day_roi", "roi_7d"]) * 100, 3),
    roi1m: round(firstNumber(record, ["1month_roi", "roi_1m"]) * 100, 3),
    roi3m: round(firstNumber(record, ["3month_roi", "roi_3m"]) * 100, 3),
    ytd: round(asNumber(row?.ytd) * 100, 3),
  };
}

function parseDateOnlyUtc(value: string | undefined) {
  if (!value) return Number.NaN;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day);
}

function todayUtcMs() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function macroImportanceScore(events: string[]) {
  const joined = events.join(" ").toLowerCase();
  let score = Math.min(28, events.length * 7);

  const highImpact = ["cpi", "pce", "inflation", "fomc", "fed", "rate", "payroll", "unemployment", "gdp"];
  const mediumImpact = ["ppi", "pmi", "retail", "claims", "treasury", "confidence", "industrial"];

  for (const keyword of highImpact) if (joined.includes(keyword)) score += 16;
  for (const keyword of mediumImpact) if (joined.includes(keyword)) score += 8;

  return clamp(Math.round(score), 0, 100);
}

function normalizeMacroEvents(rows: SosoMacroEventRaw[] | undefined): MacroEvent[] {
  const today = todayUtcMs();

  return (rows ?? [])
    .map((row): MacroEvent | null => {
      const dateMs = parseDateOnlyUtc(row.date);
      if (!Number.isFinite(dateMs) || !row.date) return null;

      const eventRows = Array.isArray(row.events) ? row.events : [];
      const events = eventRows
        .filter((event): event is string => typeof event === "string")
        .map((event) => event.trim())
        .filter(Boolean)
        .slice(0, 8);
      if (events.length === 0) return null;

      const daysFromNow = Math.round((dateMs - today) / 86_400_000);
      return {
        date: row.date,
        events,
        daysFromNow,
        horizon: daysFromNow === 0 ? "today" : daysFromNow > 0 ? "upcoming" : "past",
        importanceScore: macroImportanceScore(events),
      };
    })
    .filter((event): event is MacroEvent => Boolean(event))
    .filter((event) => event.daysFromNow >= -7 && event.daysFromNow <= 30)
    .sort((left, right) => {
      const leftUpcoming = left.daysFromNow >= 0 ? 0 : 1;
      const rightUpcoming = right.daysFromNow >= 0 ? 0 : 1;
      if (leftUpcoming !== rightUpcoming) return leftUpcoming - rightUpcoming;
      return Math.abs(left.daysFromNow) - Math.abs(right.daysFromNow);
    })
    .slice(0, 10);
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

async function getDefiLlamaPools() {
  return withTtlCache(`defillama:pools:${DEFILLAMA_POOLS_URL}`, CACHE_TTL.defillamaPools, () =>
    fetchJson<DefiLlamaPoolsResponse>(DEFILLAMA_POOLS_URL, undefined, 15_000),
  );
}

async function getDefiLlamaOpportunities(goal: StrategyGoal, constraints: StrategyConstraints) {
  const payload = await getDefiLlamaPools();
  return normalizeOpportunities(payload.data ?? [], goal, constraints);
}

async function getSosoMarket(apiKey: string | undefined) {
  const source: DataSourceStatus = {
    name: "SoSoValue",
    status: "missing_key",
    detail: "Set SOSOVALUE_API_KEY to enable live news, ETF flow, index, and macro intelligence.",
  };

  if (!apiKey) {
    return {
      source,
      news: [] as NewsItem[],
      etfFlows: [] as EtfFlowPoint[],
      indexes: [] as SosoIndexSnapshot[],
      macroEvents: [] as MacroEvent[],
    };
  }

  return withTtlCache(`soso:market:${SOSOVALUE_BASE_URL}:${hashText(apiKey)}`, CACHE_TTL.sosoMarket, async () => {
  try {
    const headers = { "x-soso-api-key": apiKey };
    const [newsResult, btcResult, ethResult, indexListResult, macroResult] = await Promise.allSettled([
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
      fetchJson<SosoEnvelope<string[]> | string[]>(`${SOSOVALUE_BASE_URL}/indices`, { headers }, 12_000),
      fetchJson<SosoEnvelope<SosoMacroEventRaw[]> | SosoMacroEventRaw[]>(
        `${SOSOVALUE_BASE_URL}/macro/events`,
        { headers },
        12_000,
      ),
    ]);

    const failedParts: string[] = [];
    const failureText = (error: unknown) =>
      sanitizeSecretBearingError(error instanceof Error ? error.message : "request failed", "SoSoValue");
    const readPart = <T>(part: string, result: PromiseSettledResult<SosoEnvelope<T> | T>, fallback: T) => {
      try {
        if (result.status !== "fulfilled") throw result.reason;
        const data = unwrapSoso(result.value);
        if (data === undefined || data === null) throw new Error(`${part} returned no data.`);
        return data;
      } catch (error) {
        failedParts.push(`${part}: ${failureText(error)}`);
        return fallback;
      }
    };

    const news = normalizeNews(readPart("hot news", newsResult, undefined as SosoNewsPage | undefined));
    const etfFlows = [
      ...normalizeEtfFlows("BTC", readPart("BTC ETF flow", btcResult, [] as SosoEtfRaw[])),
      ...normalizeEtfFlows("ETH", readPart("ETH ETF flow", ethResult, [] as SosoEtfRaw[])),
    ];
    const macroEvents = normalizeMacroEvents(readPart("macro events", macroResult, [] as SosoMacroEventRaw[]));
    const indexTickers = readPart("index list", indexListResult, [] as string[]).slice(0, 3);
    const resolvedTickers = indexTickers.length > 0 ? indexTickers : ["ssimag7"];
    const fetchIndexSnapshot = (ticker: string) =>
      fetchJson<SosoEnvelope<SosoIndexRaw>>(
        `${SOSOVALUE_BASE_URL}/indices/${encodeURIComponent(ticker)}/market-snapshot`,
        { headers },
        12_000,
      ).then((payload) => normalizeSosoIndex(ticker, unwrapSoso(payload)));
    const indexPayloads = await Promise.allSettled(
      resolvedTickers.map((ticker) => fetchIndexSnapshot(ticker)),
    );
    let indexes = indexPayloads
      .filter((result): result is PromiseFulfilledResult<SosoIndexSnapshot> => result.status === "fulfilled")
      .map((result) => result.value);
    const failedIndexSnapshots = indexPayloads.length - indexes.length;
    if (failedIndexSnapshots > 0) {
      failedParts.push(`${failedIndexSnapshots} index snapshot${failedIndexSnapshots === 1 ? "" : "s"}`);
    }
    if (indexes.length === 0 && !resolvedTickers.includes("ssimag7")) {
      try {
        indexes = [await fetchIndexSnapshot("ssimag7")];
      } catch {
        failedParts.push("fallback ssimag7 index snapshot");
      }
    }
    const status: SourceStatus =
      failedParts.length === 0
        ? "live"
        : news.length > 0 || etfFlows.length > 0 || indexes.length > 0 || macroEvents.length > 0
          ? "degraded"
          : "error";
    const configNotice = SOSOVALUE_CONFIG.notice ? `${SOSOVALUE_CONFIG.notice} ` : "";
    const detail =
      status === "live"
        ? `${configNotice}Hot crypto news, BTC/ETH ETF flows, ${indexes.length} SoSoValue Index snapshots, and ${macroEvents.length} macro calendar dates are live.`
        : status === "degraded"
          ? `${configNotice}Partial SoSoValue data is live: ${news.length} news items, ${etfFlows.length} ETF rows, ${indexes.length}/${resolvedTickers.length} index snapshots, and ${macroEvents.length} macro dates. Degraded parts: ${failedParts
              .map((part) => part.split(":")[0])
              .slice(0, 4)
              .join(", ")}.`
          : `${configNotice}SoSoValue returned no usable data. ${failedParts[0] ?? "Check API key and network access."}`;

    return {
      source: {
        name: "SoSoValue",
        status,
        detail,
        updatedAt: new Date().toISOString(),
      },
      news,
      etfFlows,
      indexes,
      macroEvents,
    };
  } catch (error) {
    return {
      source: {
        name: "SoSoValue",
        status: "error" as const,
        detail: sanitizeSecretBearingError(error instanceof Error ? error.message : "SoSoValue request failed.", "SoSoValue"),
      },
      news: [] as NewsItem[],
      etfFlows: [] as EtfFlowPoint[],
      indexes: [] as SosoIndexSnapshot[],
      macroEvents: [] as MacroEvent[],
    };
  }
  });
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function resolveConfiguredHttpsUrl(value: string | undefined, fallback: string, envName: string) {
  if (!value?.trim()) return { url: fallback, notice: "" };

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") throw new Error("Only HTTPS endpoints are allowed.");
    url.hash = "";
    return { url: trimTrailingSlash(url.toString()), notice: "" };
  } catch {
    return {
      url: fallback,
      notice: `Configured ${envName} was invalid; using the default endpoint.`,
    };
  }
}

function resolveSodexSpotEndpoint() {
  const env = process.env.SODEX_ENV === "mainnet" ? "mainnet" : "testnet";
  const fallback = SODEX_ENDPOINTS[env].spot;
  const configuredEndpoint = process.env.SODEX_SPOT_ENDPOINT?.trim();

  if (!configuredEndpoint) {
    return { env, spotEndpoint: fallback, endpointNotice: "" };
  }

  try {
    const url = new URL(configuredEndpoint);
    if (url.protocol !== "https:") {
      return {
        env,
        spotEndpoint: fallback,
        endpointNotice: "Configured SODEX_SPOT_ENDPOINT was rejected because only HTTPS endpoints are allowed; using the known SoDEX spot endpoint.",
      };
    }

    url.pathname = trimTrailingSlash(url.pathname);
    url.search = "";
    url.hash = "";
    return { env, spotEndpoint: trimTrailingSlash(url.toString()), endpointNotice: "" };
  } catch {
    return {
      env,
      spotEndpoint: fallback,
      endpointNotice: "Configured SODEX_SPOT_ENDPOINT was invalid; using the known SoDEX spot endpoint.",
    };
  }
}

async function getSodexTickers() {
  const { env, spotEndpoint, endpointNotice } = resolveSodexSpotEndpoint();

  return withTtlCache(`sodex:${env}:${spotEndpoint}`, CACHE_TTL.sodexTickers, async () => {
    try {
      const payload = await fetchJson<SodexEnvelope<SodexTickerRaw[]>>(`${spotEndpoint}/markets/tickers`, undefined, 12_000);
      if (payload.code !== 0) throw new Error("SoDEX ticker request returned a non-zero code.");

      return {
        source: {
          name: "SoDEX",
          status: "live" as const,
          detail: `${endpointNotice ? `${endpointNotice} ` : ""}${env} public spot ticker feed is live.`,
          updatedAt: new Date(payload.timestamp ?? Date.now()).toISOString(),
        },
        tickers: normalizeSodexTickers(payload.data),
      };
    } catch (error) {
      return {
        source: {
          name: "SoDEX",
          status: "error" as const,
          detail: sanitizeSecretBearingError(
            `${endpointNotice ? `${endpointNotice} ` : ""}${error instanceof Error ? error.message : "SoDEX ticker request failed."}`,
            "SoDEX",
          ),
        },
        tickers: [] as SodexTicker[],
      };
    }
  });
}

function buildMarketPulse(
  news: NewsItem[],
  etfFlows: EtfFlowPoint[],
  sodexTickers: SodexTicker[],
  sosoIndexes: SosoIndexSnapshot[],
  macroEvents: MacroEvent[],
): MarketPulse {
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
  const indexAverageMovePct =
    sosoIndexes.length === 0 ? 0 : sosoIndexes.reduce((sum, index) => sum + index.change24hPct, 0) / sosoIndexes.length;
  const nearTermMacroEvents = macroEvents.filter((event) => event.daysFromNow >= 0 && event.daysFromNow <= 7);
  const macroRiskScore =
    nearTermMacroEvents.length === 0
      ? 0
      : clamp(
          Math.max(...nearTermMacroEvents.map((event) => event.importanceScore - Math.max(event.daysFromNow, 0) * 3)),
          0,
          100,
        );
  const macroRiskLabel: MarketPulse["macroRiskLabel"] =
    macroRiskScore >= 60 ? "Event Risk" : macroRiskScore >= 30 ? "Watch" : "Calm";

  const moodScore = clamp(
    50 +
      newsSentiment * 0.22 +
      clamp(etfNetFlowUsd / 100_000_000, -16, 16) +
      clamp(sodexAverageMovePct * 2.2, -12, 12) +
      clamp(indexAverageMovePct * 1.5, -8, 8) -
      clamp(macroRiskScore * 0.12, 0, 10),
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
    macroRiskLabel,
    macroRiskScore: Math.round(macroRiskScore),
    newsSentiment: Math.round(newsSentiment),
    etfNetFlowUsd: round(etfNetFlowUsd, 2),
    etfFlowDirection,
    sodexAverageMovePct: round(sodexAverageMovePct, 3),
    news,
    etfFlows,
    sodexTickers,
    sosoIndexes,
    macroEvents,
  };
}

function macroTiming(event: MacroEvent) {
  if (event.daysFromNow === 0) return "today";
  if (event.daysFromNow === 1) return "tomorrow";
  if (event.daysFromNow > 1) return `in ${event.daysFromNow} days`;
  if (event.daysFromNow === -1) return "yesterday";
  return `${Math.abs(event.daysFromNow)} days ago`;
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

  const nextMacroEvent = market.macroEvents.find((event) => event.daysFromNow >= 0);
  if (nextMacroEvent && market.macroRiskLabel !== "Calm") {
    events.push({
      level: market.macroRiskLabel === "Event Risk" ? "warning" : "watch",
      title: "Macro calendar risk",
      detail: `${nextMacroEvent.events.slice(0, 2).join(", ")} is scheduled ${macroTiming(
        nextMacroEvent,
      )}. YieldPilot tightens risk review before fresh allocations.`,
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
    if (source.status === "error" || source.status === "missing_key" || source.status === "degraded") {
      events.push({
        level: source.status === "error" ? "warning" : source.status === "degraded" ? "watch" : "info",
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
      ? `Market mood is ${market.moodLabel.toLowerCase()}, SoDEX volatility is ${market.volatilityLabel.toLowerCase()}, macro risk is ${market.macroRiskLabel.toLowerCase()}, and the top watched pool risk is ${bestPool.riskScore}/100.`
      : `Market mood is ${market.moodLabel.toLowerCase()} with ${market.volatilityLabel.toLowerCase()} volatility and ${market.macroRiskLabel.toLowerCase()} macro risk, but no allocation passed filters.`,
    nextAction: detail,
    reasoning: [
      `Constraint gate: max risk ${strategy.constraints.maxRisk}, min TVL ${formatUsdForText(strategy.constraints.minTvlUsd)}, max APY ${strategy.constraints.maxApy}%.`,
      `Market gate: ${market.moodLabel} mood, ${market.volatilityLabel} SoDEX volatility, ${market.etfFlowDirection} ETF flow, ${market.macroRiskLabel} macro risk.`,
      top ? `Allocation gate: ${top.protocol} leads because ${top.reason}.` : "Allocation gate: no pool passed the selected constraints.",
    ],
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
        detail: `${OPENAI_CONFIG.notice ? `${OPENAI_CONFIG.notice} ` : ""}Set OPENAI_API_KEY to enable model-generated strategy reasoning.`,
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
      constraints: strategy.constraints,
      rebalanceDecisions: strategy.rebalanceDecisions,
    },
    market: {
      mood: market.moodLabel,
      moodScore: market.moodScore,
      volatility: market.volatilityLabel,
      macroRisk: market.macroRiskLabel,
      macroRiskScore: market.macroRiskScore,
      etfFlowDirection: market.etfFlowDirection,
      etfNetFlowUsd: market.etfNetFlowUsd,
      sodexAverageMovePct: market.sodexAverageMovePct,
      latestNews: market.news.slice(0, 3).map((item) => item.title),
      sosoIndexes: market.sosoIndexes.slice(0, 3),
      macroEvents: market.macroEvents.slice(0, 4),
      topSodexTickers: market.sodexTickers.slice(0, 4),
    },
    topOpportunities: opportunities.slice(0, 5),
  };

  const cacheKey = `openai:${OPENAI_BASE_URL}:${model}:${hashText(JSON.stringify(promptPayload))}`;

  try {
    return await withTtlCache(cacheKey, CACHE_TTL.openAiInsight, async () => {
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
              "You are YieldPilot AI, an autonomous DeFi yield risk analyst. Use only the supplied JSON. Do not invent protocols, APYs, prices, or news. This is simulation-only and not financial advice. Return strict JSON only.",
            input: `Create a concise strategy explanation from this live payload. Return only valid JSON in this exact shape: {"headline":"...","summary":"...","recommendation":"...","riskNote":"...","nextAction":"...","reasoning":["constraint reason","market reason","rebalance reason"]}\n${JSON.stringify(promptPayload)}`,
            text: {
              format: { type: "json_object" },
            },
            max_output_tokens: 520,
            temperature: 0.2,
          }),
        },
        20_000,
      );

      if (response.error?.message) throw new Error(response.error.message);

      const text = extractOpenAiText(response);
      const parsed = parseOpenAiDecision(text);
      const resolvedModel = response.model ?? model;
      const fallback = deterministicInsight(strategy, market, opportunities, "live", "", resolvedModel);
      const reasoning = (Array.isArray(parsed.reasoning) ? parsed.reasoning : [])
        .map((line) => compactLine(line, "", 150))
        .filter(Boolean)
        .slice(0, 4);

      return {
        source: {
          name: "OpenAI",
          status: "live",
          detail: `${OPENAI_CONFIG.notice ? `${OPENAI_CONFIG.notice} ` : ""}Responses API generated strategy reasoning with ${resolvedModel}.`,
          updatedAt: new Date().toISOString(),
        },
        insight: {
          provider: "OpenAI",
          model: resolvedModel,
          status: "live",
          headline: compactLine(parsed.headline, fallback.headline, 90),
          summary: compactLine(parsed.summary, fallback.summary),
          recommendation: compactLine(
            parsed.recommendation,
            fallback.recommendation,
          ),
          riskNote: compactLine(parsed.riskNote, fallback.riskNote),
          nextAction: compactLine(
            parsed.nextAction,
            "Activate the simulation only after reviewing the allocation and source health.",
            150,
          ),
          reasoning: reasoning.length > 0 ? reasoning : fallback.reasoning,
        },
      };
    });
  } catch (error) {
    const detail = sanitizeSecretBearingError(
      `${OPENAI_CONFIG.notice ? `${OPENAI_CONFIG.notice} ` : ""}${error instanceof Error ? error.message : "OpenAI request failed."}`,
      "OpenAI",
    );
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
  constraints: StrategyConstraints,
): YieldPilotStrategy {
  const allocation = buildAllocation(opportunities, amountUsd, goal, constraints);
  const estimatedApy =
    allocation.length === 0 ? 0 : allocation.reduce((sum, item) => sum + (item.apy * item.weight) / 100, 0);
  const riskScore =
    allocation.length === 0 ? 0 : allocation.reduce((sum, item) => sum + (item.riskScore * item.weight) / 100, 0);
  const dailyYieldUsd = (amountUsd * estimatedApy) / 100 / 365;

  const rationale = [
    `Goal profile: ${GOAL_CONFIG[goal].label}.`,
    `User constraints: max risk ${constraints.maxRisk}, min TVL ${formatUsdForText(constraints.minTvlUsd)}, max APY ${constraints.maxApy}%, ${constraints.stableOnly ? "stablecoins only" : "volatile assets allowed"}.`,
    `Market mood is ${market.moodLabel.toLowerCase()} with ${market.volatilityLabel.toLowerCase()} volatility.`,
    `Allocation favors live APY after TVL, protocol reputation, and instability penalties.`,
  ];

  if (market.etfFlowDirection !== "unknown") {
    rationale.push(`ETF flow is ${market.etfFlowDirection}, net ${Math.round(market.etfNetFlowUsd).toLocaleString("en-US")} USD.`);
  }

  if (market.macroRiskLabel !== "Calm") {
    const nextMacroEvent = market.macroEvents.find((event) => event.daysFromNow >= 0);
    rationale.push(
      nextMacroEvent
        ? `Macro calendar risk is ${market.macroRiskLabel.toLowerCase()} because ${nextMacroEvent.events
            .slice(0, 2)
            .join(", ")} is scheduled ${macroTiming(nextMacroEvent)}.`
        : `Macro calendar risk is ${market.macroRiskLabel.toLowerCase()}.`,
    );
  }

  return {
    goal,
    goalLabel: GOAL_CONFIG[goal].label,
    constraints,
    estimatedApy: round(estimatedApy, 2),
    riskScore: Math.round(riskScore),
    dailyYieldUsd: round(dailyYieldUsd, 2),
    allocation,
    rationale,
    rebalanceActions: allocation.map(
      (item) => `Allocate ${item.weight}% to ${item.protocol} ${item.asset} on ${item.chain} because ${item.reason}.`,
    ),
    rebalanceDecisions: buildRebalanceDecisions(allocation, opportunities, market, constraints),
  };
}

function buildRebalanceDecisions(
  allocation: StrategyAllocation[],
  opportunities: YieldOpportunity[],
  market: MarketPulse,
  constraints: StrategyConstraints,
) {
  const decisions: RebalanceDecision[] = allocation.map((item, index) => ({
    id: `allocate-${index}-${item.protocol}-${item.asset}`,
    action: "allocate" as const,
    title: `Allocate ${item.weight}% to ${item.protocol}`,
    detail: `${item.asset} on ${item.chain} passed custom constraints and earns ${item.apy}% APY with ${item.riskScore}/100 risk.`,
    evidence: item.evidence,
    source: "DefiLlama + YieldPilot risk engine",
    impact: "positive" as const,
  }));

  const riskiest = opportunities.find((item) => item.riskScore >= constraints.alertRiskScore);
  if (riskiest) {
    decisions.push({
      id: `protect-${riskiest.id}`,
      action: riskiest.riskScore >= constraints.maxRisk ? "exit_ready" : "reduce",
      title: `${riskiest.protocol} is capped by risk`,
      detail: `${riskiest.asset} is attractive, but risk ${riskiest.riskScore}/100 is above the alert threshold ${constraints.alertRiskScore}.`,
      evidence: [
        `${riskiest.apy}% APY`,
        `${formatUsdForText(riskiest.tvlUsd)} TVL`,
        riskiest.notes.join("; "),
      ],
      source: "Risk alert threshold",
      impact: "protective" as const,
    });
  }

  if (market.volatilityLabel === "Elevated" || market.etfFlowDirection === "outflow" || market.macroRiskLabel === "Event Risk") {
    decisions.push({
      id: "market-protection",
      action: "hold",
      title: "Protective monitor armed",
      detail: `Market pulse is ${market.moodLabel.toLowerCase()} with ${market.volatilityLabel.toLowerCase()} SoDEX volatility, ${market.etfFlowDirection} ETF flow, and ${market.macroRiskLabel.toLowerCase()} macro risk.`,
      evidence: [
        `SoDEX average move ${market.sodexAverageMovePct}%`,
        `ETF net flow ${formatUsdForText(market.etfNetFlowUsd)}`,
        `Macro risk ${market.macroRiskScore}/100`,
      ],
      source: "SoSoValue + SoDEX market pulse",
      impact: "protective" as const,
    });
  }

  return decisions.slice(0, 6);
}

function buildRiskHistory(strategy: YieldPilotStrategy, market: MarketPulse) {
  const baseRisk = strategy.riskScore || strategy.constraints.maxRisk;
  const baseApy = strategy.estimatedApy;
  const points = [
    { label: "T-4", riskOffset: 8, apyOffset: -1.1 },
    { label: "T-3", riskOffset: 4, apyOffset: -0.4 },
    { label: "T-2", riskOffset: 2, apyOffset: 0.2 },
    { label: "T-1", riskOffset: market.volatilityLabel === "Elevated" ? 7 : -1, apyOffset: 0.4 },
    { label: "Now", riskOffset: 0, apyOffset: 0 },
  ];

  return points.map((point) => ({
    label: point.label,
    riskScore: clamp(Math.round(baseRisk + point.riskOffset), 0, 100),
    estimatedApy: round(Math.max(0, baseApy + point.apyOffset), 2),
    marketMood: point.label === "Now" ? market.moodLabel : point.riskOffset > 5 ? "Risk-Off" : "Neutral",
  }));
}

function buildAlerts(
  strategy: YieldPilotStrategy,
  market: MarketPulse,
  opportunities: YieldOpportunity[],
  sources: DataSourceStatus[],
): StrategyAlert[] {
  const alerts: StrategyAlert[] = [];

  if (strategy.riskScore >= strategy.constraints.alertRiskScore) {
    alerts.push({
      id: "portfolio-risk-threshold",
      level: "warning",
      title: "Portfolio risk threshold crossed",
      detail: `Blended risk is ${strategy.riskScore}/100 against an alert threshold of ${strategy.constraints.alertRiskScore}.`,
      trigger: "custom alertRiskScore",
    });
  }

  const thinPool = opportunities.find((item) => item.tvlUsd < strategy.constraints.minTvlUsd * 1.25);
  if (thinPool) {
    alerts.push({
      id: `thin-liquidity-${thinPool.id}`,
      level: "watch",
      title: "Liquidity buffer is narrow",
      detail: `${thinPool.protocol} is close to the minimum TVL gate at ${formatUsdForText(thinPool.tvlUsd)}.`,
      trigger: "minTvlUsd buffer",
    });
  }

  if (market.etfFlowDirection === "outflow" || market.volatilityLabel === "Elevated") {
    alerts.push({
      id: "market-stress",
      level: market.volatilityLabel === "Elevated" ? "warning" : "watch",
      title: "Market stress monitor",
      detail: `ETF flow is ${market.etfFlowDirection}; SoDEX volatility is ${market.volatilityLabel.toLowerCase()}.`,
      trigger: "SoSoValue ETF + SoDEX pulse",
    });
  }

  const nextMacroEvent = market.macroEvents.find((event) => event.daysFromNow >= 0);
  if (nextMacroEvent && market.macroRiskLabel !== "Calm") {
    alerts.push({
      id: "macro-calendar-risk",
      level: market.macroRiskLabel === "Event Risk" ? "warning" : "watch",
      title: "Macro event risk",
      detail: `${nextMacroEvent.events.slice(0, 2).join(", ")} is scheduled ${macroTiming(
        nextMacroEvent,
      )}; strategy confidence is adjusted before activation.`,
      trigger: "SoSoValue macro calendar",
    });
  }

  for (const source of sources) {
    if (source.status === "error" || source.status === "missing_key" || source.status === "degraded") {
      alerts.push({
        id: `source-${source.name}`,
        level: source.status === "error" ? "warning" : source.status === "degraded" ? "watch" : "info",
        title: `${source.name} source health`,
        detail: source.detail,
        trigger: "source status",
      });
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "portfolio-clear",
      level: "info",
      title: "No active alert",
      detail: "The simulated strategy is inside the selected risk, TVL, APY, and market-stress thresholds.",
      trigger: "all Wave 3 monitors",
    });
  }

  return alerts.slice(0, 6);
}

function buildAnalytics(strategy: YieldPilotStrategy, amountUsd: number, market: MarketPulse): StrategyAnalytics {
  const projectedAnnualYieldUsd = (amountUsd * strategy.estimatedApy) / 100;
  const stressMultiplier =
    market.volatilityLabel === "Elevated"
      ? 0.18
      : market.macroRiskLabel === "Event Risk"
        ? 0.15
        : market.etfFlowDirection === "outflow"
          ? 0.12
          : market.macroRiskLabel === "Watch"
            ? 0.1
            : 0.07;
  const stressLossPct = round(clamp((strategy.riskScore / 100) * stressMultiplier * 100, 1.5, 22), 2);
  const uniqueChains = new Set(strategy.allocation.map((item) => item.chain)).size;
  const diversificationScore = clamp(Math.round(uniqueChains * 18 + strategy.allocation.length * 12), 0, 100);
  const confidenceScore = clamp(
    Math.round(
      100 -
        strategy.riskScore * 0.55 +
        diversificationScore * 0.25 +
        (market.moodScore - 50) * 0.2 -
        market.macroRiskScore * 0.12,
    ),
    0,
    100,
  );

  return {
    projectedMonthlyYieldUsd: round(projectedAnnualYieldUsd / 12, 2),
    projectedAnnualYieldUsd: round(projectedAnnualYieldUsd, 2),
    stressLossUsd: round((amountUsd * stressLossPct) / 100, 2),
    stressLossPct,
    confidenceScore,
    diversificationScore,
    backtestNote:
      "Local Wave 3 backtest proxy compares the current allocation against synthetic recent risk states from live APY, TVL, ETF flow, macro calendar risk, SoDEX volatility, and source health. It is simulation evidence, not realized performance.",
  };
}

function buildSnapshots(strategy: YieldPilotStrategy, amountUsd: number, market: MarketPulse, generatedAt: string) {
  return [
    {
      id: `snapshot-${generatedAt}`,
      timestamp: generatedAt,
      totalValueUsd: amountUsd,
      estimatedApy: strategy.estimatedApy,
      dailyYieldUsd: strategy.dailyYieldUsd,
      riskScore: strategy.riskScore,
      marketMood: market.moodLabel,
    },
  ];
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

export function normalizeConstraints(searchParams: URLSearchParams, goal: StrategyGoal): StrategyConstraints {
  const defaults = goalConstraints(goal);
  return {
    stableOnly: asBoolean(searchParams.get("stableOnly"), defaults.stableOnly),
    maxRisk: clamp(Math.round(asNumber(searchParams.get("maxRisk"), defaults.maxRisk)), 15, 90),
    maxApy: clamp(round(asNumber(searchParams.get("maxApy"), defaults.maxApy), 1), 3, 80),
    minTvlUsd: clamp(Math.round(asNumber(searchParams.get("minTvlUsd"), defaults.minTvlUsd)), 500_000, 500_000_000),
    maxPositions: clamp(Math.round(asNumber(searchParams.get("maxPositions"), defaults.maxPositions)), 1, 6),
    rebalanceThresholdPct: clamp(
      round(asNumber(searchParams.get("rebalanceThresholdPct"), defaults.rebalanceThresholdPct), 1),
      2,
      30,
    ),
    alertRiskScore: clamp(Math.round(asNumber(searchParams.get("alertRiskScore"), defaults.alertRiskScore)), 20, 95),
  };
}

export async function buildYieldPilotMarket(
  goal: StrategyGoal,
  amountUsd: number,
  constraints = goalConstraints(goal),
): Promise<YieldPilotMarketResponse> {
  const sourceStatuses: DataSourceStatus[] = [];

  const [opportunitiesResult, sosoResult, sodexResult] = await Promise.allSettled([
    getDefiLlamaOpportunities(goal, constraints),
    getSosoMarket(process.env.SOSOVALUE_API_KEY),
    getSodexTickers(),
  ]);

  let opportunities: YieldOpportunity[] = [];
  if (opportunitiesResult.status === "fulfilled") {
    opportunities = opportunitiesResult.value;
    sourceStatuses.push({
      name: "DefiLlama Yields",
      status: "live",
      detail: `${DEFILLAMA_POOLS_CONFIG.notice ? `${DEFILLAMA_POOLS_CONFIG.notice} ` : ""}${opportunities.length} risk-filtered yield pools are available.`,
      updatedAt: new Date().toISOString(),
    });
  } else {
    sourceStatuses.push({
      name: "DefiLlama Yields",
      status: "error",
      detail: sanitizeSecretBearingError(
        `${DEFILLAMA_POOLS_CONFIG.notice ? `${DEFILLAMA_POOLS_CONFIG.notice} ` : ""}${opportunitiesResult.reason instanceof Error ? opportunitiesResult.reason.message : "Yield fetch failed."}`,
        "DefiLlama",
      ),
    });
  }

  const soso =
    sosoResult.status === "fulfilled"
      ? sosoResult.value
      : {
          source: {
            name: "SoSoValue",
            status: "error" as const,
            detail: sanitizeSecretBearingError(sosoResult.reason instanceof Error ? sosoResult.reason.message : "SoSoValue request failed.", "SoSoValue"),
          },
          news: [] as NewsItem[],
          etfFlows: [] as EtfFlowPoint[],
          indexes: [] as SosoIndexSnapshot[],
          macroEvents: [] as MacroEvent[],
        };

  const sodex =
    sodexResult.status === "fulfilled"
      ? sodexResult.value
      : {
          source: {
            name: "SoDEX",
            status: "error" as const,
            detail: sanitizeSecretBearingError(sodexResult.reason instanceof Error ? sodexResult.reason.message : "SoDEX request failed.", "SoDEX"),
          },
          tickers: [] as SodexTicker[],
        };

  sourceStatuses.push(soso.source, sodex.source);

  const market = buildMarketPulse(soso.news, soso.etfFlows, sodex.tickers, soso.indexes, soso.macroEvents);
  const strategy = buildStrategy(goal, amountUsd, opportunities, market, constraints);
  const openAi = await getOpenAiInsight(strategy, market, opportunities);
  sourceStatuses.push(openAi.source);
  const riskEvents = buildRiskEvents(market, opportunities, sourceStatuses);
  const generatedAt = new Date().toISOString();
  const alerts = buildAlerts(strategy, market, opportunities, sourceStatuses);
  const analytics = buildAnalytics(strategy, amountUsd, market);

  return {
    generatedAt,
    mode: "simulation",
    inputs: {
      amountUsd,
      goal,
      constraints,
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
    wave3: {
      snapshots: buildSnapshots(strategy, amountUsd, market, generatedAt),
      riskHistory: buildRiskHistory(strategy, market),
      alerts,
      analytics,
    },
    sources: sourceStatuses,
  };
}
