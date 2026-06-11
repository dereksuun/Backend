import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { env } from "../env.js";
import { listMarketIndicators, updateMarketIndicators } from "../services/market-indicator-service.js";

export const marketDataRouter = Router();
export const marketDataCronRouter = Router();

marketDataRouter.use(requireUserContext);

marketDataRouter.get("/", async (_request, response, next) => {
  try {
    const indicators = await listMarketIndicators();
    response.json({ indicators });
  } catch (error) {
    next(error);
  }
});

marketDataCronRouter.post("/update-market-data", async (request, response, next) => {
  try {
    const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");

    if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
      response.status(401).json({
        error: "invalid_cron_secret",
        message: "Cron nao autorizado."
      });
      return;
    }

    const indicators = await updateMarketIndicators();
    response.json({
      updated: indicators.length,
      indicators
    });
  } catch (error) {
    next(error);
  }
});
