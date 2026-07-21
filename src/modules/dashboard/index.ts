import type { FastifyInstance } from "fastify";

import dashboardApi from "./api.js";
import dashboardPage from "./routes.js";

export default async function dashboardModule(app: FastifyInstance) {
  await app.register(dashboardApi);
  await app.register(dashboardPage);
}
