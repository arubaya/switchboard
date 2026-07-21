import type { FastifyInstance } from "fastify";

export default async function dashboardPage(app: FastifyInstance) {
  app.get("/logout", async (request, reply) => {
    const loggedOut = (request.query as { done?: string }).done === "1";

    return reply.view("dashboard/logout.eta", {
      title: loggedOut ? "Logged out" : "Logout",
      loggedOut,
      script: loggedOut ? undefined : "/public/js/logout.js",
    });
  });

  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.basicAuth);

    protectedApp.get("/", async (_, reply) => {
      return reply.view("dashboard/index.eta", {
        title: "Switchboard",
        activeNav: "routes",
        script: "/public/js/dashboard.js",
      });
    });
  });
}
