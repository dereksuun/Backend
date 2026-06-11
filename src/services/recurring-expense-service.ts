import { prisma } from "../lib/prisma.js";
import type {
  PayRecurringExpenseInput,
  RecurringExpenseInput,
  UpdateRecurringExpenseInput
} from "../validations/recurring-expense.js";

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export async function listRecurringExpenses(userId: string) {
  const referenceMonth = startOfMonth();

  return prisma.recurringExpense.findMany({
    where: { userId },
    include: {
      monthlyExpenses: {
        where: { referenceMonth },
        orderBy: { updatedAt: "desc" }
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
