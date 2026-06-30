import { describe, expect, it } from "vitest";
import { buildGdeltNewsQuery, mapGdeltArticlesToInvestmentNews } from "./gdelt-news.js";

describe("GDELT news integration helpers", () => {
  it("builds a query with ticker and known company alias", () => {
    expect(buildGdeltNewsQuery("PETR4")).toBe('PETR4 OR "Petrobras"');
    expect(buildGdeltNewsQuery("ABCD3", "Companhia Teste")).toBe('ABCD3 OR "Companhia Teste"');
    expect(buildGdeltNewsQuery("AAPL")).toBe("AAPL");
  });

  it("maps GDELT article payloads to news items accepted by investment analysis", () => {
    const news = mapGdeltArticlesToInvestmentNews({
      articles: [
        {
          title: "Petrobras anuncia novo plano de investimentos",
          url: "https://example.com/petrobras-plano",
          domain: "example.com",
          seendate: "20260629T213000Z"
        },
        {
          title: "",
          url: "https://example.com/sem-titulo",
          domain: "example.com",
          seendate: "20260629T213500Z"
        },
        {
          title: "Mercado reage a petroleo",
          url: "https://news.example.com/mercado",
          domain: "news.example.com"
        }
      ]
    });

    expect(news).toEqual([
      {
        title: "Petrobras anuncia novo plano de investimentos",
        source: "example.com",
        publishedAt: "2026-06-29T21:30:00.000Z",
        url: "https://example.com/petrobras-plano"
      },
      {
        title: "Mercado reage a petroleo",
        source: "news.example.com",
        publishedAt: undefined,
        url: "https://news.example.com/mercado"
      }
    ]);
  });
});
