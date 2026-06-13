import { z } from "zod";

export const investmentInstitutionSchema = z.enum(["B3", "XP", "INTER", "NUBANK", "ITAU", "OTHER"]);

export const investmentImportPreviewSchema = z.object({
  institution: investmentInstitutionSchema,
  fileType: z.enum(["CSV", "XLSX", "PDF"]),
  content: z.string().min(1),
  saveOriginalFile: z.boolean().default(false)
});

export const investmentImportConfirmSchema = investmentImportPreviewSchema.extend({
  confirmReviewed: z.literal(true)
});

export type InvestmentImportPreviewInput = z.infer<typeof investmentImportPreviewSchema>;
export type InvestmentImportConfirmInput = z.infer<typeof investmentImportConfirmSchema>;
