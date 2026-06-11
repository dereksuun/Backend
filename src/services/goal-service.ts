import { prisma } from "../lib/prisma.js";
import type { GoalContributionInput, GoalInput } from "../validations/goal.js";

export async function listGoals(userId: string) {
  return prisma.goal.findMany({
    where: { userId },
    include: {
      contributions: {
        orderBy: { contributedAt: "desc" }
      }
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
  });
}

export async function createGoal(userId: string, input: GoalInput) {
  return prisma.goal.create({
    data: {
      userId,
      ...input
    },
    include: {
      contributions: true
    }
  });
}

export async function deleteGoal(userId: string, goalId: string) {
  const result = await prisma.goal.deleteMany({
    where: {
      id: goalId,
      userId
    }
  });

  return result.count > 0;
}

export async function addGoalContribution(userId: string, goalId: string, input: GoalContributionInput) {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId
    }
  });

  if (!goal) return null;

  return prisma.$transaction(async (tx) => {
    const contribution = await tx.goalContribution.create({
      data: {
        goalId,
        userId,
        amountCents: input.amountCents,
        contributedAt: input.contributedAt
      }
    });

    const updatedGoal = await tx.goal.update({
      where: { id: goalId },
      data: {
        currentCents: {
          increment: input.amountCents
        }
      },
      include: {
        contributions: {
          orderBy: { contributedAt: "desc" }
        }
      }
    });

    return {
      contribution,
      goal: updatedGoal
    };
  });
}
