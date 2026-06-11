import { prisma } from "../lib/prisma.js";
import type { TransactionInput } from "../validations/transaction.js";

export async function listTransactions(userId: string) {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" }
  });
}

export async function createTransaction(userId: string, input: TransactionInput) {
  return prisma.transaction.create({
    data: {
      userId,
      ...input
    }
  });
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const result = await prisma.transaction.deleteMany({
    where: {
      id: transactionId,
      userId
    }
  });

  return result.count > 0;
}
