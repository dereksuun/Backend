import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { previewInvestmentImport } from "../importers/investment-import-service.js";
import type { InvestmentImportConfirmInput } from "../../validations/investment-import.js";

function sourceHash(userId: string, content: string) {
  return createHash("sha256").update(`${userId}:${content}`).digest("hex");
}

function normalizeMovementType(value?: string) {
  switch (value?.toLowerCase()) {
    case "compra":
    case "buy":
      return "BUY" as const;
    case "venda":
    case "sell":
      return "SELL" as const;
    case "dividendo":
    case "dividend":
      return "DIVIDEND" as const;
    case "jcp":
      return "JCP" as const;
    case "rendimento":
    case "income":
      return "INCOME" as const;
    case "posicao":
    case "position":
      return "POSITION" as const;
    case "aporte":
    case "deposit":
      return "DEPOSIT" as const;
    case "resgate":
    case "withdrawal":
      return "WITHDRAWAL" as const;
    default:
      return "OTHER" as const;
  }
}

async function upsertPosition(input: {
  client: Prisma.TransactionClient;
  userId: string;
  assetId: string;
  platformId: string;
  movementType: ReturnType<typeof normalizeMovementType>;
  quantity: Prisma.Decimal;
  totalCents: number;
}) {
  const existing = await input.client.investmentPosition.findUnique({
    where: {
      userId_assetId_platformId: {
        userId: input.userId,
        assetId: input.assetId,
        platformId: input.platformId
      }
    }
  });

  if (input.movementType === "POSITION") {
    return input.client.investmentPosition.upsert({
      where: {
        userId_assetId_platformId: {
          userId: input.userId,
          assetId: input.assetId,
          platformId: input.platformId
        }
      },
      create: {
        userId: input.userId,
        assetId: input.assetId,
        platformId: input.platformId,
        quantity: input.quantity,
        investedCents: input.totalCents,
        averagePriceCents: input.quantity.toNumber() > 0 ? Math.round(input.totalCents / input.quantity.toNumber()) : 0
      },
      update: {
        quantity: input.quantity,
        investedCents: input.totalCents,
        averagePriceCents: input.quantity.toNumber() > 0 ? Math.round(input.totalCents / input.quantity.toNumber()) : 0
      }
    });
  }

  if (!["BUY", "SELL"].includes(input.movementType)) {
    return existing;
  }

  const currentQuantity = existing?.quantity ?? new Prisma.Decimal(0);
  const currentInvestedCents = existing?.investedCents ?? 0;
  const nextQuantity =
    input.movementType === "BUY" ? currentQuantity.plus(input.quantity) : currentQuantity.minus(input.quantity);
  const nextInvestedCents =
    input.movementType === "BUY" ? currentInvestedCents + input.totalCents : Math.max(0, currentInvestedCents - input.totalCents);

  return input.client.investmentPosition.upsert({
    where: {
      userId_assetId_platformId: {
        userId: input.userId,
        assetId: input.assetId,
        platformId: input.platformId
      }
    },
    create: {
      userId: input.userId,
      assetId: input.assetId,
      platformId: input.platformId,
      quantity: nextQuantity,
      investedCents: nextInvestedCents,
      averagePriceCents: nextQuantity.toNumber() > 0 ? Math.round(nextInvestedCents / nextQuantity.toNumber()) : 0
    },
    update: {
      quantity: nextQuantity,
      investedCents: nextInvestedCents,
      averagePriceCents: nextQuantity.toNumber() > 0 ? Math.round(nextInvestedCents / nextQuantity.toNumber()) : 0
    }
  });
}

export async function listInvestmentPortfolio(userId: string) {
  const [platforms, positions, movements, imports] = await Promise.all([
    prisma.investmentPlatform.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    }),
    prisma.investmentPosition.findMany({
      where: { userId },
      include: { asset: true, platform: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.investmentMovement.findMany({
      where: { userId },
      include: { asset: true, platform: true },
      orderBy: { occurredAt: "desc" },
      take: 20
    }),
    prisma.investmentImportBatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return { platforms, positions, movements, imports };
}

export async function confirmInvestmentImport(userId: string, input: InvestmentImportConfirmInput) {
  const preview = previewInvestmentImport(input);

  if (preview.status !== "READY_FOR_CONFIRMATION") {
    return {
      confirmed: false,
      preview,
      message: "A importacao ainda possui pendencias. Revise antes de confirmar."
    };
  }

  const hash = sourceHash(userId, input.content);

  const existing = await prisma.investmentImportBatch.findUnique({
    where: {
      userId_sourceHash: {
        userId,
        sourceHash: hash
      }
    }
  });

  if (existing) {
    return {
      confirmed: false,
      preview,
      message: "Este arquivo ja foi importado anteriormente."
    };
  }

  const result = await prisma.$transaction(async (client) => {
    const platform = await client.investmentPlatform.upsert({
      where: {
        userId_institution_name: {
          userId,
          institution: input.institution,
          name: input.institution
        }
      },
      create: {
        userId,
        institution: input.institution,
        name: input.institution
      },
      update: {
        active: true
      }
    });

    const batch = await client.investmentImportBatch.create({
      data: {
        userId,
        platformId: platform.id,
        institution: input.institution,
        fileType: input.fileType,
        status: "CONFIRMED",
        sourceHash: hash,
        summary: preview.summary,
        issues: preview.issues,
        importedRows: preview.rows,
        confirmedAt: new Date()
      }
    });

    let movementsCreated = 0;

    for (const row of preview.rows) {
      if (!row.ticker || !row.totalCents || !row.date) continue;

      const movementType = normalizeMovementType(row.movementType);
      const quantity = new Prisma.Decimal(row.quantity ?? 0);
      const asset = await client.investmentAsset.upsert({
        where: {
          userId_ticker: {
            userId,
            ticker: row.ticker
          }
        },
        create: {
          userId,
          ticker: row.ticker,
          name: row.ticker,
          assetType: row.assetType || "indefinido"
        },
        update: {
          assetType: row.assetType || "indefinido"
        }
      });

      await client.investmentMovement.create({
        data: {
          userId,
          assetId: asset.id,
          platformId: platform.id,
          importBatchId: batch.id,
          movementType,
          assetType: row.assetType,
          occurredAt: new Date(row.date),
          quantity,
          unitPriceCents: row.unitPriceCents ?? null,
          totalCents: row.totalCents,
          feesCents: row.feesCents ?? 0,
          notes: row.notes
        }
      });

      await upsertPosition({
        client,
        userId,
        assetId: asset.id,
        platformId: platform.id,
        movementType,
        quantity,
        totalCents: row.totalCents
      });
      movementsCreated += 1;
    }

    return {
      batch,
      movementsCreated
    };
  });

  return {
    confirmed: true,
    preview,
    importBatch: result.batch,
    movementsCreated: result.movementsCreated,
    message: "Importacao confirmada e carteira atualizada."
  };
}
