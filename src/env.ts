import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().default(3333),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_MAIN_MODEL: z.string().default("nvidia/llama-3.3-nemotron-super-49b-v1.5"),
  NVIDIA_FALLBACK_MODEL: z.string().default("nvidia/llama-3.3-nemotron-super-49b-v1"),
  NVIDIA_LIGHT_MODEL: z.string().default("nvidia/nvidia-nemotron-nano-9b-v2")
});

export const env = envSchema.parse(process.env);
