import { prisma } from "../lib/prisma.js";
import { bcbSgsIndicators, fetchBcbSgsIndicator } from "../integrations/bcb-sgs.js";

export async function listMarketIndicators() {
  return prisma.marketIndicator.findMany({
    orderBy: { code: "asc" }
  });
}

export async function updateMarketIndicators() {
  const fetchedIndicators = await Promise.all(bcbSgsIndicators.map(fetchBcbSgsIndicator));

  const indicators = await Promise.all(
    fetchedIndicators.map((indicator) =>
      prisma.marketIndicator.upsert({
        where: { code: indicator.code },
        create: indicator,
        update: {
          name: indicator.name,
          value: indicator.value,
          referenceAt: indicator.referenceAt,
          source: indicator.source
        }
      })
    )
  );

  return indicators;
}
