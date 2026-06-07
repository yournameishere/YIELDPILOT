"use client";

import { useEffect, useState } from "react";

const REPOSITORY_URL = process.env.NEXT_PUBLIC_REPOSITORY_URL?.trim();

type FooterLink = {
  name: string;
  href: string;
  badge?: string;
};

const LINKS: Record<string, FooterLink[]> = {
  PLATFORM: [
    { name: "App Console",     href: "#console" },
    { name: "Features",        href: "#features" },
    { name: "Workflow",        href: "#how-it-works" },
    { name: "Risk Map",        href: "#infrastructure" },
    { name: "Data Layer",      href: "#integrations" },
  ],
  DEVELOPERS: [
    { name: "API Route",       href: "#developers" },
    { name: "SoDEX Docs",      href: "https://sodex.com/documentation" },
    { name: "SoSoValue API",   href: "https://sosovalue-1.gitbook.io/sosovalue-api-doc" },
    { name: REPOSITORY_URL ? "README" : "Set Repo URL", href: REPOSITORY_URL ? `${REPOSITORY_URL}#readme` : "#developers" },
    { name: "Source Health",   href: "#console" },
  ],
  COMPANY: [
    { name: "Live Demo",       href: "#console" },
    { name: "Market Engine",   href: "#developers" },
    { name: "Risk Model",      href: "#security" },
    { name: "Demo",            href: "#console" },
  ],
  LEGAL: [
    { name: "Simulation",      href: "#security" },
    { name: "No Custody",      href: "#security" },
    { name: "Security",        href: "#security" },
  ],
};

export function FooterSection() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false, timeZone: "UTC" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="relative border-t border-[#1e1e1e]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">

        {/* Top row — brand + tagline */}
        <div className="border-b border-[#1e1e1e] py-12 grid lg:grid-cols-[1fr_2fr] gap-10">
          <div>
            {/* Logo */}
            <a href="#console" className="inline-flex items-center gap-3 mb-5 group">
              <div className="w-8 h-8 border border-[#2196f3] flex items-center justify-center relative">
                <div className="w-2.5 h-2.5 bg-[#2196f3]" />
                <div className="absolute inset-0 bg-[#2196f3]/10 group-hover:bg-[#2196f3]/20 transition-colors" />
              </div>
              <span className="font-display text-2xl tracking-[0.12em] text-[#f2ede6]">YIELDPILOT</span>
            </a>
            <p className="text-sm text-[#3a3a3a] leading-relaxed max-w-xs font-mono">
              Autonomous DeFi yield manager that discovers opportunities, scores risk, explains moves, and simulates safer rebalances.
            </p>
            <div className="flex gap-5 mt-6">
              <a href="https://app.akindo.io/wave-hacks/JBEQXgN4Zi2jA3wA" target="_blank" rel="noreferrer" className="font-mono text-[10px] tracking-widest text-[#3a3a3a] hover:text-[#2196f3] transition-colors">
                WAVE_HACK -&gt;
              </a>
              <a href="https://sodex.com/documentation" target="_blank" rel="noreferrer" className="font-mono text-[10px] tracking-widest text-[#3a3a3a] hover:text-[#2196f3] transition-colors">
                SODEX -&gt;
              </a>
              <a href="https://sosovalue-1.gitbook.io/sosovalue-api-doc" target="_blank" rel="noreferrer" className="font-mono text-[10px] tracking-widest text-[#3a3a3a] hover:text-[#2196f3] transition-colors">
                SOSOVALUE -&gt;
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Object.entries(LINKS).map(([section, links]) => (
              <div key={section}>
                <h3 className="font-mono text-[9px] tracking-[0.2em] text-[#2196f3] mb-5">{section}</h3>
                <ul className="space-y-3">
                  {links.map(l => (
                    <li key={l.name}>
                      <a href={l.href} className="font-mono text-[11px] text-[#3a3a3a] hover:text-[#f2ede6] transition-colors inline-flex items-center gap-2">
                        {l.name}
                        {"badge" in l && l.badge && (
                          <span className="text-[9px] border border-[#2196f3]/30 text-[#2196f3] px-1.5 py-0.5 tracking-wider">
                            {l.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-[10px] text-[#3a3a3a]">
            © 2026 YIELDPILOT AI. WAVE 2 LOCAL MVP.
          </p>
          <div className="flex items-center gap-6">
            <span className="font-mono text-[10px] text-[#3a3a3a] tabular-nums">{time} UTC</span>
            <div className="flex items-center gap-2">
              <span className="status-pulse w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
              <span className="font-mono text-[10px] text-[#22c55e] tracking-widest">SIMULATION_ENGINE_OPERATIONAL</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
