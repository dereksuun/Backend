import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
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
