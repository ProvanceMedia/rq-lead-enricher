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

  try {
    console.log('[Prisma] Creating new PrismaClient');
    cachedClient = new PrismaClient({
      log: ['error', 'warn']
    });

    if (process.env.NODE_ENV !== "production") {
      global.prisma = cachedClient;
    }

    console.log('[Prisma] PrismaClient created successfully');
    return cachedClient;
  } catch (error) {
    console.error('[Prisma] Failed to create PrismaClient:', error);
    throw error;
  }
}

// Export a Proxy that lazily initializes the client
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    try {
      return getClient()[prop as keyof PrismaClient];
    } catch (error) {
      console.error('[Prisma Proxy] Error accessing property:', prop, error);
      throw error;
    }
  },
  has(_, prop) {
    try {
      return prop in getClient();
    } catch (error) {
      console.error('[Prisma Proxy] Error checking property:', prop, error);
      return false;
    }
  }
});
