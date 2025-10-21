import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create PrismaClient even during build (with placeholder URL from getServerEnv)
// The client won't actually connect unless methods are called, which route handlers prevent
export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
