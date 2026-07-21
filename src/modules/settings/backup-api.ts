import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";

import { appConfigStore } from "../config/app-store.js";
import { routesStore } from "../config/routes-store.js";
import { usersStore } from "../config/users-store.js";
import { reloadProxyRoutes } from "../proxy/register.js";
import { sslStore } from "../ssl/ssl-store.js";
import { requestRestart } from "../../shared/restart.js";
import { createBackupArchive, createBackupFilename } from "./backup.js";
import {
  parseJsonInput,
  resolveCertRelativePath,
  validateAppConfig,
  validateRoutesConfig,
  validateSslConfig,
  validateUsersConfig,
  writeCertificateFile,
} from "./restore.js";

function scheduleRestart(app: FastifyInstance): void {
  setTimeout(() => {
    requestRestart().catch((error) => {
      app.log.error(error, "Failed to restart server");
    });
  }, 300);
}

export default async function backupApi(app: FastifyInstance) {
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 20,
    },
  });

  app.addHook("preHandler", app.basicAuth);

  app.get("/api/settings/backup", async (_request, reply) => {
    const filename = createBackupFilename();

    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);

    return reply.send(createBackupArchive());
  });

  app.put("/api/settings/restore/app", async (request, reply) => {
    try {
      const parsed = parseJsonInput(request.body, "app.json");
      const config = validateAppConfig(parsed);
      const previous = appConfigStore.get();
      await appConfigStore.save(config);

      const restarting =
        previous.host !== config.host || previous.port !== config.port;

      reply.send({
        message: restarting
          ? "app.json restored. Restarting Switchboard..."
          : "app.json restored.",
        restarting,
      });

      if (restarting) {
        scheduleRestart(app);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore app.json";
      return reply.code(400).send({ error: message });
    }
  });

  app.put("/api/settings/restore/routes", async (request, reply) => {
    try {
      const parsed = parseJsonInput(request.body, "routes.json");
      const routes = validateRoutesConfig(parsed);
      await routesStore.restore(routes);
      await reloadProxyRoutes(app, routesStore.getAll());

      reply.send({
        message: "routes.json restored. Proxy routes reloaded.",
        reloaded: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore routes.json";
      return reply.code(400).send({ error: message });
    }
  });

  app.put("/api/settings/restore/ssl", async (request, reply) => {
    try {
      const parsed = parseJsonInput(request.body, "ssl.json");
      const config = validateSslConfig(parsed);
      await sslStore.restore(config);

      reply.send({
        message: "ssl.json restored. Restarting Switchboard...",
        restarting: true,
      });

      scheduleRestart(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore ssl.json";
      return reply.code(400).send({ error: message });
    }
  });

  app.put("/api/settings/restore/users", async (request, reply) => {
    try {
      const parsed = parseJsonInput(request.body, "users.json");
      const config = validateUsersConfig(parsed);
      await usersStore.restore(config);

      reply.send({
        message: "users.json restored.",
        reloaded: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore users.json";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/settings/restore/certs", async (request, reply) => {
    try {
      const saved: string[] = [];
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type !== "file" || !part.filename) {
          continue;
        }

        const relativePath = resolveCertRelativePath(part.filename);
        const content = await part.toBuffer();
        await writeCertificateFile(relativePath, content);
        saved.push(relativePath);
      }

      if (saved.length === 0) {
        return reply.code(400).send({ error: "No certificate files uploaded" });
      }

      const restarting = sslStore.get().enabled;

      reply.send({
        message: restarting
          ? `Saved ${saved.length} certificate file(s). Restarting Switchboard...`
          : `Saved ${saved.length} certificate file(s).`,
        saved,
        restarting,
      });

      if (restarting) {
        scheduleRestart(app);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to restore certificates";
      return reply.code(400).send({ error: message });
    }
  });
}
