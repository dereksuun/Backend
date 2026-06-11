import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { getMonthlyTimeline } from "../services/monthly-timeline-service.js";

export const dashboardTimelineRouter = Router();

dashboardTimelineRouter.use(requireUserContext);

dashboardTimelineRouter.get("/", async (request, response, next) => {
  try {
    const timeline = await getMonthlyTimeline(request.userContext!.id);
    response.json(timeline);
  } catch (error) {
    next(error);
  }
});
