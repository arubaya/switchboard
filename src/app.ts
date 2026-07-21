import Fastify from "fastify";

import viewPlugin from "./plugins/view";
import staticPlugin from "./plugins/static";

import dashboardRoutes from "./dashboard/routes";

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

  /**
   * Register plugins
   */
  await app.register(viewPlugin);
  await app.register(staticPlugin);

  /**
   * Register routes
   */
  await app.register(dashboardRoutes);

  return app;
}
