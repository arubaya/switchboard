import type { FastifyInstance } from "fastify";

export default async function dashboardPage(app: FastifyInstance) {
  app.addHook("preHandler", app.basicAuth);

  app.get("/", async (_, reply) => {
    return reply.view("dashboard/index.eta", {
      title: "Switchboard",
    });
  });
}
