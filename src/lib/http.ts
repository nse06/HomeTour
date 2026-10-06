import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what, "not_found");
export const badRequest = (msg: string) => new HttpError(400, msg, "bad_request");
export const unauthorized = () => new HttpError(401, "Please sign in to continue.", "unauthorized");

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

/**
 * CSRF defense for cookie-authenticated JSON endpoints: browsers always send Origin on
 * cross-site POST/PATCH/DELETE, so require it to match our own host.
 */
export function assertSameOrigin(request: Request): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return; // Non-browser clients (curl, tests) don't send Origin; cookies still required.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    /* fall through */
  }
  throw new HttpError(403, "Cross-origin request blocked.", "forbidden");
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Invalid JSON body.");
  }
  return schema.parse(body);
}

type Handler<C> = (request: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with origin checks and consistent JSON error responses. */
export function route<C>(handler: Handler<C>): Handler<C> {
  return async (request, ctx) => {
    try {
      assertSameOrigin(request);
      return await handler(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const where = first?.path?.length ? `${first.path.join(".")}: ` : "";
        return json({ error: `${where}${first?.message ?? "Invalid input"}`, code: "invalid" }, { status: 400 });
      }
      console.error("[api] Unhandled error", err);
      return json({ error: "Something went wrong. Please try again.", code: "internal" }, { status: 500 });
    }
  };
}
