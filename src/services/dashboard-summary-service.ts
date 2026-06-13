import { prisma } from "../lib/prisma.js";
import { classifyCreditCardRisk } from "../finance/risk.js";
import { ensureMonthlyExpensesForUser } from "./recurring-expense-service.js";

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function calculateReceivedIncomeCents(
  monthlyIncomeCents: number,
  mainPaymentPercent: number,
  advancePaymentPercent: number,
  mainPaymentDay: number,
  advancePaymentDay: number
) {
  const today = new Date().getUTCDate();
  const mainIncomeCents = Math.round((monthlyIncomeCents * mainPaymentPercent) / 100);
  const advanceIncomeCents = Math.round((monthlyIncomeCents * advancePaymentPercent) / 100);

  return (today >= mainPaymentDay ? mainIncomeCents : 0) + (today >= advancePaymentDay ? advanceIncomeCents : 0);
}

function getNextPayment(profile: {
  mainPaymentDay: number;
  advancePaymentDay: number;
  mainPaymentPercent: number;
  advancePaymentPercent: number;
}) {
  const today = new Date().getUTCDate();

  if (today < profile.mainPaymentDay) {
    return {
      day: profile.mainPaymentDay,
      label: "Salario",
      percent: profile.mainPaymentPercent
    };
  }

  if (today < profile.advancePaymentDay) {
    return {
      day: profile.advancePaymentDay,
      label: "Adiantamento",
      percent: profile.advancePaymentPercent
    };
  }

  return {
    day: profile.mainPaymentDay,
    label: "Salario",
    percent: profile.mainPaymentPercent
  };
}

export async function getDashboardSummary(userId: string) {
  const referenceMonth = startOfUtcMonth();
  await ensureMonthlyExpensesForUser(userId, referenceMonth);
  const profile = await prisma.financialProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    return {
      profile: null,
      summary: null
    };
  }

  const [recurringExpenses, currentInstallments, transactions, incomes] = await Promise.all([
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
        invoiceMonth: referenceMonth,
        paidAt: null
      }
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: referenceMonth,
          lt: nextUtcMonth(referenceMonth)
        }
      }
    }),
    prisma.income.findMany({
      where: {
        userId,
        receivedAt: {
          gte: referenceMonth,
          lt: nextUtcMonth(referenceMonth)
        }
      }
    })
  ]);

  const pendingExpenses = recurringExpenses.filter((expense) => expense.monthlyExpenses[0]?.status !== "PAID");
  const pendingExpensesCents = pendingExpenses.reduce((total, expense) => total + expense.expectedAmountCents, 0);
  const currentInvoiceCents = currentInstallments.reduce((total, installment) => total + installment.amountCents, 0);
  const monthlyTransactionsCents = transactions.reduce((total, transaction) => total + transaction.amountCents, 0);
  const extraIncomeCents = incomes.reduce((total, income) => total + income.amountCents, 0);
  const expectedIncomeCents = profile.monthlyIncomeCents + extraIncomeCents;
  const protectedGoalCents = profile.monthlySavingGoalCents + profile.safetyMarginCents;
  const realFreeMoneyCents =
    expectedIncomeCents - pendingExpensesCents - currentInvoiceCents - monthlyTransactionsCents - protectedGoalCents;
  const receivedIncomeCents = calculateReceivedIncomeCents(
    profile.monthlyIncomeCents,
    profile.mainPaymentPercent,
    profile.advancePaymentPercent,
    profile.mainPaymentDay,
    profile.advancePaymentDay
  ) + extraIncomeCents;

  return {
    profile,
    summary: {
      realFreeMoneyCents,
      expectedIncomeCents,
      receivedIncomeCents,
      extraIncomeCents,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesCents,
      currentInvoiceCents,
      monthlyTransactionsCents,
      futureInstallmentsCount: currentInstallments.length,
      protectedGoalCents,
      nextPayment: getNextPayment(profile),
      creditCardRisk: classifyCreditCardRisk(currentInvoiceCents, profile.monthlyIncomeCents)
    }
  };
}
