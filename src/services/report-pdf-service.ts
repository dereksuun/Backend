import type { FinancialReport } from "./report-service.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

function money(cents: number) {
  return currencyFormatter.format(cents / 100).replace(/\u00a0/g, " ");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function line(text: string, x: number, y: number, size = 10) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function buildContent(report: FinancialReport) {
  const rows = [
    line("Derycash - Relatorio Financeiro", 52, 790, 18),
    line(`Periodo: ${report.period.label}`, 52, 768, 11),
    line(`Gerado em: ${new Date(report.generatedAt).toLocaleDateString("pt-BR")}`, 52, 752, 10),
    line("Visao geral", 52, 720, 14),
    line(`Receita bruta: ${money(report.summary.grossIncomeCents)}`, 52, 698, 11),
    line(`Despesa geral: ${money(report.summary.generalExpenseCents)}`, 52, 680, 11),
    line(`Saldo liquido: ${money(report.summary.netBalanceCents)}`, 52, 662, 11),
    line(`Investido: ${money(report.summary.investedCents)}`, 52, 644, 11),
    line(`Taxa de poupanca: ${report.summary.savingsRatePercent}%`, 52, 626, 11),
    line(`Progresso medio das metas: ${report.summary.averageGoalProgressPercent}%`, 52, 608, 11),
    line("Categorias de receita", 52, 574, 13),
    ...report.incomeCategories.slice(0, 6).map((item, index) => line(`${item.category}: ${money(item.amountCents)}`, 52, 552 - index * 16, 10)),
    line("Categorias de despesa", 310, 574, 13),
    ...report.expenseCategories.slice(0, 6).map((item, index) => line(`${item.category}: ${money(item.amountCents)}`, 310, 552 - index * 16, 10)),
    line("Maiores receitas", 52, 430, 13),
    ...report.topIncomes.slice(0, 5).map((item, index) => line(`${item.description} - ${money(item.amountCents)}`, 52, 408 - index * 16, 10)),
    line("Maiores despesas", 310, 430, 13),
    ...report.topExpenses.slice(0, 5).map((item, index) => line(`${item.description} - ${money(item.amountCents)}`, 310, 408 - index * 16, 10)),
    line("Metas", 52, 292, 13),
    ...(report.goals.length > 0
      ? report.goals.slice(0, 6).map((goal, index) => line(`${goal.name}: ${goal.progressPercent}% - ${money(goal.currentCents)} de ${money(goal.targetAmountCents)}`, 52, 270 - index * 16, 10))
      : [line("Sem metas cadastradas no periodo.", 52, 270, 10)]),
    line("Pendencias", 52, 160, 13),
    ...(report.debts.length > 0
      ? report.debts.slice(0, 4).map((debt, index) => line(`${debt.name} (${debt.type}): ${money(debt.balanceCents)}`, 52, 138 - index * 16, 10))
      : [line("Sem pendencias abertas.", 52, 138, 10)]),
    line("Derycash - gerado automaticamente", 52, 38, 9)
  ];

  return rows.join("\n");
}

export function renderFinancialReportPdf(report: FinancialReport) {
  const content = buildContent(report);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
