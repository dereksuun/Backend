import type { InvestmentAnalysisRequest } from "../../validations/investment-analysis.js";

export type InvestmentIndexes = {
  riskScore: number;
  trendScore: number;
  attractivenessScore: number;
  labels: {
    risk: "low" | "medium" | "high";
    trend: "up" | "down" | "sideways" | "unclear";
    attractiveness: "low" | "moderate" | "high";
  };
  factors: {
    risk: string[];
    trend: string[];
    attractiveness: string[];
  };
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function scoreTrend(input: InvestmentAnalysisRequest) {
  const daily = input.marketData?.dailyChangePercent ?? 0;
  const weekly = input.marketData?.change7dPercent ?? 0;
  const monthly = input.marketData?.change30dPercent ?? 0;
  const weightedChange = daily * 0.2 + weekly * 0.3 + monthly * 0.5;
  const score = clampScore(50 + weightedChange * 3);
  const factors: string[] = [];

  if (monthly > 5) factors.push("Variacao de 30 dias positiva.");
  if (monthly < -5) factors.push("Variacao de 30 dias negativa.");
  if (weekly > 3) factors.push("Forca positiva em 7 dias.");
  if (weekly < -3) factors.push("Pressao negativa em 7 dias.");
  if (Math.abs(weightedChange) < 1) factors.push("Movimento recente sem direcao forte.");

  return { score, factors };
}

function scoreRisk(input: InvestmentAnalysisRequest) {
  const changes = [
    input.marketData?.dailyChangePercent ?? 0,
    input.marketData?.change7dPercent ?? 0,
    input.marketData?.change30dPercent ?? 0
  ];
  const volatilityProxy = average(changes.map((value) => Math.abs(value)));
  const negativeNews = input.news.filter((item) => /queda|risco|prejuizo|investigacao|crise|cai/i.test(item.title)).length;
  const pl = input.fundamentals?.pl;
  const roe = input.fundamentals?.roe;
  let score = 30 + volatilityProxy * 4 + negativeNews * 8;
  const factors: string[] = [];

  if (volatilityProxy > 6) factors.push("Oscilacao recente elevada.");
  if (negativeNews > 0) factors.push("Noticias recentes pedem leitura cuidadosa.");
  if (typeof pl === "number" && pl > 25) {
    score += 10;
    factors.push("P/L informado esta alto dentro da regra inicial.");
  }
  if (typeof roe === "number" && roe < 5) {
    score += 8;
    factors.push("ROE informado esta baixo dentro da regra inicial.");
  }
  if (factors.length === 0) factors.push("Nenhum fator extremo de risco foi informado.");

  return { score: clampScore(score), factors };
}

function scoreAttractiveness(input: InvestmentAnalysisRequest) {
  const dividendYield = input.fundamentals?.dividendYield;
  const pl = input.fundamentals?.pl;
  const roe = input.fundamentals?.roe;
  const trend = scoreTrend(input).score;
  let score = 45 + (trend - 50) * 0.25;
  const factors: string[] = [];

  if (typeof dividendYield === "number" && dividendYield >= 6) {
    score += 14;
    factors.push("Dividend yield informado acima da regra inicial.");
  }
  if (typeof pl === "number" && pl > 0 && pl <= 12) {
    score += 12;
    factors.push("P/L informado esta em faixa interessante para estudo.");
  }
  if (typeof roe === "number" && roe >= 15) {
    score += 14;
    factors.push("ROE informado indica boa rentabilidade sobre patrimonio.");
  }
  if (typeof pl === "number" && pl > 25) {
    score -= 12;
    factors.push("P/L alto reduz a atratividade na regra inicial.");
  }
  if (typeof roe === "number" && roe < 5) {
    score -= 10;
    factors.push("ROE baixo reduz a atratividade na regra inicial.");
  }
  if (factors.length === 0) factors.push("Dados fundamentalistas insuficientes para uma leitura forte.");

  return { score: clampScore(score), factors };
}

export function calculateInvestmentIndexes(input: InvestmentAnalysisRequest): InvestmentIndexes {
  const trend = scoreTrend(input);
  const risk = scoreRisk(input);
  const attractiveness = scoreAttractiveness(input);

  return {
    riskScore: risk.score,
    trendScore: trend.score,
    attractivenessScore: attractiveness.score,
    labels: {
      risk: risk.score >= 70 ? "high" : risk.score >= 40 ? "medium" : "low",
      trend: trend.score >= 58 ? "up" : trend.score <= 42 ? "down" : trend.factors.length > 0 ? "sideways" : "unclear",
      attractiveness: attractiveness.score >= 70 ? "high" : attractiveness.score >= 45 ? "moderate" : "low"
    },
    factors: {
      risk: risk.factors,
      trend: trend.factors,
      attractiveness: attractiveness.factors
    }
  };
}
