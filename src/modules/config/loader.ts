import { readFile } from "node:fs/promises";
import type { FastifyBaseLogger } from "fastify";

import {
  AppConfigSchema,
  RouteSchema,
  RoutesConfigSchema,
  UsersConfigSchema,
  type AppConfig,
  type Route,
  type UsersConfig,
} from "./schemas.js";
import {
  appConfigPath,
  routesConfigPath,
  usersConfigPath,
} from "../../shared/paths.js";

async function readJson(path: string): Promise<unknown> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as unknown;
}

export async function loadAppConfig(): Promise<AppConfig> {
  const data = await readJson(appConfigPath);
  return AppConfigSchema.parse(data);
}

export async function loadUsersConfig(): Promise<UsersConfig> {
  const data = await readJson(usersConfigPath);
  return UsersConfigSchema.parse(data);
}

export function parseRoutes(
  data: unknown,
  log?: FastifyBaseLogger,
): Route[] {
  const parsed = RoutesConfigSchema.safeParse(data);

  if (!parsed.success) {
    log?.error({ err: parsed.error.flatten() }, "Invalid routes.json");
    return [];
  }

  const valid: Route[] = [];

  for (const [index, entry] of parsed.data.routes.entries()) {
    const result = RouteSchema.safeParse(entry);

    if (!result.success) {
      log?.warn(
        { index, err: result.error.flatten() },
        "Skipping invalid route entry",
      );
      continue;
    }

    valid.push(result.data);
  }

  return valid;
}

export async function loadRoutesConfig(
  log?: FastifyBaseLogger,
): Promise<Route[]> {
  const data = await readJson(routesConfigPath);
  return parseRoutes(data, log);
}
