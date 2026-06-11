import { z } from "zod";

export const incomeSchema = z.object({
  description: z.string().trim().min(2).max(100),
  amountCents: z.coerce.number().int().positive(),
  receivedAt: z.union([z.string().datetime(), z.string().date()]).transform((value) => new Date(value)),
  type: z.string().trim().min(2).max(40).default("EXTRA")
});

export type IncomeInput = z.infer<typeof incomeSchema>;
