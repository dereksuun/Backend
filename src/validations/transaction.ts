import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().trim().min(2).max(100),
  amountCents: z.coerce.number().int().positive(),
  occurredAt: z.union([z.string().datetime(), z.string().date()]).transform((value) => new Date(value)),
  category: z.string().trim().min(2).max(60),
  paymentType: z.string().trim().min(2).max(40).default("PIX")
});

export type TransactionInput = z.infer<typeof transactionSchema>;
