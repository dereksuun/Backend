import type { InvestmentSimulationInput } from "../validations/investment-simulation.js";

export function simulateInvestment(input: InvestmentSimulationInput) {
  const monthlyRate = Math.pow(1 + input.annualRatePercent / 100, 1 / 12) - 1;
  let balanceCents = input.initialAmountCents;
  const timeline = [];

  for (let month = 1; month <= input.months; month += 1) {
    balanceCents = Math.round(balanceCents * (1 + monthlyRate) + input.monthlyContributionCents);

    if (month === 1 || month === input.months || month % 12 === 0) {
      timeline.push({
        month,
        balanceCents
      });
    }
  }

  const investedCents = input.initialAmountCents + input.monthlyContributionCents * input.months;
  const earningsCents = balanceCents - investedCents;

  return {
    finalAmountCents: balanceCents,
    investedCents,
    earningsCents,
    monthlyRatePercent: monthlyRate * 100,
    timeline,
    disclaimer:
      "Simulacao educativa com taxa estimada. Nao e recomendacao financeira; compare liquidez, risco, prazo e custos."
  };
}
