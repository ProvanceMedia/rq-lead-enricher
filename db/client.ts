import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Allow undefined during build time, will throw at runtime if actually used
const connectionString = process.env.DATABASE_URL || "";

// Configure SSL for production database connections
const sslConfig = connectionString && process.env.NODE_ENV === "production"
  ? {
      rejectUnauthorized: false,
      // Explicitly disable certificate verification for Digital Ocean managed databases
      checkServerIdentity: () => undefined
    }
  : connectionString
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  connectionTimeoutMillis: 10000
});

export const db = drizzle(pool, { schema });

export const closeDbPool = async () => {
  await pool.end();
};
