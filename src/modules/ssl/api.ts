import type { FastifyInstance } from "fastify";

import { requestRestart } from "../../shared/restart.js";
import { sslStore } from "./ssl-store.js";
import { SslConfigPatchSchema } from "./schemas.js";
import {
  issueLetsEncryptCertificate,
  renewLetsEncryptCertificate,
} from "./providers/letsencrypt.js";

function scheduleRestart(app: FastifyInstance): void {
  setTimeout(() => {
    requestRestart().catch((error) => {
      app.log.error(error, "Failed to restart server");
    });
  }, 300);
}

export default async function sslApi(app: FastifyInstance) {
  app.addHook("preHandler", app.basicAuth);

  app.get("/api/ssl", async () => {
    return {
      config: sslStore.get(),
      restartRequired: sslStore.get().enabled,
    };
  });

  app.get("/api/ssl/status", async () => {
    const status = await sslStore.getStatus();

    return {
      status,
      restartRequired: status.httpsEnabled,
    };
  });

  app.patch("/api/ssl", async (request, reply) => {
    try {
      const patch = SslConfigPatchSchema.parse(request.body);
      const config = await sslStore.patch(patch);

      reply.send({
        config,
        restarting: true,
        message: "SSL configuration saved. Restarting server...",
      });

      scheduleRestart(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save SSL config";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/ssl/request", async (request, reply) => {
    try {
      const config = sslStore.get();

      if (config.provider !== "letsencrypt") {
        return reply
          .code(400)
          .send({ error: "Certificate requests require Let's Encrypt provider" });
      }

      await issueLetsEncryptCertificate(config, {
        info: (message) => app.log.info(message),
        error: (error) => app.log.error(error),
      });

      reply.send({
        message: "Certificate issued. Restarting server...",
        restarting: true,
      });

      scheduleRestart(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to request certificate";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/ssl/renew", async (request, reply) => {
    try {
      const config = sslStore.get();

      if (config.provider !== "letsencrypt") {
        return reply
          .code(400)
          .send({ error: "Certificate renewals require Let's Encrypt provider" });
      }

      await renewLetsEncryptCertificate(config, {
        info: (message) => app.log.info(message),
        error: (error) => app.log.error(error),
      });

      reply.send({
        message: "Certificate renewed. Restarting server...",
        restarting: true,
      });

      scheduleRestart(app);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to renew certificate";
      return reply.code(400).send({ error: message });
    }
  });

  app.post("/api/ssl/reload", async (_request, reply) => {
    reply.send({
      message: "Reloading HTTPS configuration...",
      restarting: true,
    });

    scheduleRestart(app);
  });
}
