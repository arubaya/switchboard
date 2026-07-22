import fp from "fastify-plugin";
import fastifyView from "@fastify/view";
import path from "node:path";
import { Eta } from "eta";

import { getVersionInfo } from "../shared/version.js";

const viewsRoot = path.join(process.cwd(), "src/views");

const eta = new Eta({
  views: viewsRoot,
  cache: process.env.NODE_ENV === "production",
});

export default fp(async (app) => {
  const version = getVersionInfo();

  await app.register(fastifyView, {
    root: viewsRoot,
    layout: "layouts/main.eta",
    defaultContext: {
      appVersion: version.version,
      appBuild: version.build,
      appCommit: version.commit,
    },
    engine: {
      eta,
    },
  });
});
