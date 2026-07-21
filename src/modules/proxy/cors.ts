import type { IncomingHttpHeaders } from "node:http";
import type { FastifyReply, FastifyRequest } from "fastify";

import type { Route } from "../config/schemas.js";

const DEFAULT_ALLOW_HEADERS =
  "Authorization, Content-Type, Accept, Origin, X-Requested-With";

export function resolveCorsOrigin(
  route: Route,
  request: FastifyRequest,
): string | null {
  const allowed = route.corsOrigins;

  if (!allowed?.length) {
    return null;
  }

  const origin = request.headers.origin;

  if (!origin) {
    return null;
  }

  if (allowed.includes("*") || allowed.includes(origin)) {
    return origin;
  }

  return null;
}

export function applyCorsHeaders(
  reply: FastifyReply,
  request: FastifyRequest,
  origin: string,
): void {
  reply.header("Access-Control-Allow-Origin", origin);
  reply.header("Vary", "Origin");
  reply.header(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  reply.header(
    "Access-Control-Allow-Headers",
    String(
      request.headers["access-control-request-headers"] ?? DEFAULT_ALLOW_HEADERS,
    ),
  );
  reply.header("Access-Control-Max-Age", "86400");
}

export function mergeCorsResponseHeaders(
  headers: IncomingHttpHeaders,
  origin: string,
): IncomingHttpHeaders {
  const cleaned = { ...headers };

  delete cleaned["access-control-allow-origin"];
  delete cleaned["access-control-allow-credentials"];
  delete cleaned["access-control-allow-headers"];
  delete cleaned["access-control-allow-methods"];
  delete cleaned["access-control-expose-headers"];

  cleaned["access-control-allow-origin"] = origin;
  cleaned.vary = "Origin";

  return cleaned;
}
