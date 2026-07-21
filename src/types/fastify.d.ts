import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    basicAuth: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    switchboardProxyReady?: boolean;
  }
}

import type { FastifyReply, FastifyRequest } from "fastify";
