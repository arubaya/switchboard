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

  try {
    const url = new URL(target);
    const internalHttpPorts = new Set([
      "3000",
      "3030",
      "8080",
      "5000",
      "8000",
    ]);

    if (
      url.protocol === "https:" &&
      (internalHttpPorts.has(url.port) || url.hostname === "grafana")
    ) {
      url.protocol = "http:";
      return url.toString();
    }

    if (url.protocol === "http:" && url.port === "443") {
      url.protocol = "https:";
      url.port = "";
      return url.toString();
    }

    if (alias && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      url.hostname = alias;
      return url.toString();
    }
  } catch {
    return target;
  }

  return target;
}

function normalizeRoutePrefix(path: string): string {
  if (path === "/") {
    return "/";
  }

  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function splitLocationPath(location: string): [string, string] {
  const hashIndex = location.indexOf("#");
  const queryIndex = location.indexOf("?");
  const end = Math.min(
    hashIndex === -1 ? location.length : hashIndex,
    queryIndex === -1 ? location.length : queryIndex,
  );

  return [location.slice(0, end), location.slice(end)];
}

export function rewriteLocationForStripPrefix(
  location: string,
  routePath: string,
  requestHost: string | undefined,
  requestProto = "http",
): string {
  const prefix = normalizeRoutePrefix(routePath);

  if (prefix === "/") {
    return location;
  }

  const attachPrefix = (pathname: string): string => {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return pathname;
    }

    if (pathname === "/") {
      return `${prefix}/`;
    }

    return `${prefix}${pathname}`;
  };

  const normalizePublicLocation = (url: URL): void => {
    if (!requestHost) {
      return;
    }

    const publicHost = requestHost.split(":")[0];

    if (url.hostname !== publicHost) {
      return;
    }

    const internalPorts = new Set(["3000", "3030", "8080", "5000", "8000", "8443"]);

    if (url.port && internalPorts.has(url.port)) {
      url.port = "";
    }

    if (requestProto === "https" && url.protocol === "http:") {
      url.protocol = "https:";
    }
  };

  if (location.startsWith("/")) {
    const [pathname, suffix] = splitLocationPath(location);
    return attachPrefix(pathname) + suffix;
  }

  try {
    const url = new URL(location);

    if (requestHost) {
      const publicHost = requestHost.split(":")[0];

      if (url.hostname !== publicHost) {
        return location;
      }
    }

    url.pathname = attachPrefix(url.pathname);
    normalizePublicLocation(url);
    return url.toString();
  } catch {
    return location;
  }
}
