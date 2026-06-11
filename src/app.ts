import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./env.js";

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
      service: "bufunfometro-backend"
    });
  });

  return app;
}
