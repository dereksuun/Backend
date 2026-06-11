import { z } from "zod";

export const creditCardPurchaseSchema = z.object({
  creditCardId: z.string().min(1),
  description: z.string().trim().min(2).max(100),
  totalAmountCents: z.coerce.number().int().positive(),
  purchasedAt: z.union([z.string().datetime(), z.string().date()]).transform((value) => new Date(value)),
  category: z.string().trim().min(2).max(60),
  installmentsCount: z.coerce.number().int().min(1).max(48).default(1),
  notes: z.string().trim().max(500).optional().nullable()
});

export type CreditCardPurchaseInput = z.infer<typeof creditCardPurchaseSchema>;
