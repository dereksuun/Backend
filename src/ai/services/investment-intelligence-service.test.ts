import { describe, expect, it } from "vitest";
import { analyzeInvestment } from "./investment-intelligence-service.js";

describe("analyzeInvestment", () => {
  it("returns an educational fallback when NVIDIA is not configured", async () => {
    const result = await analyzeInvestment(
      {
        ticker: "PETR4",
        internalIndexes: {
          riskScore: 72,
          trendScore: 38,
          attractivenessScore: 62
        },
        news: [
          {
            title: "Petroleo cai no mercado internacional"
          }
        ]
      },
      { disableAi: true }
    );

    expect(result.analysis.summary).toContain("PETR4");
    expect(result.analysis.disclaimer).toContain("nao fornece recomendacao");
    expect(result.analysis.newsAnalysis).toHaveLength(1);
  });
});
