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
const marketResponseCache = new Map<
  string,
  { expiresAt: number; payload: Awaited<ReturnType<typeof buildYieldPilotMarket>> }
>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goal = normalizeGoal(searchParams.get("goal"));
  const amountUsd = normalizeAmount(searchParams.get("amount"));
  const constraints = normalizeConstraints(searchParams, goal);
  const cacheKey = JSON.stringify({ goal, amountUsd, constraints });
  const cached = marketResponseCache.get(cacheKey);

  try {
    if (cached && cached.expiresAt > Date.now()) {
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
