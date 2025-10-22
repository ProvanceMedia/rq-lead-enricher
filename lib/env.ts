import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
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

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
