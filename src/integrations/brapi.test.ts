import { describe, expect, it } from "vitest";
import { buildBrapiHeaders, buildBrapiQuoteUrl, mapBrapiQuoteToSnapshot, normalizeAssetTicker } from "./brapi.js";

describe("brapi integration helpers", () => {
  it("normalizes asset tickers before calling public market data APIs", () => {
    expect(normalizeAssetTicker(" petr4 ")).toBe("PETR4");
    expect(normalizeAssetTicker("petr4.sa")).toBe("PETR4");
    expect(normalizeAssetTicker("aapl")).toBe("AAPL");
  });

  it("builds the official v2 quote URL and keeps optional tokens in headers", () => {
    expect(buildBrapiQuoteUrl("petr4").toString()).toBe("https://brapi.dev/api/v2/stocks/quote?symbols=PETR4");
    expect(buildBrapiHeaders()).toEqual({ accept: "application/json" });
    expect(buildBrapiHeaders("free-token")).toEqual({
      accept: "application/json",
      Authorization: "Bearer free-token"
    });
  });

  it("maps quote payloads to the Derycash investment snapshot format", () => {
    const snapshot = mapBrapiQuoteToSnapshot({
      symbol: "PETR4",
      longName: "Petroleo Brasileiro SA Pfd",
      currency: "BRL",
      regularMarketPrice: 38.14,
      regularMarketChangePercent: 0.21,
      regularMarketTime: "2026-06-29T21:31:30.000Z",
      regularMarketVolume: 14924800,
      marketCap: 516581124106,
      priceEarnings: 4.569251596362809,
      earningsPerShare: 8.347058
    });

    expect(snapshot.ticker).toBe("PETR4");
    expect(snapshot.name).toBe("Petroleo Brasileiro SA Pfd");
    expect(snapshot.currency).toBe("BRL");
    expect(snapshot.marketData).toMatchObject({
      price: 38.14,
      dailyChangePercent: 0.21,
      volume: 14924800,
      marketCap: 516581124106,
      updatedAt: "2026-06-29T21:31:30.000Z",
      source: "brapi"
    });
    expect(snapshot.fundamentals).toMatchObject({
      pl: 4.569251596362809,
      earningsPerShare: 8.347058,
      source: "brapi"
    });
  });
});
