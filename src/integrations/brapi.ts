export type InvestmentMarketDataSnapshot = {
  price?: number;
  dailyChangePercent?: number;
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  marketCap?: number;
  updatedAt?: string;
  source: "brapi";
};

export type InvestmentFundamentalsSnapshot = {
  dividendYield?: number;
  pl?: number;
  roe?: number;
  earningsPerShare?: number;
  source: "brapi";
};

export type BrapiQuoteSnapshot = {
  ticker: string;
  name?: string;
  currency?: string;
  marketData: InvestmentMarketDataSnapshot;
  fundamentals: InvestmentFundamentalsSnapshot;
};

export type BrapiQuotePayload = {
  symbol: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: string;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  marketCap?: number;
  priceEarnings?: number;
  earningsPerShare?: number;
  dividendYield?: number;
  returnOnEquity?: number;
};

type BrapiQuoteResult = BrapiQuotePayload | { symbol?: string; requestedSymbol?: string; data?: BrapiQuotePayload };

type BrapiQuoteResponse = {
  results?: BrapiQuoteResult[];
};

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

function finiteNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeAssetTicker(ticker: string) {
  return ticker.trim().toUpperCase().replace(/\.SA$/i, "").replace(/\s+/g, "");
}

export function buildBrapiQuoteUrl(ticker: string) {
  const url = new URL("https://brapi.dev/api/v2/stocks/quote");
  url.searchParams.set("symbols", normalizeAssetTicker(ticker));

  return url;
}

export function buildBrapiHeaders(token?: string) {
  return {
    accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export function mapBrapiQuoteToSnapshot(quote: BrapiQuotePayload): BrapiQuoteSnapshot {
  return {
    ticker: normalizeAssetTicker(quote.symbol),
    name: quote.longName ?? quote.shortName,
    currency: quote.currency,
    marketData: {
      price: finiteNumber(quote.regularMarketPrice),
      dailyChangePercent: finiteNumber(quote.regularMarketChangePercent),
      previousClose: finiteNumber(quote.regularMarketPreviousClose),
      open: finiteNumber(quote.regularMarketOpen),
      high: finiteNumber(quote.regularMarketDayHigh),
      low: finiteNumber(quote.regularMarketDayLow),
      volume: finiteNumber(quote.regularMarketVolume),
      marketCap: finiteNumber(quote.marketCap),
      updatedAt: quote.regularMarketTime,
      source: "brapi"
    },
    fundamentals: {
      dividendYield: finiteNumber(quote.dividendYield),
      pl: finiteNumber(quote.priceEarnings),
      roe: finiteNumber(quote.returnOnEquity),
      earningsPerShare: finiteNumber(quote.earningsPerShare),
      source: "brapi"
    }
  };
}

export async function fetchBrapiQuoteSnapshot(input: {
  ticker: string;
  token?: string;
  fetcher?: Fetcher;
  timeoutMs?: number;
}) {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(buildBrapiQuoteUrl(input.ticker), {
    headers: buildBrapiHeaders(input.token),
    signal: AbortSignal.timeout(input.timeoutMs ?? 8000)
  });

  if (!response.ok) {
    throw new Error(`brapi_quote_failed:${response.status}`);
  }

  const data = (await response.json()) as BrapiQuoteResponse;
  const result = data.results?.[0];
  const quote =
    result && "data" in result && result.data
      ? { ...result.data, symbol: result.symbol ?? result.requestedSymbol ?? result.data.symbol ?? input.ticker }
      : result;

  if (!quote) {
    throw new Error("brapi_quote_empty");
  }

  return mapBrapiQuoteToSnapshot(quote as BrapiQuotePayload);
}
