import { describe, expect, it } from "vitest";
import { AuthError } from "./auth-service.js";
import { assertCanCreateManagedUser, assertCanManageExistingUser } from "./user-service.js";

describe("admin user permissions", () => {
  it("allows SUPERADMIN to create administrators", () => {
    expect(() => assertCanCreateManagedUser("SUPERADMIN", "ADMIN")).not.toThrow();
    expect(() => assertCanCreateManagedUser("SUPERADMIN", "SUPERADMIN")).not.toThrow();
  });

  it("blocks ADMIN from creating administrators", () => {
    expect(() => assertCanCreateManagedUser("ADMIN", "ADMIN")).toThrow(AuthError);
    expect(() => assertCanCreateManagedUser("ADMIN", "SUPERADMIN")).toThrow(AuthError);
  });

  it("allows ADMIN to manage regular users", () => {
    expect(() =>
      assertCanManageExistingUser({ id: "admin-id", role: "ADMIN" }, { id: "user-id", role: "USER" }, { role: "USER" })
    ).not.toThrow();
  });

  it("blocks ADMIN from managing other administrators", () => {
    expect(() =>
      assertCanManageExistingUser({ id: "admin-id", role: "ADMIN" }, { id: "superadmin-id", role: "SUPERADMIN" })
    ).toThrow(AuthError);

    expect(() =>
      assertCanManageExistingUser({ id: "admin-id", role: "ADMIN" }, { id: "user-id", role: "USER" }, { role: "ADMIN" })
    ).toThrow(AuthError);
  });
});
