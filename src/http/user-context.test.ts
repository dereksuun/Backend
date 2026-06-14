import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireUserContext } from "./user-context.js";

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };

  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("requireUserContext", () => {
  it("requires a Bearer token and ignores legacy user headers", async () => {
    const request = {
      header: vi.fn((name: string) => {
        const headers: Record<string, string> = {
          "x-user-id": "someone@example.com",
          "x-user-email": "someone@example.com",
          "x-user-name": "Someone"
        };

        return headers[name.toLowerCase()];
      })
    } as unknown as Request;
    const response = createResponse();
    const next = vi.fn() as NextFunction;

    await requireUserContext(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: "missing_token",
      message: "Informe um Bearer token para acessar dados financeiros."
    });
    expect(next).not.toHaveBeenCalled();
  });
});
