import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let cachedClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  if (cachedClient) return cachedClient;
  if (global.prisma) {
    cachedClient = global.prisma;
    return cachedClient;
  }

  console.log('[Prisma] Creating new PrismaClient');
  cachedClient = new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.prisma = cachedClient;
  }

  return cachedClient;
}

// Export a Proxy that lazily initializes the client
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getClient()[prop as keyof PrismaClient];
  },
  has(_, prop) {
    return prop in getClient();
  }
});
