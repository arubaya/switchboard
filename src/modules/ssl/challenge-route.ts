import type { FastifyInstance } from "fastify";

import { acmeChallengeStore } from "./challenge-store.js";

export default async function sslChallengeRoute(app: FastifyInstance) {
  app.get("/.well-known/acme-challenge/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const response = acmeChallengeStore.get(token);

    if (!response) {
      return reply.code(404).type("text/plain").send("Not found");
    }

    return reply.type("text/plain").send(response);
  });
}
