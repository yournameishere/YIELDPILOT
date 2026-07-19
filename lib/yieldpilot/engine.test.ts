import { describe, expect, it } from "vitest";
import {
  normalizeAmount,
  normalizeConstraints,
  normalizeGoal,
  sanitizeSecretBearingError,
} from "./engine";

describe("YieldPilot engine request normalization", () => {
  it("defaults unknown strategy goals to balanced", () => {
    expect(normalizeGoal(null)).toBe("balanced");
    expect(normalizeGoal("unknown")).toBe("balanced");
    expect(normalizeGoal("aggressive")).toBe("aggressive");
  });

  it("clamps simulated capital to the supported production range", () => {
    expect(normalizeAmount(null)).toBe(1000);
    expect(normalizeAmount("99.1")).toBe(100);
    expect(normalizeAmount("1234.567")).toBe(1234.57);
    expect(normalizeAmount("1000000000")).toBe(1000000);
    expect(normalizeAmount("not-a-number")).toBe(1000);
  });

  it("normalizes and clamps custom strategy constraints", () => {
    const params = new URLSearchParams({
      stableOnly: "false",
      maxRisk: "999",
      maxApy: "1",
      minTvlUsd: "100",
      maxPositions: "99",
      rebalanceThresholdPct: "0.5",
      alertRiskScore: "120",
    });

    expect(normalizeConstraints(params, "custom")).toEqual({
      stableOnly: false,
      maxRisk: 90,
      maxApy: 3,
      minTvlUsd: 500000,
      maxPositions: 6,
      rebalanceThresholdPct: 2,
      alertRiskScore: 95,
    });
  });

  it("uses goal defaults when optional constraints are absent or invalid", () => {
    const params = new URLSearchParams({
      stableOnly: "maybe",
      maxRisk: "not-a-number",
    });

    expect(normalizeConstraints(params, "safe")).toMatchObject({
      stableOnly: true,
      maxRisk: 40,
      maxApy: 16,
      minTvlUsd: 20000000,
      maxPositions: 3,
    });
  });
});

describe("YieldPilot error sanitization", () => {
  it("redacts provider secrets before returning errors to the UI", () => {
    const detail = sanitizeSecretBearingError(
      "Fetch failed with Bearer sk-live-secret-token and x-soso-api-key SOSO-secret-token api_key=verylongprivateapikey123",
      "Provider",
    );

    expect(detail).toContain("Bearer [redacted]");
    expect(detail).toContain("x-soso-api-key [redacted]");
    expect(detail).toContain("api_key=[redacted]");
    expect(detail).not.toContain("sk-live-secret-token");
    expect(detail).not.toContain("SOSO-secret-token");
    expect(detail).not.toContain("verylongprivateapikey123");
  });

  it("returns a generic authentication message for invalid key failures", () => {
    expect(sanitizeSecretBearingError("401 incorrect api key", "OpenAI")).toBe(
      "OpenAI authentication failed. Check the local server environment value without exposing it in the UI.",
    );
  });
});
