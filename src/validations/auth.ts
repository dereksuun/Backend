import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200)
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(20)
});

export const githubAuthSchema = z.object({
  accessToken: z.string().min(20)
});
