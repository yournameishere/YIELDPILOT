"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { RiskHistoryPoint, YieldPilotMarketResponse } from "@/lib/yieldpilot/types";

function AnimCounter({
  end,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    done.current = false;
    setN(reducedMotion ? end : 0);
  }, [end, reducedMotion]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !done.current) {
          done.current = true;
          if (reducedMotion) {
            setN(end);
            return;
          }
          const start = performance.now();
          const dur = 1800;
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setN(Number((ease * end).toFixed(decimals)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [decimals, end, reducedMotion]);

  return (
    <div ref={ref} className="font-display text-3xl sm:text-4xl lg:text-5xl leading-none text-[#f2ede6] tabular-nums">
      {prefix}
      {n.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </div>
  );
}

type MetricSnapshot = {
  estimatedApy: number;
  confidenceScore: number;
  liveSources: number;
  sourceCount: number;
  custodyRisk: number;
  riskTrend: RiskHistoryPoint[];
  status: "loading" | "live" | "error";
  detail: string;
};

function riskColor(score: number) {
  if (score < 34) return "#22c55e";
  if (score < 62) return "#f59e0b";
  return "#ef4444";
}

export function MetricsSection() {
  const [vis, setVis] = useState(false);
  const [time, setTime] = useState("");
  const [snapshot, setSnapshot] = useState<MetricSnapshot>({
    estimatedApy: 0,
    confidenceScore: 0,
    liveSources: 0,
    sourceCount: 0,
    custodyRisk: 0,
    riskTrend: [],
    status: "loading",
    detail: "Waiting for live market scan.",
  });
  const hasLoaded = useRef(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!vis || hasLoaded.current) return;

    hasLoaded.current = true;
    const controller = new AbortController();

    async function loadMetrics() {
      try {
        const response = await fetch("/api/yieldpilot/market?goal=balanced&amount=1000", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(payload?.detail ?? "Metrics scan failed.");
        }

        const payload = (await response.json()) as YieldPilotMarketResponse;
        if (controller.signal.aborted) return;

        setSnapshot({
          estimatedApy: payload.portfolio.estimatedApy,
          confidenceScore: payload.wave3.analytics.confidenceScore,
          liveSources: payload.sources.filter((source) => source.status === "live").length,
          sourceCount: payload.sources.length,
          custodyRisk: payload.mode === "simulation" ? 0 : 100,
          riskTrend: payload.wave3.riskHistory,
          status: "live",
          detail: `Updated from ${payload.sources.length} configured market sources.`,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setSnapshot((current) => ({
          ...current,
          status: "error",
          detail: error instanceof Error ? error.message : "Metrics scan failed.",
        }));
      }
    }

    void loadMetrics();
    return () => controller.abort();
  }, [vis]);

  const metrics = [
    {
      end: snapshot.estimatedApy,
      suffix: "%",
      decimals: 2,
      label: "ESTIMATED APY",
      sub: snapshot.status === "live" ? "balanced live market scan" : snapshot.detail,
    },
    {
      end: snapshot.confidenceScore,
      suffix: "/100",
      decimals: 0,
      label: "CONFIDENCE SCORE",
      sub: "risk engine confidence",
    },
    {
      end: snapshot.liveSources,
      suffix: `/${snapshot.sourceCount}`,
      decimals: 0,
      label: "LIVE DATA SOURCES",
      sub: "configured provider health",
    },
    {
      end: snapshot.custodyRisk,
      suffix: "/100",
      decimals: 0,
      label: "CUSTODY RISK",
      sub: "derived from simulation-only mode",
    },
  ];

  return (
    <section id="metrics" ref={ref} className="relative border-t border-[#1e1e1e] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div
          className={`border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 transition-opacity duration-500 ${
            vis ? "opacity-100" : "opacity-0"
          }`}
        >
          <div>
            <span className="sys-tag mb-3 block">PORTFOLIO METRICS</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[1.02] text-[#f2ede6]">
              SIGNALS YOU
              <br />
              <span
                style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}
              >
                CAN TRUST
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-[#3a3a3a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block animate-pulse" />
            <span className={snapshot.status === "error" ? "text-[#ef4444]" : snapshot.status === "live" ? "text-[#22c55e]" : "text-[#f59e0b]"}>
              {snapshot.status.toUpperCase()}
            </span>
            <span className="tabular-nums">{time}</span>
          </div>
        </div>

        {/* Metrics grid — each cell has a fixed min-height and overflow-hidden to prevent bleed */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-[#1e1e1e]">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`border-r border-[#1e1e1e] last:border-r-0 border-b lg:border-b-0 p-6 lg:p-8 overflow-hidden transition-[opacity,transform] duration-500 ${
                vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <AnimCounter end={m.end} suffix={m.suffix} decimals={m.decimals} />
              <div className="mt-3 font-mono text-[10px] text-[#2196f3] tracking-[0.18em]">
                {m.label}
              </div>
              <div className="mt-1 font-mono text-[10px] text-[#3a3a3a]">
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Uptime — pill-bar style matching reference design */}
        <div className="py-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-[#3a3a3a] tracking-widest uppercase">
              Risk trend from latest live scan
            </span>
            <span className={`font-mono text-[10px] ${snapshot.riskTrend.some((point) => point.riskScore >= 70) ? "text-[#ef4444]" : "text-[#22c55e]"} tracking-widest`}>
              {snapshot.riskTrend.some((point) => point.riskScore >= 70) ? "EXIT WATCH" : "NO EXIT TRIGGER"}
            </span>
          </div>
          <div className="flex gap-[3px] items-end h-10">
            {snapshot.riskTrend.map((point, i) => (
              <div
                key={i}
                title={`${point.label}: risk ${point.riskScore}/100`}
                className="flex-1 rounded-sm transition-opacity hover:opacity-80 cursor-default"
                style={{
                  height: `${Math.max(point.riskScore, 8)}%`,
                  background: riskColor(point.riskScore),
                  alignSelf: "flex-end",
                  opacity: vis ? 1 : 0,
                  transition: `opacity 0.4s ease ${i * 8}ms, height 0.3s ease`,
                }}
              />
            ))}
          </div>
          {snapshot.riskTrend.length === 0 && (
            <p className="mt-3 text-sm text-[#5a5a5a]">{snapshot.detail}</p>
          )}
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[9px] text-[#3a3a3a]">90 days</span>
            <span className="font-mono text-[9px] text-[#3a3a3a]">Today</span>
          </div>
        </div>

      </div>
    </section>
  );
}
