import type { Prisma, User, UserRole } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";
import { AuthError, hashPassword, normalizeEmail, toPublicUser } from "./auth-service.js";

type CreateUserInput = {
  name?: string;
  email: string;
  password?: string;
  role: UserRole;
};

type UpdateUserInput = {
  name?: string | null;
  email?: string;
  password?: string;
  role?: UserRole;
  disabled?: boolean;
};

type ActingAdmin = {
  id: string;
  role?: UserRole | null;
};

function isSuperAdmin(role?: UserRole | null) {
  return role === "SUPERADMIN";
}

function isAdmin(role?: UserRole | null) {
  return role === "SUPERADMIN" || role === "ADMIN";
}

export function assertCanCreateManagedUser(currentRole: UserRole | undefined | null, targetRole: UserRole) {
  if (!isAdmin(currentRole)) {
    throw new AuthError("admin_required", "Apenas administradores podem gerenciar usuarios.", 403);
  }

  if (targetRole !== "USER" && !isSuperAdmin(currentRole)) {
    throw new AuthError("superadmin_required", "Apenas SUPERADMIN pode criar administradores.", 403);
  }
}

export function assertCanManageExistingUser(
  currentUser: ActingAdmin,
  targetUser: Pick<User, "id" | "role">,
  input: UpdateUserInput = {}
) {
  if (!isAdmin(currentUser.role)) {
    throw new AuthError("admin_required", "Apenas administradores podem gerenciar usuarios.", 403);
  }

  if (isSuperAdmin(currentUser.role)) {
    return;
  }

  if (targetUser.role !== "USER" || (input.role && input.role !== "USER")) {
    throw new AuthError("superadmin_required", "Apenas SUPERADMIN pode gerenciar administradores.", 403);
  }
}

export async function listUsers() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });

  return users.map(toPublicUser);
}

export async function getManagedUser(userId: string, currentUser?: ActingAdmin) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AuthError("user_not_found", "Usuario nao encontrado.", 404);
  }

  if (currentUser) {
    assertCanManageExistingUser(currentUser, user);
  }

  return toPublicUser(user);
}

export async function createManagedUser(input: CreateUserInput, currentRole?: UserRole | null) {
  assertCanCreateManagedUser(currentRole, input.role);

  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AuthError("email_already_registered", "Ja existe uma conta com este email.", 409);
  }

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      role: input.role,
      passwordHash: await hashPassword(input.password ?? env.USER_DEFAULT_PASSWORD),
      mustChangePassword: true
    }
  });

  return toPublicUser(user);
}

export async function updateManagedUser(currentUser: ActingAdmin, userId: string, input: UpdateUserInput) {
  const existingUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!existingUser) {
    throw new AuthError("user_not_found", "Usuario nao encontrado.", 404);
  }

  assertCanManageExistingUser(currentUser, existingUser, input);

  if (currentUser.id === userId && input.disabled) {
    throw new AuthError("cannot_disable_self", "Voce nao pode desativar sua propria conta.", 400);
  }

  if (currentUser.id === userId && input.role && input.role !== existingUser.role) {
    throw new AuthError("cannot_demote_self", "Voce nao pode remover seu proprio admin.", 400);
  }

  const data: Prisma.UserUpdateInput = {
    name: input.name,
    role: input.role,
    disabledAt: input.disabled === undefined ? undefined : input.disabled ? new Date() : null
  };

  if (input.email) {
    data.email = normalizeEmail(input.email);
  }

  if (input.password) {
    data.passwordHash = await hashPassword(input.password);
    data.mustChangePassword = true;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data
    });

    return toPublicUser(user);
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      throw new AuthError("email_already_registered", "Ja existe uma conta com este email.", 409);
    }

    throw error;
  }
}

export async function disableManagedUser(currentUser: ActingAdmin, userId: string) {
  return updateManagedUser(currentUser, userId, { disabled: true });
}
