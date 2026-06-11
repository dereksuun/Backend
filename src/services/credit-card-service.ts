import { prisma } from "../lib/prisma.js";
import type { CreditCardInput, UpdateCreditCardInput } from "../validations/credit-card.js";

export async function listCreditCards(userId: string) {
  return prisma.creditCard.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });
}

export async function createCreditCard(userId: string, input: CreditCardInput) {
  return prisma.creditCard.create({
    data: {
      userId,
      ...input
    }
  });
}

export async function updateCreditCard(userId: string, cardId: string, input: UpdateCreditCardInput) {
  const result = await prisma.creditCard.updateMany({
    where: {
      id: cardId,
      userId
    },
    data: input
  });

  if (result.count === 0) return null;

  return prisma.creditCard.findFirst({
    where: {
      id: cardId,
      userId
    }
  });
}

export async function deleteCreditCard(userId: string, cardId: string) {
  const result = await prisma.creditCard.deleteMany({
    where: {
      id: cardId,
      userId
    }
  });

  return result.count > 0;
}
