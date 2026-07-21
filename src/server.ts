import { buildApp } from "./app";
import appConfig from "../data/app.json";

async function bootstrap() {
  const app = await buildApp();

  try {
    await app.listen({
      host: appConfig.host,
      port: appConfig.port,
    });

    app.log.info(`🚀 Switchboard started`);
    app.log.info(`🌐 http://${appConfig.host}:${appConfig.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
