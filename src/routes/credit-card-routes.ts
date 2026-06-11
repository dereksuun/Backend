import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import {
  createCreditCard,
  deleteCreditCard,
  listCreditCards,
  updateCreditCard
} from "../services/credit-card-service.js";
import { creditCardSchema, updateCreditCardSchema } from "../validations/credit-card.js";

export const creditCardRouter = Router();

creditCardRouter.use(requireUserContext);

creditCardRouter.get("/", async (request, response, next) => {
  try {
    const cards = await listCreditCards(request.userContext!.id);
    response.json({ cards });
  } catch (error) {
    next(error);
  }
});

creditCardRouter.post("/", async (request, response, next) => {
  try {
    const parsed = creditCardSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_credit_card",
        issues: parsed.error.flatten()
      });
      return;
    }

    const card = await createCreditCard(request.userContext!.id, parsed.data);
    response.status(201).json({ card });
  } catch (error) {
    next(error);
  }
});

creditCardRouter.put("/:cardId", async (request, response, next) => {
  try {
    const parsed = updateCreditCardSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_credit_card",
        issues: parsed.error.flatten()
      });
      return;
    }

    const card = await updateCreditCard(request.userContext!.id, request.params.cardId, parsed.data);

    if (!card) {
      response.status(404).json({
        error: "credit_card_not_found",
        message: "Cartao nao encontrado."
      });
      return;
    }

    response.json({ card });
  } catch (error) {
    next(error);
  }
});

creditCardRouter.delete("/:cardId", async (request, response, next) => {
  try {
    const deleted = await deleteCreditCard(request.userContext!.id, request.params.cardId);

    if (!deleted) {
      response.status(404).json({
        error: "credit_card_not_found",
        message: "Cartao nao encontrado."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
