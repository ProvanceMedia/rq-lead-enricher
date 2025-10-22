import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./auth";
import { HttpError } from "./errors";

type HandlerResult = Response | NextResponse | Record<string, unknown> | void;

type Handler<TContext = unknown> = (params: {
  request: Request;
  context: TContext;
}) => Promise<HandlerResult>;

export function withErrorHandling<TContext>(handler: Handler<TContext>) {
  return async (request: Request, context: TContext) => {
    try {
      const result = await handler({ request, context });

      if (result instanceof NextResponse || result instanceof Response) {
        return result;
      }

      const payload = result ?? { ok: true };
      return NextResponse.json(payload);
    } catch (error) {
      console.error("API error", error);

      if (error instanceof UnauthorizedError) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      if (error instanceof ForbiddenError) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error instanceof HttpError) {
        return NextResponse.json(
          { error: error.expose ? error.message : "Unexpected error" },
          { status: error.status }
        );
      }

      return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
    }
  };
}
