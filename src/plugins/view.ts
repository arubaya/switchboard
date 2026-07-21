import fp from "fastify-plugin";
import fastifyView from "@fastify/view";
import path from "node:path";
import { Eta } from "eta";

const eta = new Eta({
  views: path.join(process.cwd(), "src/views"),
  cache: process.env.NODE_ENV === "production",
});

export default fp(async (app) => {
  await app.register(fastifyView, {
    engine: {
      eta,
    },
  });
});
