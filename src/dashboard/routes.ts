import { FastifyInstance } from "fastify";

export default async function (app: FastifyInstance) {
  app.get("/", async (_, reply) => {
    return reply.view("dashboard/index.eta", {
      title: "Dashboard",
    });
  });
}
