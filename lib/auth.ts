import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";
import { env } from "./env";

export type AppRole = "admin" | "operator" | "read_only";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const normalizeDomain = (value: string) => value.trim().toLowerCase();

const allowedDomain = env.ALLOWED_EMAIL_DOMAIN
  ? normalizeDomain(env.ALLOWED_EMAIL_DOMAIN)
  : undefined;

export async function requireUser(allowedRoles?: AppRole[]) {
  const { userId } = auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  const clerkUser = await clerkClient().users.getUser(userId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new UnauthorizedError("User must have an email address");
  }

  if (allowedDomain && !email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    throw new ForbiddenError("Email domain is not allowed");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!existing) {
    await db
      .insert(users)
      .values({
        id: userId,
        email,
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
          clerkUser.username ||
          email,
        role: "operator"
      })
      .onConflictDoNothing({ target: users.id });
  }

  const dbUser =
    existing ??
    (await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1))[0];

  if (!dbUser) {
    throw new Error("Failed to resolve database user");
  }

  const role = dbUser.role as AppRole;

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ForbiddenError("User does not have permission");
  }

  return {
    clerkUser,
    dbUser: dbUser as User
  };
}

export function assertRole(user: Pick<User, "role">, allowed: AppRole[]) {
  if (!allowed.includes(user.role as AppRole)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}
