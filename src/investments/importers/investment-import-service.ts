import type { InvestmentImportPreviewInput } from "../../validations/investment-import.js";

type ImportRow = Record<string, string>;

const requiredStandardColumns = [
  "data",
  "instituicao",
  "tipo_movimentacao",
  "tipo_ativo",
  "ticker",
  "nome_ativo",
  "quantidade",
  "preco_unitario",
  "valor_total",
  "taxas",
  "observacao"
];

export const standardInvestmentCsvTemplate = [
  requiredStandardColumns.join(","),
  "2026-06-11,XP,compra,acao,PETR4,Petrobras PN,10,38.50,385.00,1.20,Compra manual/importada"
].join("\n");

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return {
      rows: [] as ImportRow[],
      missingColumns: requiredStandardColumns,
      errors: ["O CSV precisa ter cabecalho e pelo menos uma linha de dados."]
    };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missingColumns = requiredStandardColumns.filter((column) => !headers.includes(column));
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  return {
    rows,
    missingColumns,
    errors: [] as string[]
  };
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

export function previewInvestmentImport(input: InvestmentImportPreviewInput) {
  if (input.fileType !== "CSV") {
    return {
      institution: input.institution,
      fileType: input.fileType,
      status: "NEEDS_MANUAL_MAPPING" as const,
      summary: {
        operations: 0,
        incomes: 0,
        positions: 0,
        assets: 0,
        reviewItems: 1
      },
      rows: [],
      issues: [
        "Este backend ja recebeu o contrato do importador, mas o parser automatico inicial esta habilitado apenas para CSV padrao Derycash.",
        "Use o CSV padrao ou mapeie colunas manualmente antes de confirmar."
      ],
      nextStep: "review_required" as const
    };
  }

  const parsed = parseCsv(input.content);
  const assets = new Set<string>();
  const rows = parsed.rows.map((row, index) => {
    const quantity = Number(row.quantidade);
    const unitPriceCents = parseMoney(row.preco_unitario ?? "");
    const totalCents = parseMoney(row.valor_total ?? "");
    const feesCents = parseMoney(row.taxas ?? "0");
    const type = row.tipo_movimentacao?.toLowerCase();
    const ticker = row.ticker?.toUpperCase();
    const issues: string[] = [];

    if (ticker) assets.add(ticker);
    if (!row.data || Number.isNaN(Date.parse(row.data))) issues.push("Data invalida ou ausente.");
    if (!ticker) issues.push("Ticker ausente.");
    if (!Number.isFinite(quantity) || quantity <= 0) issues.push("Quantidade precisa ser positiva.");
    if (unitPriceCents === null || unitPriceCents < 0) issues.push("Preco unitario invalido.");
    if (totalCents === null || totalCents < 0) issues.push("Valor total invalido.");

    return {
      rowNumber: index + 2,
      ticker,
      institution: row.instituicao || input.institution,
      movementType: type,
      assetType: row.tipo_ativo,
      date: row.data,
      quantity,
      unitPriceCents,
      totalCents,
      feesCents,
      notes: row.observacao,
      issues
    };
  });

  const rowIssues = rows.flatMap((row) => row.issues.map((issue) => `Linha ${row.rowNumber}: ${issue}`));
  const issues = [
    ...parsed.errors,
    ...parsed.missingColumns.map((column) => `Coluna obrigatoria ausente: ${column}.`),
    ...rowIssues
  ];

  return {
    institution: input.institution,
    fileType: input.fileType,
    status: issues.length > 0 ? ("NEEDS_REVIEW" as const) : ("READY_FOR_CONFIRMATION" as const),
    summary: {
      operations: rows.filter((row) => row.movementType === "compra" || row.movementType === "venda").length,
      incomes: rows.filter((row) => ["dividendo", "jcp", "rendimento"].includes(row.movementType ?? "")).length,
      positions: rows.filter((row) => row.movementType === "posicao").length,
      assets: assets.size,
      reviewItems: issues.length
    },
    rows,
    issues,
    nextStep: "user_confirmation_required" as const
  };
}
