import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { createTransaction, deleteTransaction, listTransactions } from "../services/transaction-service.js";
import { transactionSchema } from "../validations/transaction.js";

export const transactionRouter = Router();

transactionRouter.use(requireUserContext);

transactionRouter.get("/", async (request, response, next) => {
  try {
    const transactions = await listTransactions(request.userContext!.id);
    response.json({ transactions });
  } catch (error) {
    next(error);
  }
});

transactionRouter.post("/", async (request, response, next) => {
  try {
    const parsed = transactionSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_transaction",
        issues: parsed.error.flatten()
      });
      return;
    }

    const transaction = await createTransaction(request.userContext!.id, parsed.data);
    response.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

transactionRouter.delete("/:transactionId", async (request, response, next) => {
  try {
    const deleted = await deleteTransaction(request.userContext!.id, request.params.transactionId);

    if (!deleted) {
      response.status(404).json({
        error: "transaction_not_found",
        message: "Gasto nao encontrado."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
