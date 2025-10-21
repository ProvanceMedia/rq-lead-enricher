import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { getAuthOptionsRuntime } from "@/lib/auth";

// Create handler lazily at runtime, not during build
let handler: any = null;

function getHandler() {
  if (!handler) {
    try {
      const opts = getAuthOptionsRuntime();
      console.log('[NextAuth] Initializing with options:', Object.keys(opts));
      handler = NextAuth(opts);
      console.log('[NextAuth] Handler created, type:', typeof handler);
    } catch (error) {
      console.error('[NextAuth] Error creating handler:', error);
      throw error;
    }
  }
  return handler;
}

export async function GET(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  try {
    const h = getHandler();
    // NextAuth returns a handler function that can be called directly
    return h(request);
  } catch (error) {
    console.error('[NextAuth] GET error:', error);
    return NextResponse.json({ error: "Auth initialization failed", details: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  try {
    const h = getHandler();
    // NextAuth returns a handler function that can be called directly
    return h(request);
  } catch (error) {
    console.error('[NextAuth] POST error:', error);
    return NextResponse.json({ error: "Auth initialization failed", details: String(error) }, { status: 500 });
  }
}
