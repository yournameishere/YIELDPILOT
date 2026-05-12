export type StrategyGoal = "safe" | "balanced" | "aggressive" | "stablecoin" | "custom";

export type SourceStatus = "live" | "missing_key" | "degraded" | "error";

export interface DataSourceStatus {
  name: string;
  status: SourceStatus;
  detail: string;
  updatedAt?: string;
}

export interface YieldOpportunity {
  id: string;
  protocol: string;
  chain: string;
  asset: string;
  apy: number;
  tvlUsd: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  score: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  confidence: number;
  notes: string[];
}

export interface StrategyAllocation {
  protocol: string;
  chain: string;
  asset: string;
  weight: number;
  amountUsd: number;
  apy: number;
  riskScore: number;
  reason: string;
}

export interface NewsItem {
  id: string;
  title: string;
  sourceLink: string;
  releaseTime: string;
  summary: string;
}

export interface EtfFlowPoint {
  symbol: string;
  date: string;
  netInflowUsd: number;
  totalAssetsUsd: number;
}

export interface SodexTicker {
  symbol: string;
  lastPrice: number;
  changePct: number;
  quoteVolume: number;
}

export interface MarketPulse {
  moodLabel: string;
  moodScore: number;
  volatilityLabel: string;
  newsSentiment: number;
  etfNetFlowUsd: number;
  etfFlowDirection: "inflow" | "outflow" | "flat" | "unknown";
  sodexAverageMovePct: number;
  news: NewsItem[];
  etfFlows: EtfFlowPoint[];
  sodexTickers: SodexTicker[];
}

export interface RiskEvent {
  level: "info" | "watch" | "warning";
  title: string;
  detail: string;
}

export interface OpenAiInsight {
  provider: "OpenAI";
  model: string;
  status: SourceStatus;
  headline: string;
  summary: string;
  recommendation: string;
  riskNote: string;
  nextAction: string;
}

export interface YieldPilotStrategy {
  goal: StrategyGoal;
  goalLabel: string;
  estimatedApy: number;
  riskScore: number;
  dailyYieldUsd: number;
  allocation: StrategyAllocation[];
  rationale: string[];
  rebalanceActions: string[];
}

export interface YieldPilotMarketResponse {
  generatedAt: string;
  mode: "simulation";
  inputs: {
    amountUsd: number;
    goal: StrategyGoal;
  };
  portfolio: {
    totalValueUsd: number;
    estimatedApy: number;
    dailyYieldUsd: number;
    riskScore: number;
    marketMood: string;
    aiStatus: string;
    activeStrategies: number;
  };
  strategy: YieldPilotStrategy;
  ai: OpenAiInsight;
  opportunities: YieldOpportunity[];
  market: MarketPulse;
  riskEvents: RiskEvent[];
  sources: DataSourceStatus[];
}
