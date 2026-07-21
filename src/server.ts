import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";
import { appConfigStore } from "./modules/config/app-store.js";
import { setRestartHandler } from "./shared/restart.js";

let app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function start(): Promise<void> {
  const config = await appConfigStore.load();
  app = await buildApp();

  await app.listen({
    host: config.host,
    port: config.port,
  });

  app.log.info("Switchboard started");
  app.log.info(`http://${config.host}:${config.port}`);
}

setRestartHandler(async () => {
  if (!app) {
    return;
  }

  app.log.info("Restarting server after config change");
  await app.close();
  app = null;
  await start();
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
