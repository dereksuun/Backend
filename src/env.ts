import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().default(3333),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);
