import type { Route } from "../config/schemas.js";

export function sortRoutesBySpecificity(routes: Route[]): Route[] {
  return [...routes].sort((a, b) => b.path.length - a.path.length);
}

export function getEnabledRoutes(routes: Route[]): Route[] {
  return sortRoutesBySpecificity(routes.filter((route) => route.enabled));
}

export function getRewritePrefix(route: Route): string {
  return route.stripPrefix ? "/" : route.path;
}

export function resolveTargetHost(target: string): string {
  const alias = process.env.SWITCHBOARD_UPSTREAM_HOST?.trim();
  if (!alias) {
    return target;
  }

  try {
    const url = new URL(target);

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.hostname = alias;
      return url.toString();
    }
  } catch {
    return target;
  }

  return target;
}
