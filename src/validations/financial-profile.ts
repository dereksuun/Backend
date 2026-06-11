import { z } from "zod";

export const financialProfileSchema = z.object({
  monthlyIncomeCents: z.coerce.number().int().positive(),
  mainPaymentDay: z.coerce.number().int().min(1).max(31).default(5),
  advancePaymentDay: z.coerce.number().int().min(1).max(31).default(20),
  mainPaymentPercent: z.coerce.number().int().min(0).max(100).default(60),
  advancePaymentPercent: z.coerce.number().int().min(0).max(100).default(40),
  includeMealVoucher: z.coerce.boolean().default(false),
  includeTransportVoucher: z.coerce.boolean().default(false),
  monthlySavingGoalCents: z.coerce.number().int().min(0).default(0),
  safetyMarginCents: z.coerce.number().int().min(0).default(0),
  cycleStartDay: z.coerce.number().int().min(1).max(31).default(1)
});

export type FinancialProfileInput = z.infer<typeof financialProfileSchema>;
