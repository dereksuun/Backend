import { z } from "zod";

export const creditCardSchema = z.object({
  name: z.string().trim().min(2).max(80),
  institution: z.string().trim().max(80).optional().nullable(),
  limitCents: z.coerce.number().int().positive(),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  color: z.string().trim().max(32).optional().nullable(),
  active: z.coerce.boolean().default(true)
});

export const updateCreditCardSchema = creditCardSchema.partial();

export type CreditCardInput = z.infer<typeof creditCardSchema>;
export type UpdateCreditCardInput = z.infer<typeof updateCreditCardSchema>;
