import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let cachedPrisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!cachedPrisma) {
    console.log('[Prisma] Creating new PrismaClient');
    cachedPrisma = new PrismaClient();
  }
  return cachedPrisma;
}

// Use Proxy to lazy-load Prisma at runtime
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// For development, cache in global
if (process.env.NODE_ENV !== "production" && !global.prisma) {
  global.prisma = getPrismaClient();
}
