import type { FastifyInstance } from "fastify";

export default async function settingsPage(app: FastifyInstance) {
  app.register(async (protectedApp) => {
    protectedApp.addHook("preHandler", app.basicAuth);

    protectedApp.get("/settings", async (_, reply) => {
      return reply.redirect("/settings/app");
    });

    protectedApp.get("/settings/app", async (_, reply) => {
      return reply.view("settings/app.eta", {
        title: "App Settings",
        activeNav: "settings",
        settingsTab: "app",
        script: "/public/js/settings.js",
      });
    });

    protectedApp.get("/settings/users", async (_, reply) => {
      return reply.view("settings/users.eta", {
        title: "User Management",
        activeNav: "settings",
        settingsTab: "users",
        script: "/public/js/settings.js",
      });
    });
  });
}
