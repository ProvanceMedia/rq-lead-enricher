import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Allow undefined during build time, will throw at runtime if actually used
const connectionString = process.env.DATABASE_URL || "";

const pool = new Pool({
  connectionString,
  ssl: connectionString
    ? {
        rejectUnauthorized: false
      }
    : undefined,
  connectionTimeoutMillis: 5000
});

export const db = drizzle(pool, { schema });

export const closeDbPool = async () => {
  await pool.end();
};
