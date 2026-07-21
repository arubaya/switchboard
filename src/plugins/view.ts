import fp from "fastify-plugin";
import fastifyView from "@fastify/view";
import path from "node:path";
import { Eta } from "eta";

const viewsRoot = path.join(process.cwd(), "src/views");

const eta = new Eta({
  views: viewsRoot,
  cache: process.env.NODE_ENV === "production",
});

export default fp(async (app) => {
  await app.register(fastifyView, {
    root: viewsRoot,
    layout: "layouts/main.eta",
    engine: {
      eta,
    },
  });
});
