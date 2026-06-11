import { prisma } from "../lib/prisma.js";

type TimelineEvent = {
  id: string;
  date: Date;
  title: string;
  description: string;
  amountCents: number;
  direction: "IN" | "OUT";
  kind: "PAYMENT" | "INCOME" | "BILL" | "CARD" | "SPENDING";
  status?: string;
};

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function daysInUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function dateForDay(referenceMonth: Date, day: number) {
  const clampedDay = Math.min(day, daysInUtcMonth(referenceMonth));
  return new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth(), clampedDay));
}

export async function getMonthlyTimeline(userId: string) {
  const referenceMonth = startOfUtcMonth();
  const nextMonth = nextUtcMonth(referenceMonth);
  const profile = await prisma.financialProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    return {
      profile: null,
      events: []
    };
  }

  const [incomes, recurringExpenses, installments, transactions] = await Promise.all([
    prisma.income.findMany({
      where: {
        userId,
        receivedAt: {
          gte: referenceMonth,
          lt: nextMonth
        }
      }
    }),
    prisma.recurringExpense.findMany({
      where: { userId },
      include: {
        monthlyExpenses: {
          where: { referenceMonth }
        }
      }
    }),
    prisma.creditCardInstallment.findMany({
      where: {
        userId,
        invoiceMonth: referenceMonth
      },
      include: {
        purchase: {
          include: {
            creditCard: true
          }
        }
      }
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: referenceMonth,
          lt: nextMonth
        }
      }
    })
  ]);

  const mainIncomeCents = Math.round((profile.monthlyIncomeCents * profile.mainPaymentPercent) / 100);
  const advanceIncomeCents = Math.round((profile.monthlyIncomeCents * profile.advancePaymentPercent) / 100);
  const cardInvoiceByCard = new Map<string, TimelineEvent>();

  for (const installment of installments) {
    const card = installment.purchase.creditCard;
    const existing = cardInvoiceByCard.get(card.id);

    if (existing) {
      existing.amountCents += installment.amountCents;
      existing.description = `${existing.description}, ${installment.purchase.description}`;
      continue;
    }

    cardInvoiceByCard.set(card.id, {
      id: `card-${card.id}`,
      date: dateForDay(referenceMonth, card.dueDay),
      title: `Fatura ${card.name}`,
      description: installment.purchase.description,
      amountCents: installment.amountCents,
      direction: "OUT",
      kind: "CARD",
      status: installment.paidAt ? "PAID" : "PENDING"
    });
  }

  const events: TimelineEvent[] = [
    {
      id: "main-payment",
      date: dateForDay(referenceMonth, profile.mainPaymentDay),
      title: "Salario principal",
      description: `${profile.mainPaymentPercent}% da renda mensal configurada`,
      amountCents: mainIncomeCents,
      direction: "IN",
      kind: "PAYMENT"
    },
    {
      id: "advance-payment",
      date: dateForDay(referenceMonth, profile.advancePaymentDay),
      title: "Adiantamento",
      description: `${profile.advancePaymentPercent}% da renda mensal configurada`,
      amountCents: advanceIncomeCents,
      direction: "IN",
      kind: "PAYMENT"
    },
    ...incomes.map((income) => ({
      id: `income-${income.id}`,
      date: income.receivedAt,
      title: income.description,
      description: income.type,
      amountCents: income.amountCents,
      direction: "IN" as const,
      kind: "INCOME" as const
    })),
    ...recurringExpenses.map((expense) => {
      const monthlyExpense = expense.monthlyExpenses[0];

      return {
        id: `bill-${expense.id}`,
        date: dateForDay(referenceMonth, expense.dueDay),
        title: expense.name,
        description: expense.category,
        amountCents: monthlyExpense?.actualAmountCents ?? expense.expectedAmountCents,
        direction: "OUT" as const,
        kind: "BILL" as const,
        status: monthlyExpense?.status ?? expense.status
      };
    }),
    ...Array.from(cardInvoiceByCard.values()),
    ...transactions.map((transaction) => ({
      id: `spending-${transaction.id}`,
      date: transaction.occurredAt,
      title: transaction.description,
      description: transaction.category,
      amountCents: transaction.amountCents,
      direction: "OUT" as const,
      kind: "SPENDING" as const
    }))
  ];

  return {
    profile,
    events: events.sort((a, b) => a.date.getTime() - b.date.getTime())
  };
}
