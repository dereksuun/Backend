import { describe, expect, it } from "vitest";
import { buildDashboardInsight } from "./dashboard-insight-service.js";

const baseSummary = {
  realFreeMoneyCents: 120000,
  expectedIncomeCents: 400000,
  receivedIncomeCents: 240000,
  extraIncomeCents: 0,
  pendingExpensesCount: 1,
  pendingExpensesCents: 80000,
  currentInvoiceCents: 70000,
  monthlyTransactionsCents: 30000,
  futureInstallmentsCount: 2,
  protectedGoalCents: 100000,
  nextPayment: {
    day: 20,
    label: "Adiantamento",
    percent: 40
  },
  creditCardRisk: "SAFE" as const
};

describe("buildDashboardInsight", () => {
  it("builds a stable insight when free money is positive", () => {
    const insight = buildDashboardInsight(baseSummary);

    expect(insight.mood).toBe("stable");
    expect(insight.summary).toContain("livres");
    expect(insight.positivePoints.length).toBeGreaterThan(0);
  });

  it("builds a critical insight when real free money is negative", () => {
    const insight = buildDashboardInsight({
      ...baseSummary,
      realFreeMoneyCents: -5000,
      creditCardRisk: "CHAOTIC"
    });

    expect(insight.mood).toBe("critical");
    expect(insight.alerts.length).toBeGreaterThan(0);
  });
});
