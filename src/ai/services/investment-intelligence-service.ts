import { NvidiaAiProvider } from "../providers/nvidia-ai-provider.js";
import { buildInvestmentAnalysisPrompt } from "../prompts/investment-analysis-prompt.js";
import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import {
  investmentAnalysisSchema,
  type InvestmentAnalysis,
  type InvestmentAnalysisRequest
} from "../../validations/investment-analysis.js";
import { calculateInvestmentIndexes } from "../../investments/calculators/investment-indexes.js";

const forbiddenRecommendationPatterns = /\b(compre|venda|invista nesse|garantid[ao]|vai subir|vai cair)\b/i;

function buildFallbackAnalysis(input: InvestmentAnalysisRequest): InvestmentAnalysis {
  const indexes = input.internalIndexes ?? calculateInvestmentIndexes(input);
  const riskScore = indexes.riskScore;
  const trendScore = indexes.trendScore;
  const attractivenessScore = indexes.attractivenessScore;

  return {
    summary: `${input.ticker} ainda precisa de dados completos para uma leitura profunda. O Derycash manteve a analise em modo educativo e usou apenas os indicadores recebidos.`,
    trendExplanation:
      trendScore >= 60
        ? "Os sinais de tendencia recebidos apontam leitura mais positiva no recorte informado."
        : trendScore <= 40
          ? "Os sinais de tendencia recebidos apontam pressao ou perda de forca no recorte informado."
          : "A tendencia aparece sem direcao forte com os dados recebidos.",
    riskExplanation:
      riskScore >= 70
        ? "O indice interno indica risco elevado; vale olhar volatilidade, concentracao e noticias recentes com cuidado."
        : riskScore <= 35
          ? "O indice interno indica risco relativamente baixo dentro dos criterios configurados."
          : "O indice interno indica risco moderado, sem leitura extrema pelos dados informados.",
    opportunityLevel: attractivenessScore >= 70 ? "high" : attractivenessScore >= 45 ? "moderate" : "low",
    positivePoints: ["Analise estruturada sem recomendacao direta.", "Calculos numericos permanecem no backend."],
    attentionPoints: ["Complete dados de mercado, fundamentos e noticias para melhorar a leitura."],
    newsAnalysis: input.news.map((item) => ({
      title: item.title,
      impact: "neutral",
      horizon: "unclear",
      reason: "Noticia recebida, mas sem classificacao automatica porque a IA nao esta configurada ou falhou."
    })),
    disclaimer:
      "Informacao educativa. O Derycash nao fornece recomendacao de compra ou venda; compare risco, prazo, liquidez e custos."
  };
}

function assertNoRecommendation(analysis: InvestmentAnalysis) {
  const searchable = JSON.stringify(analysis);

  if (forbiddenRecommendationPatterns.test(searchable)) {
    throw new Error("ai_response_contains_recommendation");
  }
}

export async function analyzeInvestment(input: InvestmentAnalysisRequest, options?: { disableAi?: boolean }) {
  const indexes = input.internalIndexes ?? calculateInvestmentIndexes(input);
  const inputWithIndexes = {
    ...input,
    internalIndexes: indexes
  };
  const provider = new NvidiaAiProvider();

  if (options?.disableAi || !provider.available) {
    return {
      source: "fallback" as const,
      internalIndexes: indexes,
      analysis: buildFallbackAnalysis(inputWithIndexes)
    };
  }

  try {
    const raw = await provider.completeJson(buildInvestmentAnalysisPrompt(inputWithIndexes));
    const parsedJson: unknown = JSON.parse(raw);
    const analysis = investmentAnalysisSchema.parse(parsedJson);
    assertNoRecommendation(analysis);

    return {
      source: "nvidia" as const,
      internalIndexes: indexes,
      analysis
    };
  } catch {
    return {
      source: "fallback" as const,
      internalIndexes: indexes,
      analysis: buildFallbackAnalysis(inputWithIndexes)
    };
  }
}

function analysisInputHash(input: InvestmentAnalysisRequest) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function cacheExpirationDate() {
  const expiresAt = new Date();
  expiresAt.setUTCHours(expiresAt.getUTCHours() + 12);
  return expiresAt;
}

export async function analyzeInvestmentWithCache(userId: string, input: InvestmentAnalysisRequest) {
  const inputHash = analysisInputHash(input);
  const cached = await prisma.investmentAnalysisCache.findUnique({
    where: {
      userId_ticker_inputHash: {
        userId,
        ticker: input.ticker,
        inputHash
      }
    }
  });

  if (cached && cached.expiresAt > new Date()) {
    return {
      source: cached.source as "nvidia" | "fallback",
      cache: "hit" as const,
      internalIndexes: cached.indexes,
      analysis: cached.analysis
    };
  }

  const result = await analyzeInvestment(input);

  await prisma.investmentAnalysisCache.upsert({
    where: {
      userId_ticker_inputHash: {
        userId,
        ticker: input.ticker,
        inputHash
      }
    },
    create: {
      userId,
      ticker: input.ticker,
      inputHash,
      source: result.source,
      indexes: result.internalIndexes,
      analysis: result.analysis,
      expiresAt: cacheExpirationDate()
    },
    update: {
      source: result.source,
      indexes: result.internalIndexes,
      analysis: result.analysis,
      expiresAt: cacheExpirationDate()
    }
  });

  return {
    ...result,
    cache: "miss" as const
  };
}
