import { NextResponse } from "next/server";
import {
  buildYieldPilotMarket,
  normalizeAmount,
  normalizeConstraints,
  normalizeGoal,
  sanitizeSecretBearingError,
} from "@/lib/yieldpilot/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const MARKET_CACHE_TTL_MS = 20_000;
const MAX_MARKET_CACHE_ENTRIES = 96;
const marketResponseCache = new Map<
  string,
  { expiresAt: number; payload: Awaited<ReturnType<typeof buildYieldPilotMarket>> }
>();

function pruneMarketResponseCache(now = Date.now()) {
  for (const [key, entry] of marketResponseCache) {
    if (entry.expiresAt <= now) marketResponseCache.delete(key);
  }

  while (marketResponseCache.size > MAX_MARKET_CACHE_ENTRIES) {
    const oldestKey = marketResponseCache.keys().next().value;
    if (!oldestKey) break;
    marketResponseCache.delete(oldestKey);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goal = normalizeGoal(searchParams.get("goal"));
  const amountUsd = normalizeAmount(searchParams.get("amount"));
  const constraints = normalizeConstraints(searchParams, goal);
  const cacheKey = JSON.stringify({ goal, amountUsd, constraints });
  const now = Date.now();
  pruneMarketResponseCache(now);
  const cached = marketResponseCache.get(cacheKey);

  try {
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload, {
        headers: {
          "Cache-Control": "no-store",
          "X-YieldPilot-Cache": "HIT",
        },
      });
    }

    const payload = await buildYieldPilotMarket(goal, amountUsd, constraints);
    marketResponseCache.set(cacheKey, {
      expiresAt: Date.now() + MARKET_CACHE_TTL_MS,
      payload,
    });
    pruneMarketResponseCache();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-YieldPilot-Cache": "MISS",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "YieldPilot market engine failed",
        detail: sanitizeSecretBearingError(error instanceof Error ? error.message : "Unknown error", "YieldPilot"),
      },
      { status: 500 },
    );
  }
}
