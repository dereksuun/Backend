import { z } from "zod";

export const investmentSimulationSchema = z.object({
  initialAmountCents: z.coerce.number().int().min(0).default(0),
  monthlyContributionCents: z.coerce.number().int().min(0).default(0),
  months: z.coerce.number().int().min(1).max(600),
  annualRatePercent: z.coerce.number().min(0).max(100)
});

export type InvestmentSimulationInput = z.infer<typeof investmentSimulationSchema>;
