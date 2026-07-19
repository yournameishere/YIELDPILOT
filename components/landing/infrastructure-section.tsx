"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { YieldPilotMarketResponse } from "@/lib/yieldpilot/types";

type WatchlistRow = {
  id: string;
  city: string;
  region: string;
  agents: string;
  latency: string;
  load: number;
};

type WatchlistSummary = {
  riskSignals: string;
  sodexFeed: string;
  detail: string;
};

function compactLabel(value: string, max = 14) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function buildWatchlistRows(payload: YieldPilotMarketResponse): WatchlistRow[] {
  const opportunityRows = payload.opportunities.slice(0, 6).map((opportunity) => ({
    id: opportunity.id,
    city: opportunity.protocol,
    region: opportunity.chain.toUpperCase(),
    agents: opportunity.riskLevel.toUpperCase(),
    latency: opportunity.asset,
    load: opportunity.riskScore,
  }));

  if (opportunityRows.length > 0) return opportunityRows;

  return payload.market.sodexTickers.slice(0, 6).map((ticker) => ({
    id: `sodex-${ticker.symbol}`,
    city: ticker.symbol,
    region: "SODEX",
    agents: ticker.changePct >= 0 ? "BID" : "ASK",
    latency: "PULSE",
    load: Math.min(Math.round(Math.abs(ticker.changePct) * 10), 100),
  }));
}

export function InfrastructureSection() {
  const [vis, setVis]       = useState(false);
  const [active, setActive] = useState(0);
  const [rows, setRows] = useState<WatchlistRow[]>([]);
  const [summary, setSummary] = useState<WatchlistSummary>({
    riskSignals: "-",
    sodexFeed: "SCAN",
    detail: "Waiting for the live market scan.",
  });
  const ref = useRef<HTMLElement>(null);
  const hasLoaded = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (hasLoaded.current) return;

    hasLoaded.current = true;
    const controller = new AbortController();

    async function loadWatchlist() {
      try {
        const response = await fetch("/api/yieldpilot/market?goal=balanced&amount=1000", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(payload?.detail ?? "Watchlist scan failed.");
        }

        const payload = (await response.json()) as YieldPilotMarketResponse;
        if (controller.signal.aborted) return;

        const nextRows = buildWatchlistRows(payload);
        const sodexSource = payload.sources.find((source) => source.name === "SoDEX");
        setRows(nextRows);
        setSummary({
          riskSignals: String(payload.riskEvents.length + payload.wave3.alerts.length),
          sodexFeed: sodexSource?.status.toUpperCase() ?? "UNKNOWN",
          detail: `${nextRows.length} live rows from the current market response.`,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSummary({
          riskSignals: "-",
          sodexFeed: "ERROR",
          detail: error instanceof Error ? error.message : "Watchlist scan failed.",
        });
      }
    }

    void loadWatchlist();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [rows.length]);

  useEffect(() => {
    if (reducedMotion || rows.length <= 1) return;
    const id = setInterval(() => setActive((value) => (value + 1) % rows.length), 1800);
    return () => clearInterval(id);
  }, [reducedMotion, rows.length]);

  return (
    <section id="infrastructure" ref={ref} className="relative border-t border-[#1e1e1e] bg-[#080808] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div
          className={`border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 transition-opacity duration-500 ${vis ? "opacity-100" : "opacity-0"}`}
        >
          <div>
            <span className="sys-tag mb-3 block">RISK MAP</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[1.02] text-[#f2ede6]">
              PROTOCOL<br />
              <span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>WATCHLIST</span>
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-8 text-right">
            {[
              { v: summary.riskSignals, l: "RISK SIGNALS" },
              { v: summary.sodexFeed, l: "SODEX FEED" },
              { v: "0",     l: "REAL FUNDS MOVED" },
            ].map(s => (
              <div key={s.l}>
                <div className="font-display text-3xl text-[#2196f3]">{s.v}</div>
                <div className="font-mono text-[9px] text-[#3a3a3a] tracking-widest mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Region table */}
        <div className="border-b border-[#1e1e1e]">
          {/* Table header */}
          <div className="grid grid-cols-[minmax(0,1fr)_72px_96px] sm:grid-cols-[minmax(0,1fr)_100px_80px_80px_120px] border-b border-[#1e1e1e] px-4 sm:px-6 py-3 gap-3 sm:gap-0">
            <span className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">PROTOCOL</span>
            <span className="hidden sm:block font-mono text-[9px] text-[#3a3a3a] tracking-widest">CHAIN</span>
            <span className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">RISK</span>
            <span className="hidden sm:block font-mono text-[9px] text-[#3a3a3a] tracking-widest">ASSET</span>
            <span className="font-mono text-[9px] text-[#3a3a3a] tracking-widest text-right">SCORE</span>
          </div>

          {/* Rows */}
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[minmax(0,1fr)_72px_96px] sm:grid-cols-[minmax(0,1fr)_100px_80px_80px_120px] px-4 sm:px-6 py-5 border-b border-[#1e1e1e] last:border-b-0 gap-3 sm:gap-0 transition-[opacity,transform,background-color] duration-300 ${
                active === i ? "bg-[#0e0e0e]" : "hover:bg-[#0a0a0a]"
              } ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-colors shrink-0 ${
                    active === i ? "bg-[#2196f3]" : "bg-[#2e2e2e]"
                  }`}
                />
                <span className={`font-mono text-sm truncate ${active === i ? "text-[#f2ede6]" : "text-[#5a5a5a]"}`}>
                  {compactLabel(r.city, 24)}
                </span>
              </div>
              <span className="hidden sm:block font-mono text-[10px] text-[#3a3a3a] tracking-wider self-center">{compactLabel(r.region, 12)}</span>
              <span className={`font-mono text-sm self-center ${active === i ? "text-[#2196f3]" : "text-[#5a5a5a]"}`}>
                {r.agents}
              </span>
              <span className="hidden sm:block font-mono text-sm text-[#5a5a5a] self-center truncate">{compactLabel(r.latency, 10)}</span>
              {/* Load bar */}
              <div className="flex items-center gap-2 self-center">
                <div className="flex-1 h-1 bg-[#1e1e1e]">
                  <div
                    className="h-full bg-[#2196f3] transition-[opacity,width] duration-500"
                    style={{ width: `${r.load}%`, opacity: active === i ? 1 : 0.4 }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#3a3a3a] w-7 text-right">{r.load}%</span>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="px-4 sm:px-6 py-5 text-sm text-[#5a5a5a]">{summary.detail}</p>
          )}
        </div>

        <div className="py-4 flex justify-end">
          <span className="font-mono text-[10px] text-[#3a3a3a]">
            {summary.detail.toUpperCase()} &nbsp;· &nbsp;SIMULATION ONLY
          </span>
        </div>
      </div>
    </section>
  );
}
