import type { Request, Response, NextFunction } from "express";

export type UserContext = {
  id: string;
  email?: string;
  name?: string;
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

export function requireUserContext(request: Request, response: Response, next: NextFunction) {
  const userId = request.header("x-user-id");

  if (!userId) {
    response.status(401).json({
      error: "missing_user_context",
      message: "Informe o header x-user-id para acessar dados financeiros."
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
