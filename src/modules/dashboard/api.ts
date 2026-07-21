import type { FastifyInstance } from "fastify";

import { routesStore } from "../config/routes-store.js";
import { RouteSchema } from "../config/schemas.js";
import { reloadProxyRoutes } from "../proxy/register.js";

export default async function dashboardApi(app: FastifyInstance) {
  app.addHook("preHandler", app.basicAuth);

  app.get("/api/routes", async () => {
    return { routes: routesStore.getAll() };
  });

  app.post("/api/routes", async (request, reply) => {
    try {
      const route = RouteSchema.parse(request.body);
      const created = await routesStore.create(route);
      await reloadProxyRoutes(app, routesStore.getAll());
      return reply.code(201).send({ route: created });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create route";
      return reply.code(400).send({ error: message });
    }
  });

  app.patch("/api/routes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const route = await routesStore.update(id, request.body as object);
      await reloadProxyRoutes(app, routesStore.getAll());
      return { route };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update route";
      const status = message.includes("not found") ? 404 : 400;
      return reply.code(status).send({ error: message });
    }
  });

  app.delete("/api/routes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await routesStore.delete(id);
      await reloadProxyRoutes(app, routesStore.getAll());
      return reply.code(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete route";
      const status = message.includes("not found") ? 404 : 400;
      return reply.code(status).send({ error: message });
    }
  });
}
