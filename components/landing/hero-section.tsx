"use client";

import { useEffect, useState } from "react";
import { AgentParticleCanvas } from "./agent-particle-canvas";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const VERBS = ["DISCOVER", "SCORE", "ALLOCATE", "EXIT", "PROTECT"];



export function HeroSection() {
  const [verbIdx, setVerbIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => { setVisible(true); }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => setVerbIdx(v => (v + 1) % VERBS.length), 640);
    return () => clearInterval(id);
  }, [reducedMotion]);



  return (
    <section className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden grid-bg pt-[88px]">
      {/* Particle canvas — right half of hero, full height, behind content */}
      <div className="absolute inset-y-0 right-0 w-full lg:w-[55%] pointer-events-none z-0">
        <AgentParticleCanvas className="w-full h-full" />
      </div>
      {/* Blue radial glow — reinforces canvas area */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 50% 60% at 80% 50%, rgba(33,150,243,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative z-20 max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28 w-full">



        {/* ── MAIN LAYOUT ─── */}
        <div className="grid lg:grid-cols-[1fr] gap-12 lg:gap-20 items-start">

          {/* LEFT COLUMN */}
          <div>
            {/* Giant headline */}
            <div
              className={`transition-[opacity,transform] duration-700 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            >
              {/* Line 1 */}
              <div className="overflow-hidden">
                <p className="font-mono text-[11px] tracking-[0.2em] text-[#2196f3] mb-4">
                  - YIELDPILOT v3.0 · AUTONOMOUS DEFI YIELD MANAGER
                </p>
              </div>

              <h1 className="font-display text-6xl sm:text-8xl lg:text-9xl xl:text-[10rem] leading-[1.02] text-[#f2ede6] uppercase">
                <span className="block">YIELDS THAT</span>
                <span className="relative block overflow-hidden h-16 sm:h-24 lg:h-32 xl:h-40 leading-[1.02] text-[#2196f3]">
                  <span
                    key={verbIdx}
                    className="absolute inset-0"
                    style={{ animation: reducedMotion ? "none" : "fade-up 0.1s ease forwards" }}
                  >
                    {VERBS[verbIdx]}
                  </span>
                </span>
                <span className="block">AUTONOMOUSLY</span>
              </h1>
            </div>

            {/* Subtext */}
            <div
              className={`mt-14 transition-[opacity,transform] duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <p className="text-base text-[#5a5a5a] leading-relaxed max-w-xl">
                YieldPilot AI scans live DeFi yields, market mood, ETF flows, SoDEX activity, and protocol risk to build safer simulated strategies before real capital moves.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 w-fit">
                <a
                  href="#console"
                  className="group inline-flex items-center gap-8 bg-[#2196f3] text-[#050505] font-mono text-sm tracking-widest px-6 py-4 hover:bg-[#42a5f5] transition-colors font-semibold whitespace-nowrap"
                >
                  LAUNCH SIMULATION
                  <span className="transition-transform group-hover:translate-x-1">-&gt;</span>
                </a>
                <a
                  href="#how-it-works"
                  className="group inline-flex items-center gap-8 border border-[#1e1e1e] text-[#f2ede6] font-mono text-sm tracking-widest px-6 py-4 hover:border-[#2196f3]/40 hover:text-[#2196f3] transition-colors whitespace-nowrap"
                >
                  VIEW AI PLAN
                  <span className="transition-transform group-hover:translate-x-1">-&gt;</span>
                </a>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-3 mt-5">
                <div className="flex -space-x-2">
                  {["#3b82f6","#a855f7","#ec4899","#2196f3"].map((c) => (
                    <div key={c} className="w-6 h-6 rounded-full border border-[#050505]" style={{ background: c }} />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-[#3a3a3a]">
                  live APY, TVL, SoDEX, and SoSoValue intelligence
                </span>
              </div>
            </div>
          </div>


        </div>

      </div>

      {/* ── BOTTOM TICKER — full viewport width ─── */}
      <div
        className={`absolute bottom-0 left-0 right-0 border-t border-[#1e1e1e] py-5 transition-opacity duration-700 delay-700 ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="marquee-fast whitespace-nowrap flex gap-16">
            {[...Array(2)].map((_, rep) => (
              <span key={rep} className="inline-flex items-center gap-16">
                {[
                  "LIVE APY DISCOVERY",
                  "RISK-WEIGHTED ALLOCATION",
                  "SOSOVALUE MARKET INTEL",
                  "SODEX TESTNET PULSE",
                  "SIMULATION-FIRST EXECUTION",
                  "AI REASONING FEED",
                  "PROTECTIVE EXIT LOGIC",
                  "WAVE 3 PRODUCTION SIM",
                ].map(item => (
                  <span key={item} className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-[#3a3a3a]">
                    <span className="w-1 h-1 bg-[#2196f3] inline-block shrink-0" />
                    {item}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
