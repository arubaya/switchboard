import fp from "fastify-plugin";
import basicAuth from "@fastify/basic-auth";

import { usersStore } from "../modules/config/users-store.js";

export default fp(async (app) => {
  await usersStore.load();

  await app.register(basicAuth, {
    validate: async (username, password) => {
      if (!usersStore.validate(username, password)) {
        throw new Error("Unauthorized");
      }
    },
    authenticate: { realm: "Switchboard" },
  });
});
