export type InvestmentNewsItem = {
  title: string;
  source?: string;
  publishedAt?: string;
  url?: string;
};

type GdeltArticle = {
  title?: string;
  url?: string;
  domain?: string;
  seendate?: string;
};

type GdeltArticlesResponse = {
  articles?: GdeltArticle[];
};

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

const tickerAliases: Record<string, string> = {
  ABEV3: "Ambev",
  BBAS3: "Banco do Brasil",
  BBDC3: "Bradesco",
  BBDC4: "Bradesco",
  BOVA11: "Ibovespa",
  ITSA4: "Itausa",
  ITUB3: "Itau",
  ITUB4: "Itau",
  MGLU3: "Magazine Luiza",
  PETR3: "Petrobras",
  PETR4: "Petrobras",
  VALE3: "Vale",
  WEGE3: "WEG"
};

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/\.SA$/i, "").replace(/\s+/g, "");
}

function parseGdeltSeenDate(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);

  if (!match) return undefined;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  ).toISOString();
}

function quoted(value: string) {
  return `"${value.replace(/"/g, "")}"`;
}

export function buildGdeltNewsQuery(ticker: string, assetName?: string) {
  const normalizedTicker = normalizeTicker(ticker);
  const alias = assetName?.trim() || tickerAliases[normalizedTicker];

  if (!alias) return normalizedTicker;

  return `${normalizedTicker} OR ${quoted(alias)}`;
}

export function buildGdeltNewsUrl(ticker: string, assetName?: string) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", buildGdeltNewsQuery(ticker, assetName));
  url.searchParams.set("mode", "ArtList");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "8");
  url.searchParams.set("sort", "HybridRel");
  return url;
}

export function mapGdeltArticlesToInvestmentNews(payload: GdeltArticlesResponse, limit = 8): InvestmentNewsItem[] {
  return (payload.articles ?? [])
    .filter((article) => article.title?.trim())
    .slice(0, limit)
    .map((article) => ({
      title: article.title!.trim(),
      source: article.domain,
      publishedAt: parseGdeltSeenDate(article.seendate),
      url: article.url
    }));
}

export async function fetchGdeltInvestmentNews(input: {
  ticker: string;
  assetName?: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}) {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(buildGdeltNewsUrl(input.ticker, input.assetName), {
    headers: {
      accept: "application/json"
    },
    signal: AbortSignal.timeout(input.timeoutMs ?? 8000)
  });

  if (!response.ok) {
    throw new Error(`gdelt_news_failed:${response.status}`);
  }

  return mapGdeltArticlesToInvestmentNews((await response.json()) as GdeltArticlesResponse);
}
