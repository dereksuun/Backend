import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { createIncome, deleteIncome, listIncomes } from "../services/income-service.js";
import { incomeSchema } from "../validations/income.js";

export const incomeRouter = Router();

incomeRouter.use(requireUserContext);

incomeRouter.get("/", async (request, response, next) => {
  try {
    const incomes = await listIncomes(request.userContext!.id);
    response.json({ incomes });
  } catch (error) {
    next(error);
  }
});

incomeRouter.post("/", async (request, response, next) => {
  try {
    const parsed = incomeSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_income",
        issues: parsed.error.flatten()
      });
      return;
    }

    const income = await createIncome(request.userContext!.id, parsed.data);
    response.status(201).json({ income });
  } catch (error) {
    next(error);
  }
});

incomeRouter.delete("/:incomeId", async (request, response, next) => {
  try {
    const deleted = await deleteIncome(request.userContext!.id, request.params.incomeId);

    if (!deleted) {
      response.status(404).json({
        error: "income_not_found",
        message: "Renda nao encontrada."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
