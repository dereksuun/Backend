import { z } from "zod";
import { investmentInstitutionSchema } from "./investment-import.js";

export const manualInvestmentMovementSchema = z.object({
  institution: investmentInstitutionSchema.default("OTHER"),
  platformName: z.string().trim().min(1).max(80).default("Manual"),
  ticker: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()),
  assetName: z.string().trim().max(120).optional(),
  assetType: z.string().trim().min(1).max(40).default("acao"),
  movementType: z.enum(["BUY", "SELL", "DIVIDEND", "JCP", "INCOME", "POSITION", "DEPOSIT", "WITHDRAWAL", "OTHER"]),
  occurredAt: z.coerce.date(),
  quantity: z.coerce.number().nonnegative().optional(),
  unitPriceCents: z.coerce.number().int().nonnegative().optional(),
  totalCents: z.coerce.number().int().nonnegative(),
  feesCents: z.coerce.number().int().nonnegative().default(0),
  notes: z.string().trim().max(500).optional()
});

export type ManualInvestmentMovementInput = z.infer<typeof manualInvestmentMovementSchema>;
