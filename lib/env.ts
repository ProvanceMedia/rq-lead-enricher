import { z } from "zod";

// During build time, some env vars may not be available
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build";

const envSchema = z.object({
  DATABASE_URL: isBuildTime ? z.string().optional() : z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  HUBSPOT_PRIVATE_APP_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  DAILY_QUOTA: z
    .string()
    .optional()
    .transform((value) => (value ? Number.parseInt(value, 10) : 40))
    .pipe(z.number().int().positive()),
  ALLOWED_EMAIL_DOMAIN: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !isBuildTime) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.success ? parsed.data : (process.env as any);
