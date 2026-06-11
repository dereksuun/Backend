import { ExpenseStatus } from "@prisma/client";
import { z } from "zod";

const optionalDateSchema = z
  .union([z.string().datetime(), z.string().date(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    return new Date(value);
  });

export const recurringExpenseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  expectedAmountCents: z.coerce.number().int().positive(),
  dueDay: z.coerce.number().int().min(1).max(31),
  category: z.string().trim().min(2).max(60),
  type: z.string().trim().min(2).max(40).default("FIXA"),
  isEssential: z.coerce.boolean().default(true),
  isVariable: z.coerce.boolean().default(false),
  status: z.nativeEnum(ExpenseStatus).default("PENDING"),
  startsAt: optionalDateSchema,
  endsAt: optionalDateSchema
});

export const updateRecurringExpenseSchema = recurringExpenseSchema.partial();

export const payRecurringExpenseSchema = z.object({
  actualAmountCents: z.coerce.number().int().positive().optional(),
  paidAt: optionalDateSchema,
  referenceMonth: optionalDateSchema
});

export type RecurringExpenseInput = z.infer<typeof recurringExpenseSchema>;
export type UpdateRecurringExpenseInput = z.infer<typeof updateRecurringExpenseSchema>;
export type PayRecurringExpenseInput = z.infer<typeof payRecurringExpenseSchema>;
