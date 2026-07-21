import fp from "fastify-plugin";

import { routesStore } from "../config/routes-store.js";
import { reloadProxyRoutes } from "./register.js";
import { watchRoutesConfig } from "./watcher.js";

export default fp(async (app) => {
  const routes = await routesStore.load(app.log);
  await reloadProxyRoutes(app, routes);
  watchRoutesConfig(app);
});
