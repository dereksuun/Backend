import { getDashboardSummary } from "./dashboard-summary-service.js";

type DashboardSummaryData = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>["summary"]>;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export function buildDashboardInsight(summary: DashboardSummaryData) {
  const alerts: string[] = [];
  const positivePoints: string[] = [];
  const attentionPoints: string[] = [];

  if (summary.realFreeMoneyCents > summary.expectedIncomeCents * 0.2) {
    positivePoints.push("A bufunfa livre esta com uma folga saudavel para o mes.");
  } else if (summary.realFreeMoneyCents >= 0) {
    attentionPoints.push("A bufunfa ainda esta positiva, mas com pouca gordura para compras novas.");
  } else {
    alerts.push("A bufunfa livre ficou negativa depois de contas, fatura, gastos, meta e margem.");
  }

  if (summary.creditCardRisk === "SAFE") {
    positivePoints.push("O monstro da fatura esta dentro de uma faixa segura pela regra atual.");
  }

  if (summary.creditCardRisk === "ATTENTION") {
    attentionPoints.push("A fatura entrou em zona de atencao e merece acompanhamento antes de novas compras.");
  }

  if (summary.creditCardRisk === "DANGEROUS" || summary.creditCardRisk === "CHAOTIC") {
    alerts.push("A fatura esta pressionando o mes e pode comprometer a margem de seguranca.");
  }

  if (summary.pendingExpensesCount > 0) {
    attentionPoints.push(`${summary.pendingExpensesCount} boleto(s) ainda entram na conta da bufunfa livre.`);
  }

  if (summary.protectedGoalCents > 0) {
    positivePoints.push(`Voce esta protegendo ${formatCurrency(summary.protectedGoalCents)} entre meta e margem.`);
  }

  const summaryText =
    summary.realFreeMoneyCents >= 0
      ? `Voce tem ${formatCurrency(summary.realFreeMoneyCents)} livres considerando renda, contas, fatura, gastos, meta e margem.`
      : `Faltam ${formatCurrency(Math.abs(summary.realFreeMoneyCents))} para a conta do mes voltar a respirar.`;

  return {
    summary: summaryText,
    mood:
      summary.realFreeMoneyCents < 0
        ? ("critical" as const)
        : summary.creditCardRisk === "DANGEROUS" || summary.creditCardRisk === "CHAOTIC"
          ? ("warning" as const)
          : ("stable" as const),
    alerts,
    positivePoints,
    attentionPoints,
    generatedBy: "deterministic" as const,
    disclaimer: "Insight educativo gerado a partir das regras do Derycash. Nao substitui planejamento financeiro profissional."
  };
}

export async function getDashboardInsight(userId: string) {
  const { profile, summary } = await getDashboardSummary(userId);

  if (!profile || !summary) {
    return {
      profile,
      insight: null
    };
  }

  return {
    profile,
    insight: buildDashboardInsight(summary)
  };
}
