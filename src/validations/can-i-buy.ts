import { z } from "zod";

export const canIBuySchema = z.object({
  description: z.string().trim().min(2).max(100).default("Compra simulada"),
  amountCents: z.coerce.number().int().positive(),
  installmentsCount: z.coerce.number().int().min(1).max(48).default(1),
  paymentType: z.enum(["CASH", "DEBIT", "CREDIT"]).default("CASH")
});

export type CanIBuyInput = z.infer<typeof canIBuySchema>;
