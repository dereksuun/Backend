import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { simulateInvestment } from "../services/investment-simulation-service.js";
import { investmentSimulationSchema } from "../validations/investment-simulation.js";

export const investmentRouter = Router();

investmentRouter.use(requireUserContext);

investmentRouter.post("/simulate", (request, response) => {
  const parsed = investmentSimulationSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "invalid_investment_simulation",
      issues: parsed.error.flatten()
    });
    return;
  }

  response.json({
    simulation: simulateInvestment(parsed.data)
  });
});
