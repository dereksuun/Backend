import { describe, expect, it } from "vitest";
import { calculateInvestmentIndexes } from "./investment-indexes.js";

describe("calculateInvestmentIndexes", () => {
  it("scores positive trend and strong fundamentals as more attractive", () => {
    const indexes = calculateInvestmentIndexes({
      ticker: "PETR4",
      marketData: {
        dailyChangePercent: 1,
        change7dPercent: 4,
        change30dPercent: 8
      },
      fundamentals: {
        dividendYield: 8,
        pl: 7,
        roe: 18
      },
      news: []
    });

    expect(indexes.trendScore).toBeGreaterThan(50);
    expect(indexes.attractivenessScore).toBeGreaterThanOrEqual(70);
    expect(indexes.labels.attractiveness).toBe("high");
  });

  it("raises risk when volatility proxy and negative news are present", () => {
    const indexes = calculateInvestmentIndexes({
      ticker: "TEST3",
      marketData: {
        dailyChangePercent: -8,
        change7dPercent: -12,
        change30dPercent: -20
      },
      fundamentals: {
        pl: 32,
        roe: 2
      },
      news: [
        {
          title: "Empresa cai apos crise no setor"
        }
      ]
    });

    expect(indexes.riskScore).toBeGreaterThanOrEqual(70);
    expect(indexes.labels.risk).toBe("high");
    expect(indexes.labels.trend).toBe("down");
  });
});
