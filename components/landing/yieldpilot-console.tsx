"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Play,
  Radar,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import type { StrategyGoal, YieldPilotMarketResponse } from "@/lib/yieldpilot/types";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const GOALS: Array<{ id: StrategyGoal; label: string; hint: string }> = [
  { id: "safe", label: "SAFE", hint: "Lower risk stablecoin allocation" },
  { id: "balanced", label: "BALANCED", hint: "Risk-adjusted growth" },
  { id: "aggressive", label: "AGGRESSIVE", hint: "Higher APY with caps" },
  { id: "stablecoin", label: "STABLECOIN", hint: "Stablecoin-only routing" },
  { id: "custom", label: "AI CUSTOM", hint: "Adaptive constraints" },
];

const statusTone: Record<string, string> = {
  live: "text-[#22c55e]",
  missing_key: "text-[#f59e0b]",
  degraded: "text-[#f59e0b]",
  error: "text-[#ef4444]",
};

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

export function YieldPilotConsole() {
  const [goal, setGoal] = useState<StrategyGoal>("balanced");
  const [amount, setAmount] = useState(1000);
  const [data, setData] = useState<YieldPilotMarketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletMode, setWalletMode] = useState<"disconnected" | "wallet" | "simulation">("disconnected");
  const [activity, setActivity] = useState<string[]>([]);

  const allocationTotal = useMemo(
    () => data?.strategy.allocation.reduce((sum, item) => sum + item.weight, 0) ?? 0,
    [data],
  );

  async function loadMarket(nextGoal = goal, nextAmount = amount) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/yieldpilot/market?goal=${nextGoal}&amount=${nextAmount}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? "Market engine returned an error.");
      }

      const payload = (await response.json()) as YieldPilotMarketResponse;
      setData(payload);
      setActivity((items) => [
        `${new Date().toLocaleTimeString("en-US", { hour12: false })} ANALYSIS refreshed ${payload.opportunities.length} live yield pools.`,
        ...items,
      ].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh market intelligence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarket("balanced", 1000);
  }, []);

  async function connectWallet() {
    setError("");

    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const [account] = Array.isArray(accounts) ? (accounts as string[]) : [];
        if (!account) throw new Error("No wallet account returned.");
        setWalletAddress(account);
        setWalletMode("wallet");
        setActivity((items) => [
          `${new Date().toLocaleTimeString("en-US", { hour12: false })} WALLET connected ${shortAddress(account)}.`,
          ...items,
        ].slice(0, 6));
        return;
      }

      const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now()).slice(-8);
      setWalletAddress(`SIM-${random.toUpperCase()}`);
      setWalletMode("simulation");
      setActivity((items) => [
        `${new Date().toLocaleTimeString("en-US", { hour12: false })} SIMULATION wallet created for demo execution.`,
        ...items,
      ].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed.");
    }
  }

  function activateStrategy() {
    if (!data) return;
    const lines = data.strategy.allocation.map(
      (item) =>
        `${new Date().toLocaleTimeString("en-US", { hour12: false })} EXECUTE ${item.weight}% ${item.protocol} ${item.asset} ${formatUsd(item.amountUsd)}.`,
    );
    setActivity((items) => [...lines, ...items].slice(0, 8));
  }

  function simulateRiskExit() {
    if (!data || data.strategy.allocation.length === 0) return;
    const riskiest = [...data.strategy.allocation].sort((a, b) => b.riskScore - a.riskScore)[0];
    setActivity((items) => [
      `${new Date().toLocaleTimeString("en-US", { hour12: false })} PROTECTIVE_EXIT reduced ${riskiest.protocol} after risk monitor trigger.`,
      `${new Date().toLocaleTimeString("en-US", { hour12: false })} REBALANCE funds returned to safest active allocation.`,
      ...items,
    ].slice(0, 8));
  }

  function handleGoal(nextGoal: StrategyGoal) {
    setGoal(nextGoal);
    void loadMarket(nextGoal, amount);
  }

  return (
    <section id="console" className="relative border-t border-[#1e1e1e] bg-[#080808] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <span className="sys-tag mb-3 block">LIVE APP</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[0.88] tracking-tight text-[#f2ede6]">
              AI YIELD<br />
              <span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>CONTROL ROOM</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={connectWallet}
              className="inline-flex items-center gap-3 border border-[#2e2e2e] px-5 h-11 font-mono text-[11px] tracking-widest text-[#f2ede6] hover:border-[#2196f3]/50 hover:text-[#2196f3] transition-colors"
            >
              <Wallet className="w-4 h-4" />
              {walletMode === "disconnected" ? "CONNECT WALLET" : shortAddress(walletAddress)}
            </button>
            <button
              onClick={() => loadMarket()}
              disabled={loading}
              className="inline-flex items-center gap-3 bg-[#2196f3] text-[#050505] px-5 h-11 font-mono text-[11px] tracking-widest font-semibold hover:bg-[#42a5f5] disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              ANALYZE MARKET
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] border-b border-[#1e1e1e]">
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
                  className="w-full bg-transparent outline-none font-display text-3xl text-[#f2ede6] tabular-nums"
                />
              </div>
            </div>

            {GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleGoal(item.id)}
                className={`w-full text-left p-6 border-b border-[#1e1e1e] transition-colors ${
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
          </aside>

          <div>
            <div className="grid grid-cols-2 lg:grid-cols-5 border-b border-[#1e1e1e]">
              {[
                { label: "PORTFOLIO", value: formatUsd(data?.portfolio.totalValueUsd ?? amount), icon: Wallet },
                { label: "EST APY", value: `${formatNumber(data?.portfolio.estimatedApy ?? 0)}%`, icon: Zap },
                { label: "DAILY YIELD", value: formatUsd(data?.portfolio.dailyYieldUsd ?? 0), icon: Activity },
                { label: "RISK SCORE", value: `${data?.portfolio.riskScore ?? 0}/100`, icon: Gauge },
                { label: "MOOD", value: data?.portfolio.marketMood ?? "Scanning", icon: Radar },
              ].map((metric) => (
                <div key={metric.label} className="p-5 lg:p-6 border-r border-b lg:border-b-0 border-[#1e1e1e] last:border-r-0 min-h-[120px]">
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-[9px] tracking-[0.18em] text-[#3a3a3a]">{metric.label}</span>
                    <metric.icon className="w-4 h-4 text-[#2196f3]" />
                  </div>
                  <div className="font-display text-3xl lg:text-4xl leading-none text-[#f2ede6] tabular-nums break-words">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid xl:grid-cols-[1.15fr_0.85fr] border-b border-[#1e1e1e]">
              <div className="border-r border-[#1e1e1e]">
                <div className="p-6 border-b border-[#1e1e1e] flex items-center justify-between gap-4">
                  <div>
                    <span className="sys-tag text-[9px]">AI RECOMMENDATION</span>
                    <h3 className="font-display text-4xl text-[#f2ede6] mt-2">{data?.strategy.goalLabel ?? "Analyzing"}</h3>
                  </div>
                  <span className="font-mono text-[10px] text-[#3a3a3a]">
                    {data ? new Date(data.generatedAt).toLocaleTimeString("en-US", { hour12: false }) : "LIVE"}
                  </span>
                </div>

                <div>
                  {(data?.strategy.allocation ?? []).map((item, index) => (
                    <div key={`${item.protocol}-${item.asset}`} className="grid grid-cols-[56px_1fr] md:grid-cols-[56px_1fr_120px] border-b border-[#1e1e1e] last:border-b-0">
                      <div className="border-r border-[#1e1e1e] p-5 font-mono text-[10px] text-[#3a3a3a]">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-display text-3xl text-[#f2ede6]">{item.protocol}</span>
                          <span className="font-mono text-[10px] text-[#2196f3] tracking-widest">{item.chain}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#5a5a5a] leading-relaxed">{item.reason}</p>
                      </div>
                      <div className="p-5 md:border-l border-[#1e1e1e] flex md:block items-end justify-between">
                        <div className="font-display text-4xl text-[#2196f3]">{item.weight}%</div>
                        <div className="font-mono text-[10px] text-[#3a3a3a] mt-1">{formatUsd(item.amountUsd)}</div>
                      </div>
                    </div>
                  ))}

                  {!loading && data?.strategy.allocation.length === 0 && (
                    <div className="p-8 text-sm text-[#5a5a5a]">
                      No live pool passed the current risk profile. Try a different goal or refresh the market scan.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="p-6 border-b border-[#1e1e1e]">
                  <span className="sys-tag text-[9px] mb-3 block">REASONING FEED</span>
                  <div className="space-y-3">
                    {(data?.strategy.rationale ?? ["Waiting for live market scan."]).map((line) => (
                      <p key={line} className="text-sm text-[#5a5a5a] leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-b border-[#1e1e1e]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="sys-tag text-[9px]">RISK MONITOR</span>
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                  </div>
                  <div className="space-y-4">
                    {(data?.riskEvents ?? []).map((event) => (
                      <div key={`${event.title}-${event.detail}`} className="border-l border-[#2e2e2e] pl-4">
                        <div className="font-mono text-[10px] tracking-widest text-[#f2ede6]">{event.title.toUpperCase()}</div>
                        <p className="mt-1 text-xs text-[#5a5a5a] leading-relaxed">{event.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={activateStrategy}
                    disabled={!data || data.strategy.allocation.length === 0}
                    className="inline-flex items-center justify-center gap-3 bg-[#2196f3] text-[#050505] px-5 h-11 font-mono text-[11px] tracking-widest font-semibold hover:bg-[#42a5f5] disabled:opacity-50 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    ACTIVATE SIM
                  </button>
                  <button
                    onClick={simulateRiskExit}
                    disabled={!data || data.strategy.allocation.length === 0}
                    className="inline-flex items-center justify-center gap-3 border border-[#2e2e2e] text-[#f2ede6] px-5 h-11 font-mono text-[11px] tracking-widest hover:border-[#ef4444]/60 hover:text-[#ef4444] disabled:opacity-50 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    TEST EXIT
                  </button>
                </div>
              </div>
            </div>

            <div className="grid xl:grid-cols-3 border-b border-[#1e1e1e]">
              <div className="border-r border-[#1e1e1e] p-6">
                <span className="sys-tag text-[9px] mb-5 block">LIVE YIELD RADAR</span>
                <div className="space-y-4">
                  {(data?.opportunities ?? []).slice(0, 5).map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] text-[#f2ede6] truncate">{item.protocol}</span>
                        <span className="font-mono text-[11px] text-[#2196f3]">{item.apy}%</span>
                      </div>
                      <div className="h-1 bg-[#1e1e1e] overflow-hidden">
                        <div className="h-full bg-[#2196f3]" style={{ width: `${Math.min(item.apy * 4, 100)}%` }} />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-[9px] text-[#3a3a3a]">{item.asset}</span>
                        <span className={`font-mono text-[9px] ${riskColor(item.riskScore)}`}>RISK {item.riskScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-r border-[#1e1e1e] p-6">
                <span className="sys-tag text-[9px] mb-5 block">MARKET INTELLIGENCE</span>
                <div className="grid grid-cols-2 gap-px bg-[#1e1e1e] mb-5">
                  <div className="bg-[#080808] p-4">
                    <div className="font-display text-3xl text-[#f2ede6]">{data?.market.moodScore ?? 0}</div>
                    <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">MOOD SCORE</div>
                  </div>
                  <div className="bg-[#080808] p-4">
                    <div className="font-display text-3xl text-[#f2ede6]">{data?.market.volatilityLabel ?? "NA"}</div>
                    <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">VOLATILITY</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {(data?.market.news ?? []).slice(0, 3).map((item) => (
                    <a key={item.id} href={item.sourceLink} target="_blank" rel="noreferrer" className="block group">
                      <span className="font-mono text-[10px] text-[#3a3a3a]">
                        {new Date(item.releaseTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <p className="text-sm text-[#5a5a5a] group-hover:text-[#f2ede6] transition-colors leading-snug">
                        {item.title}
                      </p>
                    </a>
                  ))}
                  {data?.market.news.length === 0 && (
                    <p className="text-sm text-[#5a5a5a]">SoSoValue news is waiting for API configuration.</p>
                  )}
                </div>
              </div>

              <div className="p-6">
                <span className="sys-tag text-[9px] mb-5 block">SODEX PULSE</span>
                <div className="space-y-3">
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
            </div>

            <div className="grid xl:grid-cols-[1fr_340px]">
              <div className="p-6 border-r border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-5">
                  <span className="sys-tag text-[9px]">SIMULATION LOG</span>
                  <span className="font-mono text-[10px] text-[#3a3a3a]">ALLOC SUM {formatNumber(allocationTotal)}%</span>
                </div>
                <div className="space-y-2 min-h-[132px]">
                  {activity.length === 0 ? (
                    <p className="text-sm text-[#5a5a5a]">Run an analysis or activate a strategy to stream AI actions.</p>
                  ) : (
                    activity.map((line) => (
                      <div key={line} className="font-mono text-[11px] text-[#5a5a5a] border-b border-[#1e1e1e] pb-2">
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-6">
                <span className="sys-tag text-[9px] mb-5 block">DATA SOURCES</span>
                <div className="space-y-4">
                  {(data?.sources ?? []).map((source) => (
                    <div key={source.name} className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[11px] text-[#f2ede6]">{source.name}</div>
                        <p className="text-xs text-[#5a5a5a] leading-relaxed mt-1">{source.detail}</p>
                      </div>
                      <span className={`font-mono text-[9px] tracking-widest ${statusTone[source.status] ?? "text-[#5a5a5a]"}`}>
                        {source.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="border-t border-[#1e1e1e] p-5 text-sm text-[#ef4444]">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
