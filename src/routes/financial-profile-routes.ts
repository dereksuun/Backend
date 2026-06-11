import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { getFinancialProfile, upsertFinancialProfile } from "../services/financial-profile-service.js";
import { financialProfileSchema } from "../validations/financial-profile.js";

export const financialProfileRouter = Router();

financialProfileRouter.use(requireUserContext);

financialProfileRouter.get("/", async (request, response, next) => {
  try {
    const profile = await getFinancialProfile(request.userContext!.id);
    response.json({ profile });
  } catch (error) {
    next(error);
  }
});

financialProfileRouter.put("/", async (request, response, next) => {
  try {
    const parsed = financialProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_financial_profile",
        issues: parsed.error.flatten()
      });
      return;
    }

    const profile = await upsertFinancialProfile(request.userContext!, parsed.data);
    response.json({ profile });
  } catch (error) {
    next(error);
  }
});
