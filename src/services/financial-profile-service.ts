import { prisma } from "../lib/prisma.js";
import type { UserContext } from "../http/user-context.js";
import type { FinancialProfileInput } from "../validations/financial-profile.js";

export async function getFinancialProfile(userId: string) {
  return prisma.financialProfile.findUnique({
    where: { userId }
  });
}

export async function upsertFinancialProfile(user: UserContext, input: FinancialProfileInput) {
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    update: {
      email: user.email,
      name: user.name
    }
  });

  return prisma.financialProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...input,
      onboardingCompletedAt: new Date()
    },
    update: {
      ...input,
      onboardingCompletedAt: new Date()
    }
  });
}
