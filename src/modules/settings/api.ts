import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { appConfigStore } from "../config/app-store.js";
import { AppConfigSchema, UserSchema } from "../config/schemas.js";
import { usersStore } from "../config/users-store.js";
import { requestRestart } from "../../shared/restart.js";

const UpdateUserSchema = z
  .object({
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  })
  .refine((data) => data.username || data.password, {
    message: "At least one field is required",
  });

export default async function settingsApi(app: FastifyInstance) {
  app.addHook("preHandler", app.basicAuth);

  app.get("/api/settings/app", async () => {
    return { config: appConfigStore.get() };
  });

  app.put("/api/settings/app", async (request, reply) => {
    try {
      const config = AppConfigSchema.parse(request.body);
      await appConfigStore.save(config);

      reply.send({ config, restarting: true });

      setTimeout(() => {
        requestRestart().catch((error) => {
          app.log.error(error, "Failed to restart server");
        });
      }, 300);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save app config";
      return reply.code(400).send({ error: message });
    }
  });

  app.get("/api/settings/users", async () => {
    return { users: usersStore.getPublicList() };
  });

  app.post("/api/settings/users", async (request, reply) => {
    try {
      const user = UserSchema.parse(request.body);
      const created = await usersStore.create(user);
      return reply.code(201).send({ user: { username: created.username } });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create user";
      return reply.code(400).send({ error: message });
    }
  });

  app.patch("/api/settings/users/:username", async (request, reply) => {
    const { username } = request.params as { username: string };

    try {
      const patch = UpdateUserSchema.parse(request.body);
      const updated = await usersStore.update(username, patch);
      return { user: { username: updated.username } };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update user";
      const status = message.includes("not found") ? 404 : 400;
      return reply.code(status).send({ error: message });
    }
  });

  app.delete("/api/settings/users/:username", async (request, reply) => {
    const { username } = request.params as { username: string };

    try {
      await usersStore.delete(username);
      return reply.code(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      const status = message.includes("not found") ? 404 : 400;
      return reply.code(status).send({ error: message });
    }
  });
}
