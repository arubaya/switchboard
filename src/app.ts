import Fastify from "fastify";

import viewPlugin from "./plugins/view.js";
import staticPlugin from "./plugins/static.js";
import authPlugin from "./plugins/auth.js";

import dashboardModule from "./modules/dashboard/index.js";
import settingsModule from "./modules/settings/index.js";
import proxyModule from "./modules/proxy/index.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== "production"
          ? {
              target: "pino-pretty",
            }
          : undefined,
    },
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "switchboard",
    };
  });

  await app.register(viewPlugin);
  await app.register(staticPlugin);
  await app.register(authPlugin);

  // Dashboard API must register before proxy to avoid path conflicts.
  await app.register(dashboardModule);
  await app.register(settingsModule);
  await app.register(proxyModule);

  return app;
}
