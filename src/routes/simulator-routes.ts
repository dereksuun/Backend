import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { simulateCanIBuy } from "../services/can-i-buy-service.js";
import { canIBuySchema } from "../validations/can-i-buy.js";

export const simulatorRouter = Router();

simulatorRouter.use(requireUserContext);

simulatorRouter.post("/can-i-buy", async (request, response, next) => {
  try {
    const parsed = canIBuySchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_simulation",
        issues: parsed.error.flatten()
      });
      return;
    }

    const simulation = await simulateCanIBuy(request.userContext!.id, parsed.data);
    response.json(simulation);
  } catch (error) {
    next(error);
  }
});
