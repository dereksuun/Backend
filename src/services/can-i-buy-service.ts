import { classifyCreditCardRisk } from "../finance/risk.js";
import { getDashboardSummary } from "./dashboard-summary-service.js";
import type { CanIBuyInput } from "../validations/can-i-buy.js";

function splitInstallments(totalAmountCents: number, installmentsCount: number) {
  const baseAmount = Math.floor(totalAmountCents / installmentsCount);
  const remainder = totalAmountCents % installmentsCount;

  return Array.from({ length: installmentsCount }, (_, index) => baseAmount + (index < remainder ? 1 : 0));
}

function buildDecision(projectedFreeMoneyCents: number) {
  if (projectedFreeMoneyCents >= 50000) {
    return {
      decision: "CAN_BUY" as const,
      message: "Cabe sem drama. A bufunfa ainda respira."
    };
  }

  if (projectedFreeMoneyCents >= 0) {
    return {
      decision: "TIGHT" as const,
      message: "Cabe, mas vai deixar o mes apertado."
    };
  }

  return {
    decision: "DO_NOT_BUY" as const,
    message: "Nem inventa. A bufunfa ja entra no modo sobrevivencia."
  };
}

export async function simulateCanIBuy(userId: string, input: CanIBuyInput) {
  const { summary } = await getDashboardSummary(userId);

  if (!summary) {
    return {
      ready: false,
      message: "Configure o onboarding financeiro antes de simular compras."
    };
  }

  const installments = splitInstallments(input.amountCents, input.installmentsCount);
  const immediateImpactCents = input.paymentType === "CREDIT" ? installments[0] : input.amountCents;
  const projectedFreeMoneyCents = summary.realFreeMoneyCents - immediateImpactCents;
  const projectedInvoiceCents =
    input.paymentType === "CREDIT" ? summary.currentInvoiceCents + immediateImpactCents : summary.currentInvoiceCents;
  const decision = buildDecision(projectedFreeMoneyCents);

  return {
    ready: true,
    input,
    decision: decision.decision,
    message: decision.message,
    currentFreeMoneyCents: summary.realFreeMoneyCents,
    immediateImpactCents,
    projectedFreeMoneyCents,
    projectedInvoiceCents,
    projectedCreditCardRisk: classifyCreditCardRisk(projectedInvoiceCents, summary.expectedIncomeCents),
    installments
  };
}
