import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  listRecurringExpenses,
  markRecurringExpenseAsPaid,
  updateRecurringExpense
} from "../services/recurring-expense-service.js";
import {
  payRecurringExpenseSchema,
  recurringExpenseSchema,
  updateRecurringExpenseSchema
} from "../validations/recurring-expense.js";

export const recurringExpenseRouter = Router();

recurringExpenseRouter.use(requireUserContext);

recurringExpenseRouter.get("/", async (request, response, next) => {
  try {
    const expenses = await listRecurringExpenses(request.userContext!.id);
    response.json({ expenses });
  } catch (error) {
    next(error);
  }
});

recurringExpenseRouter.post("/", async (request, response, next) => {
  try {
    const parsed = recurringExpenseSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_recurring_expense",
        issues: parsed.error.flatten()
      });
      return;
    }

    const expense = await createRecurringExpense(request.userContext!.id, parsed.data);
    response.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

recurringExpenseRouter.put("/:expenseId", async (request, response, next) => {
  try {
    const parsed = updateRecurringExpenseSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_recurring_expense",
        issues: parsed.error.flatten()
      });
      return;
    }

    const expense = await updateRecurringExpense(request.userContext!.id, request.params.expenseId, parsed.data);

    if (!expense) {
      response.status(404).json({
        error: "recurring_expense_not_found",
        message: "Conta recorrente nao encontrada."
      });
      return;
    }

    response.json({ expense });
  } catch (error) {
    next(error);
  }
});

recurringExpenseRouter.delete("/:expenseId", async (request, response, next) => {
  try {
    const deleted = await deleteRecurringExpense(request.userContext!.id, request.params.expenseId);

    if (!deleted) {
      response.status(404).json({
        error: "recurring_expense_not_found",
        message: "Conta recorrente nao encontrada."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

recurringExpenseRouter.post("/:expenseId/pay", async (request, response, next) => {
  try {
    const parsed = payRecurringExpenseSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_monthly_expense",
        issues: parsed.error.flatten()
      });
      return;
    }

    const monthlyExpense = await markRecurringExpenseAsPaid(
      request.userContext!.id,
      request.params.expenseId,
      parsed.data
    );

    if (!monthlyExpense) {
      response.status(404).json({
        error: "recurring_expense_not_found",
        message: "Conta recorrente nao encontrada."
      });
      return;
    }

    response.json({ monthlyExpense });
  } catch (error) {
    next(error);
  }
});
