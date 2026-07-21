import chokidar from "chokidar";
import type { FastifyInstance } from "fastify";

import { routesStore } from "../config/routes-store.js";
import { routesConfigPath } from "../../shared/paths.js";
import { reloadProxyRoutes } from "./register.js";

export function watchRoutesConfig(app: FastifyInstance): void {
  let reloading = false;

  const reload = async () => {
    if (reloading) {
      return;
    }

    reloading = true;

    try {
      const routes = await routesStore.reloadFromDisk(app.log);
      await reloadProxyRoutes(app, routes);
      app.log.info({ count: routes.length }, "Proxy routes reloaded");
    } catch (error) {
      app.log.error(error, "Failed to reload proxy routes");
    } finally {
      reloading = false;
    }
  };

  const watcher = chokidar.watch(routesConfigPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  watcher.on("change", () => {
    void reload();
  });

  app.addHook("onClose", async () => {
    await watcher.close();
  });
}
