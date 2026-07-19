"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  Database,
  Download,
  Gauge,
  LineChart,
  Play,
  Radar,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Zap,
} from "lucide-react";
import type {
  PortfolioSnapshot,
  RiskHistoryPoint,
  StrategyConstraints,
  StrategyGoal,
  YieldPilotMarketResponse,
} from "@/lib/yieldpilot/types";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type ConsoleTab = "strategy" | "risk" | "macro" | "analytics" | "sources";

const STORAGE_KEY = "yieldpilot-wave3-state-v1";

const DEFAULT_CONSTRAINTS: Record<StrategyGoal, StrategyConstraints> = {
  safe: {
    stableOnly: true,
    maxRisk: 40,
    maxApy: 16,
    minTvlUsd: 20_000_000,
    maxPositions: 3,
    rebalanceThresholdPct: 7,
    alertRiskScore: 45,
  },
  balanced: {
    stableOnly: true,
    maxRisk: 58,
    maxApy: 26,
    minTvlUsd: 5_000_000,
    maxPositions: 3,
    rebalanceThresholdPct: 10,
    alertRiskScore: 58,
  },
  aggressive: {
    stableOnly: false,
    maxRisk: 74,
    maxApy: 48,
    minTvlUsd: 1_500_000,
    maxPositions: 4,
    rebalanceThresholdPct: 14,
    alertRiskScore: 72,
  },
  stablecoin: {
    stableOnly: true,
    maxRisk: 46,
    maxApy: 20,
    minTvlUsd: 10_000_000,
    maxPositions: 3,
    rebalanceThresholdPct: 8,
    alertRiskScore: 50,
  },
  custom: {
    stableOnly: true,
    maxRisk: 54,
    maxApy: 24,
    minTvlUsd: 4_000_000,
    maxPositions: 4,
    rebalanceThresholdPct: 10,
    alertRiskScore: 60,
  },
};

const GOALS: Array<{ id: StrategyGoal; label: string; hint: string }> = [
  { id: "safe", label: "SAFE", hint: "Lower-risk stablecoin routing" },
  { id: "balanced", label: "BALANCED", hint: "Risk-adjusted growth" },
  { id: "aggressive", label: "AGGRESSIVE", hint: "Higher APY with caps" },
  { id: "stablecoin", label: "STABLECOIN", hint: "Stablecoin-only routing" },
  { id: "custom", label: "AI CUSTOM", hint: "User-controlled constraints" },
];

const TABS: Array<{ id: ConsoleTab; label: string; icon: typeof ClipboardList }> = [
  { id: "strategy", label: "STRATEGY", icon: ClipboardList },
  { id: "risk", label: "RISK", icon: ShieldCheck },
  { id: "macro", label: "MACRO", icon: CalendarDays },
  { id: "analytics", label: "ANALYTICS", icon: BarChart3 },
  { id: "sources", label: "SOURCES", icon: Database },
];

const statusTone: Record<string, string> = {
  live: "text-[#22c55e]",
  missing_key: "text-[#f59e0b]",
  degraded: "text-[#f59e0b]",
  error: "text-[#ef4444]",
};

const alertTone: Record<string, string> = {
  info: "text-[#2196f3]",
  watch: "text-[#f59e0b]",
  warning: "text-[#ef4444]",
};

const macroRiskTone: Record<string, string> = {
  Calm: "text-[#22c55e]",
  Watch: "text-[#f59e0b]",
  "Event Risk": "text-[#ef4444]",
};

function constraintsEqual(left: StrategyConstraints, right: StrategyConstraints) {
  return (
    left.stableOnly === right.stableOnly &&
    left.maxRisk === right.maxRisk &&
    left.maxApy === right.maxApy &&
    left.minTvlUsd === right.minTvlUsd &&
    left.maxPositions === right.maxPositions &&
    left.rebalanceThresholdPct === right.rebalanceThresholdPct &&
    left.alertRiskScore === right.alertRiskScore
  );
}

function normalizeUiAmount(value: number) {
  if (!Number.isFinite(value)) return 1_000;
  return Math.min(Math.max(Math.round(value * 100) / 100, 100), 1_000_000);
}

function formatUsd(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function riskColor(score: number) {
  if (score < 34) return "text-[#22c55e]";
  if (score < 62) return "text-[#f59e0b]";
  return "text-[#ef4444]";
}

function shortAddress(address: string) {
  if (address.startsWith("SIM-")) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function timeStamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function macroTimingLabel(daysFromNow: number) {
  if (daysFromNow === 0) return "Today";
  if (daysFromNow === 1) return "Tomorrow";
  if (daysFromNow > 1) return `In ${daysFromNow} days`;
  if (daysFromNow === -1) return "Yesterday";
  return `${Math.abs(daysFromNow)} days ago`;
}

function readStoredState() {
  if (typeof window === "undefined") {
    return { snapshots: [] as PortfolioSnapshot[], activity: [] as string[], riskHistory: [] as RiskHistoryPoint[] };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as {
      snapshots?: PortfolioSnapshot[];
      activity?: string[];
      riskHistory?: RiskHistoryPoint[];
    };

    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots.slice(0, 12) : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity.slice(0, 12) : [],
      riskHistory: Array.isArray(parsed.riskHistory) ? parsed.riskHistory.slice(0, 12) : [],
    };
  } catch {
    return { snapshots: [] as PortfolioSnapshot[], activity: [] as string[], riskHistory: [] as RiskHistoryPoint[] };
  }
}

function saveStoredState(snapshots: PortfolioSnapshot[], activity: string[], riskHistory: RiskHistoryPoint[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      snapshots: snapshots.slice(0, 12),
      activity: activity.slice(0, 12),
      riskHistory: riskHistory.slice(0, 12),
    }),
  );
}

function BarMeter({ value, tone = "bg-[#2196f3]" }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 bg-[#1e1e1e] overflow-hidden" aria-hidden="true">
      <div className={`h-full ${tone}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="p-7 text-sm text-[#5a5a5a] leading-relaxed">{children}</div>;
}

export function YieldPilotConsole() {
  const [goal, setGoal] = useState<StrategyGoal>("balanced");
  const [amount, setAmount] = useState(1000);
  const [constraints, setConstraints] = useState<StrategyConstraints>(DEFAULT_CONSTRAINTS.balanced);
  const [tab, setTab] = useState<ConsoleTab>("strategy");
  const [data, setData] = useState<YieldPilotMarketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletMode, setWalletMode] = useState<"disconnected" | "wallet" | "simulation">("disconnected");
  const [activity, setActivity] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [riskHistory, setRiskHistory] = useState<RiskHistoryPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const requestSeq = useRef(0);

  const allocationTotal = useMemo(
    () => data?.strategy.allocation.reduce((sum, item) => sum + item.weight, 0) ?? 0,
    [data],
  );

  const latestSnapshot = snapshots[0] ?? data?.wave3.snapshots[0];
  const displayedRiskHistory = useMemo(
    () => (riskHistory.length > 0 ? riskHistory.slice(0, 8).reverse() : data?.wave3.riskHistory ?? []),
    [data, riskHistory],
  );
  const macroEvents = useMemo(() => data?.market.macroEvents ?? [], [data]);
  const nextMacroEvent = useMemo(() => macroEvents.find((event) => event.daysFromNow >= 0), [macroEvents]);
  const hasPendingInputs = Boolean(
    data &&
      (data.inputs.goal !== goal ||
        data.inputs.amountUsd !== amount ||
        !constraintsEqual(data.inputs.constraints, constraints)),
  );
  const activeConstraints = hasPendingInputs ? constraints : data?.inputs.constraints ?? constraints;
  const canUseCurrentStrategy = Boolean(data && !hasPendingInputs && data.strategy.allocation.length > 0);
  const canExportMemo = Boolean(data && !hasPendingInputs);
  const liveStatus = error
    ? `Market analysis error: ${error}`
    : loading
      ? "Market analysis is running."
      : data
        ? `Market analysis loaded for ${data.strategy.goalLabel}.`
        : "Market analysis is waiting to run.";

  function persist(nextSnapshots = snapshots, nextActivity = activity, nextRiskHistory = riskHistory) {
    saveStoredState(nextSnapshots, nextActivity, nextRiskHistory);
  }

  function pushActivity(lines: string[], nextSnapshots = snapshots, nextRiskHistory = riskHistory) {
    setActivity((items) => {
      const next = [...lines, ...items].slice(0, 12);
      saveStoredState(nextSnapshots, next, nextRiskHistory);
      return next;
    });
  }

  function addSnapshot(snapshot: PortfolioSnapshot) {
    setSnapshots((items) => {
      const next = [snapshot, ...items.filter((item) => item.id !== snapshot.id)].slice(0, 12);
      saveStoredState(next, activity, riskHistory);
      return next;
    });
  }

  function updateConstraint<K extends keyof StrategyConstraints>(key: K, value: StrategyConstraints[K]) {
    setGoal("custom");
    setConstraints((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadMarket(nextGoal = goal, nextAmount = amount, nextConstraints = constraints) {
    const requestId = ++requestSeq.current;
    const safeAmount = normalizeUiAmount(nextAmount);
    if (safeAmount !== nextAmount) setAmount(safeAmount);
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        goal: nextGoal,
        amount: String(safeAmount),
        stableOnly: String(nextConstraints.stableOnly),
        maxRisk: String(nextConstraints.maxRisk),
        maxApy: String(nextConstraints.maxApy),
        minTvlUsd: String(nextConstraints.minTvlUsd),
        maxPositions: String(nextConstraints.maxPositions),
        rebalanceThresholdPct: String(nextConstraints.rebalanceThresholdPct),
        alertRiskScore: String(nextConstraints.alertRiskScore),
      });

      const response = await fetch(`/api/yieldpilot/market?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Market engine returned an error.");
      }

      const payload = (await response.json()) as YieldPilotMarketResponse;
      if (requestId !== requestSeq.current) return;
      setData(payload);

      const snapshot = payload.wave3.snapshots[0];
      const nextSnapshots = snapshot
        ? [snapshot, ...snapshots.filter((item) => item.id !== snapshot.id)].slice(0, 12)
        : snapshots;
      const riskPoint: RiskHistoryPoint = {
        label: new Date(payload.generatedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        riskScore: payload.strategy.riskScore,
        estimatedApy: payload.strategy.estimatedApy,
        marketMood: payload.market.moodLabel,
      };
      const nextRiskHistory = [riskPoint, ...riskHistory].slice(0, 12);

      setSnapshots(nextSnapshots);
      setRiskHistory(nextRiskHistory);

      pushActivity(
        [
          `${timeStamp()} ANALYSIS refreshed ${payload.opportunities.length} pools with ${payload.strategy.goalLabel} constraints.`,
          `${timeStamp()} REASON ${payload.strategy.rationale[1]}`,
        ],
        nextSnapshots,
        nextRiskHistory,
      );
    } catch (err) {
      if (requestId === requestSeq.current) {
        setError(err instanceof Error ? err.message : "Unable to refresh market intelligence.");
      }
    } finally {
      if (requestId === requestSeq.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const stored = readStoredState();
    setSnapshots(stored.snapshots);
    setActivity(stored.activity);
    setRiskHistory(stored.riskHistory);
    void loadMarket("balanced", 1000, DEFAULT_CONSTRAINTS.balanced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void loadMarket(goal, amount, constraints);
    }, 45_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, goal, amount, constraints]);

  async function connectWallet() {
    setError("");

    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const [account] = Array.isArray(accounts) ? (accounts as string[]) : [];
        if (!account) throw new Error("No wallet account returned.");
        setWalletAddress(account);
        setWalletMode("wallet");
        pushActivity([`${timeStamp()} WALLET connected ${shortAddress(account)} in approval-only mode.`]);
        return;
      }

      const random =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID().slice(0, 8)
          : String(Date.now()).slice(-8);
      setWalletAddress(`SIM-${random.toUpperCase()}`);
      setWalletMode("simulation");
      pushActivity([`${timeStamp()} SIMULATION wallet created for local Wave 3 testing.`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    }
  }

  function handleGoal(nextGoal: StrategyGoal) {
    const nextConstraints = DEFAULT_CONSTRAINTS[nextGoal];
    setGoal(nextGoal);
    setConstraints(nextConstraints);
    void loadMarket(nextGoal, amount, nextConstraints);
  }

  function activateStrategy() {
    if (!data || hasPendingInputs) return;
    const lines = data.strategy.rebalanceDecisions.map(
      (decision) => `${timeStamp()} ${decision.action.toUpperCase()} ${decision.title}: ${decision.detail}`,
    );
    pushActivity(lines.length > 0 ? lines : [`${timeStamp()} HOLD no eligible allocation changes.`]);
    if (data.wave3.snapshots[0]) addSnapshot(data.wave3.snapshots[0]);
  }

  function simulateRiskExit() {
    if (!data || hasPendingInputs || data.strategy.allocation.length === 0) return;
    const protective = data.strategy.rebalanceDecisions.find((decision) => decision.impact === "protective");
    const riskiest = [...data.strategy.allocation].sort((a, b) => b.riskScore - a.riskScore)[0];
    pushActivity([
      `${timeStamp()} PROTECTIVE_EXIT ${protective?.detail ?? `Reduced ${riskiest.protocol} after risk monitor trigger.`}`,
      `${timeStamp()} REBALANCE funds returned to safest simulated allocation.`,
    ]);
  }

  function exportMemo() {
    if (!data || hasPendingInputs) return;
    const memo = {
      generatedAt: data.generatedAt,
      mode: data.mode,
      inputs: data.inputs,
      portfolio: data.portfolio,
      ai: data.ai,
      strategy: data.strategy,
      market: data.market,
      alerts: data.wave3.alerts,
      analytics: data.wave3.analytics,
      sources: data.sources,
    };
    const blob = new Blob([JSON.stringify(memo, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `yieldpilot-wave3-memo-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushActivity([`${timeStamp()} EXPORT strategy memo saved locally as JSON.`]);
  }

  function resetLocalState() {
    setSnapshots([]);
    setActivity([]);
    setRiskHistory([]);
    persist([], [], []);
  }

  const metrics = [
    { label: "PORTFOLIO", value: formatUsd(data?.portfolio.totalValueUsd ?? amount), icon: Wallet },
    { label: "EST APY", value: `${formatNumber(data?.portfolio.estimatedApy ?? 0)}%`, icon: Zap },
    { label: "DAILY YIELD", value: formatUsd(data?.portfolio.dailyYieldUsd ?? 0), icon: Activity },
    { label: "RISK SCORE", value: `${data?.portfolio.riskScore ?? 0}/100`, icon: Gauge },
    { label: "MOOD", value: data?.portfolio.marketMood ?? "Scanning", icon: Radar },
    { label: "MACRO", value: data?.market.macroRiskLabel ?? "Pending", icon: CalendarDays },
  ];

  return (
    <section id="console" className="relative border-t border-[#1e1e1e] bg-[#080808] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <span className="sys-tag mb-3 block">WAVE 3 PRODUCTION SIM</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[1.02] text-[#f2ede6]">
              AI YIELD<br />
              <span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>WORKSPACE</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={connectWallet}
              type="button"
              className="inline-flex items-center gap-3 border border-[#2e2e2e] px-5 h-11 font-mono text-[11px] tracking-widest text-[#f2ede6] hover:border-[#2196f3]/50 hover:text-[#2196f3] transition-colors"
            >
              <Wallet className="w-4 h-4" aria-hidden="true" />
              {walletMode === "disconnected" ? "CONNECT WALLET" : shortAddress(walletAddress)}
            </button>
            <button
              onClick={() => setAutoRefresh((value) => !value)}
              type="button"
              aria-pressed={autoRefresh}
              className={`inline-flex items-center gap-3 border px-5 h-11 font-mono text-[11px] tracking-widest transition-colors ${
                autoRefresh
                  ? "border-[#22c55e]/60 text-[#22c55e]"
                  : "border-[#2e2e2e] text-[#5a5a5a] hover:text-[#f2ede6]"
              }`}
            >
              <Activity className="w-4 h-4" aria-hidden="true" />
              {autoRefresh ? "LIVE POLLING ON" : "LIVE POLLING OFF"}
            </button>
            <button
              onClick={() => loadMarket()}
              disabled={loading}
              type="button"
              className="inline-flex items-center gap-3 bg-[#2196f3] text-[#050505] px-5 h-11 font-mono text-[11px] tracking-widest font-semibold hover:bg-[#42a5f5] disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              ANALYZE MARKET
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live={error ? "assertive" : "polite"} aria-atomic="true">
          {liveStatus}
        </p>

        <div className="grid lg:grid-cols-[320px_1fr] border-b border-[#1e1e1e]">
          <aside className="border-r border-[#1e1e1e]">
            <div className="p-6 border-b border-[#1e1e1e]">
              <label className="font-mono text-[10px] tracking-[0.18em] text-[#3a3a3a] block mb-3">
                SIMULATED CAPITAL
              </label>
              <div className="flex items-center border border-[#2e2e2e] h-12 px-4">
                <span className="font-mono text-[#3a3a3a] mr-2">$</span>
                <input
                  value={amount}
                  min={100}
                  max={1_000_000}
                  type="number"
                  onChange={(event) => setAmount(Number(event.target.value))}
                  onBlur={() => {
                    const nextAmount = normalizeUiAmount(amount);
                    setAmount(nextAmount);
                    void loadMarket(goal, nextAmount, constraints);
                  }}
                  className="w-full bg-transparent outline-none font-display text-3xl text-[#f2ede6] tabular-nums"
                />
              </div>
            </div>

            <div className="border-b border-[#1e1e1e]">
              {GOALS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleGoal(item.id)}
                  type="button"
                  aria-pressed={goal === item.id}
                  className={`w-full text-left p-5 border-b border-[#1e1e1e] last:border-b-0 transition-colors ${
                    goal === item.id ? "bg-[#0e0e0e]" : "hover:bg-[#0a0a0a]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={`font-mono text-[11px] tracking-widest ${goal === item.id ? "text-[#2196f3]" : "text-[#5a5a5a]"}`}>
                      {item.label}
                    </span>
                    {goal === item.id && <ShieldCheck className="w-4 h-4 text-[#2196f3]" />}
                  </div>
                  <p className="mt-2 text-xs text-[#3a3a3a] leading-relaxed">{item.hint}</p>
                </button>
              ))}
            </div>

            <div className="p-6 border-b border-[#1e1e1e] flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <span className="sys-tag text-[9px]">CUSTOM CONSTRAINTS</span>
                <SlidersHorizontal className="w-4 h-4 text-[#2196f3]" />
              </div>

              {[
                { key: "maxRisk" as const, label: "MAX RISK", min: 15, max: 90, suffix: "/100" },
                { key: "maxApy" as const, label: "MAX APY", min: 3, max: 80, suffix: "%" },
                { key: "rebalanceThresholdPct" as const, label: "REBALANCE DELTA", min: 2, max: 30, suffix: "%" },
                { key: "alertRiskScore" as const, label: "ALERT RISK", min: 20, max: 95, suffix: "/100" },
              ].map((control) => (
                <label key={control.key} className="flex flex-col gap-2">
                  <span className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[#3a3a3a]">
                    {control.label}
                    <span className="text-[#f2ede6]">
                      {String(constraints[control.key])}
                      {control.suffix}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    value={Number(constraints[control.key])}
                    onChange={(event) => updateConstraint(control.key, Number(event.target.value) as StrategyConstraints[typeof control.key])}
                    className="accent-[#2196f3]"
                  />
                </label>
              ))}

              <label className="flex flex-col gap-2">
                <span className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[#3a3a3a]">
                  MIN TVL
                  <span className="text-[#f2ede6]">{formatUsd(constraints.minTvlUsd, true)}</span>
                </span>
                <input
                  type="range"
                  min={500_000}
                  max={100_000_000}
                  step={500_000}
                  value={constraints.minTvlUsd}
                  onChange={(event) => updateConstraint("minTvlUsd", Number(event.target.value))}
                  className="accent-[#2196f3]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateConstraint("stableOnly", !constraints.stableOnly)}
                  type="button"
                  aria-pressed={constraints.stableOnly}
                  className={`h-10 border font-mono text-[10px] tracking-widest transition-colors ${
                    constraints.stableOnly ? "border-[#2196f3] text-[#2196f3]" : "border-[#2e2e2e] text-[#5a5a5a]"
                  }`}
                >
                  STABLE ONLY
                </button>
                <select
                  value={constraints.maxPositions}
                  onChange={(event) => updateConstraint("maxPositions", Number(event.target.value))}
                  className="h-10 border border-[#2e2e2e] bg-[#080808] px-3 font-mono text-[10px] tracking-widest text-[#f2ede6] outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value} POSITIONS
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => loadMarket("custom", amount, constraints)}
                disabled={loading}
                type="button"
                className="inline-flex items-center justify-center gap-3 border border-[#2196f3]/60 text-[#2196f3] px-5 h-10 font-mono text-[10px] tracking-widest hover:bg-[#2196f3] hover:text-[#050505] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                APPLY CUSTOM
              </button>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <button
                onClick={activateStrategy}
                disabled={!canUseCurrentStrategy}
                type="button"
                className="inline-flex items-center justify-center gap-3 bg-[#2196f3] text-[#050505] px-5 h-11 font-mono text-[11px] tracking-widest font-semibold hover:bg-[#42a5f5] disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4" />
                ACTIVATE SIM
              </button>
              <button
                onClick={simulateRiskExit}
                disabled={!canUseCurrentStrategy}
                type="button"
                className="inline-flex items-center justify-center gap-3 border border-[#2e2e2e] text-[#f2ede6] px-5 h-11 font-mono text-[11px] tracking-widest hover:border-[#ef4444]/60 hover:text-[#ef4444] disabled:opacity-50 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                TEST EXIT
              </button>
              {hasPendingInputs && (
                <p className="font-mono text-[10px] leading-relaxed text-[#f59e0b]">
                  INPUTS CHANGED - RUN ANALYZE OR APPLY CUSTOM BEFORE ACTIVATING.
                </p>
              )}
            </div>
          </aside>

          <div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 border-b border-[#1e1e1e]">
              {metrics.map((metric) => (
                <div key={metric.label} className="p-5 lg:p-6 border-r border-b lg:border-b-0 border-[#1e1e1e] last:border-r-0 min-h-[120px]">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-[9px] tracking-[0.18em] text-[#3a3a3a]">{metric.label}</span>
                    <metric.icon className="w-4 h-4 text-[#2196f3]" aria-hidden="true" />
                  </div>
                  <div
                    className={`font-display leading-none text-[#f2ede6] tabular-nums ${
                      metric.label === "MOOD" || metric.label === "MACRO" ? "text-2xl lg:text-3xl" : "text-3xl lg:text-4xl"
                    }`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-b border-[#1e1e1e] grid grid-cols-2 sm:grid-cols-3 lg:flex" role="tablist" aria-label="YieldPilot console views">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  type="button"
                  role="tab"
                  id={`yieldpilot-tab-${item.id}`}
                  aria-selected={tab === item.id}
                  aria-controls={`yieldpilot-panel-${item.id}`}
                  tabIndex={tab === item.id ? 0 : -1}
                  className={`h-14 px-3 sm:px-5 border-r border-b lg:border-b-0 border-[#1e1e1e] inline-flex items-center justify-center gap-2 sm:gap-3 font-mono text-[9px] sm:text-[10px] tracking-widest transition-colors lg:min-w-[150px] ${
                    tab === item.id ? "bg-[#0e0e0e] text-[#2196f3]" : "text-[#5a5a5a] hover:text-[#f2ede6]"
                  }`}
                >
                  <item.icon className="w-4 h-4" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "strategy" && (
              <div id="yieldpilot-panel-strategy" role="tabpanel" aria-labelledby="yieldpilot-tab-strategy" className="grid xl:grid-cols-[1.15fr_0.85fr] border-b border-[#1e1e1e]">
                <div className="border-r border-[#1e1e1e]">
                  <div className="p-6 border-b border-[#1e1e1e] flex items-start justify-between gap-4">
                    <div>
                      <span className="sys-tag text-[9px]">AI RECOMMENDATION</span>
                      <h3 className="font-display text-4xl text-[#f2ede6] mt-2">{data?.strategy.goalLabel ?? "Analyzing"}</h3>
                      <p className="mt-2 text-xs text-[#5a5a5a] leading-relaxed">
                        Max risk {activeConstraints.maxRisk}/100, min TVL {formatUsd(activeConstraints.minTvlUsd, true)}, max APY{" "}
                        {activeConstraints.maxApy}%.
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-[#3a3a3a]">
                      {hasPendingInputs
                        ? "PENDING APPLY"
                        : data
                          ? new Date(data.generatedAt).toLocaleTimeString("en-US", { hour12: false })
                          : "LIVE"}
                    </span>
                  </div>

                  <div>
                    {(data?.strategy.allocation ?? []).map((item, index) => (
                      <div
                        key={`${item.protocol}-${item.asset}-${item.chain}-${index}`}
                        className="grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_128px] border-b border-[#1e1e1e] last:border-b-0"
                      >
                        <div className="border-r border-[#1e1e1e] p-5 font-mono text-[10px] text-[#3a3a3a]">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="p-5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-display text-3xl text-[#f2ede6] break-words">{item.protocol}</span>
                            <span className="font-mono text-[10px] text-[#2196f3] tracking-widest">{item.chain}</span>
                          </div>
                          <p className="mt-2 text-sm text-[#5a5a5a] leading-relaxed">{item.reason}</p>
                          <div className="mt-3 flex flex-col gap-1">
                            {item.evidence.map((line) => (
                              <span key={line} className="font-mono text-[10px] text-[#3a3a3a]">
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-5 md:border-l border-[#1e1e1e] flex md:block items-end justify-between">
                          <div className="font-display text-4xl text-[#2196f3]">{item.weight}%</div>
                          <div className="font-mono text-[10px] text-[#3a3a3a] mt-1">{formatUsd(item.amountUsd)}</div>
                        </div>
                      </div>
                    ))}

                    {!loading && data?.strategy.allocation.length === 0 && (
                      <EmptyState>No live pool passed the current risk profile. Adjust custom constraints or refresh the market scan.</EmptyState>
                    )}
                  </div>
                </div>

                <div>
                  <div className="p-6 border-b border-[#1e1e1e]">
                    <span className="sys-tag text-[9px] mb-3 block">OPENAI STRATEGY MEMO</span>
                    <div className="flex items-center gap-2 mb-4 font-mono text-[9px] tracking-widest text-[#3a3a3a]">
                      <BrainCircuit className="w-3.5 h-3.5 text-[#2196f3]" />
                      <span>{data?.ai.model ?? "OPENAI_MODEL_PENDING"}</span>
                      <span className={data?.ai.status === "live" ? "text-[#22c55e]" : "text-[#f59e0b]"}>
                        {data?.ai.status?.toUpperCase() ?? "SCANNING"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {data ? (
                        [data.ai.headline, data.ai.summary, data.ai.recommendation, data.ai.riskNote, data.ai.nextAction].map((line) => (
                          <p key={line} className="text-sm text-[#5a5a5a] leading-relaxed">
                            {line}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-[#5a5a5a] leading-relaxed">Waiting for live OpenAI strategy reasoning.</p>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-b border-[#1e1e1e]">
                    <span className="sys-tag text-[9px] mb-4 block">REBALANCE REASONING</span>
                    <div className="flex flex-col gap-4">
                      {(data?.strategy.rebalanceDecisions ?? []).map((decision) => (
                        <div key={decision.id} className="border-l border-[#2e2e2e] pl-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[10px] tracking-widest text-[#f2ede6]">{decision.title.toUpperCase()}</span>
                            <span className={decision.impact === "protective" ? "font-mono text-[9px] text-[#ef4444]" : "font-mono text-[9px] text-[#2196f3]"}>
                              {decision.action.toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#5a5a5a] leading-relaxed">{decision.detail}</p>
                          <p className="mt-2 font-mono text-[9px] text-[#3a3a3a]">{decision.source}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={exportMemo}
                      disabled={!canExportMemo}
                      className="inline-flex items-center justify-center gap-3 border border-[#2e2e2e] text-[#f2ede6] px-5 h-11 font-mono text-[11px] tracking-widest hover:border-[#2196f3]/60 hover:text-[#2196f3] disabled:opacity-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      EXPORT MEMO
                    </button>
                    <button
                      onClick={resetLocalState}
                      className="inline-flex items-center justify-center gap-3 border border-[#2e2e2e] text-[#5a5a5a] px-5 h-11 font-mono text-[11px] tracking-widest hover:text-[#f2ede6] transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      RESET LOCAL
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "risk" && (
              <div id="yieldpilot-panel-risk" role="tabpanel" aria-labelledby="yieldpilot-tab-risk" className="grid xl:grid-cols-[1fr_0.9fr] border-b border-[#1e1e1e]">
                <div className="border-r border-[#1e1e1e] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="sys-tag text-[9px]">RISK SCORING TRANSPARENCY</span>
                    <ShieldCheck className="w-4 h-4 text-[#2196f3]" />
                  </div>
                  <div className="flex flex-col gap-5">
                    {(data?.opportunities ?? []).slice(0, 5).map((item) => {
                      const positive =
                        item.scoring.yieldComponent +
                        item.scoring.tvlComponent +
                        item.scoring.reputationComponent +
                        item.scoring.stabilityComponent +
                        item.scoring.predictionComponent;
                      return (
                        <div key={item.id} className="border-b border-[#1e1e1e] pb-5 last:border-b-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <div className="font-display text-3xl text-[#f2ede6] break-words">{item.protocol}</div>
                              <p className="font-mono text-[10px] text-[#3a3a3a]">
                                {item.asset} / {item.chain}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`font-display text-3xl ${riskColor(item.riskScore)}`}>{item.riskScore}</div>
                              <p className="font-mono text-[9px] text-[#3a3a3a]">RISK</p>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            {[
                              { label: "YIELD", value: item.scoring.yieldComponent },
                              { label: "TVL", value: item.scoring.tvlComponent },
                              { label: "REPUTATION", value: item.scoring.reputationComponent },
                              { label: "STABILITY", value: item.scoring.stabilityComponent },
                              { label: "PREDICTION", value: item.scoring.predictionComponent },
                              { label: "RISK PENALTY", value: -item.scoring.riskPenalty },
                            ].map((part) => (
                              <div key={part.label}>
                                <div className="flex items-center justify-between font-mono text-[9px] tracking-widest text-[#3a3a3a] mb-1">
                                  <span>{part.label}</span>
                                  <span className={part.value >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}>
                                    {part.value >= 0 ? "+" : ""}
                                    {formatNumber(part.value)}
                                  </span>
                                </div>
                                <BarMeter value={part.label === "RISK PENALTY" ? Math.abs(part.value) : (part.value / Math.max(positive, 1)) * 100} tone={part.value >= 0 ? "bg-[#2196f3]" : "bg-[#ef4444]"} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="p-6 border-b border-[#1e1e1e]">
                    <div className="flex items-center justify-between mb-5">
                      <span className="sys-tag text-[9px]">ALERTS</span>
                      <Bell className="w-4 h-4 text-[#f59e0b]" />
                    </div>
                    <div className="flex flex-col gap-4">
                      {(data?.wave3.alerts ?? []).map((alert) => (
                        <div key={alert.id} className="border-l border-[#2e2e2e] pl-4">
                          <div className={`font-mono text-[10px] tracking-widest ${alertTone[alert.level]}`}>
                            {alert.title.toUpperCase()}
                          </div>
                          <p className="mt-1 text-xs text-[#5a5a5a] leading-relaxed">{alert.detail}</p>
                          <p className="mt-2 font-mono text-[9px] text-[#3a3a3a]">TRIGGER: {alert.trigger}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    <span className="sys-tag text-[9px] mb-5 block">RISK HISTORY</span>
                    <div className="flex items-end gap-3 h-44 border-b border-[#1e1e1e]">
                      {displayedRiskHistory.map((point) => (
                        <div key={point.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                          <div className={`w-full bg-[#2196f3] ${point.riskScore >= activeConstraints.alertRiskScore ? "bg-[#ef4444]" : ""}`} style={{ height: `${Math.max(point.riskScore, 8)}%` }} />
                          <span className="font-mono text-[9px] text-[#3a3a3a]">{point.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-[#5a5a5a] leading-relaxed">
                      Completed scans are persisted locally; before local samples exist, the chart uses the current scan proxy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === "macro" && (
              <div id="yieldpilot-panel-macro" role="tabpanel" aria-labelledby="yieldpilot-tab-macro" className="grid xl:grid-cols-[0.85fr_1.15fr] border-b border-[#1e1e1e]">
                <div className="border-r border-[#1e1e1e] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="sys-tag text-[9px]">MACRO RISK OVERLAY</span>
                    <CalendarDays className="w-4 h-4 text-[#2196f3]" />
                  </div>
                  <div className={`font-display text-5xl leading-none ${macroRiskTone[data?.market.macroRiskLabel ?? "Watch"] ?? "text-[#f2ede6]"}`}>
                    {data?.market.macroRiskLabel ?? "Scanning"}
                  </div>
                  <p className="mt-4 text-sm text-[#5a5a5a] leading-relaxed">
                    SoSoValue macro calendar risk is folded into market mood, confidence, stress loss, alerts, and protective-hold logic.
                  </p>
                  <div className="mt-6">
                    <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-[#3a3a3a] mb-2">
                      <span>IMPACT SCORE</span>
                      <span className={macroRiskTone[data?.market.macroRiskLabel ?? "Watch"] ?? "text-[#f2ede6]"}>
                        {data?.market.macroRiskScore ?? 0}/100
                      </span>
                    </div>
                    <BarMeter
                      value={data?.market.macroRiskScore ?? 0}
                      tone={
                        data?.market.macroRiskLabel === "Event Risk"
                          ? "bg-[#ef4444]"
                          : data?.market.macroRiskLabel === "Watch"
                            ? "bg-[#f59e0b]"
                            : "bg-[#22c55e]"
                      }
                    />
                  </div>

                  <div className="mt-8 border-t border-[#1e1e1e] pt-5">
                    <span className="font-mono text-[10px] tracking-widest text-[#3a3a3a]">NEXT CATALYST</span>
                    {nextMacroEvent ? (
                      <div className="mt-3">
                        <div className="font-display text-3xl text-[#f2ede6] leading-none">
                          {macroTimingLabel(nextMacroEvent.daysFromNow)}
                        </div>
                        <p className="mt-2 text-sm text-[#5a5a5a] leading-relaxed">
                          {nextMacroEvent.events.slice(0, 3).join(", ")}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-[#5a5a5a] leading-relaxed">
                        No upcoming macro event returned by SoSoValue for the near-term window.
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="sys-tag text-[9px]">SOSOVALUE MACRO CALENDAR</span>
                    <span className="font-mono text-[10px] text-[#3a3a3a]">{macroEvents.length} DATES</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {macroEvents.length === 0 && (
                      <EmptyState>Macro events will appear when SoSoValue returns `/macro/events` data.</EmptyState>
                    )}
                    {macroEvents.map((event) => (
                      <div key={event.date} className="grid md:grid-cols-[120px_minmax(0,1fr)_96px] gap-4 border-b border-[#1e1e1e] pb-4">
                        <div>
                          <div className="font-mono text-[10px] tracking-widest text-[#2196f3]">
                            {macroTimingLabel(event.daysFromNow).toUpperCase()}
                          </div>
                          <div className="mt-1 font-mono text-[10px] text-[#3a3a3a]">
                            {new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-[#f2ede6] leading-relaxed break-words">{event.events.slice(0, 3).join(", ")}</p>
                          {event.events.length > 3 && (
                            <p className="mt-1 font-mono text-[9px] text-[#3a3a3a]">+{event.events.length - 3} MORE EVENTS</p>
                          )}
                        </div>
                        <div className="md:text-right">
                          <div className="font-display text-2xl text-[#f2ede6]">{event.importanceScore}</div>
                          <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">IMPACT</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "analytics" && (
              <div id="yieldpilot-panel-analytics" role="tabpanel" aria-labelledby="yieldpilot-tab-analytics" className="grid xl:grid-cols-[1fr_0.9fr] border-b border-[#1e1e1e]">
                <div className="border-r border-[#1e1e1e] p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="sys-tag text-[9px]">ANALYTICS</span>
                    <LineChart className="w-4 h-4 text-[#2196f3]" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-px bg-[#1e1e1e]">
                    {[
                      { label: "MONTHLY YIELD", value: formatUsd(data?.wave3.analytics.projectedMonthlyYieldUsd ?? 0) },
                      { label: "ANNUAL YIELD", value: formatUsd(data?.wave3.analytics.projectedAnnualYieldUsd ?? 0) },
                      { label: "STRESS LOSS", value: `${formatUsd(data?.wave3.analytics.stressLossUsd ?? 0)} / ${data?.wave3.analytics.stressLossPct ?? 0}%` },
                      { label: "CONFIDENCE", value: `${data?.wave3.analytics.confidenceScore ?? 0}/100` },
                      { label: "DIVERSIFICATION", value: `${data?.wave3.analytics.diversificationScore ?? 0}/100` },
                      { label: "SNAPSHOTS", value: String(snapshots.length) },
                    ].map((metric) => (
                      <div key={metric.label} className="bg-[#080808] p-5 min-h-[112px]">
                        <div className="font-display text-3xl text-[#f2ede6] leading-none">{metric.value}</div>
                        <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest mt-3">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-sm text-[#5a5a5a] leading-relaxed">
                    {data?.wave3.analytics.backtestNote ?? "Waiting for the first local analytics pass."}
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <span className="sys-tag text-[9px]">LOCAL PORTFOLIO TRACKING</span>
                    <Save className="w-4 h-4 text-[#2196f3]" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {snapshots.length === 0 && <EmptyState>No local snapshots yet. Run analysis or activate the simulation.</EmptyState>}
                    {snapshots.slice(0, 6).map((snapshot) => (
                      <div key={snapshot.id} className="grid grid-cols-[1fr_auto] gap-4 border-b border-[#1e1e1e] pb-3">
                        <div>
                          <div className="font-mono text-[11px] text-[#f2ede6]">
                            {new Date(snapshot.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <p className="text-xs text-[#5a5a5a] mt-1">
                            {formatUsd(snapshot.totalValueUsd)} at {snapshot.estimatedApy}% APY / {snapshot.marketMood}
                          </p>
                        </div>
                        <div className={`font-display text-2xl ${riskColor(snapshot.riskScore)}`}>{snapshot.riskScore}</div>
                      </div>
                    ))}
                  </div>
                  {latestSnapshot && (
                    <p className="mt-5 font-mono text-[10px] text-[#3a3a3a]">
                      LAST SNAPSHOT: {new Date(latestSnapshot.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === "sources" && (
              <div id="yieldpilot-panel-sources" role="tabpanel" aria-labelledby="yieldpilot-tab-sources" className="grid xl:grid-cols-4 border-b border-[#1e1e1e]">
                <div className="border-r border-[#1e1e1e] p-6">
                  <span className="sys-tag text-[9px] mb-5 block">SOSOVALUE INTELLIGENCE</span>
                  <div className="grid grid-cols-2 gap-px bg-[#1e1e1e] mb-5">
                    <div className="bg-[#080808] p-4">
                      <div className="font-display text-3xl text-[#f2ede6]">{data?.market.moodScore ?? 0}</div>
                      <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">MOOD SCORE</div>
                    </div>
                    <div className="bg-[#080808] p-4">
                      <div className="font-display text-3xl text-[#f2ede6]">{data?.market.etfFlowDirection ?? "NA"}</div>
                      <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">ETF FLOW</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(data?.market.news ?? []).slice(0, 3).map((item) => (
                      <a key={item.id} href={item.sourceLink} target="_blank" rel="noreferrer" className="block group">
                        <span className="font-mono text-[10px] text-[#3a3a3a]">
                          {new Date(item.releaseTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <p className="text-sm text-[#5a5a5a] group-hover:text-[#f2ede6] transition-colors leading-snug">{item.title}</p>
                      </a>
                    ))}
                    {data?.market.news.length === 0 && <p className="text-sm text-[#5a5a5a]">SoSoValue news is waiting for API configuration.</p>}
                  </div>
                </div>

                <div className="border-r border-[#1e1e1e] p-6">
                  <span className="sys-tag text-[9px] mb-5 block">SOSOVALUE INDEXES</span>
                  <div className="flex flex-col gap-3">
                    {(data?.market.sosoIndexes ?? []).map((index) => (
                      <div key={index.ticker} className="border-b border-[#1e1e1e] pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-mono text-[11px] text-[#f2ede6]">{index.ticker.toUpperCase()}</div>
                            <div className="font-mono text-[9px] text-[#3a3a3a]">PRICE {formatNumber(index.price)}</div>
                          </div>
                          <div className={`font-display text-2xl ${index.change24hPct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                            {index.change24hPct >= 0 ? "+" : ""}
                            {index.change24hPct}%
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[9px] text-[#3a3a3a]">
                          <span>7D {index.roi7d}%</span>
                          <span>1M {index.roi1m}%</span>
                          <span>YTD {index.ytd}%</span>
                        </div>
                      </div>
                    ))}
                    {data?.market.sosoIndexes.length === 0 && <p className="text-sm text-[#5a5a5a]">Index snapshots will appear when SoSoValue returns `/indices` data.</p>}
                  </div>
                </div>

                <div className="border-r border-[#1e1e1e] p-6">
                  <span className="sys-tag text-[9px] mb-5 block">MACRO EVENTS</span>
                  <div className="flex flex-col gap-3">
                    {macroEvents.slice(0, 5).map((event) => (
                      <div key={`source-${event.date}`} className="border-b border-[#1e1e1e] pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-mono text-[11px] text-[#f2ede6]">
                              {macroTimingLabel(event.daysFromNow).toUpperCase()}
                            </div>
                            <p className="mt-1 text-xs text-[#5a5a5a] leading-relaxed">
                              {event.events.slice(0, 2).join(", ")}
                            </p>
                          </div>
                          <span className="font-display text-2xl text-[#2196f3]">{event.importanceScore}</span>
                        </div>
                      </div>
                    ))}
                    {macroEvents.length === 0 && <p className="text-sm text-[#5a5a5a]">Macro calendar data will appear when SoSoValue returns `/macro/events` data.</p>}
                  </div>
                </div>

                <div className="p-6">
                  <span className="sys-tag text-[9px] mb-5 block">SODEX PULSE</span>
                  <div className="flex flex-col gap-3">
                    {(data?.market.sodexTickers ?? []).slice(0, 6).map((ticker) => (
                      <div key={ticker.symbol} className="flex items-center justify-between gap-3 border-b border-[#1e1e1e] pb-3">
                        <div>
                          <div className="font-mono text-[11px] text-[#f2ede6]">{ticker.symbol}</div>
                          <div className="font-mono text-[9px] text-[#3a3a3a]">{formatUsd(ticker.quoteVolume, true)} volume</div>
                        </div>
                        <div className={`font-display text-2xl ${ticker.changePct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                          {ticker.changePct >= 0 ? "+" : ""}
                          {ticker.changePct}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="xl:col-span-4 border-t border-[#1e1e1e] p-6">
                  <span className="sys-tag text-[9px] mb-5 block">DATA SOURCE HEALTH</span>
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {(data?.sources ?? []).map((source) => (
                      <div key={source.name} className="border-l border-[#2e2e2e] pl-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-mono text-[11px] text-[#f2ede6] break-words">{source.name}</div>
                            <p className="text-xs text-[#5a5a5a] leading-relaxed mt-1">{source.detail}</p>
                          </div>
                          <span className={`font-mono text-[9px] tracking-widest ${statusTone[source.status] ?? "text-[#5a5a5a]"}`}>
                            {source.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid xl:grid-cols-[1fr_340px]">
              <div className="p-6 border-r border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-5">
                  <span className="sys-tag text-[9px]">SIMULATION LOG</span>
                  <span className="font-mono text-[10px] text-[#3a3a3a]">ALLOC SUM {formatNumber(allocationTotal)}%</span>
                </div>
                <div className="flex flex-col gap-2 min-h-[132px]">
                  {activity.length === 0 ? (
                    <p className="text-sm text-[#5a5a5a]">Run an analysis or activate a strategy to stream AI actions.</p>
                  ) : (
                    activity.map((line, index) => (
                      <div key={`${line}-${index}`} className="font-mono text-[11px] text-[#5a5a5a] border-b border-[#1e1e1e] pb-2">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6">
                <span className="sys-tag text-[9px] mb-5 block">WAVE 3 STATUS</span>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Portfolio tracking", value: snapshots.length > 0 ? "local persistence active" : "waiting for first snapshot" },
                    { label: "Market updates", value: autoRefresh ? "45s local polling" : "manual refresh" },
                    { label: "Custom strategy", value: `${activeConstraints.maxPositions} positions, ${activeConstraints.maxRisk}/100 max risk` },
                    { label: "Macro overlay", value: `${data?.market.macroRiskLabel ?? "pending"} risk, ${macroEvents.length} dates` },
                    { label: "Alerts", value: `${data?.wave3.alerts.length ?? 0} active monitors` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between gap-4">
                      <span className="font-mono text-[10px] tracking-widest text-[#3a3a3a]">{item.label.toUpperCase()}</span>
                      <span className="text-right text-xs text-[#5a5a5a]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && <div className="border-t border-[#1e1e1e] p-5 text-sm text-[#ef4444]" role="alert">{error}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
