import fp from "fastify-plugin";
import fastifyView from "@fastify/view";
import path from "node:path";
import { Eta } from "eta";

const eta = new Eta({
  views: path.join(process.cwd(), "src/views"),
  cache: process.env.NODE_ENV === "production",
});

export default fp(async (app) => {
  const viewsRoot = path.join(process.cwd(), "src/views");

  await app.register(fastifyView, {
    root: viewsRoot,
    engine: {
      eta,
    },
  });
});
