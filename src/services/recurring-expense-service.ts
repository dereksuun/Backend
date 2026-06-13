import { prisma } from "../lib/prisma.js";
import type {
  PayRecurringExpenseInput,
  RecurringExpenseInput,
  UpdateRecurringExpenseInput
} from "../validations/recurring-expense.js";

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function subtractUtcMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
}

function isRecurringExpenseActiveForMonth(expense: { startsAt: Date | null; endsAt: Date | null }, referenceMonth: Date) {
  const nextMonth = new Date(Date.UTC(referenceMonth.getUTCFullYear(), referenceMonth.getUTCMonth() + 1, 1));

  if (expense.startsAt && expense.startsAt >= nextMonth) return false;
  if (expense.endsAt && expense.endsAt < referenceMonth) return false;
  return true;
}

function statusForDueDay(dueDay: number, referenceMonth: Date, now = new Date()) {
  const isCurrentMonth =
    referenceMonth.getUTCFullYear() === now.getUTCFullYear() && referenceMonth.getUTCMonth() === now.getUTCMonth();

  if (!isCurrentMonth) return "PENDING" as const;
  return now.getUTCDate() > dueDay ? ("OVERDUE" as const) : ("PENDING" as const);
}

export async function ensureMonthlyExpensesForUser(userId: string, referenceDate = new Date()) {
  const referenceMonth = startOfMonth(referenceDate);
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: {
      userId,
      status: {
        not: "CANCELED"
      }
    }
  });
  const activeExpenses = recurringExpenses.filter((expense) => isRecurringExpenseActiveForMonth(expense, referenceMonth));

  await Promise.all(
    activeExpenses.map(async (expense) => {
      const existing = await prisma.monthlyExpense.findUnique({
        where: {
          recurringExpenseId_userId_referenceMonth: {
            recurringExpenseId: expense.id,
            userId,
            referenceMonth
          }
        }
      });

      if (existing?.status === "PAID") return existing;

      if (existing) {
        return prisma.monthlyExpense.update({
          where: { id: existing.id },
          data: {
            expectedAmountCents: expense.expectedAmountCents,
            status: statusForDueDay(expense.dueDay, referenceMonth)
          }
        });
      }

      return prisma.monthlyExpense.create({
        data: {
          recurringExpenseId: expense.id,
          userId,
          referenceMonth,
          expectedAmountCents: expense.expectedAmountCents,
          status: statusForDueDay(expense.dueDay, referenceMonth)
        }
      });
    })
  );

  return activeExpenses.length;
}

export async function listRecurringExpenses(userId: string) {
  const referenceMonth = startOfMonth();
  const historyStartMonth = subtractUtcMonths(referenceMonth, 5);
  await ensureMonthlyExpensesForUser(userId, referenceMonth);

  return prisma.recurringExpense.findMany({
    where: { userId },
    include: {
      monthlyExpenses: {
        where: {
          referenceMonth: {
            gte: historyStartMonth,
            lte: referenceMonth
          }
        },
        orderBy: { referenceMonth: "desc" }
      }
    },
    orderBy: [{ dueDay: "asc" }, { name: "asc" }]
  });
}

export async function createRecurringExpense(userId: string, input: RecurringExpenseInput) {
  return prisma.recurringExpense.create({
    data: {
      userId,
      ...input
    }
  });
}

export async function updateRecurringExpense(userId: string, expenseId: string, input: UpdateRecurringExpenseInput) {
  const result = await prisma.recurringExpense.updateMany({
    where: {
      id: expenseId,
      userId
    },
    data: input
  });

  if (result.count === 0) return null;

  return prisma.recurringExpense.findFirst({
    where: {
      id: expenseId,
      userId
    }
  });
}

export async function deleteRecurringExpense(userId: string, expenseId: string) {
  const result = await prisma.recurringExpense.deleteMany({
    where: {
      id: expenseId,
      userId
    }
  });

  return result.count > 0;
}

export async function markRecurringExpenseAsPaid(
  userId: string,
  expenseId: string,
  input: PayRecurringExpenseInput
) {
  const recurringExpense = await prisma.recurringExpense.findFirst({
    where: {
      id: expenseId,
      userId
    }
  });

  if (!recurringExpense) return null;

  const referenceMonth = startOfMonth(input.referenceMonth ?? new Date());
  const paidAt = input.paidAt ?? new Date();
  const actualAmountCents = input.actualAmountCents ?? recurringExpense.expectedAmountCents;

  const existingMonthlyExpense = await prisma.monthlyExpense.findFirst({
    where: {
      recurringExpenseId: expenseId,
      userId,
      referenceMonth
    }
  });

  if (existingMonthlyExpense) {
    return prisma.monthlyExpense.update({
      where: { id: existingMonthlyExpense.id },
      data: {
        actualAmountCents,
        expectedAmountCents: recurringExpense.expectedAmountCents,
        paidAt,
        status: "PAID"
      }
    });
  }

  return prisma.monthlyExpense.create({
    data: {
      recurringExpenseId: expenseId,
      userId,
      referenceMonth,
      expectedAmountCents: recurringExpense.expectedAmountCents,
      actualAmountCents,
      paidAt,
      status: "PAID"
    }
  });
}
