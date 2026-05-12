import { NextResponse } from "next/server";
import { buildYieldPilotMarket, normalizeAmount, normalizeGoal } from "@/lib/yieldpilot/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const goal = normalizeGoal(searchParams.get("goal"));
  const amountUsd = normalizeAmount(searchParams.get("amount"));

  try {
    const payload = await buildYieldPilotMarket(goal, amountUsd);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "YieldPilot market engine failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
