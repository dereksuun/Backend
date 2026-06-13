import { describe, expect, it } from "vitest";
import { previewInvestmentImport } from "./investment-import-service.js";

describe("previewInvestmentImport", () => {
  it("builds a reviewable preview for the standard Derycash CSV", () => {
    const preview = previewInvestmentImport({
      institution: "XP",
      fileType: "CSV",
      saveOriginalFile: false,
      content: [
        "data,instituicao,tipo_movimentacao,tipo_ativo,ticker,nome_ativo,quantidade,preco_unitario,valor_total,taxas,observacao",
        "2026-06-11,XP,compra,acao,PETR4,Petrobras PN,10,38.50,385.00,1.20,Compra manual"
      ].join("\n")
    });

    expect(preview.status).toBe("READY_FOR_CONFIRMATION");
    expect(preview.summary.operations).toBe(1);
    expect(preview.summary.assets).toBe(1);
    expect(preview.rows[0]?.ticker).toBe("PETR4");
    expect(preview.nextStep).toBe("user_confirmation_required");
  });

  it("requires manual mapping for planned non-CSV formats", () => {
    const preview = previewInvestmentImport({
      institution: "B3",
      fileType: "PDF",
      saveOriginalFile: false,
      content: "conteudo do documento"
    });

    expect(preview.status).toBe("NEEDS_MANUAL_MAPPING");
    expect(preview.summary.reviewItems).toBe(1);
  });
});
