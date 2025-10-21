import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  ALLOWED_EMAIL_DOMAIN: z.string().min(1, "ALLOWED_EMAIL_DOMAIN is required"),
  APOLLO_API_KEY: z.string().optional(),
  HUBSPOT_PRIVATE_APP_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  DAILY_QUOTA: z.coerce.number().default(40),
  SLACK_WEBHOOK_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional()
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().optional()
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

let serverEnvCache: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (serverEnvCache) {
    return serverEnvCache;
  }

  // During build phase, return placeholder values to avoid validation errors
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    serverEnvCache = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://placeholder",
      REDIS_URL: "redis://placeholder",
      NEXTAUTH_URL: "http://placeholder",
      NEXTAUTH_SECRET: "placeholder",
      ALLOWED_EMAIL_DOMAIN: "placeholder.com",
      DAILY_QUOTA: 40
    } as ServerEnv;
    return serverEnvCache;
  }

  serverEnvCache = serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN,
    APOLLO_API_KEY: process.env.APOLLO_API_KEY,
    HUBSPOT_PRIVATE_APP_TOKEN: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    DAILY_QUOTA: process.env.DAILY_QUOTA,
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD
  });

  return serverEnvCache;
}

export function getClientEnv(): ClientEnv {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME
  });
}
