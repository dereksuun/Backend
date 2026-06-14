import { Router } from "express";
import {
  AuthError,
  changePassword,
  getUserFromToken,
  loginWithGithub,
  loginWithGoogle,
  loginWithPassword,
  registerWithPassword
} from "../services/auth-service.js";
import {
  githubAuthSchema,
  googleAuthSchema,
  changePasswordSchema,
  loginSchema,
  registerSchema
} from "../validations/auth.js";

export const authRouter = Router();

function handleAuthError(error: unknown, response: import("express").Response) {
  if (error instanceof AuthError) {
    response.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return true;
  }

  return false;
}

authRouter.post("/register", async (request, response, next) => {
  try {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_register",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.status(201).json(await registerWithPassword(parsed.data));
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_login",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.json(await loginWithPassword(parsed.data));
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});

authRouter.post("/change-password", async (request, response, next) => {
  try {
    const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
      response.status(401).json({
        error: "missing_token",
        message: "Informe o token de autenticacao."
      });
      return;
    }

    const parsed = changePasswordSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_password_change",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.json(await changePassword({ token, ...parsed.data }));
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});

authRouter.post("/google", async (request, response, next) => {
  try {
    const parsed = googleAuthSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_google_login",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.json(await loginWithGoogle(parsed.data.idToken));
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});

authRouter.post("/github", async (request, response, next) => {
  try {
    const parsed = githubAuthSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_github_login",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.json(await loginWithGithub(parsed.data.accessToken));
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});

authRouter.get("/me", async (request, response, next) => {
  try {
    const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
      response.status(401).json({
        error: "missing_token",
        message: "Informe o token de autenticacao."
      });
      return;
    }

    response.json({ user: await getUserFromToken(token) });
  } catch (error) {
    if (!handleAuthError(error, response)) {
      next(error);
    }
  }
});
