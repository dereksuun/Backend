import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthProvider, User, UserRole } from "@prisma/client";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;

export type PublicUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  disabledAt: Date | null;
  mustChangePassword: boolean;
};

type AuthPayload = {
  token: string;
  user: PublicUser;
};

type JwtPayload = {
  sub: string;
  email?: string;
  name?: string;
  role?: UserRole;
  exp: number;
};

type GoogleTokenInfo = {
  sub: string;
  aud?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

type GithubUser = {
  id: number;
  name: string | null;
  login: string;
  avatar_url: string | null;
  email: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 401
  ) {
    super(message);
  }
}

export function toPublicUser(
  user: Pick<User, "id" | "name" | "email" | "image" | "role" | "disabledAt" | "mustChangePassword">
): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    disabledAt: user.disabledAt,
    mustChangePassword: user.mustChangePassword
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signJwt(payload: Omit<JwtPayload, "exp">) {
  const header = { alg: "HS256", typ: "JWT" };
  const body: JwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + env.AUTH_JWT_EXPIRES_SECONDS
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = createHmac("sha256", env.AUTH_JWT_SECRET).update(unsignedToken).digest("base64url");

  return `${unsignedToken}.${signature}`;
}

export function verifyAuthToken(token: string): JwtPayload {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    throw new AuthError("invalid_token", "Sessao invalida.");
  }

  const expected = createHmac("sha256", env.AUTH_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (
    !timingSafeEqual(
      Buffer.from(signature.padEnd(expected.length)),
      Buffer.from(expected.padEnd(signature.length))
    )
  ) {
    throw new AuthError("invalid_token", "Sessao invalida.");
  }

  let decoded: JwtPayload;

  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
  } catch {
    throw new AuthError("invalid_token", "Sessao invalida.");
  }

  if (!decoded.sub || typeof decoded.exp !== "number" || decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new AuthError("invalid_token", "Sessao expirada.");
  }

  return decoded;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, passwordKeyLength)) as Buffer;

  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, key] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }

  const candidate = (await scrypt(password, salt, passwordKeyLength)) as Buffer;
  const expected = Buffer.from(key, "base64url");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function assertActiveUser(user: Pick<User, "disabledAt">) {
  if (user.disabledAt) {
    throw new AuthError("user_disabled", "Usuario desativado.", 403);
  }
}

function createAuthPayload(
  user: Pick<User, "id" | "name" | "email" | "image" | "role" | "disabledAt" | "mustChangePassword">
): AuthPayload {
  assertActiveUser(user);

  return {
    token: signJwt({
      sub: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      role: user.role
    }),
    user: toPublicUser(user)
  };
}

export async function registerWithPassword(input: { name?: string; email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AuthError("email_already_registered", "Ja existe uma conta com este email.", 409);
  }

  const adminCount = await prisma.user.count({ where: { role: { in: ["SUPERADMIN", "ADMIN"] } } });
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      role: adminCount === 0 ? "SUPERADMIN" : "USER",
      passwordHash: await hashPassword(input.password)
    }
  });

  return createAuthPayload(user);
}

export async function loginWithPassword(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AuthError("invalid_credentials", "Email ou senha invalidos.");
  }

  assertActiveUser(user);
  return createAuthPayload(user);
}

async function upsertSocialUser(input: {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const account = await prisma.authAccount.findUnique({
    where: {
      provider_providerId: {
        provider: input.provider,
        providerId: input.providerId
      }
    },
    include: { user: true }
  });

  if (account) {
    assertActiveUser(account.user);

    const user = await prisma.user.update({
      where: { id: account.userId },
      data: {
        email,
        name: account.user.name ?? input.name,
        image: account.user.image ?? input.image
      }
    });

    return createAuthPayload(user);
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: input.name,
      image: input.image,
      role:
        (await prisma.user.count({ where: { role: { in: ["SUPERADMIN", "ADMIN"] } } })) === 0
          ? "SUPERADMIN"
          : "USER",
      authAccounts: {
        create: {
          provider: input.provider,
          providerId: input.providerId,
          email
        }
      }
    },
    update: {
      name: input.name ?? undefined,
      image: input.image ?? undefined,
      authAccounts: {
        create: {
          provider: input.provider,
          providerId: input.providerId,
          email
        }
      }
    }
  });

  assertActiveUser(user);
  return createAuthPayload(user);
}

export async function loginWithGoogle(idToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  if (!response.ok) {
    throw new AuthError("invalid_google_token", "Login com Google invalido.");
  }

  const tokenInfo = (await response.json()) as GoogleTokenInfo;

  if (env.GOOGLE_CLIENT_ID && tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
    throw new AuthError("invalid_google_audience", "Token do Google nao pertence a este app.");
  }

  if (!tokenInfo.sub || !tokenInfo.email || tokenInfo.email_verified === false || tokenInfo.email_verified === "false") {
    throw new AuthError("unverified_google_email", "Email do Google nao verificado.");
  }

  return upsertSocialUser({
    provider: "GOOGLE",
    providerId: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name,
    image: tokenInfo.picture
  });
}

async function fetchGithub<T>(path: string, accessToken: string) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Derycash"
    }
  });

  if (!response.ok) {
    throw new AuthError("invalid_github_token", "Login com GitHub invalido.");
  }

  return (await response.json()) as T;
}

export async function loginWithGithub(accessToken: string) {
  const githubUser = await fetchGithub<GithubUser>("/user", accessToken);
  const emails = await fetchGithub<GithubEmail[]>("/user/emails", accessToken);
  const email =
    githubUser.email ??
    emails.find((item) => item.primary && item.verified)?.email ??
    emails.find((item) => item.verified)?.email;

  if (!email) {
    throw new AuthError("missing_github_email", "Autorize um email verificado no GitHub.");
  }

  return upsertSocialUser({
    provider: "GITHUB",
    providerId: String(githubUser.id),
    email,
    name: githubUser.name ?? githubUser.login,
    image: githubUser.avatar_url
  });
}

export async function getUserFromToken(token: string) {
  const payload = verifyAuthToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user) {
    throw new AuthError("user_not_found", "Usuario nao encontrado.");
  }

  assertActiveUser(user);
  return toPublicUser(user);
}

export async function changePassword(input: {
  token: string;
  currentPassword: string;
  newPassword: string;
}) {
  const payload = verifyAuthToken(input.token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });

  if (!user) {
    throw new AuthError("user_not_found", "Usuario nao encontrado.");
  }

  assertActiveUser(user);

  if (!user.passwordHash || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AuthError("invalid_credentials", "Senha atual invalida.");
  }

  if (input.currentPassword === input.newPassword) {
    throw new AuthError("same_password", "A nova senha precisa ser diferente da senha atual.", 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      mustChangePassword: false
    }
  });

  return createAuthPayload(updatedUser);
}
