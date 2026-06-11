import { prisma } from "../lib/prisma.js";
import { classifyCreditCardRisk } from "../finance/risk.js";

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
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
  const profile = await prisma.financialProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    return {
      profile: null,
      summary: null
    };
  }

  const [recurringExpenses, currentInstallments] = await Promise.all([
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
    })
  ]);

  const pendingExpenses = recurringExpenses.filter((expense) => expense.monthlyExpenses[0]?.status !== "PAID");
  const pendingExpensesCents = pendingExpenses.reduce((total, expense) => total + expense.expectedAmountCents, 0);
  const currentInvoiceCents = currentInstallments.reduce((total, installment) => total + installment.amountCents, 0);
  const protectedGoalCents = profile.monthlySavingGoalCents + profile.safetyMarginCents;
  const realFreeMoneyCents =
    profile.monthlyIncomeCents - pendingExpensesCents - currentInvoiceCents - protectedGoalCents;
  const receivedIncomeCents = calculateReceivedIncomeCents(
    profile.monthlyIncomeCents,
    profile.mainPaymentPercent,
    profile.advancePaymentPercent,
    profile.mainPaymentDay,
    profile.advancePaymentDay
  );

  return {
    profile,
    summary: {
      realFreeMoneyCents,
      expectedIncomeCents: profile.monthlyIncomeCents,
      receivedIncomeCents,
      pendingExpensesCount: pendingExpenses.length,
      pendingExpensesCents,
      currentInvoiceCents,
      futureInstallmentsCount: currentInstallments.length,
      protectedGoalCents,
      nextPayment: getNextPayment(profile),
      creditCardRisk: classifyCreditCardRisk(currentInvoiceCents, profile.monthlyIncomeCents)
    }
  };
}
