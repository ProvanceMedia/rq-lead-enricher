import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";
import nodemailer from "nodemailer";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { getServerSession, type NextAuthOptions } from "next-auth";

import { prisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

function createEmailTransporter() {
  const env = getServerEnv();
  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD
      }
    });
  }

  return nodemailer.createTransport({
    streamTransport: true,
    newline: "unix",
    buffer: true
  });
}

let authOptionsCache: NextAuthOptions | null = null;
let isBuildPhase = process.env.SKIP_ENV_VALIDATION === "true";

function getAuthOptions(): NextAuthOptions {
  // Don't use cache if we're transitioning from build to runtime
  const currentlyInBuild = process.env.SKIP_ENV_VALIDATION === "true";
  if (authOptionsCache && isBuildPhase === currentlyInBuild) {
    return authOptionsCache;
  }

  // Clear cache if transitioning from build to runtime
  if (isBuildPhase && !currentlyInBuild) {
    authOptionsCache = null;
    isBuildPhase = false;
  }

  const env = getServerEnv();

  authOptionsCache = {
    adapter: PrismaAdapter(prisma),
    secret: env.NEXTAUTH_SECRET,
    session: {
      strategy: "jwt"
    },
    pages: {
      signIn: "/auth/sign-in"
    },
    providers: [
      EmailProvider({
        sendVerificationRequest: async ({ identifier, url }) => {
          const transporter = createEmailTransporter();
          const { ALLOWED_EMAIL_DOMAIN } = env;
          if (!identifier.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
            throw new Error("Email domain not allowed");
          }
          const mail = await transporter.sendMail({
            to: identifier,
            from: `RoboQuill Outreach <no-reply@${ALLOWED_EMAIL_DOMAIN}>`,
            subject: "Your RoboQuill Outreach sign in link",
            text: `Sign in to RoboQuill Outreach:\n${url}`,
            html: `<p>Sign in to RoboQuill Outreach:</p><p><a href="${url}">${url}</a></p>`
          });

          if ("message" in mail) {
            // eslint-disable-next-line no-console
            console.info(mail.message);
          }
        }
      }),
      ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? [
            GoogleProvider({
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              authorization: {
                params: {
                  prompt: "consent",
                  access_type: "offline",
                  response_type: "code"
                }
              }
            })
          ]
        : [])
    ],
    callbacks: {
      async signIn({ user }) {
        const { ALLOWED_EMAIL_DOMAIN } = env;
        if (!user.email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          return false;
        }
        return true;
      },
      async session({ token, session }) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.role) {
          session.user.role = token.role as Role;
        }
        return session;
      },
      async jwt({ token, user }) {
        if (user) {
          token.role = (user as { role?: Role }).role ?? Role.read_only;
        } else if (!token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub ?? "" },
            select: { role: true }
          });
          token.role = dbUser?.role ?? Role.read_only;
        }
        return token;
      }
    }
  };

  return authOptionsCache;
}

// Export function instead of object to ensure runtime evaluation
export function getAuthOptionsRuntime(): NextAuthOptions {
  return getAuthOptions();
}

// Lazy evaluation - don't initialize during build
let _authOptions: NextAuthOptions | null = null;

export function getAuthOptionsExport(): NextAuthOptions {
  if (!_authOptions) {
    _authOptions = getAuthOptions();
  }
  return _authOptions;
}

// For backward compatibility with existing imports
export const authOptions = new Proxy({} as NextAuthOptions, {
  get(_target, prop) {
    return getAuthOptionsExport()[prop as keyof NextAuthOptions];
  },
  has(_target, prop) {
    return prop in getAuthOptionsExport();
  },
  ownKeys() {
    return Reflect.ownKeys(getAuthOptionsExport());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getAuthOptionsExport(), prop);
  }
});

export function auth() {
  return getServerSession(getAuthOptionsExport());
}
