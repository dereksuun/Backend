import { env } from "../../env.js";
import {
  fetchBrapiQuoteSnapshot,
  normalizeAssetTicker,
  type InvestmentFundamentalsSnapshot,
  type InvestmentMarketDataSnapshot
} from "../../integrations/brapi.js";
import { fetchGdeltInvestmentNews, type InvestmentNewsItem } from "../../integrations/gdelt-news.js";

export type InvestmentMarketSnapshot = {
  requestedTicker: string;
  ticker: string;
  name?: string;
  currency?: string;
  fetchedAt: string;
  marketData?: InvestmentMarketDataSnapshot;
  fundamentals?: InvestmentFundamentalsSnapshot;
  news: InvestmentNewsItem[];
  sources: Array<{
    name: "brapi" | "GDELT";
    kind: "quote" | "news";
    status: "ok" | "unavailable";
  }>;
  warnings: string[];
};

function warningForSource(source: "brapi" | "GDELT", error: unknown) {
  const message = error instanceof Error ? error.message : "unknown_error";

  if (source === "brapi") {
    return `A brapi nao retornou cotacao para este ativo (${message}).`;
  }

  return `O GDELT nao retornou noticias agora (${message}).`;
}

export async function getInvestmentMarketSnapshot(ticker: string): Promise<InvestmentMarketSnapshot> {
  const requestedTicker = normalizeAssetTicker(ticker);
  const fetchedAt = new Date().toISOString();
  const sources: InvestmentMarketSnapshot["sources"] = [];
  const warnings: string[] = [];

  let quoteSnapshot:
    | Awaited<ReturnType<typeof fetchBrapiQuoteSnapshot>>
    | null = null;

  try {
    quoteSnapshot = await fetchBrapiQuoteSnapshot({
      ticker: requestedTicker,
      token: env.BRAPI_TOKEN
    });
    sources.push({ name: "brapi", kind: "quote", status: "ok" });
  } catch (error) {
    sources.push({ name: "brapi", kind: "quote", status: "unavailable" });
    warnings.push(warningForSource("brapi", error));
  }

  let news: InvestmentNewsItem[] = [];

  try {
    news = await fetchGdeltInvestmentNews({
      ticker: requestedTicker,
      assetName: quoteSnapshot?.name
    });
    sources.push({ name: "GDELT", kind: "news", status: "ok" });
  } catch (error) {
    sources.push({ name: "GDELT", kind: "news", status: "unavailable" });
    warnings.push(warningForSource("GDELT", error));
  }

  if (!env.BRAPI_TOKEN) {
    warnings.push("Sem BRAPI_TOKEN, a brapi pode limitar ativos fora do modo publico de demonstracao.");
  }

  return {
    requestedTicker,
    ticker: quoteSnapshot?.ticker ?? requestedTicker,
    name: quoteSnapshot?.name,
    currency: quoteSnapshot?.currency,
    fetchedAt,
    marketData: quoteSnapshot?.marketData,
    fundamentals: quoteSnapshot?.fundamentals,
    news,
    sources,
    warnings
  };
}
