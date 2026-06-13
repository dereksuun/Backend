import { z } from "zod";

const optionalDateSchema = z
  .union([z.string().datetime(), z.string().date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    return new Date(value);
  });

export const goalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  targetAmountCents: z.coerce.number().int().positive(),
  currentCents: z.coerce.number().int().min(0).default(0),
  deadline: optionalDateSchema,
  priority: z.coerce.number().int().min(0).max(5).default(0)
});

export const updateGoalSchema = goalSchema.partial();

export const goalContributionSchema = z.object({
  amountCents: z.coerce.number().int().positive(),
  contributedAt: z.union([z.string().datetime(), z.string().date()]).transform((value) => new Date(value))
});

export type GoalInput = z.infer<typeof goalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type GoalContributionInput = z.infer<typeof goalContributionSchema>;
