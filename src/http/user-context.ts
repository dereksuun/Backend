import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { AuthError, verifyAuthToken } from "../services/auth-service.js";
import { prisma } from "../lib/prisma.js";

export type UserContext = {
  id: string;
  email?: string;
  name?: string;
  role?: UserRole;
};

declare global {
  // Express still uses namespace merging for request augmentation.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

export async function requireUserContext(request: Request, response: Response, next: NextFunction) {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (token) {
    try {
      const payload = verifyAuthToken(token);

      request.userContext = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role
      };

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { disabledAt: true, mustChangePassword: true }
      });

      if (!user || user.disabledAt) {
        response.status(403).json({
          error: "user_disabled",
          message: "Usuario desativado."
        });
        return;
      }

      if (user.mustChangePassword) {
        response.status(403).json({
          error: "password_change_required",
          message: "Troque a senha padrao antes de continuar."
        });
        return;
      }

      next();
      return;
    } catch (error) {
      if (error instanceof AuthError) {
        response.status(error.status).json({
          error: error.code,
          message: error.message
        });
        return;
      }

      next(error);
      return;
    }
  }

  const userId = request.header("x-user-id");

  if (!userId) {
    response.status(401).json({
      error: "missing_user_context",
      message: "Informe um Bearer token ou o header x-user-id para acessar dados financeiros."
    });
    return;
  }

  request.userContext = {
    id: userId,
    email: request.header("x-user-email") ?? undefined,
    name: request.header("x-user-name") ?? undefined
  };

  next();
}

export async function requireAdminUser(request: Request, response: Response, next: NextFunction) {
  try {
    const userId = request.userContext?.id;

    if (!userId) {
      response.status(401).json({
        error: "missing_user_context",
        message: "Informe um usuario autenticado."
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, disabledAt: true }
    });

    if (!user || user.disabledAt || !["SUPERADMIN", "ADMIN"].includes(user.role)) {
      response.status(403).json({
        error: "admin_required",
        message: "Apenas administradores podem gerenciar usuarios."
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}
