import type { CreditCardRisk } from "@prisma/client";

export function classifyCreditCardRisk(invoiceCents: number, monthlyIncomeCents: number): CreditCardRisk {
  if (monthlyIncomeCents <= 0) {
    return "CHAOTIC";
  }

  const ratio = invoiceCents / monthlyIncomeCents;

  if (ratio <= 0.25) return "SAFE";
  if (ratio <= 0.4) return "ATTENTION";
  if (ratio <= 0.6) return "DANGEROUS";
  return "CHAOTIC";
}
