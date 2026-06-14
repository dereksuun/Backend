import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(["SUPERADMIN", "ADMIN", "USER"]).default("USER")
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).nullable().optional(),
    email: z.string().trim().email().max(255).optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(["SUPERADMIN", "ADMIN", "USER"]).optional(),
    disabled: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar."
  });
