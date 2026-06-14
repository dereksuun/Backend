import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().default(3333),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  AUTH_JWT_SECRET: z.string().min(32).default("derycash-dev-auth-secret-change-before-production"),
  AUTH_JWT_EXPIRES_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  USER_DEFAULT_PASSWORD: z.string().min(8).default("Mudar123"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_MAIN_MODEL: z.string().default("nvidia/llama-3.3-nemotron-super-49b-v1.5"),
  NVIDIA_FALLBACK_MODEL: z.string().default("nvidia/llama-3.3-nemotron-super-49b-v1"),
  NVIDIA_LIGHT_MODEL: z.string().default("nvidia/nvidia-nemotron-nano-9b-v2")
});

export const env = envSchema.parse(process.env);
