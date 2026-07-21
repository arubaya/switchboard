import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import path from "node:path";

export default fp(async (app) => {
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "src", "public"),
    prefix: "/public/",
  });
});
