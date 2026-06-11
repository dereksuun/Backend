import { prisma } from "../lib/prisma.js";
import type { IncomeInput } from "../validations/income.js";

export async function listIncomes(userId: string) {
  return prisma.income.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" }
  });
}

export async function createIncome(userId: string, input: IncomeInput) {
  return prisma.income.create({
    data: {
      userId,
      ...input
    }
  });
}

export async function deleteIncome(userId: string, incomeId: string) {
  const result = await prisma.income.deleteMany({
    where: {
      id: incomeId,
      userId
    }
  });

  return result.count > 0;
}
