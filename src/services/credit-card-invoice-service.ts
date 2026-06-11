import { prisma } from "../lib/prisma.js";

type InvoiceGroup = {
  id: string;
  creditCardId: string;
  creditCardName: string;
  invoiceMonth: Date;
  dueDay: number;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  status: "PAID" | "PENDING";
  installments: Array<{
    id: string;
    number: number;
    amountCents: number;
    paidAt: Date | null;
    purchaseDescription: string;
    purchaseCategory: string;
  }>;
};

export async function listCreditCardInvoices(userId: string) {
  const installments = await prisma.creditCardInstallment.findMany({
    where: { userId },
    include: {
      purchase: {
        include: {
          creditCard: true
        }
      }
    },
    orderBy: [{ invoiceMonth: "asc" }, { createdAt: "asc" }]
  });

  const invoices = new Map<string, InvoiceGroup>();

  for (const installment of installments) {
    const card = installment.purchase.creditCard;
    const monthKey = installment.invoiceMonth.toISOString().slice(0, 10);
    const key = `${card.id}-${monthKey}`;
    const existing = invoices.get(key);

    if (existing) {
      existing.totalCents += installment.amountCents;
      existing.paidCents += installment.paidAt ? installment.amountCents : 0;
      existing.pendingCents += installment.paidAt ? 0 : installment.amountCents;
      existing.installments.push({
        id: installment.id,
        number: installment.number,
        amountCents: installment.amountCents,
        paidAt: installment.paidAt,
        purchaseDescription: installment.purchase.description,
        purchaseCategory: installment.purchase.category
      });
      existing.status = existing.pendingCents === 0 ? "PAID" : "PENDING";
      continue;
    }

    invoices.set(key, {
      id: key,
      creditCardId: card.id,
      creditCardName: card.name,
      invoiceMonth: installment.invoiceMonth,
      dueDay: card.dueDay,
      totalCents: installment.amountCents,
      paidCents: installment.paidAt ? installment.amountCents : 0,
      pendingCents: installment.paidAt ? 0 : installment.amountCents,
      status: installment.paidAt ? "PAID" : "PENDING",
      installments: [
        {
          id: installment.id,
          number: installment.number,
          amountCents: installment.amountCents,
          paidAt: installment.paidAt,
          purchaseDescription: installment.purchase.description,
          purchaseCategory: installment.purchase.category
        }
      ]
    });
  }

  return Array.from(invoices.values()).sort(
    (a, b) => a.invoiceMonth.getTime() - b.invoiceMonth.getTime() || a.creditCardName.localeCompare(b.creditCardName)
  );
}

export async function markInstallmentAsPaid(userId: string, installmentId: string) {
  const installment = await prisma.creditCardInstallment.findFirst({
    where: {
      id: installmentId,
      userId
    }
  });

  if (!installment) return null;

  return prisma.creditCardInstallment.update({
    where: { id: installmentId },
    data: {
      paidAt: new Date()
    }
  });
}

export async function markInvoiceAsPaid(userId: string, creditCardId: string, invoiceMonth: Date) {
  const result = await prisma.creditCardInstallment.updateMany({
    where: {
      userId,
      invoiceMonth,
      paidAt: null,
      purchase: {
        creditCardId
      }
    },
    data: {
      paidAt: new Date()
    }
  });

  return result.count;
}
