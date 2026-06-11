import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env.js";
import { financialProfileRouter } from "./routes/financial-profile-routes.js";

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
