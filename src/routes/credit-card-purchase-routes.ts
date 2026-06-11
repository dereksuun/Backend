import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import {
  createCreditCardPurchase,
  deleteCreditCardPurchase,
  listCreditCardPurchases
} from "../services/credit-card-purchase-service.js";
import { creditCardPurchaseSchema } from "../validations/credit-card-purchase.js";

export const creditCardPurchaseRouter = Router();

creditCardPurchaseRouter.use(requireUserContext);

creditCardPurchaseRouter.get("/", async (request, response, next) => {
  try {
    const purchases = await listCreditCardPurchases(request.userContext!.id);
    response.json({ purchases });
  } catch (error) {
    next(error);
  }
});

creditCardPurchaseRouter.post("/", async (request, response, next) => {
  try {
    const parsed = creditCardPurchaseSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_credit_card_purchase",
        issues: parsed.error.flatten()
      });
      return;
    }

    const purchase = await createCreditCardPurchase(request.userContext!.id, parsed.data);

    if (!purchase) {
      response.status(404).json({
        error: "credit_card_not_found",
        message: "Cartao nao encontrado."
      });
      return;
    }

    response.status(201).json({ purchase });
  } catch (error) {
    next(error);
  }
});

creditCardPurchaseRouter.delete("/:purchaseId", async (request, response, next) => {
  try {
    const deleted = await deleteCreditCardPurchase(request.userContext!.id, request.params.purchaseId);

    if (!deleted) {
      response.status(404).json({
        error: "credit_card_purchase_not_found",
        message: "Compra nao encontrada."
      });
      return;
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
