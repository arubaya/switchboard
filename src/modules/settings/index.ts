import type { FastifyInstance } from "fastify";

import settingsApi from "./api.js";
import settingsPage from "./routes.js";

export default async function settingsModule(app: FastifyInstance) {
  await app.register(settingsApi);
  await app.register(settingsPage);
}
