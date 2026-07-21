import type { FastifyInstance } from "fastify";

import { sslStore } from "./ssl-store.js";

export function registerSslRedirectHook(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    const config = sslStore.get();

    if (!config.enabled || !config.redirectHttpToHttps) {
      return;
    }

    const pathname = request.url.split("?")[0];

    if (pathname.startsWith("/.well-known/acme-challenge/")) {
      return;
    }

    const socket = request.raw.socket as { encrypted?: boolean };
    const isHttps = Boolean(socket.encrypted) || request.protocol === "https";

    if (isHttps) {
      return;
    }

    const host = request.headers.host?.split(":")[0] ?? request.hostname;
    const target = `https://${host}:${config.httpsPort}${request.url}`;

    return reply.redirect(target);
  });
}
