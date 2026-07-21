import type { FastifyInstance } from "fastify";

import sslApi from "./api.js";
import sslChallengeRoute from "./challenge-route.js";
import sslPage from "./routes.js";

export default async function sslModule(app: FastifyInstance) {
  await app.register(sslChallengeRoute);
  await app.register(sslApi);
  await app.register(sslPage);
}
