import type { FastifyInstance } from "fastify";

import { buildApp } from "./app.js";
import { appConfigStore } from "./modules/config/app-store.js";
import { sslStore } from "./modules/ssl/ssl-store.js";
import { setRestartHandler } from "./shared/restart.js";
import { startRuntime, type RuntimeServers } from "./shared/runtime.js";

let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let runtime: RuntimeServers | null = null;

async function start(): Promise<void> {
  const config = await appConfigStore.load();
  await sslStore.load();

  app = await buildApp();
  runtime = await startRuntime(app, config);

  app.log.info("Switchboard started");
}

setRestartHandler(async () => {
  if (runtime) {
    await runtime.close();
  }

  app = null;
  runtime = null;
  await start();
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
