import { Role } from "@prisma/client";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession, type NextAuthOptions } from "next-auth";

import { prisma } from "@/lib/prisma";
import { getServerEnv } from "@/lib/env";

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
    // No adapter - use JWT sessions only (no database tables needed)
    secret: env.NEXTAUTH_SECRET,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    pages: {
      signIn: "/auth/sign-in"
    },
    providers: [
      // Email provider requires database adapter - removed for JWT-only mode
      // Use Google OAuth instead
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
      async signIn({ user, account }) {
        const { ALLOWED_EMAIL_DOMAIN } = env;
        if (!user.email?.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          return false;
        }

        // Create or update user in database on sign-in
        if (user.email) {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name
            },
            create: {
              email: user.email,
              name: user.name,
              role: Role.read_only
            }
          });
        }

        return true;
      },
      async session({ token, session }) {
        if (token.sub) {
          session.user.id = token.sub;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        if (token.role) {
          session.user.role = token.role as Role;
        }
        return session;
      },
      async jwt({ token, user, account }) {
        // Initial sign in
        if (user && user.email) {
          // Get user from database to get their role
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, role: true }
          });

          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role;
          }
        }

        // Refresh role from database if not in token
        if (!token.role && token.email) {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email as string },
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
let _wasBuildPhase = process.env.SKIP_ENV_VALIDATION === "true";

export function getAuthOptionsExport(): NextAuthOptions {
  const isBuildPhaseNow = process.env.SKIP_ENV_VALIDATION === "true";

  // Clear cache if transitioning from build to runtime
  if (_wasBuildPhase && !isBuildPhaseNow && _authOptions) {
    console.log('[Auth] Clearing build-phase authOptions cache');
    _authOptions = null;
    _wasBuildPhase = false;
  }

  if (!_authOptions) {
    console.log('[Auth] Creating authOptions, build phase:', isBuildPhaseNow);
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
