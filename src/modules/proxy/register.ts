import fp from "fastify-plugin";
import replyFrom from "@fastify/reply-from";
import type { IncomingHttpHeaders } from "node:http";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { Route } from "../config/schemas.js";
import {
  applyCorsHeaders,
  mergeCorsResponseHeaders,
  resolveCorsOrigin,
} from "./cors.js";
import {
  getEnabledRoutes,
  getRewritePrefix,
  resolveTargetHost,
  rewriteLocationForStripPrefix,
  sortRoutesBySpecificity,
} from "./utils.js";

const RESERVED_PATHS = [
  "/health",
  "/api/routes",
  "/api/settings",
  "/api/ssl",
  "/api/version",
  "/public",
  "/logout",
  "/settings",
  "/ssl",
  "/.well-known",
];

const proxyState = {
  routes: [] as Route[],
};

function isReservedPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return RESERVED_PATHS.some(
    (reserved) =>
      pathname === reserved || pathname.startsWith(`${reserved}/`),
  );
}

function findMatchingRoute(pathname: string, routes: Route[]): Route | undefined {
  for (const route of sortRoutesBySpecificity(routes)) {
    if (pathname === route.path || pathname.startsWith(`${route.path}/`)) {
      return route;
    }
  }

  return undefined;
}

function buildUpstreamUrl(request: FastifyRequest, route: Route): string {
  const [pathname, search = ""] = request.url.split("?");
  const query = search ? `?${search}` : "";
  const rewritePrefix = getRewritePrefix(route);
  const target = resolveTargetHost(route.target);

  if (rewritePrefix === "/") {
    const stripped = pathname.slice(route.path.length) || "/";
    return new URL(`${stripped}${query}`, target).toString();
  }

  return new URL(`${pathname}${query}`, target).toString();
}

function upstreamErrorDetail(error: unknown, target: string): string {
  let current = error;

  while (current instanceof Error) {
    if (current.message && !current.message.includes("FST_REPLY_FROM")) {
      return current.message;
    }

    current = current.cause;
  }

  return `Could not connect to ${target}`;
}

function forwardedProto(request: FastifyRequest): string {
  const header = request.headers["x-forwarded-proto"];

  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }

  return request.protocol;
}

async function proxyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const pathname = request.url.split("?")[0];

  if (isReservedPath(pathname)) {
    return;
  }

  const route = findMatchingRoute(pathname, proxyState.routes);

  if (!route) {
    return;
  }

  const corsOrigin = resolveCorsOrigin(route, request);

  if (corsOrigin && request.method === "OPTIONS") {
    applyCorsHeaders(reply, request, corsOrigin);
    return reply.code(204).send();
  }

  const upstream = buildUpstreamUrl(request, route);
  const forwardBody =
    request.body !== undefined &&
    request.body !== null &&
    request.method !== "GET" &&
    request.method !== "HEAD";

  return reply.from(upstream, {
    ...(forwardBody ? { body: request.body } : {}),
    rewriteRequestHeaders: (_request, headers) => {
      const publicHost = String(request.headers.host ?? "");

      return {
        ...headers,
        host: publicHost || headers.host,
        "x-forwarded-for": String(
          headers["x-forwarded-for"]
            ? `${headers["x-forwarded-for"]}, ${request.ip}`
            : request.ip,
        ),
        "x-forwarded-proto": forwardedProto(request),
        "x-forwarded-host": publicHost,
      };
    },
    rewriteHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
      let next = headers;

      if (route.stripPrefix && next.location) {
        next = {
          ...next,
          location: rewriteLocationForStripPrefix(
            String(next.location),
            route.path,
            request.headers.host,
            forwardedProto(request),
          ),
        };
      }

      if (corsOrigin) {
        next = mergeCorsResponseHeaders(next, corsOrigin);
      }

      return next;
    },
    onError(_reply, { error }) {
      const detail = upstreamErrorDetail(error, route.target);

      request.log.error(
        { err: error, upstream, routeId: route.id, target: route.target },
        "Upstream proxy failed",
      );

      if (!_reply.sent) {
        _reply.code(502).send({
          error: "Bad Gateway",
          message: detail,
          upstream,
        });
      }
    },
  });
}

const proxyPlugin = fp(
  async (app) => {
    await app.register(replyFrom);
    app.addHook("preHandler", proxyHandler);
  },
  { name: "switchboard-proxy" },
);

export async function reloadProxyRoutes(
  app: FastifyInstance,
  routes: Route[],
): Promise<void> {
  proxyState.routes = getEnabledRoutes(routes);

  if (!app.hasDecorator("switchboardProxyReady")) {
    app.decorate("switchboardProxyReady", true);
    await app.register(proxyPlugin);
  }

  for (const route of proxyState.routes) {
    app.log.info(
      { id: route.id, path: route.path, target: route.target },
      "Proxy route active",
    );
  }
}
