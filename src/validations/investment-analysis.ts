import { z } from "zod";

export const investmentAnalysisRequestSchema = z.object({
  ticker: z.string().trim().min(3).max(12).transform((value) => value.toUpperCase()),
  marketData: z
    .object({
      price: z.number().nonnegative().optional(),
      dailyChangePercent: z.number().optional(),
      change7dPercent: z.number().optional(),
      change30dPercent: z.number().optional()
    })
    .optional(),
  fundamentals: z
    .object({
      dividendYield: z.number().optional(),
      pl: z.number().optional(),
      roe: z.number().optional()
    })
    .optional(),
  internalIndexes: z
    .object({
      riskScore: z.number().min(0).max(100),
      trendScore: z.number().min(0).max(100),
      attractivenessScore: z.number().min(0).max(100)
    })
    .optional(),
  news: z
    .array(
      z.object({
        title: z.string().min(1),
        source: z.string().optional(),
        publishedAt: z.string().optional()
      })
    )
    .max(8)
    .default([])
});

export const investmentAnalysisSchema = z.object({
  summary: z.string().min(1),
  trendExplanation: z.string().min(1),
  riskExplanation: z.string().min(1),
  opportunityLevel: z.enum(["low", "moderate", "high"]),
  positivePoints: z.array(z.string()).default([]),
  attentionPoints: z.array(z.string()).default([]),
  newsAnalysis: z
    .array(
      z.object({
        title: z.string(),
        impact: z.enum(["positive", "negative", "neutral", "risk", "opportunity"]),
        horizon: z.enum(["short_term", "long_term", "unclear"]),
        reason: z.string()
      })
    )
    .default([]),
  disclaimer: z.string().min(1)
});

export type InvestmentAnalysisRequest = z.infer<typeof investmentAnalysisRequestSchema>;
export type InvestmentAnalysis = z.infer<typeof investmentAnalysisSchema>;
