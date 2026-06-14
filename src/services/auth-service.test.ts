import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { env } from "../env.js";
import { AuthError, verifyAuthToken } from "./auth-service.js";

function signRawToken(payload: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", env.AUTH_JWT_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url");

  return `${header}.${encodedPayload}.${signature}`;
}

describe("verifyAuthToken", () => {
  it("rejects tokens with invalid shape", () => {
    expect(() => verifyAuthToken("invalid-token")).toThrow(AuthError);
  });

  it("rejects signed tokens with malformed payload", () => {
    expect(() => verifyAuthToken(signRawToken("not-json"))).toThrow(AuthError);
  });
});
