import { logError, logEvent, withRequestId } from "./logger";

/**
 * Wraps an API route handler with request-id generation, timing, structured
 * logging, and a safe 500 fallback for unhandled errors.
 *
 * The inner handler sees a Request whose headers include `x-request-id`.
 * The response always carries `x-request-id` so clients can correlate.
 */
export function withHandler(
  handler: (req: Request) => Promise<Response>,
  options: { route?: string } = {}
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    return withRequestId(async (rid) => {
      const start = Date.now();
      const url = new URL(req.url);
      const route = options.route || url.pathname;

      // Expose the request id to the inner handler via header.
      const headers = new Headers(req.headers);
      headers.set("x-request-id", rid);
      const wrappedReq = new Request(req.url, {
        method: req.method,
        headers,
        body: req.body,
        // Keep streaming semantics for POST bodies
        // @ts-expect-error duplex required by undici when streaming a body
        duplex: "half",
      });

      try {
        const res = await handler(wrappedReq);
        const duration = Date.now() - start;
        logEvent("api_request", {
          rid,
          route,
          method: req.method,
          status: res.status,
          duration_ms: duration,
        });
        // Attach the request id to the response.
        const outHeaders = new Headers(res.headers);
        outHeaders.set("x-request-id", rid);
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: outHeaders,
        });
      } catch (err) {
        const duration = Date.now() - start;
        logError(err, { rid, route, method: req.method, duration_ms: duration });
        return new Response(
          JSON.stringify({
            error: "internal_error",
            message: "Ocurrió un error inesperado. Intenta de nuevo.",
            rid,
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "x-request-id": rid,
            },
          }
        );
      }
    });
  };
}
