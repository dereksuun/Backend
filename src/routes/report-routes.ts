import { Router } from "express";
import { requireUserContext } from "../http/user-context.js";
import { renderFinancialReportPdf } from "../services/report-pdf-service.js";
import { getFinancialReport, type ReportPeriodInput } from "../services/report-service.js";

export const reportRouter = Router();

reportRouter.use(requireUserContext);

function parseReportPeriod(query: Record<string, unknown>): ReportPeriodInput {
  const period = query.period === "month" ? "month" : "year";
  const year = typeof query.year === "string" ? Number.parseInt(query.year, 10) : undefined;
  const month = typeof query.month === "string" ? Number.parseInt(query.month, 10) : undefined;

  return {
    period,
    year: Number.isFinite(year) ? year : undefined,
    month: Number.isFinite(month) ? month : undefined
  };
}

reportRouter.get("/financial", async (request, response, next) => {
  try {
    const report = await getFinancialReport(request.userContext!.id, parseReportPeriod(request.query));
    response.json({ report });
  } catch (error) {
    next(error);
  }
});

reportRouter.get("/financial.pdf", async (request, response, next) => {
  try {
    const report = await getFinancialReport(request.userContext!.id, parseReportPeriod(request.query));
    const pdf = renderFinancialReportPdf(report);
    const filename = `derycash-relatorio-${report.period.label.toLowerCase().replace(/\s+/g, "-")}.pdf`;

    response.setHeader("content-type", "application/pdf");
    response.setHeader("content-disposition", `attachment; filename="${filename}"`);
    response.send(pdf);
  } catch (error) {
    next(error);
  }
});
