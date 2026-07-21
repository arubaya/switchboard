import fp from "fastify-plugin";
import replyFrom from "@fastify/reply-from";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { Route } from "../config/schemas.js";
import {
  getEnabledRoutes,
  getRewritePrefix,
  sortRoutesBySpecificity,
} from "./utils.js";

const RESERVED_PATHS = ["/health", "/api/routes", "/public"];

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

  if (rewritePrefix === "/") {
    const stripped = pathname.slice(route.path.length) || "/";
    return new URL(`${stripped}${query}`, route.target).toString();
  }

  return new URL(`${pathname}${query}`, route.target).toString();
}

async function proxyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const pathname = request.url.split("?")[0];

  if (isReservedPath(pathname) || request.method === "OPTIONS") {
    return;
  }

  const route = findMatchingRoute(pathname, proxyState.routes);

  if (!route) {
    return;
  }

  await reply.from(buildUpstreamUrl(request, route));
}

const proxyPlugin = fp(
  async (app) => {
    await app.register(replyFrom);
    app.addHook("onRequest", proxyHandler);
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
