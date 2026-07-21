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
