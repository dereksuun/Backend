import { Router } from "express";
import { requireAdminUser, requireUserContext } from "../http/user-context.js";
import { AuthError } from "../services/auth-service.js";
import {
  createManagedUser,
  disableManagedUser,
  getManagedUser,
  listUsers,
  updateManagedUser
} from "../services/user-service.js";
import { createUserSchema, updateUserSchema } from "../validations/user.js";

export const userRouter = Router();

function handleUserError(error: unknown, response: import("express").Response) {
  if (error instanceof AuthError) {
    response.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return true;
  }

  return false;
}

userRouter.use(requireUserContext, requireAdminUser);

userRouter.get("/", async (_request, response, next) => {
  try {
    response.json({ users: await listUsers() });
  } catch (error) {
    next(error);
  }
});

userRouter.get("/:userId", async (request, response, next) => {
  try {
    response.json({ user: await getManagedUser(request.params.userId) });
  } catch (error) {
    if (!handleUserError(error, response)) {
      next(error);
    }
  }
});

userRouter.post("/", async (request, response, next) => {
  try {
    const parsed = createUserSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_user",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.status(201).json({ user: await createManagedUser(parsed.data) });
  } catch (error) {
    if (!handleUserError(error, response)) {
      next(error);
    }
  }
});

userRouter.put("/:userId", async (request, response, next) => {
  try {
    const parsed = updateUserSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: "invalid_user",
        issues: parsed.error.flatten()
      });
      return;
    }

    response.json({
      user: await updateManagedUser(request.userContext!.id, request.params.userId, parsed.data)
    });
  } catch (error) {
    if (!handleUserError(error, response)) {
      next(error);
    }
  }
});

userRouter.delete("/:userId", async (request, response, next) => {
  try {
    response.json({
      user: await disableManagedUser(request.userContext!.id, request.params.userId)
    });
  } catch (error) {
    if (!handleUserError(error, response)) {
      next(error);
    }
  }
});
