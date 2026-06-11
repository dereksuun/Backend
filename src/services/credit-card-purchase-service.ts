import { prisma } from "../lib/prisma.js";
import type { CreditCardPurchaseInput } from "../validations/credit-card-purchase.js";

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function getFirstInvoiceMonth(purchasedAt: Date, closingDay: number) {
  const normalized = startOfUtcMonth(purchasedAt);
  const purchaseDay = purchasedAt.getUTCDate();

  if (purchaseDay > closingDay) {
    return addMonths(normalized, 1);
  }

  return normalized;
}

function splitInstallments(totalAmountCents: number, installmentsCount: number) {
  const baseAmount = Math.floor(totalAmountCents / installmentsCount);
  const remainder = totalAmountCents % installmentsCount;

  return Array.from({ length: installmentsCount }, (_, index) => baseAmount + (index < remainder ? 1 : 0));
}

export async function listCreditCardPurchases(userId: string) {
  return prisma.creditCardPurchase.findMany({
    where: { userId },
    include: {
      creditCard: true,
      installments: {
        orderBy: [{ invoiceMonth: "asc" }, { number: "asc" }]
      }
    },
    orderBy: { purchasedAt: "desc" }
  });
}

export async function createCreditCardPurchase(userId: string, input: CreditCardPurchaseInput) {
  const creditCard = await prisma.creditCard.findFirst({
    where: {
      id: input.creditCardId,
      userId
    }
  });

  if (!creditCard) return null;

  const firstInvoiceMonth = getFirstInvoiceMonth(input.purchasedAt, creditCard.closingDay);
  const installmentAmounts = splitInstallments(input.totalAmountCents, input.installmentsCount);

  return prisma.creditCardPurchase.create({
    data: {
      userId,
      creditCardId: input.creditCardId,
      description: input.description,
      totalAmountCents: input.totalAmountCents,
      purchasedAt: input.purchasedAt,
      category: input.category,
      installmentsCount: input.installmentsCount,
      notes: input.notes,
      installments: {
        create: installmentAmounts.map((amountCents, index) => ({
          userId,
          number: index + 1,
          amountCents,
          invoiceMonth: addMonths(firstInvoiceMonth, index)
        }))
      }
    },
    include: {
      creditCard: true,
      installments: {
        orderBy: { number: "asc" }
      }
    }
  });
}

export async function deleteCreditCardPurchase(userId: string, purchaseId: string) {
  const result = await prisma.creditCardPurchase.deleteMany({
    where: {
      id: purchaseId,
      userId
    }
  });

  return result.count > 0;
}
