import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./dashboard-summary-service.js", () => ({
  getDashboardSummary: vi.fn()
}));

const { getDashboardSummary } = await import("./dashboard-summary-service.js");
const { simulateCanIBuy } = await import("./can-i-buy-service.js");

const mockedGetDashboardSummary = vi.mocked(getDashboardSummary);

const baseProfile = {
  id: "profile-1",
  userId: "user-1",
  monthlyIncomeCents: 400000,
  mainPaymentDay: 5,
  advancePaymentDay: 20,
  mainPaymentPercent: 60,
  advancePaymentPercent: 40,
  includeMealVoucher: false,
  includeTransportVoucher: false,
  monthlySavingGoalCents: 80000,
  safetyMarginCents: 20000,
  cycleStartDay: 1,
  onboardingCompletedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

const baseSummary = {
  realFreeMoneyCents: 100000,
  expectedIncomeCents: 400000,
  receivedIncomeCents: 240000,
  extraIncomeCents: 0,
  pendingExpensesCount: 1,
  pendingExpensesCents: 80000,
  currentInvoiceCents: 50000,
  monthlyTransactionsCents: 20000,
  futureInstallmentsCount: 2,
  protectedGoalCents: 100000,
  nextPayment: {
    day: 20,
    label: "Adiantamento",
    percent: 40
  },
  creditCardRisk: "SAFE" as const
};

describe("simulateCanIBuy", () => {
  beforeEach(() => {
    mockedGetDashboardSummary.mockReset();
  });

  it("asks the user to finish onboarding before simulating", async () => {
    mockedGetDashboardSummary.mockResolvedValue({
      profile: null,
      summary: null
    });

    await expect(
      simulateCanIBuy("user-1", {
        description: "Compra",
        amountCents: 10000,
        installmentsCount: 1,
        paymentType: "CASH"
      })
    ).resolves.toMatchObject({
      ready: false,
      message: "Configure o onboarding financeiro antes de simular compras."
    });
  });

  it("splits installments and applies only the first installment to current credit impact", async () => {
    mockedGetDashboardSummary.mockResolvedValue({
      profile: baseProfile,
      summary: baseSummary
    });

    const simulation = await simulateCanIBuy("user-1", {
      description: "Cadeira",
      amountCents: 10000,
      installmentsCount: 3,
      paymentType: "CREDIT"
    });

    expect(simulation.ready).toBe(true);
    expect(simulation.installments).toEqual([3334, 3333, 3333]);
    expect(simulation.immediateImpactCents).toBe(3334);
    expect(simulation.projectedInvoiceCents).toBe(53334);
    expect(simulation.projectedFreeMoneyCents).toBe(96666);
    expect(simulation.decision).toBe("CAN_BUY");
  });

  it("rejects a purchase that would make real free money negative", async () => {
    mockedGetDashboardSummary.mockResolvedValue({
      profile: baseProfile,
      summary: baseSummary
    });

    const simulation = await simulateCanIBuy("user-1", {
      description: "Notebook",
      amountCents: 120000,
      installmentsCount: 1,
      paymentType: "DEBIT"
    });

    expect(simulation.decision).toBe("DO_NOT_BUY");
    expect(simulation.projectedFreeMoneyCents).toBe(-20000);
  });
});
