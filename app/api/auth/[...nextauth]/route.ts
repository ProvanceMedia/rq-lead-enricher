import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { getAuthOptionsRuntime } from "@/lib/auth";

// Create handler lazily at runtime, not during build
let handler: ReturnType<typeof NextAuth> | null = null;

function getHandler() {
  if (!handler) {
    handler = NextAuth(getAuthOptionsRuntime());
  }
  return handler;
}

export async function GET(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  const h = getHandler();
  if (!h.GET) {
    return NextResponse.json({ error: "Auth handler not initialized" }, { status: 500 });
  }

  return h.GET(request);
}

export async function POST(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  const h = getHandler();
  if (!h.POST) {
    return NextResponse.json({ error: "Auth handler not initialized" }, { status: 500 });
  }

  return h.POST(request);
}
