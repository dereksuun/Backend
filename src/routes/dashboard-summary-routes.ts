import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { getDashboardInsight } from "../services/dashboard-insight-service.js";
import { getDashboardSummary } from "../services/dashboard-summary-service.js";

export const dashboardSummaryRouter = Router();

dashboardSummaryRouter.use(requireUserContext);

dashboardSummaryRouter.get("/", async (request, response, next) => {
  try {
    const summary = await getDashboardSummary(request.userContext!.id);
    response.json(summary);
  } catch (error) {
    next(error);
  }
});

dashboardSummaryRouter.get("/insight", async (request, response, next) => {
  try {
    const insight = await getDashboardInsight(request.userContext!.id);
    response.json(insight);
  } catch (error) {
    next(error);
  }
});
