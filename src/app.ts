import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env.js";
import { creditCardPurchaseRouter } from "./routes/credit-card-purchase-routes.js";
import { creditCardRouter } from "./routes/credit-card-routes.js";
import { dashboardSummaryRouter } from "./routes/dashboard-summary-routes.js";
import { financialProfileRouter } from "./routes/financial-profile-routes.js";
import { goalRouter } from "./routes/goal-routes.js";
import { investmentRouter } from "./routes/investment-routes.js";
import { recurringExpenseRouter } from "./routes/recurring-expense-routes.js";
import { simulatorRouter } from "./routes/simulator-routes.js";
import { transactionRouter } from "./routes/transaction-routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "derycash-backend"
    });
  });

  app.use("/api/financial-profile", financialProfileRouter);
  app.use("/api/recurring-expenses", recurringExpenseRouter);
  app.use("/api/credit-cards", creditCardRouter);
  app.use("/api/credit-card-purchases", creditCardPurchaseRouter);
  app.use("/api/dashboard/summary", dashboardSummaryRouter);
  app.use("/api/transactions", transactionRouter);
  app.use("/api/goals", goalRouter);
  app.use("/api/simulator", simulatorRouter);
  app.use("/api/investments", investmentRouter);

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction
    ) => {
      void _next;
      console.error(error);
      response.status(500).json({
        error: "internal_server_error",
        message: "Nao foi possivel concluir a operacao."
      });
    }
  );

  return app;
}
