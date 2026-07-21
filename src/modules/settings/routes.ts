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

    protectedApp.get("/settings/backup", async (_, reply) => {
      return reply.view("settings/backup.eta", {
        title: "Backup",
        activeNav: "settings",
        settingsTab: "backup",
        script: "/public/js/backup-restore.js",
      });
    });

    protectedApp.get("/settings/restore", async (_, reply) => {
      return reply.view("settings/restore.eta", {
        title: "Restore",
        activeNav: "settings",
        settingsTab: "restore",
        script: "/public/js/backup-restore.js",
      });
    });
  });
}
