import { describe, expect, it } from "vitest";
import { simulateInvestment } from "./investment-simulation-service.js";

describe("simulateInvestment", () => {
  it("projects invested amount, earnings and timeline", () => {
    const simulation = simulateInvestment({
      initialAmountCents: 100000,
      monthlyContributionCents: 50000,
      months: 12,
      annualRatePercent: 12
    });

    expect(simulation.investedCents).toBe(700000);
    expect(simulation.finalAmountCents).toBeGreaterThan(simulation.investedCents);
    expect(simulation.earningsCents).toBe(simulation.finalAmountCents - simulation.investedCents);
    expect(simulation.timeline.at(-1)?.month).toBe(12);
  });
});
