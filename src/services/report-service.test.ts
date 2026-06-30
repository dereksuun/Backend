import { describe, expect, it } from "vitest";
import {
  buildCategoryTotals,
  calculateAverageGoalProgress,
  calculateSavingsRatePercent,
  resolveReportPeriod
} from "./report-service.js";

describe("report-service helpers", () => {
  it("resolves a month period in UTC", () => {
    const period = resolveReportPeriod({ period: "month", year: 2026, month: 6 });

    expect(period.label).toBe("Junho de 2026");
    expect(period.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("resolves a year period in UTC", () => {
    const period = resolveReportPeriod({ period: "year", year: 2026 });

    expect(period.label).toBe("2026");
    expect(period.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("calculates savings rate from net balance and gross income", () => {
    expect(calculateSavingsRatePercent(436_500, 696_500)).toBe(62.7);
    expect(calculateSavingsRatePercent(0, 0)).toBe(0);
  });

  it("calculates average goal progress capped at 100", () => {
    expect(
      calculateAverageGoalProgress([
        { currentCents: 600_00, targetAmountCents: 10_000_00 },
        { currentCents: 6_000_00, targetAmountCents: 5_000_00 }
      ])
    ).toBe(53);
  });

  it("groups category totals descending by value", () => {
    const totals = buildCategoryTotals([
      { category: "Mercado", amountCents: 350_00 },
      { category: "Transporte", amountCents: 120_00 },
      { category: "Mercado", amountCents: 50_00 }
    ]);

    expect(totals).toEqual([
      { category: "Mercado", amountCents: 400_00 },
      { category: "Transporte", amountCents: 120_00 }
    ]);
  });
});
