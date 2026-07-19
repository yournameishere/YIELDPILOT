"use client";

import { useEffect, useRef, useState } from "react";

const ROW1 = [
  { name: "SoSoValue",   cat: "MARKET INTEL" },
  { name: "SoDEX",       cat: "DEX DATA" },
  { name: "DefiLlama",   cat: "YIELDS" },
  { name: "MetaMask",    cat: "WALLET" },
  { name: "WalletConnect", cat: "WALLET" },
  { name: "Aave",        cat: "LENDING" },
  { name: "Pendle",      cat: "YIELD" },
  { name: "Ethena",      cat: "STABLES" },
  { name: "Morpho",      cat: "LENDING" },
  { name: "Curve",       cat: "DEX" },
];

const ROW2 = [
  { name: "ETF Flows",   cat: "SIGNAL" },
  { name: "Hot News",    cat: "SIGNAL" },
  { name: "APY",         cat: "RISK INPUT" },
  { name: "TVL",         cat: "RISK INPUT" },
  { name: "IL Risk",     cat: "RISK INPUT" },
  { name: "Volatility",  cat: "RISK INPUT" },
  { name: "Stablecoins", cat: "ASSET" },
  { name: "vUSDC",       cat: "SODEX" },
  { name: "Testnet",     cat: "EXECUTION" },
  { name: "Simulation",  cat: "MODE" },
];

function IntChip({ name, cat }: { name: string; cat: string }) {
  return (
    <div className="shrink-0 flex items-center gap-4 border border-[#1e1e1e] px-5 py-3.5 hover:border-[#2196f3]/40 hover:bg-[#2196f3]/5 transition-colors duration-200 cursor-default group">
      <span className="font-mono text-[9px] text-[#3a3a3a] tracking-widest">{cat}</span>
      <span className="font-display text-lg text-[#5a5a5a] group-hover:text-[#f2ede6] transition-colors">
        {name}
      </span>
    </div>
  );
}

export function IntegrationsSection() {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="integrations" className="relative border-t border-[#1e1e1e] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          ref={ref}
          className={`border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 transition-opacity duration-500 ${vis ? "opacity-100" : "opacity-0"}`}
        >
          <div>
            <span className="sys-tag mb-3 block">DATA LAYER</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[1.02] text-[#f2ede6]">
              REAL SIGNALS<br />
              <span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>NOT STATIC TABLES.</span>
            </h2>
          </div>
          <p className="font-mono text-[10px] text-[#3a3a3a] max-w-[220px] text-right hidden lg:block leading-relaxed">
            SOSOVALUE NEWS &nbsp;/&nbsp; SODEX MARKET DATA &nbsp;/&nbsp; LIVE APY POOLS
          </p>
        </div>
      </div>

      {/* Marquee rows — full width */}
      <div className="border-b border-[#1e1e1e] py-4 overflow-hidden">
        <div className="flex gap-3 marquee">
          {[...Array(2)].map((_, ri) => (
            <div key={ri} className="flex gap-3 shrink-0">
              {ROW1.map(i => <IntChip key={`${i.name}-${ri}`} {...i} />)}
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-[#1e1e1e] py-4 overflow-hidden">
        <div className="flex gap-3" style={{ animation: "marquee 20s linear infinite reverse" }}>
          {[...Array(2)].map((_, ri) => (
            <div key={ri} className="flex gap-3 shrink-0">
              {ROW2.map(i => <IntChip key={`${i.name}-${ri}`} {...i} />)}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-[#3a3a3a]">SOURCE HEALTH IS VISIBLE INSIDE THE APP</span>
        <a href="#console" className="font-mono text-[10px] text-[#2196f3] hover:underline tracking-wider">
          CHECK SOURCES -&gt;
        </a>
      </div>
    </section>
  );
}
