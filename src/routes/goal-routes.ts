import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { addGoalContribution, createGoal, deleteGoal, listGoals, updateGoal } from "../services/goal-service.js";
import { goalContributionSchema, goalSchema, updateGoalSchema } from "../validations/goal.js";

export const goalRouter = Router();

goalRouter.use(requireUserContext);

goalRouter.get("/", async (request, response, next) => {
  try {
    const goals = await listGoals(request.userContext!.id);
    response.json({ goals });
  } catch (error) {
    next(error);
  }
});

goalRouter.post("/", async (request, response, next) => {
  try {
    const parsed = goalSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_goal",
        issues: parsed.error.flatten()
      });
      return;
    }

    const goal = await createGoal(request.userContext!.id, parsed.data);
    response.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
});

goalRouter.put("/:goalId", async (request, response, next) => {
  try {
    const parsed = updateGoalSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_goal",
        issues: parsed.error.flatten()
      });
      return;
    }

    const goal = await updateGoal(request.userContext!.id, request.params.goalId, parsed.data);

    if (!goal) {
      response.status(404).json({
        error: "goal_not_found",
        message: "Meta nao encontrada."
      });
      return;
    }

    response.json({ goal });
  } catch (error) {
    next(error);
  }
});

goalRouter.delete("/:goalId", async (request, response, next) => {
  try {
    const deleted = await deleteGoal(request.userContext!.id, request.params.goalId);

    if (!deleted) {
      response.status(404).json({
        error: "goal_not_found",
        message: "Meta nao encontrada."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

goalRouter.post("/:goalId/contributions", async (request, response, next) => {
  try {
    const parsed = goalContributionSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_goal_contribution",
        issues: parsed.error.flatten()
      });
      return;
    }

    const result = await addGoalContribution(request.userContext!.id, request.params.goalId, parsed.data);

    if (!result) {
      response.status(404).json({
        error: "goal_not_found",
        message: "Meta nao encontrada."
      });
      return;
    }

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
