import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { analyzeInvestmentWithCache } from "../ai/services/investment-intelligence-service.js";
import { calculateInvestmentIndexes } from "../investments/calculators/investment-indexes.js";
import { previewInvestmentImport, standardInvestmentCsvTemplate } from "../investments/importers/investment-import-service.js";
import {
  confirmInvestmentImport,
  createManualInvestmentMovement,
  listInvestmentPortfolio
} from "../investments/services/investment-portfolio-service.js";
import { simulateInvestment } from "../services/investment-simulation-service.js";
import { investmentAnalysisRequestSchema } from "../validations/investment-analysis.js";
import { investmentImportConfirmSchema, investmentImportPreviewSchema } from "../validations/investment-import.js";
import { manualInvestmentMovementSchema } from "../validations/investment-movement.js";
import { investmentSimulationSchema } from "../validations/investment-simulation.js";

export const investmentRouter = Router();

investmentRouter.get("/imports/template.csv", (_request, response) => {
  response.header("content-type", "text/csv; charset=utf-8");
  response.header("content-disposition", 'attachment; filename="derycash-investimentos-template.csv"');
  response.send(standardInvestmentCsvTemplate);
});

investmentRouter.use(requireUserContext);

investmentRouter.get("/portfolio", async (request, response, next) => {
  try {
    const portfolio = await listInvestmentPortfolio(request.userContext!.id);
    response.json(portfolio);
  } catch (error) {
    next(error);
  }
});

investmentRouter.post("/simulate", (request, response) => {
  const parsed = investmentSimulationSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "invalid_investment_simulation",
      issues: parsed.error.flatten()
    });
    return;
  }

  response.json({
    simulation: simulateInvestment(parsed.data)
  });
});

investmentRouter.post("/analyze-asset", async (request, response, next) => {
  try {
    const parsed = investmentAnalysisRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_investment_analysis",
        issues: parsed.error.flatten()
      });
      return;
    }

    const result = await analyzeInvestmentWithCache(request.userContext!.id, parsed.data);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

investmentRouter.post("/indexes", (request, response) => {
  const parsed = investmentAnalysisRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "invalid_investment_indexes",
      issues: parsed.error.flatten()
    });
    return;
  }

  response.json({
    indexes: calculateInvestmentIndexes(parsed.data)
  });
});

investmentRouter.post("/imports/preview", (request, response) => {
  const parsed = investmentImportPreviewSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: "invalid_investment_import_preview",
      issues: parsed.error.flatten()
    });
    return;
  }

  response.json({
    preview: previewInvestmentImport(parsed.data)
  });
});

investmentRouter.post("/imports/confirm", async (request, response, next) => {
  try {
    const parsed = investmentImportConfirmSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_investment_import_confirmation",
        issues: parsed.error.flatten()
      });
      return;
    }

    const result = await confirmInvestmentImport(request.userContext!.id, parsed.data);
    response.status(result.confirmed ? 201 : 409).json(result);
  } catch (error) {
    next(error);
  }
});

investmentRouter.post("/movements", async (request, response, next) => {
  try {
    const parsed = manualInvestmentMovementSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_investment_movement",
        issues: parsed.error.flatten()
      });
      return;
    }

    const movement = await createManualInvestmentMovement(request.userContext!.id, parsed.data);
    response.status(201).json({ movement });
  } catch (error) {
    next(error);
  }
});
