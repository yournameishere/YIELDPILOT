"use client";

import { useState, useEffect, useRef } from "react";

const PLANS = [
  {
    id: "01",
    name: "WAVE 1",
    tagline: "Concept and prototype",
    price: { mo: 0, yr: 0 },
    features: [
      "Landing page and app console",
      "Wallet connect plus simulation wallet",
      "Live SoSoValue market intelligence",
      "Live DefiLlama APY discovery",
      "SoDEX public market pulse",
      "AI reasoning and rebalance logs",
    ],
    cta: "OPEN APP",
    highlight: false,
  },
  {
    id: "02",
    name: "WAVE 2",
    tagline: "Functional MVP",
    price: { mo: 49, yr: 39 },
    features: [
      "Portfolio tracking database",
      "Real-time market updates",
      "Notifications and alerts",
      "Risk scoring history",
      "Better analytics charts",
      "More DeFi protocol coverage",
      "OpenAI assisted explanations",
    ],
    cta: "MVP NEXT",
    highlight: true,
  },
  {
    id: "03",
    name: "WAVE 3",
    tagline: "Advanced product",
    price: { mo: null, yr: null },
    features: [
      "Smart contract execution",
      "Optional auto-rebalance approvals",
      "AI chat assistant",
      "Custom user rules",
      "Strategy marketplace",
      "Multi-chain expansion",
      "Mobile polish",
      "Security review and audits",
    ],
    cta: "VISION",
    highlight: false,
  },
];

export function PricingSection() {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="roadmap" ref={ref} className="relative border-t border-[#1e1e1e] bg-[#080808] scroll-mt-[88px]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Header */}
        <div
          className={`border-b border-[#1e1e1e] py-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 transition-all duration-500 ${vis ? "opacity-100" : "opacity-0"}`}
        >
          <div>
            <span className="sys-tag mb-3 block">ROADMAP</span>
            <h2 className="font-display text-6xl lg:text-8xl leading-[0.88] tracking-tight text-[#f2ede6]">
              WAVE PLAN.<br />
              <span style={{ WebkitTextStroke: "1px #3a3a3a", color: "transparent" }}>TO WAVE 3.</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {["WAVE_1_READY", "WAVE_2_MVP", "WAVE_3_PRODUCT"].map((item) => (
              <span key={item} className="font-mono text-[9px] tracking-widest border border-[#2e2e2e] text-[#5a5a5a] px-3 py-2">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 border-b border-[#1e1e1e]">
          {PLANS.map((p, i) => (
            <div
              key={p.id}
              className={`border-r border-[#1e1e1e] last:border-r-0 relative transition-all duration-500 ${
                p.highlight ? "bg-[#0e0e0e]" : ""
              } ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {p.highlight && (
                <div className="absolute top-0 left-0 right-0 h-px bg-[#2196f3]" />
              )}

              <div className="p-8 border-b border-[#1e1e1e]">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-[9px] text-[#3a3a3a]">{p.id}</span>
                  {p.highlight && (
                    <span className="font-mono text-[9px] tracking-widest border border-[#2196f3]/40 text-[#2196f3] px-2 py-1">
                      NEXT
                    </span>
                  )}
                </div>
                <h3 className="font-display text-4xl text-[#f2ede6] mb-1">{p.name}</h3>
                <p className="font-mono text-[10px] text-[#3a3a3a] tracking-wider">{p.tagline}</p>
              </div>

              <div className="p-8 border-b border-[#1e1e1e]">
                <span className="font-display text-5xl text-[#f2ede6]">
                  {p.id === "01" ? "BUILT" : p.id === "02" ? "NEXT" : "VISION"}
                </span>
                <p className="font-mono text-[10px] text-[#3a3a3a] tracking-wider mt-2">
                  {p.id === "01" ? "READY FOR WAVE 1 DEMO" : p.id === "02" ? "FUNCTIONAL MVP TARGET" : "PRODUCTION DIRECTION"}
                </p>
              </div>

              <ul className="p-8 space-y-3 border-b border-[#1e1e1e]">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="text-[#2196f3] font-mono text-[10px] mt-0.5 shrink-0">+</span>
                    <span className="font-mono text-[11px] text-[#5a5a5a]">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="p-8">
                <a
                  href={p.id === "01" ? "#console" : "#roadmap"}
                  className={`w-full flex items-center justify-between font-mono text-[11px] tracking-widest px-5 py-4 transition-colors group ${
                    p.highlight
                      ? "bg-[#2196f3] text-[#050505] hover:bg-[#42a5f5] font-semibold"
                      : "border border-[#2e2e2e] text-[#5a5a5a] hover:border-[#2196f3]/40 hover:text-[#2196f3]"
                  }`}
                >
                  {p.cta}
                  <span className="transition-transform group-hover:translate-x-1">-&gt;</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="py-5 text-center font-mono text-[10px] text-[#3a3a3a]">
          ROADMAP KEEPS REAL FUND MOVEMENT BEHIND USER APPROVAL, SECURITY REVIEW, AND CONTRACT INTEGRATION
        </p>
      </div>
    </section>
  );
}
