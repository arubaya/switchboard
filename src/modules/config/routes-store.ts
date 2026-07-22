import { readFile, writeFile } from "node:fs/promises";
import type { FastifyBaseLogger } from "fastify";

import { loadRoutesConfig, parseRoutes } from "./loader.js";
import { RouteSchema, type Route } from "./schemas.js";
import { routesConfigPath } from "../../shared/paths.js";
import { CURRENT_SCHEMA_VERSION } from "../../shared/schema-version.js";

export class RoutesStore {
  private routes: Route[] = [];

  async load(log?: FastifyBaseLogger): Promise<Route[]> {
    this.routes = await loadRoutesConfig(log);
    return this.getAll();
  }

  getAll(): Route[] {
    return [...this.routes];
  }

  getById(id: string): Route | undefined {
    return this.routes.find((route) => route.id === id);
  }

  async create(input: Route): Promise<Route> {
    const route = RouteSchema.parse(input);

    if (this.getById(route.id)) {
      throw new Error(`Route with id "${route.id}" already exists`);
    }

    if (this.routes.some((item) => item.path === route.path)) {
      throw new Error(`Route with path "${route.path}" already exists`);
    }

    this.routes.push(route);
    await this.persist();
    return route;
  }

  async update(id: string, patch: Partial<Route>): Promise<Route> {
    const index = this.routes.findIndex((route) => route.id === id);

    if (index === -1) {
      throw new Error(`Route with id "${id}" not found`);
    }

    const updated = RouteSchema.parse({
      ...this.routes[index],
      ...patch,
      id,
    });

    const pathConflict = this.routes.some(
      (route) => route.id !== id && route.path === updated.path,
    );

    if (pathConflict) {
      throw new Error(`Route with path "${updated.path}" already exists`);
    }

    this.routes[index] = updated;
    await this.persist();
    return updated;
  }

  async delete(id: string): Promise<void> {
    const index = this.routes.findIndex((route) => route.id === id);

    if (index === -1) {
      throw new Error(`Route with id "${id}" not found`);
    }

    this.routes.splice(index, 1);
    await this.persist();
  }

  private async persist(): Promise<void> {
    const payload = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      routes: this.routes,
    };
    await writeFile(routesConfigPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  async reloadFromDisk(log?: FastifyBaseLogger): Promise<Route[]> {
    const raw = await readFile(routesConfigPath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    this.routes = parseRoutes(data, log);
    return this.getAll();
  }

  async restore(routes: Route[]): Promise<Route[]> {
    this.routes = routes;
    await this.persist();
    return this.getAll();
  }
}

export const routesStore = new RoutesStore();
