import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export function GET(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  return handler.GET?.(request) as ReturnType<typeof handler.GET>;
}

export function POST(request: Request) {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return NextResponse.json({ ok: false, reason: "Auth disabled during build" });
  }

  return handler.POST?.(request) as ReturnType<typeof handler.POST>;
}
