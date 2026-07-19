export type StrategyGoal = "safe" | "balanced" | "aggressive" | "stablecoin" | "custom";

export type SourceStatus = "live" | "missing_key" | "degraded" | "error";

export interface StrategyConstraints {
  stableOnly: boolean;
  maxRisk: number;
  maxApy: number;
  minTvlUsd: number;
  maxPositions: number;
  rebalanceThresholdPct: number;
  alertRiskScore: number;
}

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
  scoring: {
    yieldComponent: number;
    tvlComponent: number;
    reputationComponent: number;
    stabilityComponent: number;
    predictionComponent: number;
    riskPenalty: number;
    sourceSignals: string[];
  };
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
  evidence: string[];
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

export interface SosoIndexSnapshot {
  ticker: string;
  price: number;
  change24hPct: number;
  roi7d: number;
  roi1m: number;
  roi3m: number;
  ytd: number;
}

export interface MacroEvent {
  date: string;
  events: string[];
  daysFromNow: number;
  horizon: "past" | "today" | "upcoming";
  importanceScore: number;
}

export interface MarketPulse {
  moodLabel: string;
  moodScore: number;
  volatilityLabel: string;
  macroRiskLabel: "Calm" | "Watch" | "Event Risk";
  macroRiskScore: number;
  newsSentiment: number;
  etfNetFlowUsd: number;
  etfFlowDirection: "inflow" | "outflow" | "flat" | "unknown";
  sodexAverageMovePct: number;
  news: NewsItem[];
  etfFlows: EtfFlowPoint[];
  sodexTickers: SodexTicker[];
  sosoIndexes: SosoIndexSnapshot[];
  macroEvents: MacroEvent[];
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
  reasoning: string[];
}

export interface YieldPilotStrategy {
  goal: StrategyGoal;
  goalLabel: string;
  constraints: StrategyConstraints;
  estimatedApy: number;
  riskScore: number;
  dailyYieldUsd: number;
  allocation: StrategyAllocation[];
  rationale: string[];
  rebalanceActions: string[];
  rebalanceDecisions: RebalanceDecision[];
}

export interface RebalanceDecision {
  id: string;
  action: "allocate" | "hold" | "reduce" | "exit_ready";
  title: string;
  detail: string;
  evidence: string[];
  source: string;
  impact: "positive" | "neutral" | "protective";
}

export interface PortfolioSnapshot {
  id: string;
  timestamp: string;
  totalValueUsd: number;
  estimatedApy: number;
  dailyYieldUsd: number;
  riskScore: number;
  marketMood: string;
}

export interface RiskHistoryPoint {
  label: string;
  riskScore: number;
  estimatedApy: number;
  marketMood: string;
}

export interface StrategyAlert {
  id: string;
  level: "info" | "watch" | "warning";
  title: string;
  detail: string;
  trigger: string;
}

export interface StrategyAnalytics {
  projectedMonthlyYieldUsd: number;
  projectedAnnualYieldUsd: number;
  stressLossUsd: number;
  stressLossPct: number;
  confidenceScore: number;
  diversificationScore: number;
  backtestNote: string;
}

export interface YieldPilotMarketResponse {
  generatedAt: string;
  mode: "simulation";
  inputs: {
    amountUsd: number;
    goal: StrategyGoal;
    constraints: StrategyConstraints;
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
  wave3: {
    snapshots: PortfolioSnapshot[];
    riskHistory: RiskHistoryPoint[];
    alerts: StrategyAlert[];
    analytics: StrategyAnalytics;
  };
  sources: DataSourceStatus[];
}
