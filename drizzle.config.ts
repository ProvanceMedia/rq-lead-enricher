import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  driver: "pg",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL as string
  }
});
