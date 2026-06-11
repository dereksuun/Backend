import { Router } from "express";
import { z } from "zod";
import { requireUserContext } from "../http/user-context.js";
import {
  listCreditCardInvoices,
  markInstallmentAsPaid,
  markInvoiceAsPaid
} from "../services/credit-card-invoice-service.js";

const payInvoiceSchema = z.object({
  creditCardId: z.string().min(1),
  invoiceMonth: z.union([z.string().datetime(), z.string().date()]).transform((value) => new Date(value))
});

export const creditCardInvoiceRouter = Router();

creditCardInvoiceRouter.use(requireUserContext);

creditCardInvoiceRouter.get("/", async (request, response, next) => {
  try {
    const invoices = await listCreditCardInvoices(request.userContext!.id);
    response.json({ invoices });
  } catch (error) {
    next(error);
  }
});

creditCardInvoiceRouter.post("/installments/:installmentId/pay", async (request, response, next) => {
  try {
    const installment = await markInstallmentAsPaid(request.userContext!.id, request.params.installmentId);

    if (!installment) {
      response.status(404).json({
        error: "installment_not_found",
        message: "Parcela nao encontrada."
      });
      return;
    }

    response.json({ installment });
  } catch (error) {
    next(error);
  }
});

creditCardInvoiceRouter.post("/pay", async (request, response, next) => {
  try {
    const parsed = payInvoiceSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_invoice_payment",
        issues: parsed.error.flatten()
      });
      return;
    }

    const paidInstallments = await markInvoiceAsPaid(
      request.userContext!.id,
      parsed.data.creditCardId,
      parsed.data.invoiceMonth
    );

    response.json({ paidInstallments });
  } catch (error) {
    next(error);
  }
});
