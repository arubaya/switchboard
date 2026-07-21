import type { FastifyInstance } from "fastify";

export default async function sslPage(app: FastifyInstance) {
  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.basicAuth);

    protectedApp.get("/ssl", async (_, reply) => {
      return reply.view("ssl/index.eta", {
        title: "SSL / HTTPS",
        activeNav: "ssl",
        script: "/public/js/ssl.js",
      });
    });
  });
}
