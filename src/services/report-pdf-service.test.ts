import { describe, expect, it } from "vitest";
import { renderFinancialReportPdf } from "./report-pdf-service.js";
import type { FinancialReport } from "./report-service.js";

const report: FinancialReport = {
  generatedAt: "2026-06-29T12:00:00.000Z",
  period: {
    type: "year",
    label: "2026",
    year: 2026,
    month: null,
    start: "2026-01-01T00:00:00.000Z",
    end: "2027-01-01T00:00:00.000Z"
  },
  summary: {
    grossIncomeCents: 696_500,
    generalExpenseCents: 260_000,
    netBalanceCents: 436_500,
    investedCents: 200_000,
    savingsRatePercent: 62.7,
    averageGoalProgressPercent: 6
  },
  incomeCategories: [{ category: "Renda fixa", amountCents: 696_500 }],
  expenseCategories: [{ category: "Investimentos", amountCents: 200_000 }],
  monthlyFlow: [{ key: "2026-06", label: "Jun", incomeCents: 696_500, expenseCents: 260_000, netCents: 436_500 }],
  topIncomes: [{ description: "Salario", category: "Renda fixa", date: "2026-06-04", amountCents: 496_500 }],
  topExpenses: [{ description: "Investimento", category: "Investimentos", date: "2026-06-10", amountCents: 200_000 }],
  goals: [
    {
      id: "goal-1",
      name: "Viagem Irlanda",
      currentCents: 600_00,
      targetAmountCents: 10_000_00,
      progressPercent: 6,
      deadline: "2027-11-15T00:00:00.000Z"
    }
  ],
  debts: [{ name: "Inter", type: "Cartao de credito", amountCents: 200_000, paidCents: 0, balanceCents: 200_000 }]
};

describe("renderFinancialReportPdf", () => {
  it("renders a valid PDF buffer with Derycash report metadata", () => {
    const pdf = renderFinancialReportPdf(report);
    const content = pdf.toString("latin1");

    expect(content.startsWith("%PDF-1.4")).toBe(true);
    expect(content).toContain("Derycash - Relatorio Financeiro");
    expect(content).toContain("%%EOF");
  });
});
