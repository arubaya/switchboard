import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { FastifyInstance } from "fastify";

import type { AppConfig } from "../modules/config/schemas.js";
import { assertCanBindPort, wrapListenError } from "./bind-port.js";
import { sslStore } from "../modules/ssl/ssl-store.js";
import { sslProviders } from "../modules/ssl/providers/index.js";
import type { SslConfig } from "../modules/ssl/schemas.js";

type HttpServer = ReturnType<typeof createHttpServer>;
type HttpsServer = ReturnType<typeof createHttpsServer>;

export type RuntimeServers = {
  close: () => Promise<void>;
};

async function loadTlsOptions(
  config: SslConfig,
): Promise<{ key: string; cert: string }> {
  const provider = sslProviders.get(config.provider);
  const paths = provider.resolvePaths(config);

  if (!paths) {
    throw new Error("Certificate paths are not configured");
  }

  const [key, cert] = await Promise.all([
    readFile(paths.privateKeyPath, "utf-8"),
    readFile(paths.certificatePath, "utf-8"),
  ]);

  return { key, cert };
}

export async function startRuntime(
  app: FastifyInstance,
  appConfig: AppConfig,
): Promise<RuntimeServers> {
  const sslConfig = sslStore.get();

  await app.ready();

  if (!sslConfig.enabled) {
    assertCanBindPort(appConfig.port);

    await app.listen({
      host: appConfig.host,
      port: appConfig.port,
    });

    app.log.info(`http://${appConfig.host}:${appConfig.port}`);

    return {
      close: async () => {
        await app.close();
      },
    };
  }

  const tlsOptions = await loadTlsOptions(sslConfig);
  const handler = app.server;

  const httpServer = createHttpServer((request, response) => {
    handler.emit("request", request, response);
  });

  const httpsServer = createHttpsServer(tlsOptions, (request, response) => {
    handler.emit("request", request, response);
  });

  assertCanBindPort(sslConfig.httpPort);
  assertCanBindPort(sslConfig.httpsPort);

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", (error) =>
      reject(wrapListenError(error, sslConfig.httpPort)),
    );
    httpServer.listen(sslConfig.httpPort, appConfig.host, () => resolve());
  });

  await new Promise<void>((resolve, reject) => {
    httpsServer.once("error", (error) =>
      reject(wrapListenError(error, sslConfig.httpsPort)),
    );
    httpsServer.listen(sslConfig.httpsPort, appConfig.host, () => resolve());
  });

  app.log.info(`http://${appConfig.host}:${sslConfig.httpPort}`);
  app.log.info(`https://${appConfig.host}:${sslConfig.httpsPort}`);

  return {
    close: async () => {
      await closeServer(httpServer);
      await closeServer(httpsServer);
      await app.close();
    },
  };
}

function closeServer(server: HttpServer | HttpsServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
