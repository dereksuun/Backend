import type { InvestmentAnalysisRequest } from "../../validations/investment-analysis.js";

export function buildInvestmentAnalysisPrompt(input: InvestmentAnalysisRequest) {
  return JSON.stringify(
    {
      task: "Explique dados de um ativo para cards do Derycash. Nao recomende compra/venda.",
      outputSchema: {
        summary: "string",
        trendExplanation: "string",
        riskExplanation: "string",
        opportunityLevel: "low | moderate | high",
        positivePoints: ["string"],
        attentionPoints: ["string"],
        newsAnalysis: [
          {
            title: "string",
            impact: "positive | negative | neutral | risk | opportunity",
            horizon: "short_term | long_term | unclear",
            reason: "string"
          }
        ],
        disclaimer: "string"
      },
      input
    },
    null,
    2
  );
}
